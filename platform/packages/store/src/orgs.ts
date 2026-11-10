// Organisations (docs/build/PLATFORM.md section 4): a company, its members and their roles, invitations and an audit log.
// Off chain and advisory: a role decides what the app shows a member, never what the contract allows; every money
// action is still signed by the person's own account. Nothing here holds a key or a sealed figure. An invitation is
// stored as the sha256 of its token only, so the stored data cannot be turned back into a working link.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type pg from "pg";

export const ROLES = ["admin", "negotiator", "approver", "treasurer", "guardian", "operator", "viewer"] as const;
export type OrgRole = (typeof ROLES)[number];

export interface Org {
  id: string;
  name: string;
  domain: string;
  domain_token: string;
  domain_verified_at: string | null;
  created_by: string;
  created_at: string;
}
export interface Member { org_id: string; account_id: string; role: OrgRole; invited_by: string | null; joined_at: string }
export interface Invite {
  token_hash: string; org_id: string; role: OrgRole; email: string | null; created_by: string; created_at: string;
  expires_at: string; accepted_by: string | null; accepted_at: string | null; revoked_at: string | null;
}
export interface AuditEntry { id: string; org_id: string; at: string; actor: string; action: string; detail: unknown }
export interface NotificationPrefs { org_id: string; account_id: string; prefs: Record<string, boolean>; updated_at: string }

export interface OrgTables {
  orgs?: Org[];
  members?: Member[];
  invites?: Invite[];
  audit?: AuditEntry[];
  notifications?: NotificationPrefs[];
}

export const ORG_SCHEMA = `
create table if not exists orgs (id uuid primary key, name text not null check (length(name) between 1 and 80),
  domain text not null check (length(domain) <= 253), domain_token text not null, domain_verified_at timestamptz,
  created_by text not null, created_at timestamptz not null default now());
create table if not exists org_members (org_id uuid not null references orgs(id) on delete cascade, account_id text not null,
  role text not null, invited_by text, joined_at timestamptz not null default now(), primary key (org_id, account_id));
create unique index if not exists org_members_one_org on org_members (account_id);
create table if not exists org_invites (token_hash text primary key, org_id uuid not null references orgs(id) on delete cascade,
  role text not null, email text, created_by text not null, created_at timestamptz not null default now(),
  expires_at timestamptz not null, accepted_by text, accepted_at timestamptz, revoked_at timestamptz);
create table if not exists org_audit (id uuid primary key, org_id uuid not null references orgs(id) on delete cascade,
  at timestamptz not null default now(), actor text not null, action text not null, detail jsonb);
create index if not exists org_audit_org on org_audit (org_id, at desc);
create table if not exists org_notifications (org_id uuid not null references orgs(id) on delete cascade, account_id text not null,
  prefs jsonb not null, updated_at timestamptz not null default now(), primary key (org_id, account_id));
`;

/** The backend the store gives this module: Postgres, or the JSON file's read and locked read-modify-write. */
export interface Backend {
  db(): Promise<pg.Pool | null>;
  read(): OrgTables;
  mutate(f: (d: OrgTables) => void): void;
}

export class OrgError extends Error {
  constructor(public code: "not_found" | "forbidden" | "conflict" | "invalid" | "expired", message: string) {
    super(message);
  }
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normaliseDomain(d: string): string {
  const v = d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!DOMAIN.test(v)) throw new OrgError("invalid", "a domain like acme.com is required");
  return v;
}

function orgRow(r: Record<string, unknown>): Org {
  return {
    id: String(r.id), name: String(r.name), domain: String(r.domain), domain_token: String(r.domain_token),
    domain_verified_at: iso(r.domain_verified_at), created_by: String(r.created_by), created_at: iso(r.created_at)!,
  };
}
function memberRow(r: Record<string, unknown>): Member {
  return { org_id: String(r.org_id), account_id: String(r.account_id), role: r.role as OrgRole, invited_by: r.invited_by == null ? null : String(r.invited_by), joined_at: iso(r.joined_at)! };
}
function inviteRow(r: Record<string, unknown>): Invite {
  return {
    token_hash: String(r.token_hash), org_id: String(r.org_id), role: r.role as OrgRole, email: r.email == null ? null : String(r.email),
    created_by: String(r.created_by), created_at: iso(r.created_at)!, expires_at: iso(r.expires_at)!,
    accepted_by: r.accepted_by == null ? null : String(r.accepted_by), accepted_at: iso(r.accepted_at), revoked_at: iso(r.revoked_at),
  };
}

