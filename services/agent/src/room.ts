// The re-arm's hands: runs `nextAction`'s decisions on chain as the /try room's own principals. Opening a room is
// the same path `make demo` takes (create, seal the `try` mandates, negotiate, approve, fund, prove the recipient,
// install the agent key); the agent key it installs lives only in this process.

import { beat, closeTryRoom, openTryRoom, tryRooms } from "@accord/store";
import { Account, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import { KeySigner, type AgreementClient } from "@accord/sdk";
import {
  approveBoth, authorise, client, create, deliverAndAccept, fundTotal, installAgent, negotiate, PRESETS, sealBoth,
} from "../../../packages/live/src/flow.js";
import type { World } from "../../../packages/live/src/world.js";
import { describe, nextAction, type RearmConfig, type RoomSnapshot } from "./rearm.js";

export interface ArmedRoom { agreement: string; key: string; deal: AgreementClient }

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
    const open = rooms.find((r) => r.status === "open");
    const snap = open ? await this.snapshot(open.agreement) : null;
    const today = new Date().toISOString().slice(0, 10);
    const openedToday = rooms.filter((r) => r.opened_at.slice(0, 10) === today).length;
    const now = snap?.view.now ?? Math.floor(Date.now() / 1000);
    if (this.room && this.room.agreement !== open?.agreement) this.room = null;
    this.keylessSince = snap && !snap.view.agent_key ? (this.keylessSince ?? now) : null;
    let action = nextAction(snap, now, this.keylessSince, openedToday, this.cfg);
    // After a restart this process no longer holds the room's key: replace it at once (the contract revokes the old).
    const held = this.room !== null;
    if (snap?.view.agent_key && !held && ["none", "deliver", "top_up"].includes(action.kind)) action = { kind: "install_key" };
    if (action.kind === "none" || action.kind === "wait_for_tomorrow") {
      await beat("rearm", { room: open?.agreement ?? null, action: action.kind, opened_today: openedToday });
      return;
    }
    const id = open?.agreement;
    switch (action.kind) {
      case "open": {
        const room = await this.openRoom();
        this.log(`try room ${room.agreement} · opened · agent key ${new KeySigner(room.agreement, room.key, this.w.reader.chain).publicKey}`);
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
        await this.closeRoom(id!, snap!);
        this.log(`try room ${id} · ${describe(action)}`);
        break;
      case "forget": {
        const paid = snap!.items.filter((i) => i.status === "Paid").length;
        await closeTryRoom(id!, paid);
        this.room = null;
        this.log(`try room ${id} · ${describe(action)}`);
        break;
      }
    }
  }

  private async snapshot(id: string): Promise<RoomSnapshot> {
    const deal = this.w.reader.agreement(id);
    const [view, items, receipts, budget] = await Promise.all([deal.get(), deal.items(), deal.receipts(), deal.budget()]);
    return { view, items, receipts, liquid: BigInt(budget.liquid) };
  }

  private async openRoom(): Promise<ArmedRoom> {
    const w = this.w;
    const id = await create(w, "procurement", "The /try room");
    await sealBoth(w, id, PRESETS.try);
    const a = await negotiate(w, id);
    if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
    await approveBoth(w, id);
    await fundTotal(w, id);
    await authorise(w, id, w.principals.recipient.account);
    const agent = await installAgent(w, id);
    await openTryRoom(id);
    this.room = { agreement: id, key: agent.secret, deal: agent.deal };
    this.keylessSince = null;
    return this.room;
  }

  /** The try buyer sends the room 1 NEAR; the agreement keeps it for gas and storage until it is withdrawn. */
  private async topUp(id: string): Promise<void> {
    const p = this.w.principals.buyer;
    const acct = new Account(p.account, this.w.reader.chain.provider, new KeyPairSigner(KeyPair.fromString(p.key as KeyPairString)));
    await acct.transfer({ receiverId: id, amount: 1_000_000_000_000_000_000_000_000n });
  }

  /** Both principals agree to close; the room settles, its spare NEAR goes back to the try buyer. */
  private async closeRoom(id: string, snap: RoomSnapshot): Promise<void> {
    await client(this.w, "buyer", id).mutualClose();
    await client(this.w, "vendor", id).mutualClose();
    await client(this.w, "buyer", id).withdrawNear().catch(() => undefined);
    await closeTryRoom(id, snap.items.filter((i) => i.status === "Paid").length);
    this.room = null;
  }
}
