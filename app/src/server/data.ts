// Read models for the pages, built from contract views only.

import "server-only";
import type {
  AgreementRecord, AgreementView, Commitment, ExceptionView, ItemView, PeriodView, Receipt, RecipientVersion, Refusal, Terms,
  StoredObservation,
} from "@accord/sdk";
import { accord, source, type Source } from "./accord";
import { currentStep } from "@/app/agreements/[id]/pipeline";

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
  /** Each side's sealed mandate commitment (public: ciphertext and hash only), or null before it seals */
  commitments: { buyer: Commitment | null; vendor: Commitment | null };
  source: Source;
}

export async function room(id: string): Promise<Room> {
  const d = accord().agreement(id);
  const [view, terms, items, refusals, recipients, exceptions, periods, receipts, commitments, src] = await Promise.all([
    d.get(), d.terms(), d.items(), d.refusals(undefined, 128), d.recipients(), d.exceptions(), d.periods(), d.receipts(),
    d.commitments().catch(() => ({ buyer: null, vendor: null })), source(),
  ]);
  const observations = await Promise.all(periods.map((p) => d.observations(p.period)));
  return { view, terms, items, refusals: refusals.reverse(), recipients, exceptions, periods, observations, receipts, commitments, source: src };
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
  /** The role this is for: Home shows only the needs of the workspace in use */
  role: Role;
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
    const need = (action: string, detail: string, rank: number, to = href, role: Role = "buyer") => out.needs.push({ room, title, action, detail, href: to, rank, role });
    const live = view.state === "Executing";
    if (view.state === "Sealed" && view.negotiation === "AwaitingMandates") {
      if (isBuyer && !commitments.buyer) need("Seal your limits", "The negotiation starts once both mandates are sealed.", 1, `${href}/seal`);
      if (isVendor && !commitments.vendor) need("Seal your limits", "The negotiation starts once both mandates are sealed.", 1, `${href}/seal`, "vendor");
    }
    if (view.state === "Attested") {
      if (isBuyer && !view.approvals.buyer) need("Approve the terms", "The agreed terms wait for your approval.", 0);
      if (isVendor && !view.approvals.vendor) need("Approve the terms", "The agreed terms wait for your approval.", 0, href, "vendor");
    }
    if (live && isBuyer && big(view.funded) < big(view.total)) need("Fund the escrow", "Payments become possible once the agreement holds its USDC.", 1);
    const pr = view.pending_recipient;
    if (pr?.status === "Proven" && isAuthority) need("Approve the recipient", `${pr.account} proved the vendor's domain.`, 0, href, "authority");
    if (pr?.status === "AuthorityApproved" && isBuyer) need("Accept the recipient", `${pr.account}, approved by the vendor's authority.`, 0);
    if (live && isVendor && !view.recipient && !pr) need("Propose a recipient", "Name the account payments go to; it is proven against your domain.", 1, href, "vendor");
    if (live && isVendor) {
      const claimable = items.filter((i) => i.status === "Eligible").length;
      if (claimable) need("Claim a payment", `${claimable} eligible payment${claimable > 1 ? "s" : ""} you can claim to your recipient.`, 1, `${href}?tab=funds`, "vendor");
    }
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

// ---------- Approvals, Agents, Recipients (PLATFORM.md §6): read models across one person's rooms ----------

export type ApprovalKind = "seal" | "terms" | "recipient-approve" | "recipient-accept" | "delivery" | "exception" | "period";

export interface ApprovalItem {
  key: string;
  kind: ApprovalKind;
  room: string;
  title: string;
  role: Role;
  /** What is waiting, in a few words */
  what: string;
  detail: string;
  /** In token base units, when the decision is about an amount */
  amount: string | null;
  /** The account the money would go to, when there is one */
  recipient: string | null;
  /** When it started waiting (unix seconds) */
  at: number;
  /** The exception id, item id, recipient version or period index the action takes */
  ref: number | null;
  termsHash: string | null;
  /** For a recipient decision: the lookalike rating */
  rating: string | null;
  href: string;
}

export interface Approvals { account: string; items: ApprovalItem[]; source: Source }

function rolesIn(view: AgreementView, account: string): Role[] {
  const roles: Role[] = [];
  if (view.buyer === account) roles.push("buyer");
  if (view.vendor === account) roles.push("vendor");
  if (view.vendor_authority === account) roles.push("authority");
  return roles;
}

export async function approvals(account: string): Promise<Approvals> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ party: account }), source()]);
  const items: ApprovalItem[] = [];
  await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view) return;
    const roles = rolesIn(view, account);
    const isBuyer = roles.includes("buyer"), isVendor = roles.includes("vendor"), isAuthority = roles.includes("authority");
    const [its, exceptions, recipients, periods, commitments] = await Promise.all([
      d.items().catch(() => [] as ItemView[]), d.exceptions().catch(() => [] as ExceptionView[]),
      d.recipients().catch(() => [] as RecipientVersion[]), d.periods().catch(() => [] as PeriodView[]),
      d.commitments().catch(() => ({ buyer: null, vendor: null })),
    ]);
    const room = record.account, title = view.title, href = `/agreements/${room}`;
    const payee = view.recipient?.account ?? null;
    const push = (x: Omit<ApprovalItem, "room" | "title" | "href" | "key"> & { href?: string }) =>
      items.push({ room, title, href: x.href ?? href, key: `${room}:${x.kind}:${x.ref ?? ""}:${x.role}`, ...x });
    const base = { amount: null, recipient: null, ref: null, termsHash: null, rating: null };

    if (view.state === "Sealed" && view.negotiation === "AwaitingMandates") {
      for (const r of (["buyer", "vendor"] as const)) {
        if (roles.includes(r) && !commitments[r]) {
          push({ ...base, kind: "seal", role: r, what: "Seal your limits", detail: "The negotiation starts once both mandates are sealed.", at: record.created_at, href: `${href}/seal` });
        }
      }
    }
    if (view.state === "Attested" && view.terms_hash) {
      const sealedAt = Math.max(commitments.buyer?.at ?? 0, commitments.vendor?.at ?? 0, record.created_at);
      for (const r of (["buyer", "vendor"] as const)) {
        if (roles.includes(r) && !view.approvals[r]) {
          push({ ...base, kind: "terms", role: r, what: "Approve the terms", detail: "The agreed terms wait for your approval.", amount: view.total, recipient: payee, termsHash: view.terms_hash, at: sealedAt });
        }
      }
    }
    for (const v of recipients) {
      if (isAuthority && v.status === "Proven") {
        push({ ...base, kind: "recipient-approve", role: "authority", what: "Approve the recipient", detail: `Proven against ${v.domain}.`, recipient: v.account, ref: v.version, rating: v.rating, at: v.proposed_at });
      }
      if (isBuyer && v.status === "AuthorityApproved") {
        push({ ...base, kind: "recipient-accept", role: "buyer", what: "Accept the recipient", detail: `Approved by ${view.vendor_authority} for ${v.domain}.`, recipient: v.account, ref: v.version, rating: v.rating, at: v.proposed_at });
      }
    }
    if (isBuyer) {
      for (const it of its) {
        if (it.status === "Delivered" && it.delivery && it.delivery.window_end > view.now) {
          push({ ...base, kind: "delivery", role: "buyer", what: "Review a delivery", detail: `Item ${it.id} · accept or dispute before the window closes.`, amount: it.due_amount, recipient: payee, ref: it.id, at: it.delivery.at });
        }
      }
      for (const e of exceptions) {
        if (e.status === "pending") {
          push({ ...base, kind: "exception", role: "buyer", what: "Decide an exception", detail: `Asked by the ${e.by}: ${e.reason}`, amount: e.amount, recipient: payee, ref: e.id, at: e.at });
        }
      }
      for (const p of periods) {
        if (p.outcome === "Review" || p.outcome === "Withheld") {
          push({ ...base, kind: "period", role: "buyer", what: "Resolve a period", detail: `Period ${p.period + 1}: ${p.passed} of ${p.observed} observations passed${p.conflict ? ", readings disagree" : ""}.`, recipient: payee, ref: p.period, at: p.ends_at ?? record.created_at });
        }
      }
    }
    void isVendor;
  }));
  items.sort((x, y) => y.at - x.at || x.title.localeCompare(y.title));
  return { account, items, source: src };
}

