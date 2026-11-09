// The stale demo room sweep: what Accord's demo vendor does with a room a visitor opened against it and then left.
//
// A wallet-free visit (/try-it, "Try without a wallet") signs with a throwaway key kept in the tab's sessionStorage.
// Closing the tab before Finish loses that key, and with it every move only the buyer can make. What the contract
// lets the demo vendor do instead (contracts/agreement):
//
// - `cancel` (negotiation.rs `cancel`): either party, only while the room is `Sealed` or `Attested`. The vendor can end
//   an abandoned room before execution. This is the one move the sweep makes.
// - `withdraw_near` (payments.rs `withdraw_near`): the buyer alone (`require_buyer`, 1 yoctoNEAR), and it pays the
//   buyer (`Promise::new(self.buyer)`). The 2 NEAR creation deposit of a cancelled room therefore stays on the room
//   until the buyer's key withdraws it; with the key lost, nobody can. No path pays it to the vendor or the faucet.
// - `mutual_close` needs both parties (payments.rs `mutual_close`), so the vendor cannot end an `Executing` room early.
//   `close` is open to anyone, but only after the term and grace (`require_term_over`); the keeper already calls it,
//   and it refunds the escrow to the buyer (`refund_buyer`), not to the faucet.
// - The throwaway account itself (its spare NEAR and test USDC) is an implicit account whose only key was the lost
//   one: nothing on chain can move its funds.
//
// So the sweep recovers no funds. It ends abandoned rooms honestly (the record says `Cancelled`, the demo vendor stops
// serving them, and no keeper or panel spends the room's balance on a negotiation nobody will finish), and a wallet
// visitor who comes back later can still `withdraw_near` the deposit of a cancelled room. Pure, so it is unit-tested.

export interface SweepRoom {
  account: string;
  state: string;
  vendor: string;
  vendor_authority: string;
  /** Unix seconds, from the factory's record */
  created_at: number;
}

export type SweepMove = { cancel: true } | { cancel: false; reason: string };

export interface SweepOptions {
  vendor: string;
  authority: string;
  /** How long a room may sit before execution before the demo vendor walks away from it. */
  staleSecs: number;
}

/** A guided deal takes about 5 minutes; a room still waiting after this long has been left. */
export const DEFAULT_STALE_SECS = 6 * 3600;

export function sweepMove(r: SweepRoom, nowSecs: number, o: SweepOptions): SweepMove {
  if (r.vendor !== o.vendor || r.vendor_authority !== o.authority) return { cancel: false, reason: "not a demo room" };
  if (r.state === "Cancelled" || r.state === "NoDeal" || r.state === "Settled") return { cancel: false, reason: "already ended" };
  if (r.state === "Executing") return { cancel: false, reason: "executing: the vendor cannot end it alone; the keeper closes it after its term" };
  if (r.state !== "Sealed" && r.state !== "Attested") return { cancel: false, reason: `state ${r.state}` };
  const age = nowSecs - r.created_at;
  if (age < o.staleSecs) return { cancel: false, reason: `opened ${Math.max(0, Math.round(age / 60))} min ago` };
  return { cancel: true };
}

export interface SweepDeps {
  /** The demo vendor's rooms on every configured factory, from the factories' records. */
  list(): Promise<{ account: string; created_at: number }[]>;
  /** The room as the chain has it now (null when it cannot be read). */
  read(account: string): Promise<{ state: string; vendor: string; vendor_authority: string } | null>;
  /** `cancel` signed by the demo vendor; returns the transaction hash. */
  cancel(account: string): Promise<string>;
  log(line: string): void;
}

export interface SweepResult {
  cancelled: { account: string; tx: string }[];
  failed: { account: string; error: string }[];
  checked: number;
}

/**
 * One pass: reads each of the demo vendor's rooms and cancels the ones left before execution, at most `max` per pass.
 * Idempotent: every room is read from the chain just before its move, and an ended room is never touched again.
 */
export async function runSweep(deps: SweepDeps, o: SweepOptions & { now: number; max: number; only?: string[] }): Promise<SweepResult> {
  const out: SweepResult = { cancelled: [], failed: [], checked: 0 };
  const records = (await deps.list()).filter((r) => !o.only || o.only.includes(r.account));
  for (const rec of records) {
    if (out.cancelled.length + out.failed.length >= o.max) break;
    // the record's age first: a fresh room needs no read at all
    if (o.now - rec.created_at < o.staleSecs) continue;
    const v = await deps.read(rec.account).catch(() => null);
    if (!v) continue;
    out.checked++;
    const move = sweepMove({ ...v, account: rec.account, created_at: rec.created_at }, o.now, o);
    if (!move.cancel) continue;
    try {
      const tx = await deps.cancel(rec.account);
      out.cancelled.push({ account: rec.account, tx });
      deps.log(`sweep ${rec.account} · ${v.state} for ${Math.round((o.now - rec.created_at) / 3600)} h · cancel · tx ${tx}`);
    } catch (e) {
      const error = String((e as Error)?.message ?? e).split("\n")[0]!.slice(0, 160);
      out.failed.push({ account: rec.account, error });
      deps.log(`sweep ${rec.account} · cancel failed: ${error}`);
    }
  }
  return out;
}
