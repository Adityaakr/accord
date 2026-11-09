// /api/relay answers with a hash within about 10 s and the page polls /api/relay/status until the call is final
// (src/server/delegate.ts readRelayed, src/components/wallet/relayClient.ts). The caller still gets one promise and
// the same outcome: the user's own call as its status, a contract refusal kept as the outcome's failure, and a
// failure of the relayer's own transaction (a deleted key) thrown with nearcore's words.
import { describe, expect, it } from "vitest";
import { toTxResult } from "@accord/sdk";
import { delegateReceiver, isUnknownTx, outerFailureMessage, readRelayed, type RelayedTx } from "../src/server/delegate";
import { relayAndWait } from "../src/components/wallet/relayClient";

const RELAYER = "relay.accord-v2.testnet";
const SENDER = "74dd2de2028f81e48b89861e5d6ac5450c3e3b2969c88116cec6732ff5146087";
const ROOM = "a40.accord-v2.testnet";
const o = (id: string, executor_id: string, status: object, receipt_ids: string[] = [], logs: string[] = []) => ({ id, outcome: { executor_id, receipt_ids, status, logs, gas_burnt: 1 } });
const delegate = { Delegate: { delegate_action: { receiver_id: ROOM, sender_id: SENDER, actions: [] } } };

function relayed(inner: object, over: Partial<RelayedTx> = {}, outer: object = { SuccessValue: "" }): RelayedTx {
  return {
    final_execution_status: "FINAL",
    status: outer,
    transaction: { hash: "HASH1111111111111111111111111111111", signer_id: RELAYER, receiver_id: SENDER, actions: [delegate] },
    transaction_outcome: o("t", RELAYER, { SuccessReceiptId: "r1" }, ["r1"]),
    receipts_outcome: [o("r1", SENDER, { SuccessValue: "" }, ["r2"]), o("r2", ROOM, inner, [], ['EVENT_JSON:{"standard":"accord","event":"delivery_accepted","data":[{"item":1}]}'])],
    ...over,
  } as RelayedTx;
}
const who = { relayer: RELAYER, sender: SENDER };

