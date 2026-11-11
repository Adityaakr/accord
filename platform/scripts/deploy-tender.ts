// `make deploy-tender`: the open tender board on testnet, as a sub-account of the factory account with no access key
// (create, fund, deploy and initialise in one transaction, no AddKey), so nobody can change its code or state outside
// its own methods. A fix ships as a new account (TENDER_BOARD=<name>). Testnet only.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import { loadEnv, repoRoot } from "../services/agent/src/config.ts";

loadEnv();
const env = process.env;
const need = (k: string) => env[k] || (() => { throw new Error(`set ${k} in .env`); })();
if ((env.NEAR_NETWORK ?? "testnet") !== "testnet") throw new Error("deploy-tender signs on testnet only");

const RPC = env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";
const FACTORY = need("ACCORD_FACTORY");
const BOARD = env.TENDER_BOARD || `tender.${FACTORY}`;
if (!BOARD.endsWith(`.${FACTORY}`)) throw new Error(`TENDER_BOARD must be a sub-account of ${FACTORY}`);
const provider = new JsonRpcProvider({ url: RPC });
const factory = new Account(FACTORY, provider, new KeyPairSigner(KeyPair.fromString(need("FACTORY_KEY") as KeyPairString)));
const code = readFileSync(`${repoRoot()}/target/wasm/tender-board.wasm`);

const exists = await provider.viewAccount({ accountId: BOARD }).then(() => true, () => false);
if (exists) {
  console.log(`deploy-tender: ${BOARD} already exists; nothing to do (a new build needs a new TENDER_BOARD name)`);
} else {
  const r = await factory.signAndSendTransaction({
    receiverId: BOARD,
    actions: [
      actions.createAccount(),
      actions.transfer(3_000_000_000_000_000_000_000_000n),
      actions.deployContract(code),
      actions.functionCall("new", { factory: FACTORY }, 30_000_000_000_000n, 0n),
    ],
    waitUntil: "FINAL",
  });
  const tx = (r as { transaction: { hash: string } }).transaction.hash;
  console.log(`deploy-tender: ${BOARD} created with no access key, tx ${tx}`);
}
const sha = createHash("sha256").update(code).digest("hex");
const keys = await provider.viewAccessKeyList({ accountId: BOARD }).catch(() => ({ keys: [] as unknown[] }));
console.log(`  code sha256 (local build) ${sha}`);
console.log(`  access keys on ${BOARD}: ${(keys as { keys: unknown[] }).keys.length}`);
console.log(`  factory: ${await provider.callFunction({ contractId: BOARD, method: "get_factory", args: {} })}`);
