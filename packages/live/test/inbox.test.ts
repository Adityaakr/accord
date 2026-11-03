import { afterEach, describe, expect, it, vi } from "vitest";
import { inbox } from "../src/inbox.js";
import { line, usdc } from "../src/flow.js";
import type { World } from "../src/world.js";

const world = { attacker: "halcyon-markets.test.near", canaries: ["halcyon-mm-payments.test.near"] } as unknown as World;

describe("inbox fixtures", () => {
  it("name the network's real attacker and canary accounts", () => {
    const m = inbox(world);
    expect(m.get("redirect")!.body).toContain("halcyon-markets.test.near");
    expect(m.get("redirect")!.body).not.toContain(".testnet");
    expect(m.get("canary")!.body).toContain("halcyon-mm-payments.test.near");
    expect(m.get("question")!.expect).toBe("no_action");
  });
});

describe("block lines", () => {
  afterEach(() => vi.restoreAllMocks());
  it("put the label in ten columns after two spaces, as INTERFACES.md section 10 prints them", () => {
    const out: string[] = [];
    vi.spyOn(console, "log").mockImplementation((t: string) => { out.push(t); });
    line("refused", "ERR_PAYEE_MISMATCH");
    line("preflight", "block");
    expect(out).toEqual(["  refused   ERR_PAYEE_MISMATCH", "  preflight block"]);
    expect(usdc("12000000")).toBe("12.00 USDC");
  });
});
