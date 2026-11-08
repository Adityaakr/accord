// The organisation layer on the JSON-file backend (and on Postgres when ACCORD_TEST_DATABASE_URL is set): one
// organisation per account, the last admin stays, invitations work once, expire, and are stored as hashes only.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "accord-store-"));
const file = path.join(dir, "store.json");

for (const backend of ["file", ...(process.env.ACCORD_TEST_DATABASE_URL ? ["postgres"] : [])] as const) {
  describe(`organisations (${backend})`, () => {
    let s: typeof import("../src/index.js");
    const run = Math.random().toString(36).slice(2, 8);
    const acct = (n: string) => `${n}-${run}.test.near`;

    beforeAll(async () => {
      process.env.ACCORD_STORE_FILE = file;
      if (backend === "postgres") process.env.DATABASE_URL = process.env.ACCORD_TEST_DATABASE_URL;
      else delete process.env.DATABASE_URL;
      const { vi } = await import("vitest");
      vi.resetModules();
      s = await import("../src/index.js");
    });

    it("creates an organisation with its creator as admin, one per account", async () => {
      const o = await s.org.create("Northwind", "https://Northwind.example/", acct("buyer"));
      expect(o.domain).toBe("northwind.example");
      expect(o.domain_verified_at).toBeNull();
      const m = await s.org.membership(acct("buyer"));
      expect(m?.member.role).toBe("admin");
      await expect(s.org.create("Second", "second.example", acct("buyer"))).rejects.toThrow(/already belongs/);
      await expect(s.org.create("", "x.example", acct("other"))).rejects.toThrow(/name/);
      await expect(s.org.create("Bad", "not a domain", acct("other"))).rejects.toThrow(/domain/);
    });

    it("invites by link, stores only the hash, and accepts once", async () => {
      const { org } = (await s.org.membership(acct("buyer")))!;
      const { token, invite } = await s.org.invite(org.id, "approver", acct("buyer"));
      expect(invite.token_hash).toBe(s.hashToken(token));
      if (backend === "file") expect(readFileSync(file, "utf8")).not.toContain(token);
      const seen = await s.org.lookupInvite(token);
      expect(seen?.org.name).toBe("Northwind");
      const joined = await s.org.acceptInvite(token, acct("auth"));
      expect(joined.member.role).toBe("approver");
      await expect(s.org.acceptInvite(token, acct("third"))).rejects.toThrow(/already used/);
      await expect(s.org.invite(org.id, "viewer", acct("auth"))).rejects.toThrow(/admin/);
    });

    it("refuses expired and withdrawn invitations", async () => {
      const { org } = (await s.org.membership(acct("buyer")))!;
      const old = await s.org.invite(org.id, "viewer", acct("buyer"), { ttlHours: -1 });
      await expect(s.org.acceptInvite(old.token, acct("late"))).rejects.toThrow(/expired/);
      const gone = await s.org.invite(org.id, "viewer", acct("buyer"));
      await s.org.revokeInvite(org.id, gone.invite.token_hash.slice(0, 8), acct("buyer"));
      await expect(s.org.acceptInvite(gone.token, acct("late"))).rejects.toThrow(/withdrawn/);
    });

    it("changes roles, keeps the last admin, removes members, and logs every change", async () => {
      const { org } = (await s.org.membership(acct("buyer")))!;
      await s.org.setRole(org.id, acct("auth"), "treasurer", acct("buyer"));
      expect((await s.org.membership(acct("auth")))?.member.role).toBe("treasurer");
      await expect(s.org.setRole(org.id, acct("buyer"), "viewer", acct("buyer"))).rejects.toThrow(/at least one admin/);
      await expect(s.org.remove(org.id, acct("buyer"), acct("buyer"))).rejects.toThrow(/at least one admin/);
      await s.org.remove(org.id, acct("auth"), acct("buyer"));
      expect(await s.org.membership(acct("auth"))).toBeNull();
      const actions = (await s.org.audit(org.id)).map((a) => a.action);
      expect(actions).toEqual(expect.arrayContaining(["org.created", "invite.created", "invite.accepted", "member.role", "member.removed", "invite.revoked"]));
    });

    it("stores a member's notification choices and the domain verification", async () => {
      const { org } = (await s.org.membership(acct("buyer")))!;
      await s.org.setNotifications(org.id, acct("buyer"), { refusal: true, hold: false, "bad key!": true } as Record<string, boolean>);
      expect(await s.org.notifications(org.id, acct("buyer"))).toEqual({ refusal: true, hold: false });
      await s.org.markDomainVerified(org.id, acct("buyer"), "dns");
      expect((await s.org.membership(acct("buyer")))?.org.domain_verified_at).not.toBeNull();
    });
  });
}

afterAll(() => rmSync(dir, { recursive: true, force: true }));
