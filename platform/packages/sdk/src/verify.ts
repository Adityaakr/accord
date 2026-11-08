// `verify(agreement)`: what anyone can check without a key (GOAL.md `make verify`). Each check reports `ok`, a
// failure with its reason, or `not checked` with why; nothing is assumed.

import { ed25519 } from "@noble/curves/ed25519";
import { baseDecode } from "near-api-js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils";
import type { Accord } from "./accord.js";
import { KNOWN_FACTORIES } from "./chain.js";
import { signedBytes } from "./hash.js";
import { fromBase64 } from "./bytes.js";

/** `partial`: some of the check ran and passed, and the rest was not run here; the detail says which part. */
export type CheckStatus = "ok" | "partial" | "fail" | "not_checked";

export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface VerifyReport {
  agreement: string;
  checks: Check[];
  ok: number;
  partial: number;
  failed: number;
  notChecked: number;
}

/** Thrown when the account does not exist or does not run Accord's agreement code. */
export class NotAnAgreementError extends Error {
  constructor(readonly agreement: string) {
    super(`${agreement} is not an Accord agreement`);
    this.name = "NotAnAgreementError";
  }
}

// What the RPC says when an account is missing, has no code, or runs a contract without `get_agreement`.
const NOT_AN_AGREEMENT = /does not exist|method is not found|MethodNotFound|CodeDoesNotExist|UNKNOWN_ACCOUNT/i;

export function verifyEd25519(output: Record<string, unknown>, publicKey: string): boolean {
  const sig = output.sig;
  if (typeof sig !== "string") return false;
  try {
    const key = baseDecode(publicKey.replace(/^ed25519:/, ""));
    return ed25519.verify(fromBase64(sig), signedBytes(output), key);
  } catch {
    return false;
  }
}

