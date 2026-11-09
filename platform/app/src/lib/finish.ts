// Finishing a wallet-free try-it visit, so the faucet gets its NEAR back. The throwaway key dies with the tab, and the
// room's 2 NEAR deposit is returned to the buyer only when the room ends, so without this every visit would cost the
// faucet about 2.25 NEAR for good. The steps, each the cheapest the contract allows:
//
// 1. End the room. Before Executing the buyer alone can `cancel`. While Executing, the buyer asks `mutual_close`
//    (1 yoctoNEAR, through Accord's relayer), then Accord's demo vendor joins it (/api/demo-counterparty/close), and
//    the second call closes the room: eligible items are paid, the rest of the escrow is refunded to the buyer.
// 2. `withdraw_near`: the room's spare NEAR (the creation deposit minus its storage) goes back to the buyer.
// 3. The test USDC the account still holds (the faucet's grant, and any escrow refunded by the close) goes back to the
//    faucet with `ft_transfer`, so none is left on an account about to be deleted.
// 4. The throwaway account deletes itself with the faucet as beneficiary, which sends all of its NEAR to the faucet.
//
// Pure apart from the deps it is given, so it is unit-tested.

import type { State } from "@accord/sdk";

export interface RoomLike {
  state: State | string;
  buyer: string;
  closing?: boolean;
  mutual_close: { buyer: boolean; vendor: boolean };
}

/** What Accord's demo vendor does for a room the buyer is closing early. */
export type CloseMove = "done" | "join" | "close" | "wait" | { refuse: string };

export function closeMove(a: RoomLike): CloseMove {
  if (a.state === "Settled" || a.state === "Cancelled" || a.state === "NoDeal") return "done";
  if (a.state !== "Executing") return { refuse: "the room is not executing yet; the buyer can cancel it alone" };
  if (!a.mutual_close.buyer) return { refuse: "the buyer has not asked to close this room" };
  if (!a.mutual_close.vendor) return "join";
  if (a.closing) return "wait";
  return "close";
}

/** What the buyer does next to end a room and take its NEAR back. */
export type BuyerMove = "cancel" | "mutual_close" | "vendor" | "withdraw";

export function buyerMove(a: RoomLike): BuyerMove {
  if (a.state === "Sealed" || a.state === "Attested") return "cancel";
  if (a.state === "Executing") return a.mutual_close.buyer ? "vendor" : "mutual_close";
  return "withdraw";
}

export interface FinishDeps {
  read(room: string): Promise<RoomLike>;
  cancel(room: string): Promise<unknown>;
  mutualClose(room: string): Promise<unknown>;
  withdrawNear(room: string): Promise<unknown>;
  /** Asks Accord's demo vendor to join the close and step it until the room is settled. */
  vendorClose(room: string): Promise<unknown>;
  /**
   * Sends the account's whole test USDC balance to `beneficiary` (ft_transfer); returns the transaction hash, or null
   * when the balance is already 0. Optional: without it nothing is sent.
   */
  returnTokens?(beneficiary: string): Promise<string | null>;
  /** Deletes the throwaway account, its NEAR to `beneficiary`; returns the transaction hash. */
  deleteSelf(beneficiary: string): Promise<string>;
  wait(ms: number): Promise<void>;
  progress?(text: string): void;
}

export interface Finished {
  rooms: string[];
  /** The ft_transfer that returned the test USDC, or null when there was none to return. */
  tokenTx: string | null;
  deleteTx: string;
}

/** The browser reads through a cache of about 2.5 s (/api/chain): after a call, wait it out before reading again. */
export const READ_SETTLE_MS = 3_000;

const nothingLeft = (e: unknown) => /ERR_NOTHING_TO_WITHDRAW/.test(`${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`);

/** Ends each room the throwaway account is the buyer of, takes its NEAR back, then deletes the account. */
export async function finishThrowaway(account: string, rooms: string[], beneficiary: string, deps: FinishDeps, maxSteps = 12): Promise<Finished> {
  const done: string[] = [];
  for (const room of rooms) {
    for (let step = 0; ; step++) {
      if (step >= maxSteps) throw new Error(`${room} did not close in time; try Finish again in a minute`);
      const a = await deps.read(room);
      if (a.buyer !== account) break; // not this account's room: nothing of ours to take back
      const move = buyerMove(a);
      if (move === "cancel") { deps.progress?.(`Cancelling ${room}…`); await deps.cancel(room); await deps.wait(READ_SETTLE_MS); continue; }
      if (move === "mutual_close") { deps.progress?.(`Asking to close ${room}…`); await deps.mutualClose(room); await deps.wait(READ_SETTLE_MS); continue; }
      if (move === "vendor") { deps.progress?.(`Closing ${room} with the demo vendor…`); await deps.vendorClose(room); await deps.wait(READ_SETTLE_MS); continue; }
      deps.progress?.(`Returning the deposit from ${room}…`);
      try { await deps.withdrawNear(room); } catch (e) { if (!nothingLeft(e)) throw e; }
      done.push(room);
      break;
    }
  }
  // A failed transfer stops here, before the delete, like a failed withdraw: Finish can be run again.
  deps.progress?.("Returning the test USDC to the faucet…");
  const tokenTx = deps.returnTokens ? await deps.returnTokens(beneficiary) : null;
  deps.progress?.("Returning the test NEAR to the faucet…");
  const deleteTx = await deps.deleteSelf(beneficiary);
  return { rooms: done, tokenTx, deleteTx };
}