export function orgs(b: Backend) {
  const t = (d: OrgTables) => {
    d.orgs ??= []; d.members ??= []; d.invites ??= []; d.audit ??= []; d.notifications ??= [];
    return d as Required<OrgTables>;
  };

  async function log(orgId: string, actor: string, action: string, detail: unknown = null) {
    const p = await b.db();
    const id = randomUUID();
    if (p) {
      await p.query("insert into org_audit (id, org_id, actor, action, detail) values ($1, $2, $3, $4, $5)", [id, orgId, actor, action, JSON.stringify(detail)]);
      return;
    }
    b.mutate((raw) => { t(raw).audit.push({ id, org_id: orgId, at: new Date().toISOString(), actor, action, detail }); });
  }

  async function membership(account: string): Promise<{ org: Org; member: Member } | null> {
    const p = await b.db();
    if (p) {
      const r = await p.query("select m.*, o.id as o_id, o.name, o.domain, o.domain_token, o.domain_verified_at, o.created_by, o.created_at from org_members m join orgs o on o.id = m.org_id where m.account_id = $1", [account]);
      const row = r.rows[0] as Record<string, unknown> | undefined;
      return row ? { org: orgRow({ ...row, id: row.o_id }), member: memberRow(row) } : null;
    }
    const d = t(b.read());
    const member = d.members.find((m) => m.account_id === account);
    const org = member && d.orgs.find((o) => o.id === member.org_id);
    return member && org ? { org, member } : null;
  }

  async function requireAdmin(orgId: string, actor: string) {
    const m = await membership(actor);
    if (!m || m.org.id !== orgId) throw new OrgError("forbidden", "not a member of this organisation");
    if (m.member.role !== "admin") throw new OrgError("forbidden", "only an admin can do this");
    return m;
  }

  async function members(orgId: string): Promise<Member[]> {
    const p = await b.db();
    if (p) return (await p.query("select * from org_members where org_id = $1 order by joined_at", [orgId])).rows.map(memberRow);
    return t(b.read()).members.filter((m) => m.org_id === orgId).sort((x, y) => x.joined_at.localeCompare(y.joined_at));
  }

  async function adminCount(orgId: string) {
    return (await members(orgId)).filter((m) => m.role === "admin").length;
  }

  /** What an invitation link shows before anyone signs in. */
  async function lookupInvite(token: string): Promise<{ invite: Invite; org: Org } | null> {
    const h = hashToken(token);
    const p = await b.db();
    if (p) {
      const r = await p.query("select i.*, o.id as o_id, o.name, o.domain, o.domain_token, o.domain_verified_at, o.created_by as o_created_by, o.created_at as o_created_at from org_invites i join orgs o on o.id = i.org_id where i.token_hash = $1", [h]);
      const row = r.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return { invite: inviteRow(row), org: orgRow({ ...row, id: row.o_id, created_by: row.o_created_by, created_at: row.o_created_at }) };
    }
    const d = t(b.read());
    const invite = d.invites.find((i) => i.token_hash === h);
    const org = invite && d.orgs.find((o) => o.id === invite.org_id);
    return invite && org ? { invite, org } : null;
  }

  return {
    membership,
    members,
    lookupInvite,
    /** Appends to the organisation's audit log. */
    log,

    /** Every organisation's id and name (the refusal alert scan walks them). */
    async list(): Promise<{ id: string; name: string }[]> {
      const p = await b.db();
      if (p) return (await p.query("select id, name from orgs order by created_at")).rows.map((r: Record<string, unknown>) => ({ id: String(r.id), name: String(r.name) }));
      return t(b.read()).orgs.map((o) => ({ id: o.id, name: o.name }));
    },

    /** A new organisation with its creator as the first admin. One organisation per account. */
    async create(name: string, domain: string, creator: string): Promise<Org> {
      const n = name.trim();
      if (!n || n.length > 80) throw new OrgError("invalid", "a name of 1 to 80 characters is required");
      const dom = normaliseDomain(domain);
      if (await membership(creator)) throw new OrgError("conflict", "this account already belongs to an organisation");
      const org: Org = {
        id: randomUUID(), name: n, domain: dom, domain_token: randomBytes(12).toString("hex"), domain_verified_at: null,
        created_by: creator, created_at: new Date().toISOString(),
      };
      const p = await b.db();
      if (p) {
        const c = await p.connect();
        try {
          await c.query("begin");
          await c.query("insert into orgs (id, name, domain, domain_token, created_by) values ($1, $2, $3, $4, $5)", [org.id, org.name, org.domain, org.domain_token, creator]);
          await c.query("insert into org_members (org_id, account_id, role) values ($1, $2, 'admin')", [org.id, creator]);
          await c.query("commit");
        } catch (e) {
          await c.query("rollback");
          throw e;
        } finally {
          c.release();
        }
      } else {
        b.mutate((raw) => {
          const d = t(raw);
          if (d.members.some((m) => m.account_id === creator)) throw new OrgError("conflict", "this account already belongs to an organisation");
          d.orgs.push(org);
          d.members.push({ org_id: org.id, account_id: creator, role: "admin", invited_by: null, joined_at: org.created_at });
        });
      }
      await log(org.id, creator, "org.created", { name: org.name, domain: org.domain });
      return org;
    },

    async rename(orgId: string, name: string, actor: string) {
      await requireAdmin(orgId, actor);
      const n = name.trim();
      if (!n || n.length > 80) throw new OrgError("invalid", "a name of 1 to 80 characters is required");
      const p = await b.db();
      if (p) await p.query("update orgs set name = $2 where id = $1", [orgId, n]);
      else b.mutate((raw) => { const o = t(raw).orgs.find((x) => x.id === orgId); if (o) o.name = n; });
      await log(orgId, actor, "org.renamed", { name: n });
    },

    async markDomainVerified(orgId: string, actor: string, via: "dns" | "file") {
      await requireAdmin(orgId, actor);
      const p = await b.db();
      if (p) await p.query("update orgs set domain_verified_at = now() where id = $1", [orgId]);
      else b.mutate((raw) => { const o = t(raw).orgs.find((x) => x.id === orgId); if (o) o.domain_verified_at = new Date().toISOString(); });
      await log(orgId, actor, "domain.verified", { via });
    },

    async setRole(orgId: string, account: string, role: OrgRole, actor: string) {
      await requireAdmin(orgId, actor);
      if (!ROLES.includes(role)) throw new OrgError("invalid", "unknown role");
      const current = (await members(orgId)).find((m) => m.account_id === account);
      if (!current) throw new OrgError("not_found", "not a member");
      if (current.role === "admin" && role !== "admin" && (await adminCount(orgId)) <= 1) throw new OrgError("conflict", "the organisation needs at least one admin");
      const p = await b.db();
      if (p) await p.query("update org_members set role = $3 where org_id = $1 and account_id = $2", [orgId, account, role]);
      else b.mutate((raw) => { const m = t(raw).members.find((x) => x.org_id === orgId && x.account_id === account); if (m) m.role = role; });
      await log(orgId, actor, "member.role", { account, from: current.role, to: role });
    },

    async remove(orgId: string, account: string, actor: string) {
      await requireAdmin(orgId, actor);
      const current = (await members(orgId)).find((m) => m.account_id === account);
      if (!current) throw new OrgError("not_found", "not a member");
      if (current.role === "admin" && (await adminCount(orgId)) <= 1) throw new OrgError("conflict", "the organisation needs at least one admin");
      const p = await b.db();
      if (p) await p.query("delete from org_members where org_id = $1 and account_id = $2", [orgId, account]);
      else b.mutate((raw) => { const d = t(raw); d.members = d.members.filter((x) => !(x.org_id === orgId && x.account_id === account)); });
      await log(orgId, actor, "member.removed", { account, role: current.role });
    },

    /** Returns the token once; only its hash is stored. */
    async invite(orgId: string, role: OrgRole, actor: string, opts: { email?: string | null; ttlHours?: number } = {}): Promise<{ token: string; invite: Invite }> {
      await requireAdmin(orgId, actor);
      if (!ROLES.includes(role)) throw new OrgError("invalid", "unknown role");
      const email = opts.email?.trim() || null;
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new OrgError("invalid", "that email address does not look right");
      const token = randomBytes(24).toString("base64url");
      const now = Date.now();
      const invite: Invite = {
        token_hash: hashToken(token), org_id: orgId, role, email, created_by: actor, created_at: new Date(now).toISOString(),
        expires_at: new Date(now + (opts.ttlHours ?? 72) * 3_600_000).toISOString(), accepted_by: null, accepted_at: null, revoked_at: null,
      };
      const p = await b.db();
      if (p) {
        await p.query("insert into org_invites (token_hash, org_id, role, email, created_by, expires_at) values ($1, $2, $3, $4, $5, $6)",
          [invite.token_hash, orgId, role, email, actor, invite.expires_at]);
      } else {
        b.mutate((raw) => { t(raw).invites.push(invite); });
      }
      await log(orgId, actor, "invite.created", { role, email, expires_at: invite.expires_at, ref: invite.token_hash.slice(0, 8) });
      return { token, invite };
    },

    async invites(orgId: string): Promise<Invite[]> {
      const p = await b.db();
      if (p) return (await p.query("select * from org_invites where org_id = $1 order by created_at desc", [orgId])).rows.map(inviteRow);
      return t(b.read()).invites.filter((i) => i.org_id === orgId).sort((x, y) => y.created_at.localeCompare(x.created_at));
    },

    async revokeInvite(orgId: string, ref: string, actor: string) {
      await requireAdmin(orgId, actor);
      const p = await b.db();
      if (p) await p.query("update org_invites set revoked_at = now() where org_id = $1 and token_hash like $2 and accepted_by is null", [orgId, `${ref}%`]);
      else b.mutate((raw) => { for (const i of t(raw).invites) if (i.org_id === orgId && i.token_hash.startsWith(ref) && !i.accepted_by) i.revoked_at = new Date().toISOString(); });
      await log(orgId, actor, "invite.revoked", { ref: ref.slice(0, 8) });
    },

    async acceptInvite(token: string, account: string): Promise<{ org: Org; member: Member }> {
      const found = await lookupInvite(token);
      if (!found) throw new OrgError("not_found", "this invitation does not exist");
      const { invite, org } = found;
      if (invite.revoked_at) throw new OrgError("expired", "this invitation was withdrawn");
      if (invite.accepted_by) throw new OrgError("conflict", invite.accepted_by === account ? "you already accepted this invitation" : "this invitation was already used");
      if (Date.parse(invite.expires_at) < Date.now()) throw new OrgError("expired", "this invitation has expired");
      const existing = await membership(account);
      if (existing) throw new OrgError("conflict", existing.org.id === org.id ? "you are already a member" : "this account already belongs to another organisation");
      const member: Member = { org_id: org.id, account_id: account, role: invite.role, invited_by: invite.created_by, joined_at: new Date().toISOString() };
      const p = await b.db();
      if (p) {
        const c = await p.connect();
        try {
          await c.query("begin");
          const u = await c.query("update org_invites set accepted_by = $2, accepted_at = now() where token_hash = $1 and accepted_by is null and revoked_at is null and expires_at > now()", [invite.token_hash, account]);
          if (u.rowCount !== 1) throw new OrgError("conflict", "this invitation was already used");
          await c.query("insert into org_members (org_id, account_id, role, invited_by) values ($1, $2, $3, $4)", [org.id, account, invite.role, invite.created_by]);
          await c.query("commit");
        } catch (e) {
          await c.query("rollback");
          throw e;
        } finally {
          c.release();
        }
      } else {
        b.mutate((raw) => {
          const d = t(raw);
          const i = d.invites.find((x) => x.token_hash === invite.token_hash);
          if (!i || i.accepted_by || i.revoked_at) throw new OrgError("conflict", "this invitation was already used");
          if (d.members.some((m) => m.account_id === account)) throw new OrgError("conflict", "this account already belongs to an organisation");
          i.accepted_by = account;
          i.accepted_at = member.joined_at;
          d.members.push(member);
        });
      }
      await log(org.id, account, "invite.accepted", { role: invite.role, invited_by: invite.created_by });
      return { org, member };
    },

    async audit(orgId: string, limit = 50): Promise<AuditEntry[]> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select * from org_audit where org_id = $1 order by at desc limit $2", [orgId, limit]);
        return r.rows.map((x: Record<string, unknown>) => ({ id: String(x.id), org_id: String(x.org_id), at: iso(x.at)!, actor: String(x.actor), action: String(x.action), detail: x.detail }));
      }
      return t(b.read()).audit.filter((a) => a.org_id === orgId).sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
    },

    async notifications(orgId: string, account: string): Promise<Record<string, boolean>> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select prefs from org_notifications where org_id = $1 and account_id = $2", [orgId, account]);
        return ((r.rows[0] as { prefs?: Record<string, boolean> } | undefined)?.prefs) ?? {};
      }
      return t(b.read()).notifications.find((n) => n.org_id === orgId && n.account_id === account)?.prefs ?? {};
    },

    async setNotifications(orgId: string, account: string, prefs: Record<string, boolean>) {
      const m = await membership(account);
      if (!m || m.org.id !== orgId) throw new OrgError("forbidden", "not a member of this organisation");
      const clean = Object.fromEntries(Object.entries(prefs).filter(([k, v]) => /^[a-z_.]{1,40}$/.test(k) && typeof v === "boolean").slice(0, 40));
      const p = await b.db();
      if (p) {
        await p.query("insert into org_notifications (org_id, account_id, prefs, updated_at) values ($1, $2, $3, now()) on conflict (org_id, account_id) do update set prefs = excluded.prefs, updated_at = now()",
          [orgId, account, JSON.stringify(clean)]);
      } else {
        b.mutate((raw) => {
          const d = t(raw);
          d.notifications = d.notifications.filter((n) => !(n.org_id === orgId && n.account_id === account));
          d.notifications.push({ org_id: orgId, account_id: account, prefs: clean, updated_at: new Date().toISOString() });
        });
      }
    },
  };
}
