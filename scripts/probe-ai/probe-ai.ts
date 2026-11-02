// PROGRESS 0.2: the NEAR AI Cloud probe (`make probe-ai`).
//
// One verified completion end to end, with nothing taken on trust:
//   1. list the models and pick the NEAR-fleet TEE model (DECISIONS.md section 4);
//   2. fetch the attestation report with a fresh 32-byte nonce, before the completion, and verify the gateway part
//      and every model candidate: the Intel TDX quote (`@phala/dcap-qvl`), debug bit, `report_data` (signer and
//      nonce), the echoed nonce, `MRCONFIGID` against `app_compose`, the RTMR3 replay, and the GPU evidence (NRAS);
//   3. send one non-streamed completion with `x-no-aliasing: true` and a random session salt;
//   4. fetch `/v1/signature/{id}?signing_algo=ecdsa`, recompute both hashes from the exact bytes, recover the
//      EIP-191 signer and require it to be exactly one verified model candidate;
//   5. try NEAR AI's end-to-end encryption (the secp256k1 scheme that matches the verified ECDSA report) with the
//      same model, structured output included, and check its signature too.
// A check that did not run is printed as `not checked` with the reason; `ok` is printed only for a check that ran.
//
// The API key is read from the repository's `.env` (NEARAI_API_KEY) and never printed. `--save <dir>` writes the
// raw report and the exchange for inspection (no headers, so no key).

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCollateralAndVerify } from "@phala/dcap-qvl";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { gcm } from "@noble/ciphers/aes";

const BASE = "https://cloud-api.near.ai/v1";
const NRAS = "https://nras.attestation.nvidia.com/v3/attest/gpu";
const PREFERRED_MODEL = "z-ai/glm-5.3-flash";
// TCB statuses this probe accepts (the verification policy). Anything else is reported, not passed.
const ACCEPTED_TCB = ["UpToDate", "SWHardeningNeeded"];

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const saveIdx = process.argv.indexOf("--save");
const saveDir = saveIdx > 0 ? resolve(process.argv[saveIdx + 1] ?? "") : undefined;

function apiKey(): string {
  const fromEnv = process.env.NEARAI_API_KEY;
  if (fromEnv) return fromEnv;
  const text = readFileSync(join(repo, ".env"), "utf8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith("NEARAI_API_KEY="));
  const value = line?.slice("NEARAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error("NEARAI_API_KEY is not set in .env");
  return value;
}
const KEY = apiKey();

type Json = Record<string, unknown>;
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
const unhex = (s: string): Buffer => Buffer.from(s.replace(/^0x/i, ""), "hex");
const sha256hex = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const parse = (v: unknown): unknown => (typeof v === "string" ? JSON.parse(v) : v);
const ms = (t0: number): string => `${Math.round(performance.now() - t0)} ms`;

const lines: string[] = [];
function say(s: string): void {
  lines.push(s);
  console.log(s);
}

async function get(url: string, headers: Record<string, string> = {}): Promise<{ status: number; bytes: Buffer }> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Accept-Encoding": "identity", ...headers },
  });
  return { status: r.status, bytes: Buffer.from(await r.arrayBuffer()) };
}

async function post(url: string, body: Buffer, headers: Record<string, string> = {}): Promise<{ status: number; bytes: Buffer }> {
  const r = await fetch(url, {
    method: "POST",
    body: new Uint8Array(body),
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "identity",
      ...headers,
    },
  });
  return { status: r.status, bytes: Buffer.from(await r.arrayBuffer()) };
}

// ---------------------------------------------------------------------------------------------------------------
// Attestation checks (docs.near.ai/cloud/verification/reference/quote-nonce-signer)

function replayRtmr3(eventLog: unknown): Buffer {
  let rtmr3 = Buffer.alloc(48);
  for (const e of parse(eventLog) as Array<{ imr: number; event_type: number; event: string; event_payload?: string; digest?: string }>) {
    if (e.imr !== 3) continue;
    const t = Buffer.alloc(4);
    t.writeUInt32LE(e.event_type);
    const digest = createHash("sha384")
      .update(t)
      .update(":")
      .update(Buffer.from(e.event, "utf8"))
      .update(":")
      .update(unhex(e.event_payload ?? ""))
      .digest();
    if (e.digest && !unhex(e.digest).equals(digest)) throw new Error(`event digest mismatch: ${e.event}`);
    rtmr3 = createHash("sha384").update(rtmr3).update(digest).digest();
  }
  return rtmr3;
}