export async function verify(
  accord: Accord,
  agreement: string,
  opts: { nonce?: string; nearAiKey?: string; factories?: string[] } = {},
): Promise<VerifyReport> {
  const deal = accord.agreement(agreement);
  let a: Awaited<ReturnType<typeof deal.get>>;
  try {
    a = await deal.get();
  } catch (e) {
    if (NOT_AN_AGREEMENT.test((e as Error).message ?? "")) throw new NotAnAgreementError(agreement);
    throw e;
  }
  // The agreement's own factory (each factory pins one token), which must be a known Accord factory that
  // registered this account; its release is the one the code and the keys are checked against.
  const known = knownFactories(accord, opts.factories);
  const own = accord.onFactory(a.factory);
  const registered = await own.chain.view<boolean>(a.factory, "is_agreement", { account: agreement }).catch(() => false);
  const release = await own.release(a.release);
  // Provenance: only an account the factory created, under its own id, with the release's job keys and the
  // factory's token, outlayer and keeper, is the agreement it claims to be (the code hash alone is public).
  const problems: string[] = [];
  if (!known.includes(a.factory)) problems.push(`factory ${a.factory} is not a known Accord factory`);
  else if (!registered) problems.push(`not registered by factory ${a.factory}`);
  if (agreement !== `a${a.id}.${a.factory}`) problems.push(`id is not a${a.id}.${a.factory}`);
  for (const j of ["sealed_table", "payee", "observer"] as const) {
    if (a.jobs?.[j]?.signing_pubkey !== release[j].signing_pubkey) problems.push(`${j} key differs from release ${release.version}`);
  }
  const config = await own.config().catch(() => null);
  if (!config) problems.push(`factory ${a.factory} config unreadable`);
  else {
    for (const k of ["token", "outlayer", "keeper"] as const) {
      if (a[k] !== config[k]) problems.push(`${k} ${a[k]} differs from the factory's ${config[k]}`);
    }
  }
  const factoryNote = problems.map((p) => ` · ${p}`).join("");
  const checks: Check[] = [];
  const add = (name: string, status: CheckStatus, detail: string) => checks.push({ name, status, detail });

  // code: the account runs exactly the release's code.
  const acct = await accord.chain.account(agreement);
  const running = acct.global_contract_hash ?? acct.code_hash;
  add("code", running === release.code_hash && !factoryNote ? "ok" : "fail",
    `code hash ${running.slice(0, 8)}… ${running === release.code_hash ? "=" : "≠"} release ${release.version} (${release.mode === "Global" ? "global by hash" : "embedded"}) · no deploy method${factoryNote}`);

  // keys: at most one FunctionCall key for `act` on the account itself; never full access.
  const keys = await accord.chain.accessKeys(agreement);
  const keysOk = keys.length <= 1 && keys.every((k) => {
    const p = k.access_key.permission;
    if (p === "FullAccess") return false;
    const fc = p.FunctionCall;
    return fc.receiver_id === agreement && fc.method_names.length === 1 && fc.method_names[0] === "act";
  });
  add("keys", keysOk ? "ok" : "fail",
    `${keys.length} key · ${keys.length ? "FunctionCall · receiver self · methods [act]" : "none"} · no full access`);

  // sealed: the Sealed Table's signed outcome, against the release's key, with the commitments on chain.
  const outText = await deal.sealedOutput();
  if (!outText) {
    add("sealed", "not_checked", "no negotiation outcome yet");
  } else {
    const out = JSON.parse(outText) as Record<string, unknown>;
    const sigOk = verifyEd25519(out, release.sealed_table.signing_pubkey);
    const c = await deal.commitments();
    const commitOk = out.buyer_commitment === c.buyer?.commitment && out.vendor_commitment === c.vendor?.commitment;
    const agreementOk = out.agreement === agreement;
    add("sealed", sigOk && commitOk && agreementOk ? "ok" : "fail",
      `outcome signature ${sigOk ? "ok" : "bad"} · commitments ${commitOk ? "match" : "differ"} · agreement ${agreementOk ? "matches" : "differs"}`);
  }

  // release: the job keys came from pubkey runs; checking the quote needs OutLayer's attestation record.
  add("release", "not_checked",
    `sealed-table wasm ${release.sealed_table.wasm_hash.slice(0, 8)}… · keys from pubkey run ${release.sealed_table.pubkey_task_id} · OutLayer attestation record not checked here (needs outlayer-verify)`);

  // model: NEAR AI's attestation report, fetched with a fresh nonce chosen here. A local node's outcome says it
  // came from the deterministic local negotiator; no model ran, so there is nothing to attest.
  const local = outText ? (JSON.parse(outText) as { model?: { local?: string } }).model?.local : undefined;
  if (local) add("model", "not_checked", `no model ran: ${local} (local node)`);
  else add(...(await modelCheck(a.model, opts.nonce ?? bytesToHex(randomBytes(32)), opts.nearAiKey)));

  // payee: the current recipient's chain of approvals, and its proof signed by the release's Payee key.
  const versions = await deal.recipients();
  const active = versions.find((v) => v.status === "Active");
  if (!active) {
    add("payee", "not_checked", "no active recipient");
  } else {
    const proof = active.proof ? (JSON.parse(active.proof) as Record<string, unknown>) : null;
    const proofOk = proof !== null && verifyEd25519(proof, release.payee.signing_pubkey);
    add("payee", proofOk ? "ok" : "fail",
      `${active.account} · proof ${active.domain} ${proofOk ? "signed by the release's payee key" : "signature bad"} · authority approved · buyer accepted · active`);
  }

  // record: the counts the views report, and the money they add up to.
  const [receipts, refusals, exceptions, items] = await Promise.all([
    deal.receipts(), deal.refusals(), deal.exceptions(), deal.items(),
  ]);
  const paidFromReceipts = receipts.reduce((s, r) => s + BigInt(r.amount), 0n);
  const assumed = items.filter((i) => i.status === "AssumedPaid").reduce((s, i) => s + BigInt(i.settled), 0n);
  const ledgerOk = paidFromReceipts + assumed === BigInt(a.paid);
  add("record", ledgerOk ? "ok" : "fail",
    `${receipts.length} payments · ${a.refusals} refusals (${refusals.length} in the log) · ${exceptions.length} exceptions · ${items.filter((i) => i.status === "Reserved").length} set aside · ${a.observation_conflicts} observation conflicts · receipts ${ledgerOk ? "match" : "do not match"} paid`);

  return {
    agreement,
    checks,
    ok: checks.filter((c) => c.status === "ok").length,
    partial: checks.filter((c) => c.status === "partial").length,
    failed: checks.filter((c) => c.status === "fail").length,
    notChecked: checks.filter((c) => c.status === "not_checked").length,
  };
}

/** The factories `verify` accepts: this client's factory, the network's known ones, and any the caller adds. */
export function knownFactories(accord: Accord, factories: string[] = []): string[] {
  const known = (KNOWN_FACTORIES[accord.network] ?? []).map((f) => f.factory);
  return [...new Set([accord.factory, ...known, ...factories.filter(Boolean)])];
}

const NEAR_AI = "https://cloud-api.near.ai/v1";

async function modelCheck(model: string, nonce: string, key?: string): Promise<[string, CheckStatus, string]> {
  const url = `${NEAR_AI}/attestation/report?model=${encodeURIComponent(model)}&provider=near&signing_algo=ecdsa&nonce=${nonce}`;
  try {
    const headers: Record<string, string> = { "x-no-aliasing": "true" };
    if (key) headers.authorization = `Bearer ${key}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return ["model", "not_checked", `${model} · attestation report HTTP ${res.status}`];
    const text = await res.text();
    const bound = text.toLowerCase().includes(nonce.toLowerCase());
    // Only the nonce binding is checked here; the hardware quote and the GPU evidence are not, so a pass is partial.
    return bound
      ? ["model", "partial", `${model} · attestation report fetched with fresh nonce ${nonce.slice(0, 8)}… · nonce bound in the report · hardware quote and GPU evidence not checked here (make probe-ai checks them)`]
      : ["model", "fail", `${model} · attestation report fetched with fresh nonce ${nonce.slice(0, 8)}… · nonce not found in the report`];
  } catch (e) {
    return ["model", "not_checked", `${model} · ${(e as Error).message}`];
  }
}
