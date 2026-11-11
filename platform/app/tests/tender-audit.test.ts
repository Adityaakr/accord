// AUDIT (failing on purpose): reproduces findings in the tender relay.
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { bidderKey, prepareBid, verifyBidSignature } from "@accord/sdk";
import { relayRoute } from "../src/server/tenderroute";
import { resetLimits } from "../src/server/limiter";

describe("AUDIT tender relay", () => {
  it("pre-check accepts a label the contract re-trims (U+0085), so the relayer pays for an ERR_SIGNATURE", () => {
    const key = bidderKey("11".repeat(32));
    const b = prepareBid({ board: "tender.accord-v2.testnet", job: 1, price: 1n, agent: "x", key });
    // sign over "\u0085x": JS trim keeps U+0085, Rust str::trim drops it, so the contract verifies over "x"
    const bad = prepareBid({ board: "tender.accord-v2.testnet", job: 1, price: 1n, agent: "x", key, nonce: b.nonce + 1 });
    const { ed25519 } = require("@noble/curves/ed25519");
    const msg = new TextEncoder().encode(`accord-tender:v1:bid:tender.accord-v2.testnet:1:${bad.nonce}:${bad.commitment}:\u0085x`);
    const sig = Buffer.from(ed25519.sign(msg, Buffer.from(key.seed, "hex"))).toString("hex");
    expect(verifyBidSignature({ ...bad, agent: "\u0085x", signature: sig })).toBe(false); // FAILS: relay would pay for a doomed call
  });
  it("junk requests (bad JSON, no signature) must not use up a job's shared 200/h allowance", async () => {
    resetLimits();
    const run = vi.fn(async () => ({ ok: true, tx: "T" }));
    for (let i = 0; i < 200; i++) {
      const junk = new Request("http://x/api/tenders/7/bids", { method: "POST", body: "junk", headers: { "x-accord-client-ip": `10.0.${i >> 8}.${i & 255}` } });
      await relayRoute(junk, Promise.resolve({ id: "7" }), "bids", 60, run);
    }
    const honest = new Request("http://x/api/tenders/7/bids", { method: "POST", body: "{}", headers: { "x-accord-client-ip": "1.2.3.4" } });
    expect((await relayRoute(honest, Promise.resolve({ id: "7" }), "bids", 60, run)).status).not.toBe(429); // FAILS: job locked for 1 h
  });
});