interface Checked {
  label: string;
  signingAddress: string;
  tdx: "ok" | "failed";
  tcbStatus?: string;
  failures: string[];
  composeHash?: string;
  gpu: "ok" | "failed" | "absent";
  gpuNote?: string;
  signingPublicKey?: string;
}

async function checkReport(label: string, report: Json, nonce: string): Promise<Checked> {
  const failures: string[] = [];
  const out: Checked = { label, signingAddress: String(report.signing_address ?? ""), tdx: "failed", failures, gpu: "absent" };
  try {
    const verified = await getCollateralAndVerify(unhex(String(report.intel_quote)));
    out.tcbStatus = verified.status;
    if (!ACCEPTED_TCB.includes(verified.status)) failures.push(`TCB status ${verified.status} (${verified.advisory_ids.join(",")})`);
    const report_ = verified.report as unknown as { type: string; data: { tdAttributes: Uint8Array; reportData: Uint8Array; mrConfigId: Uint8Array; rtMr3: Uint8Array } };
    if (report_.type !== "td10") failures.push(`quote type ${report_.type}`);
    const q = report_.data;
    if (q.tdAttributes[0]! & 1) failures.push("TDX debug mode");
    const algo = String(report.signing_algo);
    const identity = unhex(String(report.signing_address));
    if ({ ecdsa: 20, ed25519: 32 }[algo] !== identity.length) failures.push(`identity length ${identity.length} for ${algo}`);
    const bound = report.tls_cert_fingerprint
      ? createHash("sha256").update(identity).update(unhex(String(report.tls_cert_fingerprint))).digest()
      : Buffer.concat([identity, Buffer.alloc(32 - identity.length)]);
    if (!Buffer.from(q.reportData).equals(Buffer.concat([bound, unhex(nonce)]))) failures.push("report_data does not bind signer and nonce");
    if (String(report.request_nonce ?? "").toLowerCase() !== nonce) failures.push("echoed nonce differs");
    if (report.report_data && String(report.report_data).replace(/^0x/, "").toLowerCase() !== hex(q.reportData)) failures.push("echoed report_data differs from the quote");
    const appCompose = (parse((report.info as Json).tcb_info) as Json).app_compose as string;
    const composeHash = createHash("sha256").update(Buffer.from(appCompose, "utf8")).digest();
    out.composeHash = composeHash.toString("hex");
    if (!Buffer.from(q.mrConfigId).equals(Buffer.concat([Buffer.from([1]), composeHash, Buffer.alloc(15)]))) failures.push("MRCONFIGID does not match app_compose");
    if (!replayRtmr3(report.event_log).equals(Buffer.from(q.rtMr3))) failures.push("event log does not replay to RTMR3");
    if (typeof report.signing_public_key === "string" && algo === "ecdsa") {
      // The E2EE key must be the key behind the attested address.
      const pub = unhex(report.signing_public_key);
      const raw = pub.length === 65 ? pub.subarray(1) : pub;
      const addr = Buffer.from(keccak_256(raw)).subarray(12);
      if (addr.equals(identity)) out.signingPublicKey = raw.toString("hex");
      else failures.push("signing_public_key does not hash to signing_address");
    }
    if (failures.length === 0) out.tdx = "ok";
  } catch (e) {
    failures.push(`quote verification error: ${(e as Error).message}`);
  }
  if (report.nvidia_payload) {
    try {
      const payload = parse(report.nvidia_payload) as Json;
      if (String(payload.nonce ?? "").toLowerCase() !== nonce) {
        out.gpu = "failed";
        out.gpuNote = "GPU payload nonce differs";
      } else {
        const t0 = performance.now();
        const r = await fetch(NRAS, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await r.json()) as unknown[];
        const first = body[0] as [string, string] | undefined;
        const jwt = first && first[0] === "JWT" ? first[1] : undefined;
        const claims = jwt ? (JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString("utf8")) as Json) : {};
        out.gpu = claims["x-nvidia-overall-att-result"] === true ? "ok" : "failed";
        out.gpuNote = `NRAS ${r.status} in ${ms(t0)}, ${((payload.evidence_list as unknown[]) ?? []).length} GPUs, arch ${String(payload.arch ?? "?")}`;
      }
    } catch (e) {
      out.gpu = "failed";
      out.gpuNote = `NRAS error: ${(e as Error).message}`;
    }
  }
  return out;
}