export interface AgentRow {
  room: string;
  title: string;
  state: string;
  key: string | null;
  status: "active" | "revoked" | "none";
  revoked: number;
  lastCall: number | null;
  payments: number;
  refusals: number;
  topCode: string | null;
}

export async function agents(account: string): Promise<{ account: string; rows: AgentRow[]; source: Source }> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ party: account }), source()]);
  const rows: AgentRow[] = [];
  await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view || view.buyer !== account) return;
    const [refusals, receipts] = await Promise.all([d.refusals(undefined, 128).catch(() => [] as Refusal[]), d.receipts().catch(() => [] as Receipt[])]);
    const byAgent = refusals.filter((r) => r.via === "agent");
    const paid = receipts.filter((r) => r.via === "agent");
    const calls = byAgent.map((r) => r.at).concat(paid.map((r) => r.at));
    const codes = new Map<string, number>();
    for (const r of byAgent) codes.set(r.code, (codes.get(r.code) ?? 0) + 1);
    const top = [...codes.entries()].sort((x, y) => y[1] - x[1])[0];
    rows.push({
      room: record.account, title: view.title, state: view.state, key: view.agent_key,
      status: view.agent_key ? "active" : view.revoked_keys > 0 ? "revoked" : "none", revoked: view.revoked_keys,
      lastCall: calls.length ? Math.max(...calls) : null, payments: paid.length, refusals: byAgent.length, topCode: top ? top[0] : null,
    });
  }));
  const order = { active: 0, none: 1, revoked: 2 } as const;
  rows.sort((x, y) => order[x.status] - order[y.status] || x.title.localeCompare(y.title));
  return { account, rows, source: src };
}

