// Read models for the pages, built from contract views only.

import "server-only";
import type {
  AgreementRecord, AgreementView, ExceptionView, ItemView, PeriodView, Receipt, RecipientVersion, Refusal, Terms,
  StoredObservation,
} from "@accord/sdk";
import { accord, source, type Source } from "./accord";

export interface RoomSummary {
  record: AgreementRecord;
  view: AgreementView | null;
}

export async function rooms(party?: string): Promise<{ rooms: RoomSummary[]; source: Source }> {
  const a = accord();
  const [records, src] = await Promise.all([party ? a.listAgreements({ party }) : a.listAgreements({ limit: 100 }), source()]);
  const views = await Promise.all(records.map((r) => a.agreement(r.account).get().catch(() => null)));
  return { rooms: records.map((record, i) => ({ record, view: views[i] ?? null })).reverse(), source: src };
}

export interface Room {
  view: AgreementView;
  terms: Terms | null;
  items: ItemView[];
  refusals: Refusal[];
  recipients: RecipientVersion[];
  exceptions: ExceptionView[];
  periods: PeriodView[];
  observations: StoredObservation[][];
  receipts: Receipt[];
  source: Source;
}

export async function room(id: string): Promise<Room> {
  const d = accord().agreement(id);
  const [view, terms, items, refusals, recipients, exceptions, periods, receipts, src] = await Promise.all([
    d.get(), d.terms(), d.items(), d.refusals(undefined, 128), d.recipients(), d.exceptions(), d.periods(), d.receipts(),
    source(),
  ]);
  const observations = await Promise.all(periods.map((p) => d.observations(p.period)));
  return { view, terms, items, refusals: refusals.reverse(), recipients, exceptions, periods, observations, receipts, source: src };
}

// ---------- Home: one person's rooms, what needs them, and the numbers (PLATFORM.md §7) ----------

export type Role = "buyer" | "vendor" | "authority";

export interface NeedsYou {
  room: string;
  title: string;
  /** What to do, in a few words ("Approve the terms") */
  action: string;
  /** Why, in one line */
  detail: string;
  href: string;
  /** Lower is more urgent */
  rank: number;
}

export interface PortfolioRoom {
  account: string;
  title: string;
  kind: string;
  state: string;
  roles: Role[];
  counterparty: string;
  total: string;
  paid: string;
  escrowed: string;
  refusals: number;
  agent: "active" | "revoked" | "none" | null;
}

export interface Portfolio {
  account: string;
  rooms: PortfolioRoom[];
  needs: NeedsYou[];
  escrowed: string;
  paidThisMonth: string;
  paidTotal: string;
  refused: number;
  topCode: { code: string; count: number } | null;
  nextEligible: { room: string; title: string; amount: string; at: number | null; payableNow: boolean; waiting: string } | null;
  agents: { active: number; revoked: number; none: number; lastCall: number | null };
  source: Source;
}

const big = (s: string | null | undefined) => BigInt(s ?? "0");

