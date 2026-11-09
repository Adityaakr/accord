// The throwaway testnet key ("Try without a wallet"): its implicit id, its NEP-413 session signature as /api/session
// checks it, its delegates as /api/relay decodes and allows them, and its routing (more than 1 yoctoNEAR goes direct).
import { describe, expect, it } from "vitest";
import { KeyPair, actions } from "near-api-js";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { implicitAccountId, isThrowawaySigner, newThrowawayKey, signDelegate, throwawaySigner, DELEGATE_TTL, type ThrowawayDeps } from "../src/components/wallet/throwaway";
import { isImplicitAccount, keyNamesImplicitAccount, verifyNep413 } from "../src/server/implicit";
import { decodeSignedDelegate, rejectDelegate } from "../src/server/delegate";

const FACTORY = "accord-v2.testnet";
const TOKEN = "tusdc.accord-v1.testnet";
const HEIGHT = 1_000_000n;
const TGAS = 1_000_000_000_000n;
const policy = { factory: FACTORY, token: TOKEN, height: HEIGHT };

// a minimal final outcome the SDK's toTxResult reads
const outcome = (hash: string) => ({
  status: { SuccessValue: "" },
  transaction: { hash },
  transaction_outcome: { id: "t", outcome: { executor_id: "x", receipt_ids: [], status: { SuccessValue: "" }, logs: [], gas_burnt: 1 } },
  receipts_outcome: [],
});

function fakes(nonce = 41n) {
  const sent: { relayed: string[]; direct: { receiverId: string; deposit: bigint; method: string }[] } = { relayed: [], direct: [] };
  const deps: ThrowawayDeps = {
    accessKey: async () => ({ nonce, height: HEIGHT }),
    relay: async (b64) => { sent.relayed.push(b64); return outcome(`relayed-${sent.relayed.length}`); },
    direct: async (receiverId, action) => {
      const del = (action as { deleteAccount?: { beneficiaryId: string } }).deleteAccount;
      if (del) { sent.direct.push({ receiverId, deposit: 0n, method: `delete_account:${del.beneficiaryId}` }); return outcome(`direct-${sent.direct.length + 1}`); }
      const fc = (action as { functionCall?: { deposit: bigint; methodName: string } }).functionCall!;
      sent.direct.push({ receiverId, deposit: fc.deposit, method: fc.methodName });
      return outcome(`direct-${sent.direct.length}`);
    },
  };
  return { deps, sent };
}

describe("implicit account id", () => {
  it("is the 64-character hex of the ed25519 public key", () => {
    const kp = newThrowawayKey();
    const id = implicitAccountId(kp);
    expect(isImplicitAccount(id)).toBe(true);
    expect(id).toBe(Buffer.from(kp.getPublicKey().data).toString("hex"));
    expect(keyNamesImplicitAccount(id, kp.getPublicKey().toString())).toBe(true);
  });
  it("is stable for a key restored from its string form", () => {
    const kp = newThrowawayKey();
    expect(implicitAccountId(KeyPair.fromString(kp.toString()))).toBe(implicitAccountId(kp));
  });
});

describe("NEP-413 session message", () => {
  it("verifies the way /api/session checks it (unfunded implicit account: against the id)", async () => {
    const kp = newThrowawayKey();
    const signer = throwawaySigner(kp, { rpc: "http://unused", deps: fakes().deps });
    const issued = Date.now();
    const message = `accord:session:v1:${signer.accountId}:${issued}`;
    const nonce = sha256(utf8ToBytes(message));
    const s = await signer.signMessage!(message, "accord-session", nonce);
    expect(s.publicKey).toBe(kp.getPublicKey().toString());
    expect(s.signature).toHaveLength(64);
    expect(verifyNep413(s.publicKey, message, "accord-session", nonce, s.signature)).toBe(true);
    expect(keyNamesImplicitAccount(signer.accountId, s.publicKey)).toBe(true);
    // a different recipient or message does not verify
    expect(verifyNep413(s.publicKey, message, "elsewhere", nonce, s.signature)).toBe(false);
    expect(verifyNep413(s.publicKey, `${message}x`, "accord-session", nonce, s.signature)).toBe(false);
  });
});

