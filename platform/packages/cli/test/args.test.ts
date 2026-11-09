import { describe, expect, it } from "vitest";
import { parseArgv } from "../src/args.js";
import { globalOptions } from "../src/cli.js";
import { parseDotEnv, redact, secretValues, selectIdentity } from "../src/env.js";

const KEY = "ed25519:2LUF1DHqLvEvKKdogNaqUkhj76empvybjEcGjd3Qh7uf8vt5MsUz6PjDaqJzAaYaKARHy26XKizdzckehNDqG3rH";
const env = {
  BUYER_ACCOUNT: "northwind-demo.testnet", BUYER_KEY: KEY,
  VENDOR_ACCOUNT: "halcyon-demo.testnet", VENDOR_KEY: KEY,
  AUTHORITY_ACCOUNT: "halcyon-auth.testnet", AUTHORITY_KEY: KEY,
  KEEPER_ACCOUNT: "accord-keeper.testnet", KEEPER_KEY: KEY,
  AGENT_AGREEMENT: "a7.accord-v1.testnet", ACCORD_AGENT_KEY: KEY,
  ACCORD_FACTORY: "accord-v1.testnet",
};

describe("parseArgv", () => {
  it("splits positionals, valued flags, = flags and boolean flags", () => {
    const a = parseArgv(["recipient", "accept", "2", "--agreement", "a7.f", "--acknowledge-warnings", "--as=buyer", "--json"]);
    expect(a.positionals).toEqual(["recipient", "accept", "2"]);
    expect(a.flags.get("agreement")).toBe("a7.f");
    expect(a.flags.get("acknowledge-warnings")).toBe(true);
    expect(a.flags.get("as")).toBe("buyer");
    expect(a.flags.get("json")).toBe(true);
  });
  it("rejects a valued flag with no value", () => {
    expect(() => parseArgv(["pay", "--to"])).toThrow("--to needs a value");
    expect(() => parseArgv(["pay", "--to", "--json"])).toThrow("--to needs a value");
  });
  it("treats everything after -- as positional", () => {
    expect(parseArgv(["check", "--", "--odd"]).positionals).toEqual(["check", "--odd"]);
  });
});

describe("global options", () => {
  it("defaults the network to testnet and the factory to ACCORD_FACTORY", () => {
    const g = globalOptions(parseArgv(["show"]), env);
    expect(g).toMatchObject({ network: "testnet", factory: "accord-v1.testnet", json: false });
    expect(g.role).toBeUndefined();
  });
  it("takes --factory, --rpc, --json and --as", () => {
    const g = globalOptions(parseArgv(["show", "--factory", "f.testnet", "--rpc", "http://x", "--json", "--as", "vendor"]), env);
    expect(g).toMatchObject({ factory: "f.testnet", rpc: "http://x", json: true, role: "vendor" });
  });
  it("infers a known factory from an a<n>.<factory> agreement id when ACCORD_FACTORY is unset", () => {
    const bare = { BUYER_ACCOUNT: "b.testnet" };
    expect(globalOptions(parseArgv(["verify", "--agreement", "a6.accord-v2.testnet"]), bare).factory).toBe("accord-v2.testnet");
    expect(globalOptions(parseArgv(["verify", "--agreement", "a1.accord-usdc.testnet"]), bare).factory).toBe("accord-usdc.testnet");
    expect(globalOptions(parseArgv(["verify", "--agreement", "a1.evil.testnet"]), bare).factory).toBe("");
    expect(globalOptions(parseArgv(["verify", "--agreement", "accord-v2.testnet"]), bare).factory).toBe("");
    expect(globalOptions(parseArgv(["verify", "--agreement", "a6.accord-v2.testnet"]), env).factory).toBe("accord-v1.testnet");
  });
  it("refuses an unknown --as", () => {
    expect(() => globalOptions(parseArgv(["show", "--as", "recipient"]), env)).toThrow(/--as must be one of/);
  });
});

describe("--as key selection", () => {
  it.each([
    ["buyer", "northwind-demo.testnet"],
    ["vendor", "halcyon-demo.testnet"],
    ["authority", "halcyon-auth.testnet"],
    ["keeper", "accord-keeper.testnet"],
  ] as const)("%s signs as its own account", (role, account) => {
    expect(selectIdentity(role, env)).toEqual({ role, accountId: account, secretKey: KEY });
  });
  it("the agent signs as the agreement account with ACCORD_AGENT_KEY", () => {
    expect(selectIdentity("agent", env)).toEqual({ role: "agent", accountId: "a7.accord-v1.testnet", secretKey: KEY });
  });
  it("names missing variables and never echoes a key", () => {
    expect(() => selectIdentity("vendor", { VENDOR_ACCOUNT: "v" })).toThrow("--as vendor needs VENDOR_KEY in .env");
    try {
      selectIdentity("buyer", { BUYER_ACCOUNT: "b", BUYER_KEY: "not-a-key-but-secret" });
    } catch (e) {
      expect((e as Error).message).toBe("BUYER_KEY is not an ed25519:<base58> key");
      expect((e as Error).message).not.toContain("not-a-key-but-secret");
    }
  });
  it("redacts secret values from any text", () => {
    const s = secretValues(env);
    expect(s).toContain(KEY);
    expect(s).not.toContain("accord-v1.testnet");
    expect(redact(`oops ${KEY}`, s)).toBe("oops <redacted>");
  });
});

describe(".env parsing", () => {
  it("handles comments, export, quotes and inline comments", () => {
    const parsed = parseDotEnv([
      "# comment", "", "export A=1", "B = \"two words\"", "C='x#y'", "D=plain # trailing", "bad line",
    ].join("\n"));
    expect(parsed).toEqual({ A: "1", B: "two words", C: "x#y", D: "plain" });
  });
});
