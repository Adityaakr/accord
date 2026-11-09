// Finishing a wallet-free visit (lib/finish.ts): end the room the cheapest way the contract allows, take its NEAR back
// with withdraw_near, then delete the throwaway account with the faucet as beneficiary.
import { describe, expect, it } from "vitest";
import { buyerMove, closeMove, finishThrowaway, type FinishDeps, type RoomLike } from "../src/lib/finish";

const ME = "477577ab6bf12041726e8a409d00f2c5319a6556011f697bcb214a52a1d7e512";
const FAUCET = "faucet.accord-v2.testnet";
const room = (state: string, mc = { buyer: false, vendor: false }, extra: Partial<RoomLike> = {}): RoomLike => ({ state, buyer: ME, mutual_close: mc, ...extra });

describe("closeMove (the demo vendor's side)", () => {
  it("joins only after the buyer asked, then steps close until settled", () => {
    expect(closeMove(room("Executing"))).toEqual({ refuse: "the buyer has not asked to close this room" });
    expect(closeMove(room("Executing", { buyer: true, vendor: false }))).toBe("join");
    expect(closeMove(room("Executing", { buyer: true, vendor: true }))).toBe("close");
    expect(closeMove(room("Executing", { buyer: true, vendor: true }, { closing: true }))).toBe("wait");
    expect(closeMove(room("Settled", { buyer: true, vendor: true }))).toBe("done");
    expect(closeMove(room("Cancelled"))).toBe("done");
    expect(typeof closeMove(room("Sealed"))).toBe("object");
  });
});

describe("buyerMove", () => {
  it("cancels before Executing, asks mutual_close during it, then withdraws", () => {
    expect(buyerMove(room("Sealed"))).toBe("cancel");
    expect(buyerMove(room("Attested"))).toBe("cancel");
    expect(buyerMove(room("Executing"))).toBe("mutual_close");
    expect(buyerMove(room("Executing", { buyer: true, vendor: false }))).toBe("vendor");
    expect(buyerMove(room("Settled"))).toBe("withdraw");
    expect(buyerMove(room("NoDeal"))).toBe("withdraw");
  });
});

/** A fake chain: each call moves the room the way the contract would. */
function chain(start: RoomLike) {
  const rooms = new Map<string, RoomLike>([["a24.accord-v2.testnet", { ...start }]]);
  const calls: string[] = [];
  let near = { room: 1_991n, account: 230n, faucet: 50_000n }; // milliNEAR
  const deps: FinishDeps = {
    read: async (id) => ({ ...rooms.get(id)! }),
    cancel: async (id) => { calls.push(`cancel ${id}`); rooms.get(id)!.state = "Cancelled"; },
    mutualClose: async (id) => { calls.push(`mutual_close ${id}`); rooms.get(id)!.mutual_close.buyer = true; },
    vendorClose: async (id) => { calls.push(`vendor ${id}`); const r = rooms.get(id)!; r.mutual_close.vendor = true; r.state = "Settled"; },
    withdrawNear: async (id) => {
      calls.push(`withdraw_near ${id}`);
      const liquid = near.room - 30n; // the room keeps its storage stake
      if (liquid <= 0n) throw Object.assign(new Error("ERR_NOTHING_TO_WITHDRAW"), { code: "ERR_NOTHING_TO_WITHDRAW" });
      near = { ...near, room: 30n, account: near.account + liquid };
    },
    deleteSelf: async (b) => { calls.push(`delete_account -> ${b}`); near = { ...near, faucet: near.faucet + near.account - 1n, account: 0n }; return "DelTx"; },
    wait: async () => undefined,
  };
  return { deps, calls, near: () => near };
}

describe("finishThrowaway", () => {
  it("a room still sealed: cancel, withdraw_near, delete; the faucet ends up with the deposit back", async () => {
    const c = chain(room("Sealed"));
    const r = await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    expect(c.calls).toEqual(["cancel a24.accord-v2.testnet", "withdraw_near a24.accord-v2.testnet", `delete_account -> ${FAUCET}`]);
    expect(r).toEqual({ rooms: ["a24.accord-v2.testnet"], tokenTx: null, deleteTx: "DelTx" });
    expect(c.near().faucet).toBe(50_000n + 230n + 1_961n - 1n);
    expect(c.near().account).toBe(0n);
  });

  it("a room executing (after revoke): mutual_close, the vendor joins, withdraw_near, delete", async () => {
    const c = chain(room("Executing"));
    await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    expect(c.calls).toEqual([
      "mutual_close a24.accord-v2.testnet", "vendor a24.accord-v2.testnet", "withdraw_near a24.accord-v2.testnet", `delete_account -> ${FAUCET}`,
    ]);
  });

  it("a room already settled and withdrawn: nothing left is fine, the account is still deleted", async () => {
    const c = chain(room("Settled"));
    await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    expect(c.calls.filter((x) => x.startsWith("delete_account"))).toHaveLength(2);
  });

  it("no room at all: only the delete", async () => {
    const c = chain(room("Sealed"));
    await finishThrowaway(ME, [], FAUCET, c.deps);
    expect(c.calls).toEqual([`delete_account -> ${FAUCET}`]);
  });

  it("stops, without deleting, when a room will not close", async () => {
    const c = chain(room("Executing"));
    c.deps.vendorClose = async () => undefined; // the vendor never joins
    await expect(finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps, 4)).rejects.toThrow(/did not close in time/);
    expect(c.calls.some((x) => x.startsWith("delete_account"))).toBe(false);
  });

  it("a withdraw that fails for a real reason stops before the delete, so no deposit is stranded", async () => {
    const c = chain(room("Settled"));
    c.deps.withdrawNear = async () => { throw new Error("ERR_WRONG_STATE"); };
    await expect(finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps)).rejects.toThrow("ERR_WRONG_STATE");
    expect(c.calls.some((x) => x.startsWith("delete_account"))).toBe(false);
  });

  it("returns the test USDC to the faucet before the delete, never after", async () => {
    const c = chain(room("Executing"));
    let tusdc = 100_000_000n;
    c.deps.returnTokens = async (b) => { c.calls.push(`ft_transfer ${tusdc} -> ${b}`); tusdc = 0n; return "FtTx"; };
    const r = await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    expect(c.calls.slice(-2)).toEqual([`ft_transfer 100000000 -> ${FAUCET}`, `delete_account -> ${FAUCET}`]);
    expect(r.tokenTx).toBe("FtTx");
    expect(tusdc).toBe(0n);
  });

  it("a token transfer that fails stops before the delete, so the account can try again", async () => {
    const c = chain(room("Settled"));
    c.deps.returnTokens = async () => { throw new Error("the test USDC could not be returned: failed"); };
    await expect(finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps)).rejects.toThrow(/could not be returned/);
    expect(c.calls.some((x) => x.startsWith("delete_account"))).toBe(false);
  });

  it("skips a room it is not the buyer of", async () => {
    const c = chain(room("Sealed", undefined, { buyer: "someone.testnet" }));
    await finishThrowaway(ME, ["a24.accord-v2.testnet"], FAUCET, c.deps);
    expect(c.calls).toEqual([`delete_account -> ${FAUCET}`]);
  });
});
