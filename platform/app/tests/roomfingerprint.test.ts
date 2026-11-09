// The demo counterparty panel's "next" line (lib/roomfingerprint.ts): an answer is shown only for the room it was read
// for; any change that can move the next step changes the fingerprint, and the panel says it is checking instead.
import { describe, expect, it } from "vitest";
import { nextLine, roomFingerprint, type FingerprintView } from "../src/lib/roomfingerprint";

const base: FingerprintView = {
  state: "Executing", negotiation: "Done", approvals: { buyer: true, vendor: true }, terms_hash: "ab".repeat(32),
  funded: "35500000", paid: "0", in_flight: null, closing: false,
  recipient: { version: 1, account: "halcyon-mm.testnet", domain: "accordweb-production.up.railway.app" },
  pending_recipient: null, agent_key: null, revoked_keys: 0, refusals: 0,
};
const items = [{ id: 1, status: "Delivered" }, { id: 2, status: "Open" }];

describe("room fingerprint", () => {
  it("is stable for the same room", () => {
    expect(roomFingerprint({ ...base }, [...items])).toBe(roomFingerprint(base, items));
  });
  it("changes with each thing that can move the next step", () => {
    const fp = roomFingerprint(base, items);
    const changed: [string, Partial<FingerprintView>][] = [
      ["state", { state: "Settled" }],
      ["negotiation", { negotiation: { Requested: { request_nonce: "n", at: 1, attempt: 1 } } }],
      ["buyer approval", { approvals: { buyer: false, vendor: true } }],
      ["terms", { terms_hash: null }],
      ["funding", { funded: "0" }],
      ["a payment", { paid: "16500000" }],
      ["a payment in flight", { in_flight: { item: 1 } as unknown as FingerprintView["in_flight"] }],
      ["recipient", { recipient: null }],
      ["pending recipient", { pending_recipient: { version: 2, account: "x.testnet", status: "Proven" as never, active_at: null } }],
      ["agent key installed", { agent_key: "ed25519:abc" }],
      ["agent key revoked", { revoked_keys: 1 }],
      ["a refusal", { refusals: 1 }],
      ["closing", { closing: true }],
    ];
    for (const [what, patch] of changed) expect(roomFingerprint({ ...base, ...patch }, items), what).not.toBe(fp);
    expect(roomFingerprint(base, [{ id: 1, status: "Eligible" }, items[1]!])).not.toBe(fp);
  });
});

describe("next line", () => {
  const fp = roomFingerprint(base, items);
  it("shows the answer read for this room", () => {
    expect(nextLine({ next: "Your move: accept item 1.", fp }, fp, true)).toBe("Your move: accept item 1.");
  });
  it("never shows an answer read for an earlier room", () => {
    const stale = { next: "Your move: fund the escrow.", fp: roomFingerprint({ ...base, funded: "0" }, items) };
    expect(nextLine(stale, fp, true)).toBe("Checking the room…");
    expect(nextLine(stale, fp, false)).toBe("The room changed. Run next step to see what comes next.");
    expect(nextLine(null, fp, true)).toBe("Checking the room…");
  });
});
