// /api/relay only pays gas for calls into Accord: the factory's create_agreement, any call on one of its agreements,
// and ft_transfer_call into an agreement on the configured token. Delegates are built and signed with near-api-js,
// encoded to base64 the way wallets return them, then decoded and checked.
import { describe, expect, it } from "vitest";
import { KeyPair, KeyPairSigner, actions, buildDelegateAction, encodeSignedDelegate } from "near-api-js";
import { decodeSignedDelegate, innerStatus, rejectDelegate, MAX_AHEAD } from "../src/server/delegate";

const FACTORY = "accord-v2.testnet";
const TOKEN = "tusdc.accord-v1.testnet";
const HEIGHT = 1_000_000n;
const TGAS = 1_000_000_000_000n;
const policy = { factory: FACTORY, token: TOKEN, height: HEIGHT };

async function delegate(o: {
  receiverId: string; acts?: ReturnType<typeof actions.functionCall>[]; method?: string; args?: object;
  gas?: bigint; deposit?: bigint; maxBlockHeight?: bigint;
}): Promise<string> {
  const kp = KeyPair.fromRandom("ed25519");
  const da = buildDelegateAction({
    senderId: "northwind-try.testnet",
    receiverId: o.receiverId,
    actions: o.acts ?? [actions.functionCall(o.method ?? "create_agreement", o.args ?? {}, o.gas ?? 300n * TGAS, o.deposit ?? 0n)],
    nonce: 7n,
    maxBlockHeight: o.maxBlockHeight ?? HEIGHT + 100n,
    publicKey: kp.getPublicKey(),
  });
  const { signedDelegate } = await new KeyPairSigner(kp).signDelegateAction(da);
  return Buffer.from(encodeSignedDelegate(signedDelegate)).toString("base64");
}

const check = async (o: Parameters<typeof delegate>[0]) => rejectDelegate(decodeSignedDelegate(await delegate(o)), policy);

describe("decodeSignedDelegate", () => {
  it("round-trips what near-api-js encodes", async () => {
    const b64 = await delegate({ receiverId: FACTORY, deposit: 2n });
    const d = decodeSignedDelegate(b64);
    expect(d.delegateAction.senderId).toBe("northwind-try.testnet");
    expect(d.delegateAction.receiverId).toBe(FACTORY);
    expect(d.delegateAction.maxBlockHeight).toBe(HEIGHT + 100n);
    expect(Buffer.from(encodeSignedDelegate(d as never)).toString("base64")).toBe(b64);
  });
  it("refuses what is not a signed delegate", () => {
    expect(() => decodeSignedDelegate("")).toThrow();
    expect(() => decodeSignedDelegate("not base64!")).toThrow();
    expect(() => decodeSignedDelegate(Buffer.from("hello").toString("base64"))).toThrow();
    expect(() => decodeSignedDelegate(undefined as never)).toThrow();
  });
});

