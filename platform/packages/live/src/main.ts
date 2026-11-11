// `make <target>`: one live target from INTERFACES.md section 10 against `NET=local` (the node `make serve` keeps
// up) or testnet. Each target that uses up items creates its own agreement.

import { world } from "./world.js";

type Run = (w: ReturnType<typeof world>) => Promise<void>;
const step = (name: "approve" | "fund" | "payee" | "pay" | "exception" | "claim" | "payeeChange") =>
  async () => ({ run: (await import("./targets/steps.js"))[name] as Run });

const TARGETS: Record<string, () => Promise<{ run: Run }>> = {
  negotiate: () => import("./targets/negotiate.js"),
  attack: () => import("./targets/attack.js"),
  revoke: () => import("./targets/revoke.js"),
  "market-making": () => import("./targets/market-making.js"),
  demo: () => import("./targets/demo.js"),
  tender: () => import("./targets/tender.js"),
  finish: () => import("./targets/finish.js"),
  "dispute-close": () => import("./targets/dispute-close.js"),
  cancel: () => import("./targets/cancel.js"),
  close: () => import("./targets/close.js"),
  inbox: () => import("./targets/inbox.js"),
  measure: () => import("./targets/measure.js"),
  approve: step("approve"),
  fund: step("fund"),
  payee: step("payee"),
  pay: step("pay"),
  exception: step("exception"),
  claim: step("claim"),
  "payee-change": step("payeeChange"),
};

// `atlas` is the retired name of `market-making` (8 Nov 2026), kept as a hidden alias for recorded runs.
const ALIASES: Record<string, string> = { atlas: "market-making" };
const arg = process.argv[2] ?? "";
const name = ALIASES[arg] ?? arg;
const load = TARGETS[name];
if (!load) {
  console.error(`usage: make <${Object.keys(TARGETS).join("|")}> [NET=local]`);
  process.exit(2);
}
try {
  await (await load()).run(world());
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exitCode = 1;
}
