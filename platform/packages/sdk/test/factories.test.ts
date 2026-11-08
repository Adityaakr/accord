import { describe, expect, it } from "vitest";
import { Accord, KNOWN_FACTORIES, knownFactories } from "../src/index.js";

describe("factories", () => {
  it("lists both testnet factories, each with its own token", () => {
    const t = KNOWN_FACTORIES.testnet!;
    expect(t.map((f) => f.factory)).toEqual(["accord-v2.testnet", "accord-usdc.testnet"]);
    expect(new Set(t.map((f) => f.token)).size).toBe(2);
    expect(t.find((f) => f.factory === "accord-usdc.testnet")!.token).toBe(
      "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
    );
  });

  it("verify accepts the client's factory, the network's known ones and any the caller adds", () => {
    const a = new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc: "http://127.0.0.1:1" });
    expect(knownFactories(a)).toEqual(["accord-v2.testnet", "accord-usdc.testnet"]);
    expect(knownFactories(a, ["accord-usdc.testnet", ""])).toEqual(["accord-v2.testnet", "accord-usdc.testnet"]);
    expect(knownFactories(a, ["other.testnet"])).toContain("other.testnet");
    const local = new Accord({ network: "sandbox", factory: "accord.test.near", rpc: "http://127.0.0.1:1" });
    expect(knownFactories(local)).toEqual(["accord.test.near"]);
  });

  it("onFactory keeps the network, chain and signer and changes only the factory", () => {
    const a = new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc: "http://127.0.0.1:1" });
    expect(a.onFactory("accord-v2.testnet")).toBe(a);
    const b = a.onFactory("accord-usdc.testnet");
    expect(b.factory).toBe("accord-usdc.testnet");
    expect(b.network).toBe("testnet");
    expect(b.chain.rpcUrl).toBe(a.chain.rpcUrl);
  });
});
