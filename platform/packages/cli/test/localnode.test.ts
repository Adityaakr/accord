import { describe, expect, it } from "vitest";
import { localNodeEnv, selectIdentity } from "../src/env.js";

const file = {
  rpc: "http://127.0.0.1:3030",
  factory: "accord.test.near",
  token: "tusdc.test.near",
  principals: {
    buyer: { account: "northwind.test.near", key: "ed25519:2LUF1DHqLvEvKKdogNaqUkhj76empvybjEcGjd3Qh7uf8vt5MsUz6PjDaqJzAaYaKARHy26XKizdzckehNDqG3rH" },
    keeper: { account: "keeper.test.near", key: "ed25519:2LUF1DHqLvEvKKdogNaqUkhj76empvybjEcGjd3Qh7uf8vt5MsUz6PjDaqJzAaYaKARHy26XKizdzckehNDqG3rH" },
  },
  agents: { "a3.accord.test.near": "ed25519:2LUF1DHqLvEvKKdogNaqUkhj76empvybjEcGjd3Qh7uf8vt5MsUz6PjDaqJzAaYaKARHy26XKizdzckehNDqG3rH" },
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

describe("loadLocalNode", () => {
  it("replaces testnet and blank values from .env with the local node's", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { loadLocalNode } = await import("../src/env.js");
    const root = mkdtempSync(join(tmpdir(), "accord-cli-"));
    mkdirSync(join(root, "target/sandbox"), { recursive: true });
    writeFileSync(join(root, "target/sandbox/env.json"), JSON.stringify(file));
    const env: Record<string, string | undefined> = { ACCORD_FACTORY: "accord-v1.testnet", BUYER_ACCOUNT: "", NEAR_RPC_URL: "" };
    expect(loadLocalNode(env, root)).toBeTruthy();
    expect(env.ACCORD_FACTORY).toBe("accord.test.near");
    expect(env.BUYER_ACCOUNT).toBe("northwind.test.near");
    expect(env.NEAR_RPC_URL).toBe("http://127.0.0.1:3030");
  });
});
