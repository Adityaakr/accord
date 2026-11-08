// The re-arm's hands: runs `nextAction`'s decisions on chain as the /try room's own principals. Opening a room is
// the same path `make demo` takes (create, seal the `try` mandates, negotiate, approve, fund, prove the recipient,
// install the agent key). A room is recorded as `opening` the moment it exists on chain and every later step reads
// the chain to see what is left, so a failure halfway is resumed on the next step, never leaked as a second room.
// The agent key it installs lives only in this process.

import { beat, closeRoomMessages, closeTryRoom, recordTryRoom, tryRooms, type TryRoom } from "@accord/store";
import { Account, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import type { AgreementClient, ItemView } from "@accord/sdk";
import {
  activate, approveBoth, authorise, client, companyMandate, create, deliverAndAccept, fundTotal, installAgent, negotiate,
  PRESETS, sleep, waitFor,
} from "../../../packages/live/src/flow.js";
import type { World } from "../../../packages/live/src/world.js";
import { describe, nextAction, type RearmConfig, type RoomSnapshot } from "./rearm.js";

export interface ArmedRoom { agreement: string; key: string; deal: AgreementClient }

const settledCount = (items: ItemView[]) => items.filter((i) => i.status === "Paid" || i.status === "AssumedPaid").length;

export class TryRoomKeeper {
  private room: ArmedRoom | null = null;
  private keylessSince: number | null = null;

  constructor(private readonly w: World, private readonly cfg: RearmConfig, private readonly log: (s: string) => void) {}

  /** The room the agent should act for, with the key it holds. */
  current(): ArmedRoom | null {
    return this.room;
  }

  async step(): Promise<void> {
    const rooms = await tryRooms(50);
    const today = new Date().toISOString().slice(0, 10);
    const openedToday = rooms.filter((r) => r.opened_at.slice(0, 10) === today).length;
    const opening = rooms.find((r) => r.status === "opening");
    if (opening) {
      await this.finishOpening(opening);
      return;
    }
    const open = rooms.find((r) => r.status === "open");
    const snap = open ? await this.snapshot(open.agreement) : null;
    const now = snap?.view.now ?? Math.floor(Date.now() / 1000);
    if (this.room && this.room.agreement !== open?.agreement) this.room = null;
    this.keylessSince = snap && !snap.view.agent_key ? (this.keylessSince ?? now) : null;
    let action = nextAction(snap, now, this.keylessSince, openedToday, this.cfg);
    // After a restart this process no longer holds the room's key: replace it at once (the contract revokes the old).
    if (snap?.view.agent_key && this.room === null && ["none", "deliver", "top_up"].includes(action.kind)) {
      action = { kind: "install_key" };
    }
    if (action.kind === "none" || action.kind === "wait_for_tomorrow") {
      await beat("rearm", { room: open?.agreement ?? null, action: action.kind, opened_today: openedToday });
      return;
    }
    const id = open?.agreement;
    switch (action.kind) {
      case "open": {
        const id = await create(this.w, "procurement", "The /try room");
        await recordTryRoom(id, "opening");
        this.log(`try room ${id} · created · opening`);
        await this.finishOpening({ agreement: id, opened_at: new Date().toISOString(), closed_at: null, items_paid: 0, status: "opening" });
        break;
      }
      case "install_key": {
        const agent = await installAgent(this.w, id!);
        this.room = { agreement: id!, key: agent.secret, deal: agent.deal };
        this.keylessSince = null;
        this.log(`try room ${id} · re-armed · new agent key ${agent.publicKey}`);
        break;
      }
      case "deliver":
        await deliverAndAccept(this.w, id!, action.item);
        this.log(`try room ${id} · ${describe(action)}`);
        break;
      case "top_up":
        await this.topUp(id!);
        this.log(`try room ${id} · ${describe(action, snap!.liquid)}`);
        break;
      case "close":
        await this.closeRoom(id!);
        this.log(`try room ${id} · ${describe(action)}`);
        break;
      case "forget":
        await this.release(id!, snap!.items);
        this.log(`try room ${id} · ${describe(action)}`);
        break;
    }
  }

  private async snapshot(id: string): Promise<RoomSnapshot> {
    const deal = this.w.reader.agreement(id);
    const [view, items, receipts, budget] = await Promise.all([deal.get(), deal.items(), deal.receipts(), deal.budget()]);
    return { view, items, receipts, liquid: BigInt(budget.liquid) };
  }

  /** Takes an `opening` room from wherever it stopped to `open`, reading each step's state from the chain. */
  private async finishOpening(r: TryRoom): Promise<void> {
    const w = this.w;
    const id = r.agreement;
    const deal = w.reader.agreement(id);
    let a = await deal.get();
    if (a.state === "NoDeal" || a.state === "Cancelled" || a.state === "Settled") {
      await this.release(id, await deal.items());
      this.log(`try room ${id} · ${a.state} while opening · released`);
      return;
    }
    const c = await deal.commitments();
    if (!c.buyer) await client(w, "buyer", id).sealMandate(companyMandate(PRESETS.try.buyer), { role: "buyer" });
    if (!c.vendor) await client(w, "vendor", id).sealMandate(companyMandate(PRESETS.try.vendor), { role: "vendor" });
    a = await deal.get();
    if (a.state === "Sealed") a = await negotiate(w, id);
    if (a.state === "Attested") {
      await approveBoth(w, id);
      a = await deal.get();
    }
    if (a.state !== "Executing") throw new Error(`try room ${id} is ${a.state} while opening`);
    if (BigInt(a.funded) < BigInt(a.total ?? "0")) await fundTotal(w, id);
    await this.ensureRecipient(id);
    const agent = await installAgent(w, id);
    await recordTryRoom(id, "open");
    this.room = { agreement: id, key: agent.secret, deal: agent.deal };
    this.keylessSince = null;
    this.log(`try room ${id} · opened · agent key ${agent.publicKey}`);
  }

  /** An active recipient, finishing a version already under way rather than proposing another. */
  private async ensureRecipient(id: string): Promise<void> {
    const w = this.w;
    const versions = await w.reader.agreement(id).recipients();
    if (versions.some((v) => v.status === "Active")) return;
    const pending = [...versions].reverse().find((v) => ["Proposed", "Proven", "AuthorityApproved", "Accepted"].includes(v.status));
    if (!pending) {
      await authorise(w, id, w.principals.recipient.account);
      return;
    }
    const v = await waitFor("the Payee job's proof", 120, async () => {
      const cur = (await w.reader.agreement(id).recipients())[pending.version - 1];
      return cur && cur.status !== "Proposed" ? cur : undefined;
    });
    if (v.status === "ProofFailed") throw new Error(`try room ${id}: the payee proof failed: ${v.failure}`);
    if (v.status === "Proven") await client(w, "authority", id).approveRecipient(v.version);
    if (v.status === "Proven" || v.status === "AuthorityApproved") {
      await client(w, "buyer", id).acceptRecipient(v.version, { acknowledgeWarnings: v.rating === "warn" });
    }
    await activate(w, id, v.version);
  }

  /** The try buyer sends the room 1 NEAR; the agreement keeps it for gas and storage until it is withdrawn. */
  private async topUp(id: string): Promise<void> {
    const p = this.w.principals.buyer;
    const acct = new Account(p.account, this.w.reader.chain.provider, new KeyPairSigner(KeyPair.fromString(p.key as KeyPairString)));
    await acct.transfer({ receiverId: id, amount: 1_000_000_000_000_000_000_000_000n });
  }

  /**
   * Both principals agree to close, then `close()` is driven until the agreement is `Settled` (each call settles one
   * step: an eligible item, or the final balance read and refund). Only then is the room recorded as closed.
   */
  private async closeRoom(id: string): Promise<void> {
    const deal = this.w.reader.agreement(id);
    const a0 = await deal.get();
    if (!a0.mutual_close.buyer) await client(this.w, "buyer", id).mutualClose();
    if (!(await deal.get()).mutual_close.vendor) await client(this.w, "vendor", id).mutualClose();
    for (let i = 0; i < 40; i++) {
      const a = await deal.get();
      if (a.state !== "Executing") break;
      if (!a.in_flight && !a.closing) await client(this.w, "buyer", id).close().catch(() => undefined);
      await sleep(3000);
    }
    const a = await deal.get();
    if (a.state !== "Settled") throw new Error(`try room ${id}: still ${a.state} after closing; trying again next step`);
    await this.release(id, await deal.items());
  }

  /** Withdraws the room's spare NEAR, closes its waiting messages and records it as closed. */
  private async release(id: string, items: ItemView[]): Promise<void> {
    try {
      await client(this.w, "buyer", id).withdrawNear();
    } catch (e) {
      if (!/ERR_NOTHING_TO_WITHDRAW|ERR_WRONG_STATE/.test((e as Error).message)) throw e;
    }
    await closeRoomMessages(id);
    await closeTryRoom(id, settledCount(items));
    if (this.room?.agreement === id) this.room = null;
  }
}