export interface RecipientRow {
  room: string;
  title: string;
  roles: Role[];
  buyer: string;
  vendor: string;
  authority: string;
  now: number;
  current: { version: number; account: string; domain: string; activeAt: number | null; proposedAt: number } | null;
  pending: { version: number; account: string; domain: string; status: string; proposedAt: number; activeAt: number | null; rating: string | null } | null;
}

const PENDING = new Set(["Proposed", "Proven", "AuthorityApproved", "Accepted"]);

export async function recipients(account: string): Promise<{ account: string; rows: RecipientRow[]; source: Source }> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ party: account }), source()]);
  const rows: RecipientRow[] = [];
  await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view) return;
    const versions = await d.recipients().catch(() => [] as RecipientVersion[]);
    const cur = versions.find((v) => v.status === "Active") ?? null;
    const pen = versions.find((v) => PENDING.has(v.status)) ?? null;
    if (!cur && !pen) return;
    rows.push({
      room: record.account, title: view.title, roles: rolesIn(view, account), buyer: view.buyer, vendor: view.vendor,
      authority: view.vendor_authority, now: view.now,
      current: cur && { version: cur.version, account: cur.account, domain: cur.domain, activeAt: cur.active_at, proposedAt: cur.proposed_at },
      pending: pen && { version: pen.version, account: pen.account, domain: pen.domain, status: pen.status, proposedAt: pen.proposed_at, activeAt: pen.active_at, rating: pen.rating },
    });
  }));
  rows.sort((x, y) => Number(!!y.pending) - Number(!!x.pending) || x.title.localeCompare(y.title));
  return { account, rows, source: src };
}

// ---------- Deal rooms table (PLATFORM.md §6): one row per room with its step and what is next ----------

export interface RoomRow {
  account: string;
  title: string;
  kind: string;
  state: string;
  buyer: string;
  vendor: string;
  /** Index into STEPS, or -1 when the room ended without a deal */
  step: number;
  terminal: "NoDeal" | "Cancelled" | null;
  escrowed: string;
  paid: string;
  total: string;
  next: { amount: string; payableNow: boolean } | null;
  refusals: number;
  /** How many things in this room wait on the signed-in account (0 without one) */
  needs: number;
  roles: Role[];
}

