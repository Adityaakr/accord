// The demo agent's record (src/agentlog.ts) on the JSON file backend: written before the agent signs, finished with
// what came back, read back per room oldest first, and capped per room.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("agent actions (file store)", () => {
  let s: typeof import("../src/index.js");
  const dir = mkdtempSync(path.join(tmpdir(), "accord-agentlog-"));
  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    process.env.ACCORD_STORE_FILE = path.join(dir, "store.json");
    vi.resetModules();
    s = await import("../src/index.js");
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("records the instruction and intent before signing, then the outcome", async () => {
    const intent = { item: 1, amount: "12000000", recipient: "halcyon-mm.testnet" };
    const id = await s.agentActions.begin({ agreement: "a1.test", trigger: "auto", instruction: "Item 1 is eligible.", intent });
    let [r] = await s.agentActions.list("a1.test");
    expect(r).toMatchObject({ id, trigger: "auto", instruction: "Item 1 is eligible.", intent, outcome: "sending", tx_hash: null });
    await s.agentActions.finish(id, { outcome: "sent", tx_hash: "TX1" });
    [r] = await s.agentActions.list("a1.test");
    expect(r).toMatchObject({ outcome: "sent", tx_hash: "TX1", code: null });
  });

  it("keeps rooms apart and reads oldest first", async () => {
    const intent = { item: 2, amount: "1", recipient: "x.testnet" };
    await s.agentActions.begin({ agreement: "a2.test", trigger: "attack", instruction: "first", intent });
    await s.agentActions.begin({ agreement: "a2.test", trigger: "pay", instruction: "second", intent });
    expect((await s.agentActions.list("a2.test")).map((r) => r.instruction)).toEqual(["first", "second"]);
    expect((await s.agentActions.list("a1.test")).length).toBe(1);
    expect((await s.agentActions.list("a2.test", 1)).map((r) => r.instruction)).toEqual(["second"]);
  });

  it("caps an instruction at 500 characters", async () => {
    await s.agentActions.begin({ agreement: "a3.test", trigger: "pay", instruction: "x".repeat(900), intent: { item: 1, amount: "1", recipient: "r" } });
    expect((await s.agentActions.list("a3.test"))[0]!.instruction.length).toBe(500);
  });
});
