// `make deploy-testnet` (PROGRESS 2.7): the factory, its keyless releases account, the jobs' pubkey runs through it,
// and release <n>. Testnet only; every step prints the ids it touched. Steps already done are skipped.
//
//   RELEASE_MODE=embedded|global (default embedded)   RELEASE_VERSION=<n> (default 1)
//   OUTLAYER_OWNER=<account>   TASK_IDS=<sealed,payee,observer> (the pubkey runs' attestation task ids)
//   RELEASE_FROM=<factory>   publish the same release as that factory's release <n> on this factory: the same agreement
//                            code hash (the global contract is not published again), the same job builds and model;
//                            only the pubkey runs are new, because they go through this factory's releases account.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, baseEncode, type KeyPairString } from "near-api-js";
import { loadEnv, repoRoot } from "../services/agent/src/config.ts";

loadEnv();
const env = process.env;
const need = (k: string) => env[k] || (() => { throw new Error(`set ${k} in .env`); })();
if ((env.NEAR_NETWORK ?? "testnet") !== "testnet") throw new Error("deploy-testnet signs on testnet only");

const RPC = env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";
const FACTORY = need("ACCORD_FACTORY");
const USDC = env.ACCORD_TOKEN || "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
const MODE = (env.RELEASE_MODE ?? "embedded") === "global" ? "Global" : "Embedded";
const VERSION = Number(env.RELEASE_VERSION ?? 1);
const TGAS = 1_000_000_000_000n;
const wasm = (n: string) => readFileSync(`${repoRoot()}/target/wasm/${n}.wasm`);
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest();
const FROM = env.RELEASE_FROM || "";

const provider = new JsonRpcProvider({ url: RPC });
const factory = new Account(FACTORY, provider, new KeyPairSigner(KeyPair.fromString(need("FACTORY_KEY") as KeyPairString)));

async function viewOn<T>(contractId: string, method: string, args: object = {}): Promise<T | null> {
  try {
    return (await provider.callFunction({ contractId, method, args: args as Record<string, unknown>, blockQuery: { finality: "final" } })) as T;
  } catch {
    return null;
  }
}
const view = <T>(method: string, args: object = {}) => viewOn<T>(FACTORY, method, args);

interface SourceJob { project: string; wasm_hash: string }
interface SourceRelease { code_hash: string; model: string; sealed_table: SourceJob; payee: SourceJob; observer: SourceJob }

/** Whether a global contract with this code hash is already on chain (NEP-591), so it is not published again. */
async function globalExists(codeHash: string): Promise<boolean> {
  try {
    await provider.query({ request_type: "view_global_contract_code", code_hash: codeHash, finality: "final" } as never);
    return true;
  } catch {
    return false;
  }
}