export async function roomTable(party?: string): Promise<{ rows: RoomRow[]; source: Source }> {
  const a = accord();
  const [records, src, folio] = await Promise.all([
    party ? a.listAgreements({ party }) : a.listAgreements({ limit: 100 }),
    source(),
    party ? portfolio(party).catch(() => null) : Promise.resolve(null),
  ]);
  const needsBy = new Map<string, number>();
  for (const n of folio?.needs ?? []) needsBy.set(n.room, (needsBy.get(n.room) ?? 0) + 1);
  const rows = await Promise.all(records.map(async (record): Promise<RoomRow | null> => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view) return null;
    const [items, periods] = await Promise.all([d.items().catch(() => [] as ItemView[]), d.periods().catch(() => [] as PeriodView[])]);
    const escrow = big(view.funded) - big(view.paid) - big(view.refunded);
    let next: RoomRow["next"] = null;
    for (const it of view.state === "Executing" ? items : []) {
      if (it.status === "Eligible") { next = { amount: it.due_amount, payableNow: true }; break; }
      if (!next && (it.status === "Open" || it.status === "Delivered")) next = { amount: it.due_amount, payableNow: false };
    }
    const terminal = view.state === "NoDeal" || view.state === "Cancelled" ? view.state : null;
    return {
      account: record.account, title: view.title, kind: view.kind, state: view.state, buyer: view.buyer, vendor: view.vendor,
      step: currentStep(view, items, periods), terminal, escrowed: (escrow > 0n ? escrow : 0n).toString(), paid: view.paid,
      total: view.total, next, refusals: view.refusals, needs: needsBy.get(record.account) ?? 0,
      roles: party ? rolesIn(view, party) : [],
    };
  }));
  return { rows: rows.filter((r): r is RoomRow => !!r).reverse(), source: src };
}

// ---------- Deliveries and claims (vendor workspace): every item in the rooms this account sells in ----------

export interface DeliveryRow {
  room: string;
  title: string;
  kind: string;
  item: number;
  amount: string;
  status: string;
  dueAt: number | null;
  eligibleAt: number | null;
  /** what the vendor does next, in a few words */
  next: string;
  /** the room tab where it happens */
  tab: "evidence" | "funds" | "activity";
  /** true when the next step is the vendor's to take */
  yours: boolean;
}

export async function deliveries(account: string): Promise<{ account: string; rows: DeliveryRow[]; source: Source }> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ party: account }), source()]);
  const rows: DeliveryRow[] = [];
  await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const view = await d.get().catch(() => null);
    if (!view || view.vendor !== account) return;
    const items = await d.items().catch(() => [] as ItemView[]);
    const mm = view.kind === "market-making";
    for (const it of items) {
      const st = String(it.status);
      const step: Pick<DeliveryRow, "next" | "tab" | "yours"> =
        st === "Eligible" ? { next: "Claim the payment", tab: "funds", yours: true }
        : st === "Open" ? (mm ? { next: "Waiting for the period's observations", tab: "evidence", yours: false } : { next: "Deliver", tab: "evidence", yours: view.state === "Executing" })
        : st === "Delivered" ? { next: "Waiting for the buyer to accept", tab: "evidence", yours: false }
        : st === "Disputed" ? { next: "Disputed by the buyer", tab: "activity", yours: false }
        : st === "Paid" || st === "AssumedPaid" ? { next: "Paid", tab: "activity", yours: false }
        : { next: st, tab: "activity", yours: false };
      rows.push({ room: record.account, title: view.title, kind: view.kind, item: it.id, amount: it.due_amount, status: st, dueAt: it.due_at, eligibleAt: it.eligible_at, ...step });
    }
  }));
  rows.sort((x, y) => Number(y.yours) - Number(x.yours) || (x.dueAt ?? Infinity) - (y.dueAt ?? Infinity));
  return { account, rows, source: src };
}
