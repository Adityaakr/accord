// `verify(agreement)`: what anyone can check without a key (GOAL.md `make verify`). Each check reports `ok`, a
// failure with its reason, or `not checked` with why; nothing is assumed.

import { ed25519 } from "@noble/curves/ed25519";
import { baseDecode } from "near-api-js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils";
import type { Accord } from "./accord.js";
import { signedBytes } from "./hash.js";
import { fromBase64 } from "./bytes.js";

export type CheckStatus = "ok" | "fail" | "not_checked";

export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface VerifyReport {
  agreement: string;
  checks: Check[];
  ok: number;
  failed: number;
  notChecked: number;
}

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
  opts: { nonce?: string; nearAiKey?: string } = {},
): Promise<VerifyReport> {
  const deal = accord.agreement(agreement);
  const a = await deal.get();
  const release = await accord.release(a.release);
  const checks: Check[] = [];
  const add = (name: string, status: CheckStatus, detail: string) => checks.push({ name, status, detail });

  // code: the account runs exactly the release's code.
  const acct = await accord.chain.account(agreement);
  const running = acct.global_contract_hash ?? acct.code_hash;
  add("code", running === release.code_hash ? "ok" : "fail",
    `code hash ${running.slice(0, 8)}… ${running === release.code_hash ? "=" : "≠"} release ${release.version} (${release.mode === "Global" ? "global by hash" : "embedded"}) · no deploy method`);

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

  // release: the job keys came from pubkey runs; quote verification needs OutLayer's attestation record.
  add("release", "not_checked",
    `sealed-table wasm ${release.sealed_table.wasm_hash.slice(0, 8)}… · keys from pubkey run ${release.sealed_table.pubkey_task_id} · attestation record check pending probe 0.3`);

  // model: NEAR AI's attestation report, fetched with a fresh nonce chosen here.
  add(...(await modelCheck(a.model, opts.nonce ?? bytesToHex(randomBytes(32)), opts.nearAiKey)));

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
    failed: checks.filter((c) => c.status === "fail").length,
    notChecked: checks.filter((c) => c.status === "not_checked").length,
  };
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
    return ["model", bound ? "ok" : "fail",
      `${model} · report fetched with fresh nonce ${nonce.slice(0, 8)}… · nonce ${bound ? "bound in the report" : "not found in the report"} · TDX quote and GPU evidence: not checked here (make probe-ai)`];
  } catch (e) {
    return ["model", "not_checked", `${model} · ${(e as Error).message}`];
  }
}