export async function portfolio(account: string): Promise<Portfolio> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ party: account }), source()]);
  const monthStart = Math.floor(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1) / 1000);

  const out: Portfolio = {
    account, rooms: [], needs: [], escrowed: "0", paidThisMonth: "0", paidTotal: "0", refused: 0, topCode: null,
    nextEligible: null, agents: { active: 0, revoked: 0, none: 0, lastCall: null }, source: src,
  };
  let escrowed = 0n, paidMonth = 0n, paidTotal = 0n;
  const codes = new Map<string, number>();

  await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view) return;
    const roles: Role[] = [];
    if (view.buyer === account) roles.push("buyer");
    if (view.vendor === account) roles.push("vendor");
    if (view.vendor_authority === account) roles.push("authority");
    const isBuyer = roles.includes("buyer"), isVendor = roles.includes("vendor"), isAuthority = roles.includes("authority");

    const [items, exceptions, refusals, receipts, commitments, periods] = await Promise.all([
      d.items().catch(() => []), d.exceptions().catch(() => []), d.refusals(undefined, 128).catch(() => []),
      d.receipts().catch(() => []), d.commitments().catch(() => ({ buyer: null, vendor: null })), d.periods().catch(() => []),
    ]);

    const roomEscrow = big(view.funded) - big(view.paid) - big(view.refunded);
    if (isBuyer && roomEscrow > 0n) escrowed += roomEscrow;
    for (const r of receipts) {
      paidTotal += big(r.amount);
      if (r.at >= monthStart) paidMonth += big(r.amount);
    }
    out.refused += refusals.length;
    for (const r of refusals) codes.set(r.code, (codes.get(r.code) ?? 0) + 1);

    const agent: PortfolioRoom["agent"] = !isBuyer ? null : view.agent_key ? "active" : view.revoked_keys > 0 ? "revoked" : "none";
    if (agent === "active") out.agents.active++;
    if (agent === "revoked") out.agents.revoked++;
    if (agent === "none" && view.state === "Executing") out.agents.none++;
    const lastAgent = refusals.filter((r) => r.via === "agent").map((r) => r.at).concat(receipts.filter((r) => r.via === "agent").map((r) => r.at));
    if (isBuyer && lastAgent.length) out.agents.lastCall = Math.max(out.agents.lastCall ?? 0, ...lastAgent);

    out.rooms.push({
      account: record.account, title: view.title, kind: view.kind, state: view.state, roles,
      counterparty: isBuyer ? view.vendor : view.buyer, total: view.total, paid: view.paid,
      escrowed: (roomEscrow > 0n ? roomEscrow : 0n).toString(), refusals: view.refusals, agent,
    });

    // what this person can do next in this room
    const room = record.account, title = view.title, href = `/agreements/${room}`;
    const need = (action: string, detail: string, rank: number, to = href) => out.needs.push({ room, title, action, detail, href: to, rank });
    const live = view.state === "Executing";
    if (view.state === "Sealed" && view.negotiation === "AwaitingMandates") {
      if (isBuyer && !commitments.buyer) need("Seal your limits", "The negotiation starts once both mandates are sealed.", 1, `${href}/seal`);
      if (isVendor && !commitments.vendor) need("Seal your limits", "The negotiation starts once both mandates are sealed.", 1, `${href}/seal`);
    }
    if (view.state === "Attested") {
      if (isBuyer && !view.approvals.buyer) need("Approve the terms", "The agreed terms wait for your approval.", 0);
      if (isVendor && !view.approvals.vendor) need("Approve the terms", "The agreed terms wait for your approval.", 0);
    }
    if (live && isBuyer && big(view.funded) < big(view.total)) need("Fund the escrow", "Payments become possible once the agreement holds its USDC.", 1);
    const pr = view.pending_recipient;
    if (pr?.status === "Proven" && isAuthority) need("Approve the recipient", `${pr.account} proved the vendor's domain.`, 0);
    if (pr?.status === "AuthorityApproved" && isBuyer) need("Accept the recipient", `${pr.account}, approved by the vendor's authority.`, 0);
    if (live && isVendor && !view.recipient && !pr) need("Propose a recipient", "Name the account payments go to; it is proven against your domain.", 1);
    const pendingEx = exceptions.filter((e) => e.status === "pending");
    if (isBuyer && pendingEx.length) need("Decide an exception", `${pendingEx.length} request${pendingEx.length > 1 ? "s" : ""} held for you.`, 0);
    const delivered = items.filter((i) => i.status === "Delivered");
    if (isBuyer && delivered.length) need("Review a delivery", `${delivered.length} deliver${delivered.length > 1 ? "ies" : "y"} to accept or dispute.`, 0);
    const review = periods.filter((p) => p.outcome === "Review");
    if (isBuyer && review.length) need("Resolve a period", "Its observations disagreed; you decide whether it pays.", 0);
    if (live && isBuyer && agent === "none") need("Connect an agent", "It will be able to call act() and nothing else.", 2);

    // the next payment that can, or will, go out
    for (const it of items) {
      const payableNow = it.status === "Eligible";
      const upcoming = it.status === "Open" || it.status === "Delivered";
      if (!payableNow && !upcoming) continue;
      const at = payableNow ? (it.eligible_at ?? view.now) : it.due_at;
      const cur = out.nextEligible;
      const better = !cur || (payableNow && !cur.payableNow) || (payableNow === cur.payableNow && (at ?? Infinity) < (cur.at ?? Infinity));
      if (better) {
        const waiting = payableNow ? "Eligible now" : it.status === "Delivered" ? "Waiting for delivery acceptance"
          : view.kind === "market-making" ? "Waiting for the period's observations" : "Waiting for delivery";
        out.nextEligible = { room, title, amount: it.due_amount, at: at ?? null, payableNow, waiting };
      }
    }
  }));

  out.rooms.sort((x, y) => x.title.localeCompare(y.title));
  out.needs.sort((x, y) => x.rank - y.rank || x.title.localeCompare(y.title));
  out.escrowed = escrowed.toString();
  out.paidThisMonth = paidMonth.toString();
  out.paidTotal = paidTotal.toString();
  const top = [...codes.entries()].sort((x, y) => y[1] - x[1])[0];
  out.topCode = top ? { code: top[0], count: top[1] } : null;
  return out;
}