describe("readRelayed", () => {
  it("keeps polling until the relayer's transaction is final", () => {
    expect(readRelayed({ ...relayed({ SuccessValue: "" }), final_execution_status: "INCLUDED" }, who)).toEqual({ final: false, status: "INCLUDED" });
    expect(readRelayed({ ...relayed({ SuccessValue: "" }), final_execution_status: "EXECUTED_OPTIMISTIC" }, who).final).toBe(false);
  });
  it("final: the user's own call is the outcome's status, which toTxResult reads as before", () => {
    const r = readRelayed(relayed({ SuccessValue: "" }), who);
    if (!r.final) throw new Error("expected final");
    const t = toTxResult(r.outcome);
    expect(t.ok).toBe(true);
    expect(t.events[0]?.event).toBe("delivery_accepted");
  });
  it("a contract refusal stays a failed outcome (not an error), as the waiting route returned it", () => {
    const r = readRelayed(relayed({ Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: ERR_NOT_BUYER" } } } } }), who);
    if (!r.final) throw new Error("expected final");
    const t = toTxResult(r.outcome);
    expect(t.ok).toBe(false);
    expect(t.failure).toMatch(/ERR_NOT_BUYER/);
  });
  it("a deleted or revoked key fails the relayer's own transaction: thrown with nearcore's words", () => {
    const fail = { ActionError: { index: 0, kind: { DelegateActionAccessKeyError: { AccessKeyNotFound: { account_id: SENDER, public_key: "ed25519:abc" } } } } };
    expect(() => readRelayed(relayed({ SuccessValue: "" }, {}, { Failure: fail }), who)).toThrow(/DelegateActionAccessKeyError.*AccessKeyNotFound/);
  });
  it("reports only this relayer's transactions for this sender", () => {
    expect(() => readRelayed(relayed({ SuccessValue: "" }), { relayer: RELAYER, sender: "mallory.testnet" })).toThrow(/not a relayed transaction/);
    expect(() => readRelayed(relayed({ SuccessValue: "" }), { relayer: "other.testnet", sender: SENDER })).toThrow(/not a relayed transaction/);
  });
  it("finds the delegate's receiver in the transaction", () => {
    expect(delegateReceiver(relayed({ SuccessValue: "" }))).toBe(ROOM);
  });
});

describe("outerFailureMessage and isUnknownTx", () => {
  it("names the error kind", () => {
    expect(outerFailureMessage({ ActionError: { kind: { DelegateActionInvalidNonce: { delegate_nonce: 1, ak_nonce: 2 } } } })).toMatch(/^DelegateActionInvalidNonce \{/);
    expect(outerFailureMessage({ ActionError: { kind: "DelegateActionExpired" } })).toBe("DelegateActionExpired");
    expect(outerFailureMessage({ InvalidTxError: { InvalidNonce: { tx_nonce: 1, ak_nonce: 2 } } })).toMatch(/^InvalidNonce/);
  });
  it("a hash the node has not seen yet is pending, not an error", () => {
    expect(isUnknownTx(Object.assign(new Error("Unknown transaction HASH"), { name: "UnknownTransactionError" }))).toBe(true);
    expect(isUnknownTx(new Error("AccessKeyDoesNotExist"))).toBe(false);
    expect(isUnknownTx(new Error("Smart contract panicked: ERR_NOT_BUYER"))).toBe(false);
  });
});

// A fake /api/relay and /api/relay/status, recording what the client asked.
function server(statuses: Array<{ status?: number; body: object } | "drop">, postReply: { status?: number; body: object } = { body: { hash: "HASH1111111111111111111111111111111", sender: SENDER, included: true } }) {
  const calls: string[] = [];
  const post = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url === "/api/relay") return Response.json(postReply.body, { status: postReply.status ?? 200 });
    const next = statuses.shift() ?? { body: { final: false, status: "INCLUDED" } };
    if (next === "drop") throw new TypeError("Failed to fetch");
    return Response.json(next.body, { status: next.status ?? 200 });
  }) as typeof fetch;
  return { post, calls };
}
const fast = { sleep: async () => undefined, busyWaits: [0, 0], pollWaits: [0] };

describe("relayAndWait", () => {
  it("posts once, polls until final, and resolves with the outcome", async () => {
    const outcome = readRelayed(relayed({ SuccessValue: "" }), who);
    if (!outcome.final) throw new Error("x");
    const s = server([{ body: { final: false, status: "UNKNOWN" } }, "drop", { status: 503, body: { busy: true, error: "busy" } }, { body: { final: false, status: "INCLUDED" } }, { body: { final: true, outcome: outcome.outcome } }]);
    const r = await relayAndWait("AAAA", { ...fast, post: s.post });
    expect(toTxResult(r).ok).toBe(true);
    expect(s.calls.filter((c) => c.startsWith("POST"))).toHaveLength(1);
    expect(s.calls.filter((c) => c.startsWith("GET"))).toHaveLength(5);
    expect(s.calls[1]).toBe(`GET /api/relay/status?hash=HASH1111111111111111111111111111111&sender=${SENDER}`);
  });
  it("a refusal by the relayer's policy is thrown at once, without polling", async () => {
    const s = server([], { status: 400, body: { error: "the relayer never carries act; the agent signs it with its own key" } });
    await expect(relayAndWait("AAAA", { ...fast, post: s.post })).rejects.toThrow(/never carries act/);
    expect(s.calls).toHaveLength(1);
  });
  it("an error from the status route (a deleted key) is thrown with its words", async () => {
    const s = server([{ status: 502, body: { error: 'DelegateActionAccessKeyError {"AccessKeyNotFound":{}}' } }]);
    await expect(relayAndWait("AAAA", { ...fast, post: s.post })).rejects.toThrow(/AccessKeyNotFound/);
  });
  it("gives up after its polling window with the hash named", async () => {
    let t = 0;
    const s = server([]);
    await expect(relayAndWait("AAAA", { ...fast, post: s.post, now: () => (t += 1000), maxPollMs: 5_000 })).rejects.toThrow(/sent \(tx HASH1+\) but is not final yet/);
  });
  it("still takes an outcome from a relayer that waits itself", async () => {
    const s = server([], { body: { outcome: { legacy: true } } });
    expect(await relayAndWait("AAAA", { ...fast, post: s.post })).toEqual({ legacy: true });
  });
});
