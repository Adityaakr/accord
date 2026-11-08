// `make negotiate` (PROGRESS 2.8): both mandates sealed on chain, the Sealed Table's run, the signed terms and the
// sealing sanity check, printed as INTERFACES.md section 10 shows.

import { deriveDocKey, sealedCheck, verifyEd25519 } from "@accord/sdk";
import { create, header, line, negotiate, PRESETS, sealBoth, short, usdc } from "../flow.js";
import type { World } from "../world.js";

const ROUNDS: Record<number, string> = {
  2: "QUOTE → ACCEPT",
  3: "QUOTE → COUNTER → ACCEPT",
  4: "QUOTE → COUNTER → FINAL → ACCEPT",
};

function kb(b64: string): string {
  return `${((b64.length * 3) / 4 / 1024).toFixed(1)} KB`;
}

export async function run(w: World): Promise<void> {
  const started = Date.now();
  const id = await create(w, "procurement", "Liquidity reporting integration");
  header("negotiate", id, " · procurement", w);
  const sealed = await sealBoth(w, id, PRESETS.procurement);
  const c = await w.reader.agreement(id).commitments();
  line("buyer", `commitment ${short(sealed.buyer.commitment)} · ciphertext ${kb(c.buyer!.ciphertext)} on chain`);
  line("vendor", `commitment ${short(sealed.vendor.commitment)} · ciphertext ${kb(c.vendor!.ciphertext)} on chain`);

  const a = await negotiate(w, id);
  const job = a.jobs.sealed_table;
  const where = w.network === "sandbox" ? "local outlayer (make serve)" : a.outlayer;
  line("request", `${where} · project ${job.project} · wasm ${short(job.wasm_hash)}`);
  const raw = await w.reader.agreement(id).sealedOutput();
  if (!raw) throw new Error(`${id}: ${a.state} and no sealed output`);
  const out = JSON.parse(raw) as Record<string, any>;
  const model = out.model ?? {};
  if (model.local) {
    line("model", `local negotiator in place of ${model.id} · no NEAR AI call, no attestation checked (local node)`);
  } else {
    const signer = model.candidates?.[0]?.signing_address ?? "none";
    line("model", `${model.id} · gateway and model attestation ok · fresh nonce ${short(model.nonce ?? "")} · signer ${signer}`);
  }
  const responses = Array.isArray(out.responses) ? out.responses.length : 0;
  const signed = model.local
    ? "no model responses (local negotiator)"
    : `${responses} responses · each signature verified against an attested model key inside the enclave`;
  line("rounds", `${ROUNDS[out.rounds] ?? `${out.rounds} messages`} · ${signed}`);
  if (a.state !== "Attested") {
    line("state", `${a.state} · ${out.no_deal_reason ?? "no terms"} · ${Math.round((Date.now() - started) / 1000)} s`);
    process.exitCode = 1;
    return;
  }
  line("limits", "pass · within both mandates (values not shown)");
  const terms = out.terms;
  line("terms", `${usdc(terms.total)} · ${terms.items.length} items · terms ${short(out.terms_hash)}`);
  const sigOk = verifyEd25519(out, job.signing_pubkey);
  line("signed", `sealed-table key ${job.signing_pubkey} · signature ${sigOk ? "ok" : "INVALID"} on chain`);

  const buyerKey = await deriveDocKey(w.signer("buyer"), id);
  const vendorKey = await deriveDocKey(w.signer("vendor"), id);
  const b2v = sealedCheck(c.vendor!.ciphertext, buyerKey);
  const v2b = sealedCheck(c.buyer!.ciphertext, vendorKey);
  line("sealed", `sanity check: buyer → vendor mandate ${b2v} · vendor → buyer mandate ${v2b}`);
  line("state", `${a.state} · ${Math.round((Date.now() - started) / 1000)} s`);
  if (!sigOk || b2v !== "ERR_SEALED" || v2b !== "ERR_SEALED") process.exitCode = 1;
}
