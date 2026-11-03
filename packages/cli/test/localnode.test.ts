import { describe, expect, it } from "vitest";
import { localNodeEnv, selectIdentity } from "../src/env.js";

const file = {
  rpc: "http://127.0.0.1:3030",
  factory: "accord.test.near",
  token: "tusdc.test.near",
  principals: {
    buyer: { account: "northwind.test.near", key: "ed25519:3D4YudUahN1nawWogh8pAKSj92sUNMdbZGjn7kERKzYoTy8tnFQuwoGUC51DowKqorvkr2pytJSnwuSbsNVfqygr" },
    keeper: { account: "keeper.test.near", key: "ed25519:3D4YudUahN1nawWogh8pAKSj92sUNMdbZGjn7kERKzYoTy8tnFQuwoGUC51DowKqorvkr2pytJSnwuSbsNVfqygr" },
  },
  agents: { "a3.accord.test.near": "ed25519:3D4YudUahN1nawWogh8pAKSj92sUNMdbZGjn7kERKzYoTy8tnFQuwoGUC51DowKqorvkr2pytJSnwuSbsNVfqygr" },
};

describe("localNodeEnv", () => {
  it("maps the node's principals onto the --as variables", () => {
    const env = localNodeEnv(file);
    expect(env.ACCORD_FACTORY).toBe("accord.test.near");
    expect(selectIdentity("buyer", env).accountId).toBe("northwind.test.near");
    expect(() => selectIdentity("vendor", env)).toThrow(/VENDOR_ACCOUNT/);
  });
  it("gives the agent key only for the agreement that has one", () => {
    expect(selectIdentity("agent", localNodeEnv(file, "a3.accord.test.near")).accountId).toBe("a3.accord.test.near");
    expect(localNodeEnv(file, "a4.accord.test.near").ACCORD_AGENT_KEY).toBeUndefined();
  });
});
