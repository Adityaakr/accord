// The `model` check's hardware part, for Node only (`@accord/sdk/node`): the Intel TDX quotes and the GPU evidence in
// NEAR AI's attestation report, which the main entry leaves unchecked (`partial`). The same checks as `make probe-ai`
// (scripts/probe-ai) and as the Sealed Table runs inside the enclave before a negotiation
// (docs.near.ai/cloud/verification/reference/quote-nonce-signer), over a report fetched with the caller's fresh nonce:
//
//   gateway and every model instance: the TDX quote verifies against Intel's collateral (`@phala/dcap-qvl`), the TCB
//   status is accepted, the TD is not in debug mode, `report_data` binds the signing address and the nonce,
//   `MRCONFIGID` is the hash of the reported `app_compose`, and the event log replays to RTMR3;
//   every model instance: its GPU evidence carries the nonce and NVIDIA's attestation service (NRAS) accepts it.
//
// What this does not do: NRAS's verdict is read from the token it returns over TLS, and that token's signature is not
// checked here; and the report is the model as served now, so the run is tied to it by its signing key (`verify`
// compares the keys that signed the run's responses, from the signed outcome, with the keys verified here).

import { createHash } from "node:crypto";
import { getCollateralAndVerify } from "@phala/dcap-qvl";
import type { ModelProof, ModelProofResult } from "./verify.js";

const NRAS = "https://nras.attestation.nvidia.com/v3/attest/gpu";
/** TCB statuses accepted (the verification policy, as in scripts/probe-ai). Anything else fails the instance. */
const ACCEPTED_TCB = ["UpToDate", "SWHardeningNeeded"];

type Json = Record<string, unknown>;
const unhex = (s: string): Buffer => Buffer.from(s.replace(/^0x/i, ""), "hex");
const parse = (v: unknown): unknown => (typeof v === "string" ? JSON.parse(v) : v);

function replayRtmr3(eventLog: unknown): Buffer {
  let rtmr3 = Buffer.alloc(48);
  for (const e of parse(eventLog) as Array<{ imr: number; event_type: number; event: string; event_payload?: string; digest?: string }>) {
    if (e.imr !== 3) continue;
    const t = Buffer.alloc(4);
    t.writeUInt32LE(e.event_type);
    const digest = createHash("sha384").update(t).update(":").update(Buffer.from(e.event, "utf8")).update(":").update(unhex(e.event_payload ?? "")).digest();
    if (e.digest && !unhex(e.digest).equals(digest)) throw new Error(`event digest mismatch: ${e.event}`);
    rtmr3 = createHash("sha384").update(rtmr3).update(digest).digest();
  }
  return rtmr3;
}

export interface InstanceCheck { label: string; signingAddress: string; tdx: boolean; tcb?: string; gpu: "ok" | "failed" | "absent"; failures: string[] }

