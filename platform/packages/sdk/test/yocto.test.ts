// Finding 8 (L2-6 / L3-F6): the sensitive methods take exactly 1 yoctoNEAR on agreements from release 4; agreements on
// the earlier code (releases 1 to 3, one global contract) refuse any deposit there, so the client attaches it only
// where the code takes it, and never on the other methods.
import { describe, expect, it } from "vitest";
import { Accord, PRE_YOCTO_CODE_HASHES, type Signer } from "../src/index.js";

function client(codeHash: string) {
  const calls: { method: string; deposit: bigint }[] = [];
  const signer: Signer = {
    accountId: "northwind.testnet",
    call: async (_c, method, _a, opts) => {
      calls.push({ method, deposit: opts?.deposit ?? 0n });
      return { ok: true, txHash: "tx", value: null, gasBurnt: 0n } as never;
    },
  };
  const accord = new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc: "http://127.0.0.1:1", signer });
  (accord.chain as unknown as { account: () => Promise<unknown> }).account = async () => ({
    code_hash: "11111111111111111111111111111111", global_contract_hash: codeHash,
  });
  return { deal: accord.agreement("a9.accord-v2.testnet"), calls };
}

describe("1 yoctoNEAR on the sensitive methods", () => {
  it("attaches it on new code, to the sensitive methods only", async () => {
    const { deal, calls } = client("NewCodeHash1111111111111111111111111111111");
    await deal.approveTerms("00");
    await deal.approveRecipient(1);
    await deal.acceptRecipient(1);
    await deal.installAgentKey("ed25519:x", "1");
    await deal.acceptDelivery(1);
    await deal.approveException(0);
    await deal.resolvePeriod(0, true);
    await deal.mutualClose();
    await deal.withdrawNear();
    await deal.submitDelivery(1, "ee", "u");
    await deal.cancel();
    expect(calls.slice(0, 9).every((c) => c.deposit === 1n)).toBe(true);
    expect(calls.slice(9).map((c) => c.deposit)).toEqual([0n, 0n]);
  });

  it("attaches none on the release 3 code, which refuses a deposit", async () => {
    const { deal, calls } = client(PRE_YOCTO_CODE_HASHES[0]!);
    await deal.approveTerms("00");
    await deal.withdrawNear();
    expect(calls.map((c) => c.deposit)).toEqual([0n, 0n]);
  });
});
