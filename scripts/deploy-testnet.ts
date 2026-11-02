// `make deploy-testnet` (PROGRESS 2.7): the factory, its keyless releases account, the jobs' pubkey runs through it,
// and release <n>. Testnet only; every step prints the ids it touched. Steps already done are skipped.
//
//   RELEASE_MODE=embedded|global (default embedded)   RELEASE_VERSION=<n> (default 1)
//   OUTLAYER_OWNER=<account>   TASK_IDS=<sealed,payee,observer> (the pubkey runs' attestation task ids)

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

const provider = new JsonRpcProvider({ url: RPC });
const factory = new Account(FACTORY, provider, new KeyPairSigner(KeyPair.fromString(need("FACTORY_KEY") as KeyPairString)));

async function view<T>(method: string, args: object = {}): Promise<T | null> {
  try {
    return (await provider.callFunction({ contractId: FACTORY, method, args: args as Record<string, unknown>, blockQuery: { finality: "final" } })) as T;
  } catch {
    return null;
  }
}

async function call(method: string, args: object, tgas = 100n, deposit = 0n) {
  const r = await factory.signAndSendTransaction({
    receiverId: FACTORY, actions: [actions.functionCall(method, args, tgas * TGAS, deposit)], waitUntil: "FINAL",
  });
  console.log(`  ${method.padEnd(18)} tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
  return r;
}

async function main() {
  console.log(`accord deploy-testnet · ${FACTORY} · release ${VERSION} (${MODE.toLowerCase()})`);
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
  }

  const pending = await view<Record<string, unknown>>("pending_pubkeys");
  const missing = ["sealed_table", "payee", "observer"].filter((j) => !pending?.[j]);
  if (missing.length && !(await view("release", { version: VERSION }))) {
    const owner = need("OUTLAYER_OWNER");
    const hashes = Object.fromEntries(["sealed-table", "observer", "payee"].map((j) => {
      const file = `${repoRoot()}/target/wasm32-wasip2/release/accord-${j}.wasm`;
      return [j, sha256(readFileSync(file)).toString("hex")];
    }));
    await call("request_pubkeys", {
      sealed_table: { project: `${owner}/accord-sealed-table`, version_key: hashes["sealed-table"] },
      payee: { project: `${owner}/accord-payee`, version_key: hashes.payee },
      observer: { project: `${owner}/accord-observer`, version_key: hashes.observer },
    }, 300n);
    console.log("  pubkeys           requested through the releases account; run again once all three are stored");
    return;
  }

  if (!(await view("release", { version: VERSION }))) {
    const code = wasm("agreement");
    const hash = baseEncode(sha256(code));
    if (MODE === "Global") {
      const r = await factory.signAndSendTransaction({
        receiverId: FACTORY, actions: [actions.deployGlobalContract(code, "codeHash")], waitUntil: "FINAL",
      });
      console.log(`  global contract   ${hash} · tx ${(r as { transaction: { hash: string } }).transaction.hash}`);
    }
    const [sealedTask, payeeTask, observerTask] = need("TASK_IDS").split(",").map(Number);
    await call("publish_release", {
      version: VERSION, mode: MODE, code_hash: hash, code: MODE === "Embedded" ? code.toString("base64") : null,
      task_ids: { sealed_table: sealedTask, payee: payeeTask, observer: observerTask },
      model: env.ACCORD_MODEL || "z-ai/glm-5.3-flash",
    }, 300n);
  }
  await call("set_current_release", { version: VERSION });
  console.log(`deploy-testnet: release ${VERSION} current on ${FACTORY}`);
}

main().catch((e) => { console.error(`deploy-testnet: ${(e as Error).message}`); process.exit(1); });