// EIP-191 personal_sign recovery.
function recoverEip191(text: string, signatureHex: string): string {
  const msg = Buffer.from(text, "utf8");
  const digest = keccak_256(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${msg.length}`), msg]));
  const sig = unhex(signatureHex);
  if (sig.length !== 65) throw new Error(`signature is ${sig.length} bytes`);
  let v = sig[64]!;
  if (v >= 27) v -= 27;
  const s = secp256k1.Signature.fromCompact(sig.subarray(0, 64)).addRecoveryBit(v);
  const pub = s.recoverPublicKey(digest).toRawBytes(false);
  return `0x${Buffer.from(keccak_256(pub.subarray(1))).subarray(12).toString("hex")}`;
}

// NEAR AI's ECDSA end-to-end encryption: secp256k1 ECDH (x coordinate), HKDF-SHA256 info "ecdsa_encryption",
// AES-256-GCM with a 12-byte nonce; wire format ephemeral pubkey (65) || nonce (12) || ciphertext+tag, hex.
function e2eeEncrypt(plaintext: string, modelPub64Hex: string): string {
  const eph = secp256k1.utils.randomPrivateKey();
  const shared = secp256k1.getSharedSecret(eph, Buffer.concat([Buffer.from([4]), unhex(modelPub64Hex)]), true).subarray(1);
  const key = hkdf(sha256, shared, undefined, "ecdsa_encryption", 32);
  const nonce = randomBytes(12);
  const ct = gcm(key, nonce).encrypt(Buffer.from(plaintext, "utf8"));
  return hex(Buffer.concat([secp256k1.getPublicKey(eph, false), nonce, ct]));
}
function e2eeDecrypt(dataHex: string, secret: Uint8Array): string {
  const d = unhex(dataHex);
  const shared = secp256k1.getSharedSecret(secret, d.subarray(0, 65), true).subarray(1);
  const key = hkdf(sha256, shared, undefined, "ecdsa_encryption", 32);
  return Buffer.from(gcm(key, d.subarray(65, 77)).decrypt(d.subarray(77))).toString("utf8");
}

interface SigCheck {
  ok: boolean;
  kind?: string;
  signer?: string;
  note: string;
}

async function checkSignature(chatId: string, model: string, req: Buffer, res: Buffer, verified: Checked[]): Promise<SigCheck> {
  let sig: Json = {};
  for (let i = 0; i < 5; i++) {
    const r = await get(`${BASE}/signature/${encodeURIComponent(chatId)}?signing_algo=ecdsa`);
    if (r.status === 200) {
      sig = JSON.parse(r.bytes.toString("utf8")) as Json;
      if (!sig.error_code) break;
    }
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  if (!sig.text || !sig.signature) return { ok: false, note: `signature unavailable: ${JSON.stringify(sig).slice(0, 200)}` };
  const expected = `${model}:${sha256hex(req)}:${sha256hex(res)}`;
  const kind = String(sig.signature_kind ?? "");
  if (sig.text !== expected) return { ok: false, kind, note: `signed text differs (kind ${kind})` };
  if (sig.signing_algo !== "ecdsa") return { ok: false, kind, note: `algo ${String(sig.signing_algo)}` };
  const signer = recoverEip191(String(sig.text), String(sig.signature));
  if (signer.toLowerCase() !== String(sig.signing_address).toLowerCase()) return { ok: false, kind, signer, note: "recovered signer differs from signing_address" };
  const matches = verified.filter((c) => c.signingAddress.toLowerCase() === signer.toLowerCase());
  if (kind !== "provider_tee") return { ok: false, kind, signer, note: `signature_kind ${kind}` };
  if (matches.length !== 1) return { ok: false, kind, signer, note: `${matches.length} verified candidates match the signer` };
  return { ok: true, kind, signer, note: "" };
}

// ---------------------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const t0 = performance.now();
  const save = (name: string, data: Buffer | string): void => {
    if (!saveDir) return;
    mkdirSync(saveDir, { recursive: true });
    writeFileSync(join(saveDir, name), data);
  };

  // 1. Models.
  const list = await get(`${BASE}/model/list`);
  const models = (JSON.parse(list.bytes.toString("utf8")) as { models: Array<{ modelId: string; metadata: Json }> }).models;
  const fleet = models.filter(
    (m) =>
      m.metadata.verifiable === true &&
      m.metadata.providerType === "vllm" &&
      ((m.metadata.supportedFeatures as string[] | undefined) ?? []).includes("structured_outputs") &&
      ((m.metadata.architecture as Json | undefined)?.outputModalities as string[] | undefined)?.includes("text"),
  );
  const chosen = fleet.find((m) => m.modelId === PREFERRED_MODEL) ?? fleet[0];
  if (!chosen) throw new Error("no NEAR-fleet TEE model with structured outputs");
  const model = chosen.modelId;
  say(`models: ${models.length} listed, NEAR-fleet TEE with structured outputs: ${fleet.map((m) => m.modelId).join(", ")}`);
  say(`model: ${model}`);

  // 2. Preflight attestation with a fresh nonce.
  const nonce = randomBytes(32).toString("hex");
  let t = performance.now();
  const rep = await get(
    `${BASE}/attestation/report?${new URLSearchParams({ model, provider: "near", signing_algo: "ecdsa", include_tls_fingerprint: "false", nonce })}`,
    { "x-no-aliasing": "true" },
  );
  if (rep.status !== 200) throw new Error(`attestation report HTTP ${rep.status}: ${rep.bytes.toString("utf8").slice(0, 300)}`);
  save("attestation-report.json", rep.bytes);
  const report = JSON.parse(rep.bytes.toString("utf8")) as Json;
  const candidates = (report.model_attestations as Json[] | undefined) ?? [];
  say(`attestation report: ${(rep.bytes.length / 1024).toFixed(0)} KB, ${candidates.length} model candidates, fetched in ${ms(t)}`);

  t = performance.now();
  const gateway = await checkReport("gateway", report.gateway_attestation as Json, nonce);
  const checkedModels: Checked[] = [];
  for (const [i, c] of candidates.entries()) checkedModels.push(await checkReport(`model candidate ${i}`, c, nonce));
  say(`verification of ${candidates.length + 1} quotes and GPU evidence: ${ms(t)}`);
  for (const c of [gateway, ...checkedModels]) {
    say(
      `  ${c.label} ${c.signingAddress}: tdx ${c.tdx}${c.tcbStatus ? ` (${c.tcbStatus})` : ""}, gpu ${c.gpu}${c.gpuNote ? ` (${c.gpuNote})` : ""}${c.failures.length ? `; failures: ${c.failures.join("; ")}` : ""}${c.composeHash ? `; compose ${c.composeHash.slice(0, 16)}` : ""}`,
    );
  }
  const verifiedModels = checkedModels.filter((c) => c.tdx === "ok" && c.gpu === "ok");

  // 3. One completion, exact bytes kept.
  const salt = randomBytes(32).toString("hex");
  const reqBody = Buffer.from(
    JSON.stringify({
      model,
      messages: [
        { role: "system", content: `Session ${salt}. Answer with one JSON object.` },
        { role: "user", content: 'Reply with {"ok": true}.' },
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 64,
      response_format: {
        type: "json_schema",
        json_schema: { name: "probe", strict: true, schema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } } },
      },
    }),
  );
  t = performance.now();
  const comp = await post(`${BASE}/chat/completions`, reqBody, { "x-no-aliasing": "true" });
  const compMs = ms(t);
  save("completion-request.json", reqBody);
  save("completion-response.json", comp.bytes);
  let content = "";
  let sigCheck: SigCheck | undefined;
  let noCompletion: string | undefined;
  if (comp.status !== 200) {
    // NEAR AI names the error type (402 `no_limit_configured` means the account has no credits or spending limit).
    let kind = "";
    try {
      kind = String(((JSON.parse(comp.bytes.toString("utf8")) as Json).error as Json | undefined)?.type ?? "");
    } catch {
      kind = "";
    }
    noCompletion = `HTTP ${comp.status}${kind ? ` ${kind}` : ""}`;
    say(`completion: ${noCompletion} in ${compMs}`);
  } else {
    const compJson = JSON.parse(comp.bytes.toString("utf8")) as { id: string; model: string; choices: Array<{ message: Json }>; usage: Json };
    content = String(compJson.choices[0]?.message.content ?? "");
    say(`completion ${compJson.id} in ${compMs}: ${content.trim().slice(0, 80)} (usage ${JSON.stringify(compJson.usage)})`);

    // 4. Signature.
    t = performance.now();
    sigCheck = await checkSignature(compJson.id, model, reqBody, comp.bytes, verifiedModels);
    say(`signature: ${sigCheck.ok ? "verified" : "failed"} in ${ms(t)}${sigCheck.kind ? `, kind ${sigCheck.kind}` : ""}${sigCheck.signer ? `, signer ${sigCheck.signer}` : ""}${sigCheck.note ? `, ${sigCheck.note}` : ""}`);
  }

  // 5. End-to-end encryption with the verified model key (secp256k1 scheme, matches the ECDSA report).
  let e2ee = noCompletion
    ? `not checked: completions are refused (${noCompletion}); a verified candidate ${verifiedModels.some((c) => c.signingPublicKey) ? "does" : "does not"} publish a secp256k1 signing_public_key that hashes to its attested address`
    : "not checked: no verified candidate exposes signing_public_key";
  const e2eeTarget = noCompletion ? undefined : verifiedModels.find((c) => c.signingPublicKey);
  if (e2eeTarget?.signingPublicKey) {
    const clientSecret = secp256k1.utils.randomPrivateKey();
    const clientPub = hex(secp256k1.getPublicKey(clientSecret, false));
    const encBody = Buffer.from(
      JSON.stringify({
        model,
        messages: [
          { role: "system", content: e2eeEncrypt(`Session ${randomBytes(32).toString("hex")}. Answer with one JSON object.`, e2eeTarget.signingPublicKey) },
          { role: "user", content: e2eeEncrypt('Reply with {"ok": true}.', e2eeTarget.signingPublicKey) },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: 64,
        response_format: {
          type: "json_schema",
          json_schema: { name: "probe", strict: true, schema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } } },
        },
      }),
    );
    t = performance.now();
    const enc = await post(`${BASE}/chat/completions`, encBody, {
      "x-no-aliasing": "true",
      "X-Signing-Algo": "ecdsa",
      "X-Client-Pub-Key": clientPub,
      "X-Model-Pub-Key": e2eeTarget.signingPublicKey,
    });
    const encMs = ms(t);
    save("e2ee-response.json", enc.bytes);
    if (enc.status !== 200) {
      e2ee = `not usable: HTTP ${enc.status} ${enc.bytes.toString("utf8").slice(0, 200)}`;
    } else {
      const encJson = JSON.parse(enc.bytes.toString("utf8")) as { id: string; choices: Array<{ message: Json }> };
      const encContent = String(encJson.choices[0]?.message.content ?? "");
      let plain: string;
      try {
        plain = e2eeDecrypt(encContent, clientSecret).trim();
      } catch (e) {
        plain = `(could not decrypt: ${(e as Error).message}; raw ${encContent.slice(0, 60)})`;
      }
      const encSig = await checkSignature(encJson.id, model, encBody, enc.bytes, verifiedModels);
      e2ee = `HTTP 200 in ${encMs}; content ${/^[0-9a-f]+$/i.test(encContent) ? "encrypted" : "PLAINTEXT"}, decrypts to ${plain.slice(0, 60)}; signature ${encSig.ok ? "verified (provider_tee, verified signer)" : `failed: ${encSig.note}`}`;
    }
  }
  say(`e2ee: ${e2ee}`);

  // Summary: ok only for what ran and passed.
  const all = [gateway, ...checkedModels];
  const parts: string[] = [];
  const mark = (name: string, ok: boolean, why?: string): void => {
    parts.push(ok ? `${name} ok` : `${name} FAILED${why ? ` (${why})` : ""}`);
  };
  mark("completion", comp.status === 200 && content.length > 0, noCompletion);
  if (sigCheck) {
    mark("signature", sigCheck.ok, sigCheck.note);
    const signer = sigCheck.signer?.toLowerCase();
    mark("signer is a verified model key", sigCheck.ok && verifiedModels.some((c) => c.signingAddress.toLowerCase() === signer));
  } else {
    parts.push("signature not checked (no completion)", "signer not checked (no completion)");
  }
  mark("gateway tdx", gateway.tdx === "ok", gateway.failures.join("; "));
  mark("model tdx", checkedModels.length > 0 && checkedModels.every((c) => c.tdx === "ok"), checkedModels.flatMap((c) => c.failures).join("; "));
  const gpuAll = checkedModels.length > 0 && checkedModels.every((c) => c.gpu === "ok");
  if (checkedModels.some((c) => c.gpu === "absent")) parts.push("gpu not checked (no nvidia_payload in a candidate)");
  else mark("gpu", gpuAll);
  mark("nonce bound", all.every((c) => !c.failures.some((f) => f.includes("nonce") || f.includes("report_data"))) && all.every((c) => c.tdx === "ok"));
  say(parts.join(" · "));
  say(`total ${ms(t0)}`);
  save("probe-output.txt", `${lines.join("\n")}\n`);
  const failed = parts.some((p) => p.includes("FAILED") || p.includes("not checked"));
  process.exit(failed ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(`probe-ai: ${(e as Error).message}`);
  process.exit(1);
});
