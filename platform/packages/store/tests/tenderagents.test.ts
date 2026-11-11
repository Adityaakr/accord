// Tender agents linked to an account: one row per (account, bidder), relinking updates the label, at most 20 per
// account, and unlinking removes only that row. File backend (no Postgres).
import { describe, expect, it } from "vitest";
import { TENDER_AGENTS_MAX, tenderAgentStore, type TenderAgentTables } from "../src/tenderagents.js";

const mem = () => {
  const d: TenderAgentTables = {};
  return tenderAgentStore({ db: async () => null, read: () => d, mutate: (f) => f(d) });
};
const key = (n: number) => n.toString(16).padStart(64, "0");

describe("tender agents", () => {
  it("links, relinks with a new label, lists per account and unlinks", async () => {
    const s = mem();
    expect(await s.link("a.testnet", key(1), "one", "script")).toBe("linked");
    expect(await s.link("a.testnet", key(1), "renamed", "browser")).toBe("updated");
    expect(await s.link("b.testnet", key(1), "theirs", "cli")).toBe("linked");
    const mine = await s.list("a.testnet");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ bidder: key(1), label: "renamed", source: "browser" });
    expect(await s.unlink("a.testnet", key(1))).toBe(true);
    expect(await s.list("a.testnet")).toEqual([]);
    expect(await s.list("b.testnet")).toHaveLength(1);
  });
  it("holds at most the cap per account", async () => {
    const s = mem();
    for (let i = 0; i < TENDER_AGENTS_MAX; i++) await s.link("a.testnet", key(i + 1), `a${i}`, "script");
    expect(await s.link("a.testnet", key(999), "extra", "script")).toBe("full");
    expect(await s.link("a.testnet", key(1), "relabel", "script")).toBe("updated");
  });
});