/** One attestation (the gateway's or a model instance's) against the nonce the report was asked with. */
export async function checkInstance(label: string, report: Json, nonce: string, fetchFn: typeof fetch = fetch): Promise<InstanceCheck> {
  const failures: string[] = [];
  const out: InstanceCheck = { label, signingAddress: String(report.signing_address ?? "").toLowerCase(), tdx: false, gpu: "absent", failures };
  try {
    const verified = await getCollateralAndVerify(unhex(String(report.intel_quote)));
    out.tcb = verified.status;
    if (!ACCEPTED_TCB.includes(verified.status)) failures.push(`TCB status ${verified.status}`);
    const r = verified.report as unknown as { type: string; data: { tdAttributes: Uint8Array; reportData: Uint8Array; mrConfigId: Uint8Array; rtMr3: Uint8Array } };
    if (r.type !== "td10") failures.push(`quote type ${r.type}`);
    const q = r.data;
    if (q.tdAttributes[0]! & 1) failures.push("TDX debug mode");
    const algo = String(report.signing_algo);
    const identity = unhex(String(report.signing_address));
    if ({ ecdsa: 20, ed25519: 32 }[algo] !== identity.length) failures.push(`identity length ${identity.length} for ${algo}`);
    const bound = report.tls_cert_fingerprint
      ? createHash("sha256").update(identity).update(unhex(String(report.tls_cert_fingerprint))).digest()
      : Buffer.concat([identity, Buffer.alloc(32 - identity.length)]);
    if (!Buffer.from(q.reportData).equals(Buffer.concat([bound, unhex(nonce)]))) failures.push("report_data does not bind signer and nonce");
    if (String(report.request_nonce ?? "").toLowerCase() !== nonce.toLowerCase()) failures.push("echoed nonce differs");
    const appCompose = (parse((report.info as Json).tcb_info) as Json).app_compose as string;
    const composeHash = createHash("sha256").update(Buffer.from(appCompose, "utf8")).digest();
    if (!Buffer.from(q.mrConfigId).equals(Buffer.concat([Buffer.from([1]), composeHash, Buffer.alloc(15)]))) failures.push("MRCONFIGID does not match app_compose");
    if (!replayRtmr3(report.event_log).equals(Buffer.from(q.rtMr3))) failures.push("event log does not replay to RTMR3");
    out.tdx = failures.length === 0;
  } catch (e) {
    failures.push(`quote verification error: ${(e as Error).message}`);
  }
  if (report.nvidia_payload) {
    try {
      const payload = parse(report.nvidia_payload) as Json;
      if (String(payload.nonce ?? "").toLowerCase() !== nonce.toLowerCase()) {
        out.gpu = "failed"; failures.push("GPU evidence nonce differs");
      } else {
        const res = await fetchFn(NRAS, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const first = ((await res.json()) as unknown[])[0] as [string, string] | undefined;
        const jwt = first && first[0] === "JWT" ? first[1] : undefined;
        const claims = jwt ? (JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString("utf8")) as Json) : {};
        out.gpu = claims["x-nvidia-overall-att-result"] === true ? "ok" : "failed";
        if (out.gpu === "failed") failures.push(`NRAS did not accept the GPU evidence (HTTP ${res.status})`);
      }
    } catch (e) {
      out.gpu = "failed"; failures.push(`NRAS error: ${(e as Error).message}`);
    }
  }
  return out;
}

/** The verdict over the checked instances; pure, so it is tested without Intel or NVIDIA. */
export function judgeInstances(gateway: InstanceCheck, models: InstanceCheck[]): ModelProofResult {
  if (models.length === 0) return { status: "not_checked", detail: "the report lists no model instance", signers: [] };
  const all = [gateway, ...models];
  const errors = all.filter((c) => c.failures.some((f) => /error:/.test(f)));
  const bad = all.filter((c) => !c.tdx || (c !== gateway && c.gpu !== "ok"));
  const tcb = [...new Set(all.map((c) => c.tcb).filter(Boolean))].join(", ");
  if (bad.length) {
    const why = bad.map((c) => `${c.label}: ${c.failures.join("; ") || (c.gpu === "absent" ? "no GPU evidence" : "failed")}`).join(" · ");
    // a check that could not run (Intel's or NVIDIA's service unreachable) is not a failed check
    return { status: errors.length === bad.length ? "not_checked" : "fail", detail: why, signers: [] };
  }
  // a signing key counts only when every instance that reports it verified (the Sealed Table's rule, DECISIONS.md 36)
  const signers = [...new Set(models.map((c) => c.signingAddress))];
  return {
    status: "ok", signers,
    detail: `TDX quote verified for the gateway and ${models.length} model instance${models.length === 1 ? "" : "s"} (Intel collateral, TCB ${tcb}, not debug, signer and nonce bound, compose and RTMR3 match) · GPU evidence accepted by NVIDIA NRAS for ${models.length === 1 ? "it" : "each"}`,
  };
}

/** The hardware proof for a report already fetched with `nonce`: the gateway and every model instance. */
export function quoteProof(o: { fetch?: typeof fetch; timeoutMs?: number } = {}): ModelProof {
  return async (reportText, nonce) => {
    const work = (async (): Promise<ModelProofResult> => {
      const report = JSON.parse(reportText) as Json;
      const candidates = (report.model_attestations as Json[] | undefined) ?? [];
      if (!report.gateway_attestation) return { status: "not_checked", detail: "the report has no gateway attestation", signers: [] };
      const [gateway, ...models] = await Promise.all([
        checkInstance("gateway", report.gateway_attestation as Json, nonce, o.fetch),
        ...candidates.map((c, i) => checkInstance(`model instance ${i + 1}`, c, nonce, o.fetch)),
      ]);
      return judgeInstances(gateway!, models);
    })();
    const timeout = new Promise<ModelProofResult>((r) => { const t = setTimeout(() => r({ status: "not_checked", detail: "the hardware checks timed out", signers: [] }), o.timeoutMs ?? 60_000); t.unref(); });
    return Promise.race([work, timeout]);
  };
}
