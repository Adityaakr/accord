// Why a room ended No deal (src/lib/nodeal.ts). The OutLayer lines are copied from a102.accord-v2.testnet's third
// attempt on 22 Nov 2026 (tx 4FqBXLF85jhX47wuq5phhLMtgp6Cb68jADNNcSTdaits, FastNEAR's /v0/transactions), which the
// room page described as "the enclave did not answer in time" and the demo panel as "the buyer's ceiling was below
// the vendor's floor"; neither was what happened.
import { describe, expect, it } from "vitest";
import type { RawTx } from "../src/lib/activity";
import { attemptFailures, isStorageUnpaid, noDealCause, noDealLine } from "../src/lib/nodeal";

const ROOM = "a102.accord-v2.testnet";
const OL = "outlayer.testnet";
const UNPAID = "output_storage_unpaid: the output is 7043 bytes and needs 70430000000000000000000 yoctoNEAR held for its storage; the payment had 44702776900000000000000 left after the run's cost. Attach more NEAR to request_execution: the rest is refunded";
const ev = (event: string, data: object) => `EVENT_JSON:${JSON.stringify({ standard: "accord", version: "1.0.0", event, data: [data] })}`;

function attempt(n: number, outlayerLog: string | null, reason = "no signed output", last = false): RawTx {
  const receipt = (id: string, executor: string, logs: string[]) => ({ id, executor, predecessor: null, logs, timestampNs: null, block: null });
  return {
    hash: `tx${n}`, signer: "halcyon-demo.testnet", realSigner: "halcyon-demo.testnet", timestampNs: String(n), block: n,
    receipts: [
      receipt(`r${n}a`, ROOM, [ev("negotiation_requested", { request_nonce: "d220", attempt: n })]),
      receipt(`r${n}b`, OL, outlayerLog ? ['[[yNEAR charged: "5297223100000000000000"]]', outlayerLog] : []),
      receipt(`r${n}c`, ROOM, [ev("negotiation_failed", { attempt: n, reason }), ...(last ? [ev("no_deal", { reason: "INFRASTRUCTURE" })] : [])]),
    ],
  };
}

const failedLog = `Execution failed: ${JSON.stringify(UNPAID)}. Resources: { instructions: 1231664314, time_ms: 42971 }. Refunded 44702776900000000000000 yoctoNEAR`;

describe("no-deal cause", () => {
  it("names OutLayer's output_storage_unpaid refusal on a102, not lateness or the limits", () => {
    const txs = [attempt(3, failedLog, undefined, true), attempt(1, failedLog), attempt(2, failedLog)];
    const c = noDealCause(null, txs, ROOM, OL);
    expect(c.kind).toBe("outlayer_error");
    expect(c.message).toBe(UNPAID);
    expect(c.attempts.map((a) => [a.attempt, a.kind])).toEqual([[1, "outlayer_error"], [2, "outlayer_error"], [3, "outlayer_error"]]);
    expect(isStorageUnpaid(c)).toBe(true);
    const line = noDealLine(c, 6);
    expect(line).toContain("output_storage_unpaid");
    expect(line).not.toMatch(/ceiling|in time|late/);
  });

  it("blames the old 0.05 NEAR deposit only for a room released before the fix", () => {
    const c = noDealCause(null, [attempt(1, failedLog, undefined, true)], ROOM, OL);
    // a102 is a release 6 room (DECISIONS.md section 38): its 0.05 NEAR left 0.0447 NEAR for a 0.0704 NEAR hold
    expect(noDealLine(c, 6)).toContain("release (6) attaches 0.05 NEAR");
    expect(noDealLine(c, 6)).toContain("on release 7");
    const now = noDealLine(c, 7);
    expect(now).toContain(UNPAID);
    expect(now).not.toMatch(/0\.05|release 7|release \(7\)/);
  });

  it("is late only when OutLayer logged that the yield ended first", () => {
    const c = noDealCause(null, [attempt(1, "Execution promise failed: Failed. Refunded 49000000000000000000000 yoctoNEAR", undefined, true)], ROOM, OL);
    expect(c.kind).toBe("late");
    expect(noDealLine(c, 7)).toContain("after NEAR's wait");
  });

  it("is the contract's refusal when an answer arrived and did not verify", () => {
    const c = noDealCause(null, [attempt(1, null, "bad signature", true)], ROOM, OL);
    expect(c).toMatchObject({ kind: "rejected", message: "bad signature" });
  });

  it("says unknown, never a guess, when the transactions could not be read or carry no OutLayer line", () => {
    expect(noDealCause(null, null, ROOM, OL).kind).toBe("unknown");
    expect(noDealCause(null, [attempt(1, null)], ROOM, OL).kind).toBe("unknown");
    expect(noDealLine(noDealCause(null, null, ROOM, OL), 7)).not.toMatch(/ceiling|in time|late/);
  });

  it("reads the Sealed Table's own signed reason when it answered with a no-deal", () => {
    expect(noDealCause(JSON.stringify({ outcome: "no_deal", no_deal_reason: "LIMIT_CHECK" }), null, ROOM, OL).kind).toBe("limits");
    expect(noDealLine(noDealCause(JSON.stringify({ outcome: "no_deal", no_deal_reason: "LIMIT_CHECK" }), null, ROOM, OL), 7, "USDC")).toContain("at least 12 USDC");
    expect(noDealCause(JSON.stringify({ outcome: "no_deal", no_deal_reason: "WALK_AWAY" }), null, ROOM, OL).kind).toBe("walk_away");
  });

  it("ignores another agreement's events and other contracts' logs", () => {
    const other = attempt(1, failedLog, undefined, true);
    expect(attemptFailures([other], "a9.accord-v2.testnet", OL)).toEqual([]);
    expect(attemptFailures([other], ROOM, "someone-else.testnet")[0]?.kind).toBe("unknown");
  });
});
