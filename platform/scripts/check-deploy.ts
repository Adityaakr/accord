// `make check-deploy`: the release wasm has no `mock` symbols, its sha256 equals the factory's current release hash,
// and every live agreement account runs its pinned release. Read-only.
//   check-deploy: release <v> · wasm <8>… · no mock symbols · <n> agreements match

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { baseEncode } from "near-api-js";
import { Accord } from "../packages/sdk/src/index.ts";
import { loadEnv, repoRoot } from "../services/agent/src/config.ts";

loadEnv();
const MOCK_SYMBOLS = ["submit_mock_negotiation", "submit_mock_payee", "submit_mock_pubkey", "[mock]"];

async function main() {
  const code = readFileSync(`${repoRoot()}/target/wasm/agreement.wasm`);
  const factoryCode = readFileSync(`${repoRoot()}/target/wasm/factory.wasm`);
  for (const [name, bytes] of [["agreement", code], ["factory", factoryCode]] as const) {
    const text = bytes.toString("latin1");
    const found = MOCK_SYMBOLS.filter((s) => text.includes(s));
    if (found.length) throw new Error(`${name}.wasm contains ${found.join(", ")}`);
  }
  const hash = baseEncode(createHash("sha256").update(code).digest());
  const factory = process.env.ACCORD_FACTORY;
  if (!factory) {
    console.log(`check-deploy: wasm ${hash.slice(0, 8)}… · no mock symbols · no factory configured, nothing on chain checked`);
    return;
  }
  const accord = new Accord({ network: "testnet", factory, rpc: process.env.NEAR_RPC_URL });
  const release = await accord.release().catch((e: Error) => {
    if (/does not exist/.test(e.message)) {
      console.log(`check-deploy: wasm ${hash.slice(0, 8)}… · no mock symbols · ${factory} not deployed yet (make deploy-testnet)`);
      process.exit(0);
    }
    throw e;
  });
  if (release.code_hash !== hash) throw new Error(`target/wasm/agreement.wasm ${hash} ≠ release ${release.version} ${release.code_hash}`);
  const records = await accord.listAgreements({ limit: 100 });
  let matched = 0;
  for (const r of records) {
    const pinned = await accord.release(r.release);
    const acct = await accord.chain.account(r.account);
    const running = acct.global_contract_hash ?? acct.code_hash;
    if (running !== pinned.code_hash) throw new Error(`${r.account} runs ${running}, release ${r.release} is ${pinned.code_hash}`);
    matched++;
  }
  console.log(`check-deploy: release ${release.version} · wasm ${hash.slice(0, 8)}… · no mock symbols · ${matched} agreements match`);
}

main().catch((e) => { console.error(`check-deploy: ${(e as Error).message}`); process.exit(1); });