describe("receiver allowlist", () => {
  it("carries create_agreement on the factory", async () => {
    expect(await check({ receiverId: FACTORY, deposit: 2_000_000_000_000_000_000_000_000n })).toBeNull();
  });
  it("refuses any other method on the factory", async () => {
    expect(await check({ receiverId: FACTORY, method: "set_config" })).toMatch(/create_agreement only/);
  });
  it("carries any call on an agreement of the factory", async () => {
    expect(await check({ receiverId: `a12.${FACTORY}`, method: "approve_terms", gas: 30n * TGAS })).toBeNull();
  });
  it("never carries act, which the agent signs with its own key", async () => {
    expect(await check({ receiverId: `a12.${FACTORY}`, method: "act", gas: 100n * TGAS })).toMatch(/never carries act/);
  });
  it("refuses look-alike agreement accounts", async () => {
    expect(await check({ receiverId: "a12.accord-v2.testnet.evil.testnet", method: "approve_terms" })).toMatch(/only carries calls into Accord/);
    expect(await check({ receiverId: "a12xaccord-v2.testnet", method: "approve_terms" })).toMatch(/only carries calls into Accord/);
    expect(await check({ receiverId: `b12.${FACTORY}`, method: "approve_terms" })).toMatch(/only carries calls into Accord/);
    expect(await check({ receiverId: "wrap.testnet", method: "ft_transfer" })).toMatch(/only carries calls into Accord/);
  });
  it("carries ft_transfer_call into an agreement on the token", async () => {
    expect(await check({ receiverId: TOKEN, method: "ft_transfer_call", args: { receiver_id: `a3.${FACTORY}`, amount: "10", msg: "fund" }, deposit: 1n, gas: 100n * TGAS })).toBeNull();
  });
  it("refuses token transfers anywhere else", async () => {
    expect(await check({ receiverId: TOKEN, method: "ft_transfer_call", args: { receiver_id: "evil.testnet", amount: "10", msg: "" }, deposit: 1n })).toMatch(/into an Accord agreement/);
    expect(await check({ receiverId: TOKEN, method: "ft_transfer", args: { receiver_id: `a3.${FACTORY}`, amount: "10" }, deposit: 1n })).toMatch(/ft_transfer_call only/);
    expect(await check({ receiverId: TOKEN, method: "ft_transfer_call", args: { receiver_id: `a3.${FACTORY}`, amount: "10", msg: "" }, deposit: 0n })).toMatch(/1 yoctoNEAR/);
  });
});

describe("expiry", () => {
  it("refuses a delegate at or below the current height", async () => {
    expect(await check({ receiverId: FACTORY, maxBlockHeight: HEIGHT })).toMatch(/expired/);
    expect(await check({ receiverId: FACTORY, maxBlockHeight: HEIGHT - 5n })).toMatch(/expired/);
  });
  it("refuses one that expires too far ahead", async () => {
    expect(await check({ receiverId: FACTORY, maxBlockHeight: HEIGHT + MAX_AHEAD + 1n })).toMatch(/too far ahead/);
  });
});

describe("method shape", () => {
  it("carries exactly one function call", async () => {
    const two = [actions.functionCall("approve_terms", {}, 30n * TGAS, 0n), actions.functionCall("cancel", {}, 30n * TGAS, 0n)];
    expect(await check({ receiverId: `a1.${FACTORY}`, acts: two })).toMatch(/exactly one call/);
    expect(await check({ receiverId: `a1.${FACTORY}`, acts: [] })).toMatch(/exactly one call/);
  });
  it("refuses non-call actions", async () => {
    expect(await check({ receiverId: `a1.${FACTORY}`, acts: [actions.transfer(5n) as never] })).toMatch(/function calls only/);
  });
  it("refuses more gas than one Accord call needs", async () => {
    expect(await check({ receiverId: `a1.${FACTORY}`, method: "close", gas: 301n * TGAS })).toMatch(/more gas/);
  });
});

describe("innerStatus", () => {
  const o = (id: string, executor_id: string, status: object, receipt_ids: string[] = []) => ({ id, outcome: { executor_id, receipt_ids, status } });
  it("reports the user's call, following its promise chain", () => {
    const tx = {
      status: { SuccessValue: "" },
      transaction: { hash: "h" },
      transaction_outcome: o("t", "relay.accord-v2.testnet", { SuccessReceiptId: "r1" }, ["r1"]),
      receipts_outcome: [
        o("r1", "northwind-try.testnet", { SuccessValue: "" }, ["r2"]),
        o("r2", FACTORY, { SuccessReceiptId: "r3" }, ["r3"]),
        o("r3", FACTORY, { SuccessValue: Buffer.from('"a9.accord-v2.testnet"').toString("base64") }),
      ],
    };
    expect(innerStatus(tx, FACTORY)).toEqual({ SuccessValue: Buffer.from('"a9.accord-v2.testnet"').toString("base64") });
  });
  it("reports a failed call as a failure", () => {
    const tx = {
      status: { SuccessValue: "" },
      transaction: { hash: "h" },
      transaction_outcome: o("t", "relay.accord-v2.testnet", { SuccessReceiptId: "r1" }, ["r1"]),
      receipts_outcome: [
        o("r1", "northwind-try.testnet", { SuccessValue: "" }, ["r2"]),
        o("r2", `a1.${FACTORY}`, { Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: "nope" } } } } }),
      ],
    };
    expect(innerStatus(tx, `a1.${FACTORY}`).Failure).toBeDefined();
  });
});

