import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Receipt } from "@accord/sdk";
import { READ_CORS, readPreflight, withReadCors } from "../src/server/cors";
import { paymentTx } from "../src/server/paymenttx";

describe("read-only CORS", () => {
  it("allows any origin to GET, without credentials", async () => {
    const r = withReadCors(Response.json({ ok: true }, { status: 404 }));
    expect(r.status).toBe(404);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
    expect(r.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(r.headers.get("access-control-allow-credentials")).toBeNull();
    expect(await r.json()).toEqual({ ok: true });
    expect(readPreflight().status).toBe(204);
    // the header origin.ts trusts is never approved for a cross-origin request
    expect(READ_CORS["access-control-allow-headers"]).not.toContain("x-accord-site-host");
  });

  it("only read routes answer a CORS preflight; no write route does", () => {
    const allowed = new Set(["api/verify/[id]/route.ts", "api/check/route.ts", "api/fund-quote/[id]/route.ts", "api/record.csv/route.ts", "record.csv/route.ts", "mcp/route.ts", "api/tenders/route.ts", "api/tenders/[id]/route.ts", "api/tenders/deliveries/[agreement]/[item]/route.ts"]);
    // Tender relay routes take POST from any origin on purpose: the body is data signed by the bidder's own key, the
    // board checks that signature on chain, and no session or cookie is read. They must never touch a session.
    const signedRelays = new Set([
      "api/tenders/[id]/bids/route.ts", "api/tenders/[id]/reveal/route.ts", "api/tenders/[id]/award/route.ts",
      // a winner's approver and payee, its deliveries, and an agent's claim on an account: each signed by the agent's key
      "api/tenders/[id]/winner/route.ts", "api/tenders/[id]/deliveries/route.ts", "api/tenders/agents/claims/route.ts",
    ]);
    const root = join(__dirname, "../src/app");
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name === "route.ts") {
          const src = readFileSync(full, "utf8");
          if (/export (const|function|async function) OPTIONS|OPTIONS }|access-control-allow-origin|withReadCors|handleMcpRequest/.test(src)) {
            found.push(full.slice(root.length + 1));
          }
        }
      }
    };
    walk(root);
    expect(found.filter((f) => !allowed.has(f) && !signedRelays.has(f))).toEqual([]);
    expect(found.length).toBe(allowed.size + signedRelays.size);
    for (const f of [...signedRelays, "../server/tenderroute.ts", "../server/tender.ts", "../server/tenderwork.ts"]) {
      expect(readFileSync(join(root, f), "utf8")).not.toMatch(/session|cookies\(|withSession|x-accord-site-host/);
    }
  });
});

describe("record CSV: the payment's transaction", () => {
  const receipt = { payment_id: 1, item: 2, amount: "35500000", recipient: "halcyon.testnet", via: "Agent", block: 100, at: 1, evidence_hash: null } as unknown as Receipt;
  const row = (tx: string, block: number, over: Partial<{ item: number; amount: string; account: string; event: string }> = {}) =>
    ({ event: "payment_sent", tx, block, item: 2, amount: "35500000", account: "halcyon.testnet", ...over });
  it("matches item, amount and recipient, preferring the receipt's block", () => {
    expect(paymentTx(receipt, [row("A", 90), row("B", 100)])).toBe("B");
    expect(paymentTx(receipt, [row("A", 99)])).toBe("A");
  });
  it("never guesses between two candidates or from other events", () => {
    expect(paymentTx(receipt, [row("A", 90), row("B", 91)])).toBeNull();
    expect(paymentTx(receipt, [row("A", 100, { event: "act_refused" }), row("C", 100, { account: "x.testnet" })])).toBeNull();
    expect(paymentTx(receipt, [])).toBeNull();
  });
});
