// /api/demo-agent: "pay" and "attack" make the demo agent sign act in a room, and five refusals revoke its key, so
// only the room's buyer (the session cookie's account) may ask for them. "key" stays open: it only reads.
import { describe, expect, it } from "vitest";
import { agentGuard } from "../src/server/demoguard";

const BUYER = "7ab36eba6cc17968d05cd28193da04928c6d8038481cc626a6f80b60fd3b5017";

describe("agentGuard", () => {
  it("lets anyone read the agent's public key", () => {
    expect(agentGuard("key", null, BUYER)).toBeNull();
    expect(agentGuard("key", "someone.testnet", BUYER)).toBeNull();
  });
  it("lets the room's buyer pay and attack", () => {
    expect(agentGuard("pay", BUYER, BUYER)).toBeNull();
    expect(agentGuard("attack", BUYER, BUYER)).toBeNull();
  });
  it("refuses pay and attack without a session", () => {
    expect(agentGuard("pay", null, BUYER)).toMatchObject({ status: 401, code: "no_session" });
    expect(agentGuard("attack", null, BUYER)).toMatchObject({ status: 401, code: "no_session" });
  });
  it("refuses pay and attack from another account's session", () => {
    expect(agentGuard("pay", "mallory.testnet", BUYER)).toMatchObject({ status: 403, code: "not_buyer" });
    expect(agentGuard("attack", "mallory.testnet", BUYER)).toMatchObject({ status: 403, code: "not_buyer" });
  });
  it("compares the whole account id", () => {
    expect(agentGuard("attack", BUYER.slice(0, -1), BUYER)).toMatchObject({ status: 403 });
    expect(agentGuard("attack", `${BUYER}.x`, BUYER)).toMatchObject({ status: 403 });
  });
});