// The optional second pair (ACCORD_FACTORY_USDC): a second factory that settles in Circle's testnet USDC. Each token
// funds only its own factory's agreements; the default pair behaves exactly as above.
describe("two factories, each with its own token", () => {
  const USDC_FACTORY = "accord-usdc.testnet";
  const USDC = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
  const both = { ...policy, pairs: [{ factory: USDC_FACTORY, token: USDC }] };
  const check2 = async (o: Parameters<typeof delegate>[0]) => rejectDelegate(decodeSignedDelegate(await delegate(o)), both);
  const fund = (token: string, into: string) => ({
    receiverId: token, method: "ft_transfer_call", args: { receiver_id: into, amount: "10", msg: "fund" }, deposit: 1n, gas: 100n * TGAS,
  });

  it("carries create_agreement on either factory, and nothing else on the second", async () => {
    expect(await check2({ receiverId: FACTORY, deposit: 2n })).toBeNull();
    expect(await check2({ receiverId: USDC_FACTORY, deposit: 2n })).toBeNull();
    expect(await check2({ receiverId: USDC_FACTORY, method: "set_config" })).toMatch(/create_agreement only/);
  });
  it("carries calls on agreements of either factory, never act", async () => {
    expect(await check2({ receiverId: `a1.${USDC_FACTORY}`, method: "approve_terms", gas: 30n * TGAS })).toBeNull();
    expect(await check2({ receiverId: `a12.${FACTORY}`, method: "approve_terms", gas: 30n * TGAS })).toBeNull();
    expect(await check2({ receiverId: `a1.${USDC_FACTORY}`, method: "act", gas: 100n * TGAS })).toMatch(/never carries act/);
  });
  it("carries each token into its own factory's agreements", async () => {
    expect(await check2(fund(TOKEN, `a3.${FACTORY}`))).toBeNull();
    expect(await check2(fund(USDC, `a1.${USDC_FACTORY}`))).toBeNull();
  });
  it("never pairs a token with the other factory's agreements", async () => {
    expect(await check2(fund(USDC, `a3.${FACTORY}`))).toMatch(/does not settle that agreement/);
    expect(await check2(fund(TOKEN, `a1.${USDC_FACTORY}`))).toMatch(/does not settle that agreement/);
  });
  it("keeps the second token's other limits", async () => {
    expect(await check2(fund(USDC, "evil.testnet"))).toMatch(/into an Accord agreement/);
    expect(await check2({ ...fund(USDC, `a1.${USDC_FACTORY}`), method: "ft_transfer" })).toMatch(/ft_transfer_call only/);
    expect(await check2({ ...fund(USDC, `a1.${USDC_FACTORY}`), deposit: 0n })).toMatch(/1 yoctoNEAR/);
    expect(await check2({ receiverId: "a1.accord-usdc.testnet.evil.testnet", method: "approve_terms" })).toMatch(/only carries calls into Accord/);
  });
  it("without the second pair, its factory, agreements and token are refused as before", async () => {
    expect(await check({ receiverId: USDC_FACTORY, deposit: 2n })).toMatch(/only carries calls into Accord/);
    expect(await check({ receiverId: `a1.${USDC_FACTORY}`, method: "approve_terms" })).toMatch(/only carries calls into Accord/);
    expect(await check(fund(USDC, `a1.${USDC_FACTORY}`))).toMatch(/only carries calls into Accord/);
    expect(await check(fund(TOKEN, `a1.${USDC_FACTORY}`))).toMatch(/into an Accord agreement/);
  });
});