/** OutLayer's request ids (the attestation task ids) in a transaction's logs. */
function requestIds(r: unknown): number[] {
  const outcomes = (r as { receipts_outcome?: { outcome: { logs: string[] } }[] }).receipts_outcome ?? [];
  const ids = outcomes.flatMap((o) => o.outcome.logs).flatMap((l) => [...l.matchAll(/request_id\\?"\s*:\s*(\d+)/g)].map((m) => Number(m[1])));
  return [...new Set(ids)];
}

async function call(method: string, args: object, tgas = 100n, deposit = 0n) {
  const r = await factory.signAndSendTransaction({
    receiverId: FACTORY, actions: [actions.functionCall(method, args, tgas * TGAS, deposit)], waitUntil: "FINAL",
  });
  console.log(`  ${method.padEnd(18)} tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
  return r;
}

async function main() {
  console.log(`accord deploy-testnet · ${FACTORY} · release ${VERSION} (${MODE.toLowerCase()})${FROM ? ` · same as ${FROM} release ${VERSION}` : ""}`);
  const source = FROM ? await viewOn<SourceRelease>(FROM, "release", { version: VERSION }) : null;
  if (FROM && !source) throw new Error(`${FROM} has no release ${VERSION}`);
  const config = await view<{ owner: string }>("config");
  if (!config) {
    const r = await factory.signAndSendTransaction({
      receiverId: FACTORY,
      actions: [
        actions.deployContract(wasm("factory")),
        actions.functionCall("new", {
          config: {
            owner: FACTORY, token: USDC, outlayer: "outlayer.testnet", keeper: need("KEEPER_ACCOUNT"),
            create_deposit: MODE === "Global" ? "2000000000000000000000000" : "7000000000000000000000000", demo_allowed: true,
          },
          releases_code: Buffer.from(wasm("releases")).toString("base64"),
        }, 300n * TGAS, 0n),
      ],
      waitUntil: "FINAL",
    });
    console.log(`  factory           deployed and initialised · tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
    console.log(`  releases          releases.${FACTORY} (no key)`);
  } else {
    console.log(`  factory           already initialised · owner ${config.owner}`);
    // redeploy the factory's code (state kept) when the local build differs from what is on chain
    const acct = (await provider.query({ request_type: "view_account", account_id: FACTORY, finality: "final" })) as unknown as { code_hash: string };
    const local = baseEncode(sha256(wasm("factory")));
    if (acct.code_hash !== local) {
      const r = await factory.signAndSendTransaction({ receiverId: FACTORY, actions: [actions.deployContract(wasm("factory"))], waitUntil: "FINAL" });
      console.log(`  factory           code updated ${acct.code_hash.slice(0, 8)}… → ${local.slice(0, 8)}… · tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
    }
  }

  const pending = await view<Record<string, unknown>>("pending_pubkeys");
  const missing = ["sealed_table", "payee", "observer"].filter((j) => !pending?.[j]);
  if (missing.length && !(await view("release", { version: VERSION }))) {
    let projects: Record<string, { project: string; version_key: string }>;
    if (source) {
      const of = (j: SourceJob) => ({ project: j.project, version_key: j.wasm_hash });
      projects = { sealed_table: of(source.sealed_table), payee: of(source.payee), observer: of(source.observer) };
    } else {
      const owner = need("OUTLAYER_OWNER");
      const hashes = Object.fromEntries(["sealed-table", "observer", "payee"].map((j) => {
        const file = `${repoRoot()}/target/wasm32-wasip2/release/accord-${j}.wasm`;
        return [j, sha256(readFileSync(file)).toString("hex")];
      }));
      projects = {
        sealed_table: { project: `${owner}/accord-sealed-table`, version_key: hashes["sealed-table"] },
        payee: { project: `${owner}/accord-payee`, version_key: hashes.payee },
        observer: { project: `${owner}/accord-observer`, version_key: hashes.observer },
      };
    }
    // one job per transaction: each releases call needs ~190 Tgas (OutLayer request plus callback)
    for (const job of missing) {
      const r = await call("request_pubkey", { job, project: projects[job] }, 300n);
      const ids = requestIds(r);
      if (ids.length) console.log(`  ${job.padEnd(18)} task id ${ids.join(",")}`);
    }
    console.log("  pubkeys           requested through the releases account; run again once all three are stored");
    return;
  }

  if (!(await view("release", { version: VERSION }))) {
    const code = wasm("agreement");
    const hash = source ? source.code_hash : baseEncode(sha256(code));
    if (source && MODE !== "Global") throw new Error("RELEASE_FROM reuses a global contract: set RELEASE_MODE=global");
    // A later release with unchanged agreement code reuses the global contract an earlier release published
    // (publishing it again costs about 50 NEAR for nothing).
    const earlier = VERSION > 1 ? await view<{ code_hash: string }>("release", { version: VERSION - 1 }) : null;
    if (MODE === "Global" && earlier?.code_hash === hash) {
      console.log(`  global contract   ${hash} · already published by release ${VERSION - 1}`);
    } else if (MODE === "Global" && (await globalExists(hash))) {
      console.log(`  global contract   ${hash} · already on chain${source ? ` (${FROM} release ${VERSION})` : ""}`);
    } else if (source) {
      throw new Error(`global contract ${hash} is not on chain`);
    } else if (MODE === "Global") {
      const r = await factory.signAndSendTransaction({
        receiverId: FACTORY, actions: [actions.deployGlobalContract(code, "codeHash")], waitUntil: "FINAL",
      });
      console.log(`  global contract   ${hash} · tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
    }
    const [sealedTask, payeeTask, observerTask] = need("TASK_IDS").split(",").map(Number);
    await call("publish_release", {
      version: VERSION, mode: MODE, code_hash: hash, code: MODE === "Embedded" ? code.toString("base64") : null,
      task_ids: { sealed_table: sealedTask, payee: payeeTask, observer: observerTask },
      model: source?.model || env.ACCORD_MODEL || "z-ai/glm-5.3-flash",
    }, 300n);
  }
  await call("set_current_release", { version: VERSION });
  console.log(`deploy-testnet: release ${VERSION} current on ${FACTORY}`);
}

main().catch((e) => { console.error(`deploy-testnet: ${(e as Error).message}`); process.exit(1); });