describe("delegates for /api/relay", () => {
  it("encode to a SignedDelegate the relayer decodes and allows", async () => {
    const kp = newThrowawayKey();
    const id = implicitAccountId(kp);
    const b64 = await signDelegate(kp, id, `a7.${FACTORY}`, actions.functionCall("approve_terms", { terms_hash: "h" }, 30n * TGAS, 0n), { nonce: 41n, height: HEIGHT });
    const d = decodeSignedDelegate(b64);
    expect(d.delegateAction.senderId).toBe(id);
    expect(d.delegateAction.receiverId).toBe(`a7.${FACTORY}`);
    expect(d.delegateAction.nonce).toBe(42n);
    expect(d.delegateAction.maxBlockHeight).toBe(HEIGHT + DELEGATE_TTL);
    expect(rejectDelegate(d, policy)).toBeNull();
  });
  it("fund with ft_transfer_call and 1 yoctoNEAR is relayed and allowed", async () => {
    const { deps, sent } = fakes();
    const s = throwawaySigner(newThrowawayKey(), { rpc: "http://unused", deps });
    const r = await s.call(TOKEN, "ft_transfer_call", { receiver_id: `a3.${FACTORY}`, amount: "40000000", msg: "fund" }, { gas: 100n * TGAS, deposit: 1n });
    expect(r.txHash).toBe("relayed-1");
    expect(sent.direct).toHaveLength(0);
    expect(rejectDelegate(decodeSignedDelegate(sent.relayed[0]!), policy)).toBeNull();
  });
  it("a call with no deposit is relayed", async () => {
    const { deps, sent } = fakes();
    const s = throwawaySigner(newThrowawayKey(), { rpc: "http://unused", deps });
    await s.call(`a3.${FACTORY}`, "revoke_agent", {}, { gas: 30n * TGAS });
    expect(sent.relayed).toHaveLength(1);
    expect(sent.direct).toHaveLength(0);
  });
});

describe("calls that attach NEAR", () => {
  it("go direct from the account, never through the relayer", async () => {
    const { deps, sent } = fakes();
    const s = throwawaySigner(newThrowawayKey(), { rpc: "http://unused", deps });
    const deposit = 2n * 10n ** 24n;
    const r = await s.call(FACTORY, "create_agreement", { kind: "procurement" }, { gas: 300n * TGAS, deposit });
    expect(r.txHash).toBe("direct-1");
    expect(sent.relayed).toHaveLength(0);
    expect(sent.direct).toEqual([{ receiverId: FACTORY, deposit, method: "create_agreement" }]);
    await s.call(`a3.${FACTORY}`, "approve_terms", {}, { deposit: 2n });
    expect(sent.direct).toHaveLength(2);
    expect(sent.relayed).toHaveLength(0);
  });
  it("the relayer would refuse such a delegate anyway", async () => {
    const kp = newThrowawayKey();
    const b64 = await signDelegate(kp, implicitAccountId(kp), FACTORY, actions.functionCall("create_agreement", {}, 300n * TGAS, 2n * 10n ** 24n), { nonce: 1n, height: HEIGHT });
    expect(rejectDelegate(decodeSignedDelegate(b64), policy)).toMatch(/at most 1 yoctoNEAR/);
  });
});

describe("returning the test USDC", () => {
  it("is an ft_transfer of 1 yoctoNEAR on the token, sent direct from the account", async () => {
    const { deps, sent } = fakes();
    const s = throwawaySigner(newThrowawayKey(), { rpc: "http://unused", deps });
    const h = await s.transferToken("tusdc.accord-v1.testnet", "faucet.accord-v2.testnet", "100000000");
    expect(h).toBe("direct-1");
    expect(sent.relayed).toHaveLength(0);
    expect(sent.direct).toEqual([{ receiverId: "tusdc.accord-v1.testnet", deposit: 1n, method: "ft_transfer" }]);
  });
});

describe("serial calls", () => {
  it("run one at a time, each reading the nonce after the last finished", async () => {
    let nonce = 10n;
    const order: string[] = [];
    const deps: ThrowawayDeps = {
      accessKey: async () => ({ nonce, height: HEIGHT }),
      relay: async (b64) => {
        const d = decodeSignedDelegate(b64);
        order.push(`start ${d.delegateAction.nonce}`);
        await new Promise((r) => setTimeout(r, 10));
        nonce = d.delegateAction.nonce;
        order.push(`end ${d.delegateAction.nonce}`);
        return outcome(String(d.delegateAction.nonce));
      },
      direct: async () => { throw new Error("not expected"); },
    };
    const s = throwawaySigner(newThrowawayKey(), { rpc: "http://unused", deps });
    const [a, b] = await Promise.all([s.call(`a1.${FACTORY}`, "x", {}), s.call(`a1.${FACTORY}`, "y", {})]);
    expect([a.txHash, b.txHash]).toEqual(["11", "12"]);
    expect(order).toEqual(["start 11", "end 11", "start 12", "end 12"]);
  });
});

describe("deleting the throwaway account at the end of a visit", () => {
  it("is the account's own DeleteAccount transaction, with the faucet as beneficiary", async () => {
    const kp = KeyPair.fromRandom("ed25519");
    const { deps, sent } = fakes();
    const s = throwawaySigner(kp, { rpc: "http://unused", deps });
    const hash = await s.deleteAccount("faucet.accord-v2.testnet");
    expect(hash).toMatch(/^direct-/);
    expect(sent.relayed).toHaveLength(0);
    expect(sent.direct).toEqual([{ receiverId: implicitAccountId(kp), deposit: 0n, method: "delete_account:faucet.accord-v2.testnet" }]);
  });
  it("is told apart from a wallet's signer", () => {
    const { deps } = fakes();
    expect(isThrowawaySigner(throwawaySigner(KeyPair.fromRandom("ed25519"), { rpc: "x", deps }))).toBe(true);
    expect(isThrowawaySigner({ accountId: "a.testnet", call: async () => { throw new Error("unused"); } })).toBe(false);
    expect(isThrowawaySigner(null)).toBe(false);
  });
});
