// `make check-deploy`: the release wasm has no `mock` symbols, its sha256 equals the factory's current release hash,
// the three enclave job builds made here equal the release's job hashes, the NEAR each OutLayer run is sent still
// covers OutLayer's live estimate for the largest output the agreement accepts, and every live agreement account
// runs its pinned release. Read-only.
//   check-deploy: release <v> · wasm <8>… · jobs match · deposits cover OutLayer · no mock or F1 symbols · <n> agreements match

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { baseEncode } from "near-api-js";
import { Accord } from "../packages/sdk/src/index.ts";
import { loadEnv, repoRoot } from "../services/agent/src/config.ts";

loadEnv();
// `submit_sealed_result` is fallback F1 (cargo feature `f1`), not in use and never deployed: with S1 not enforced a
// keeper could request its own run for the live nonce and submit the outcome it prefers.
const MOCK_SYMBOLS = ["submit_mock_negotiation", "submit_mock_payee", "submit_mock_pubkey", "submit_sealed_result", "[mock]"];

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
    console.log(`check-deploy: wasm ${hash.slice(0, 8)}… · no mock or F1 symbols · no factory configured, nothing on chain checked`);
    return;
  }
  const accord = new Accord({ network: "testnet", factory, rpc: process.env.NEAR_RPC_URL });
  const config = await accord.config().catch(() => null);
  const release = await accord.release().catch((e: Error) => {
    if (/does not exist/.test(e.message)) {
      console.log(`check-deploy: wasm ${hash.slice(0, 8)}… · no mock or F1 symbols · ${factory} not deployed yet (make deploy-testnet)`);
      process.exit(0);
    }
    throw e;
  });
  if (release.code_hash !== hash) throw new Error(`target/wasm/agreement.wasm ${hash} ≠ release ${release.version} ${release.code_hash}`);
  const jobs = jobsMatch(release);
  const deposits = await depositsCover(accord, config?.outlayer ?? "outlayer.testnet");
  const records = await accord.listAgreements({ limit: 100 });
  let matched = 0;
  for (const r of records) {
    const pinned = await accord.release(r.release);
    const acct = await accord.chain.account(r.account);
    const running = acct.global_contract_hash ?? acct.code_hash;
    if (running !== pinned.code_hash) throw new Error(`${r.account} runs ${running}, release ${r.release} is ${pinned.code_hash}`);
    matched++;
  }
  console.log(`check-deploy: release ${release.version} · wasm ${hash.slice(0, 8)}… · ${jobs} · ${deposits} · no mock or F1 symbols · ${matched} agreements match`);
}

/** The job builds in target/ (make jobs) are byte for byte the release's: the source here is what OutLayer runs. */
function jobsMatch(release: { version: number } & Record<"sealed_table" | "payee" | "observer", { wasm_hash: string }>): string {
  for (const [job, file] of [["sealed_table", "sealed-table"], ["payee", "payee"], ["observer", "observer"]] as const) {
    const bytes = readFileSync(`${repoRoot()}/target/wasm32-wasip2/release/accord-${file}.wasm`);
    const local = createHash("sha256").update(bytes).digest("hex");
    if (local !== release[job].wasm_hash) throw new Error(`accord-${file}.wasm ${local.slice(0, 8)}… ≠ release ${release.version} ${job} ${release[job].wasm_hash.slice(0, 8)}…`);
  }
  return "jobs match";
}

interface DepositFixture { max_output: number; jobs: Record<string, { max_instructions: number; max_execution_seconds: number; deposit: string }> }

/**
 * Each deposit (fixtures/outlayer-deposits.json, which a unit test ties to the compiled constants) is at least what
 * OutLayer's `estimate_execution_cost` asks today for the job's limits and an output of `max_output` bytes, the largest
 * the agreement reads. A price rise past the margin fails here, before a release that OutLayer would refuse.
 */
async function depositsCover(accord: Accord, outlayer: string): Promise<string> {
  const f = JSON.parse(readFileSync(`${repoRoot()}/fixtures/outlayer-deposits.json`, "utf8")) as DepositFixture;
  const near = (y: bigint) => (Number(y / 10n ** 18n) / 1e6).toFixed(4);
  const parts: string[] = [];
  for (const [job, j] of Object.entries(f.jobs)) {
    const estimate = BigInt(await accord.chain.view<string>(outlayer, "estimate_execution_cost", {
      resource_limits: { max_instructions: j.max_instructions, max_execution_seconds: j.max_execution_seconds },
      output_len: f.max_output,
    }));
    const deposit = BigInt(j.deposit);
    if (deposit < estimate) throw new Error(`${job} attaches ${near(deposit)} NEAR; ${outlayer} now asks ${near(estimate)} NEAR for a ${f.max_output}-byte output`);
    parts.push(`${job.replace("_", " ")} ${near(deposit)} ≥ ${near(estimate)} NEAR`);
  }
  return `deposits cover OutLayer (${parts.join(", ")})`;
}

main().catch((e) => { console.error(`check-deploy: ${(e as Error).message}`); process.exit(1); });
