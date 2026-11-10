// References, alert channels, cursors, alerts and deliveries (src/alerts.ts) on the JSON file backend (and Postgres
// when ACCORD_TEST_DATABASE_URL is set): an alert is stored once per refusal, a cursor never moves back, a webhook
// secret is returned once, and a claimed delivery is not claimed twice.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "accord-alerts-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

for (const backend of ["file", ...(process.env.ACCORD_TEST_DATABASE_URL ? ["postgres"] : [])] as const) {
  describe(`alerts (${backend})`, () => {
    let s: typeof import("../src/index.js");
    let orgId = "";
    const run = Math.random().toString(36).slice(2, 8);

    beforeAll(async () => {
      process.env.ACCORD_STORE_FILE = path.join(dir, `store-${backend}.json`);
      if (backend === "postgres") process.env.DATABASE_URL = process.env.ACCORD_TEST_DATABASE_URL;
      else delete process.env.DATABASE_URL;
      vi.resetModules();
      s = await import("../src/index.js");
      orgId = (await s.org.create("Northwind", "northwind.example", `admin-${run}.testnet`)).id;
    });

    it("keeps a reference per organisation and agreement", async () => {
      expect(await s.alerts.reference(orgId, "a1.test")).toBeNull();
      await s.alerts.setReference(orgId, "a1.test", "PO-1042", { "1": "INV-7" }, "x");
      await s.alerts.setReference(orgId, "a1.test", "PO-1043", {}, "x");
      expect(await s.alerts.reference(orgId, "a1.test")).toMatchObject({ reference: "PO-1043", items: {} });
    });

    it("returns a webhook secret once and keeps it until rotated or cleared", async () => {
      const a = await s.alerts.setChannels(orgId, { webhook_url: "https://hooks.example/a", telegram_chat: null, email_to: null }, "x");
      expect(a.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
      const b = await s.alerts.setChannels(orgId, { webhook_url: "https://hooks.example/b", telegram_chat: "-100123", email_to: null }, "x");
      expect(b.secret).toBeNull();
      expect((await s.alerts.channels(orgId))?.webhook_secret).toBe(a.secret);
      const c = await s.alerts.setChannels(orgId, { webhook_url: "https://hooks.example/b", telegram_chat: "-100123", email_to: null, rotate: true }, "x");
      expect(c.secret).not.toBe(a.secret);
      await s.alerts.setChannels(orgId, { webhook_url: null, telegram_chat: "-100123", email_to: null }, "x");
      expect((await s.alerts.channels(orgId))?.webhook_secret).toBeNull();
    });

    it("moves a cursor forward only", async () => {
      expect(await s.alerts.cursor(orgId, "a1.test")).toBeNull();
      await s.alerts.setCursor(orgId, "a1.test", 3);
      await s.alerts.setCursor(orgId, "a1.test", 2);
      expect(await s.alerts.cursor(orgId, "a1.test")).toBe(3);
    });

    it("stores one alert per refusal, counts unread, marks read", async () => {
      const base = { org_id: orgId, agreement: "a1.test", code: "ERR_PAYEE_MISMATCH", at: new Date().toISOString(), payload: { seq: 1 } };
      const first = await s.alerts.addAlert({ ...base, seq: 1 });
      expect(first).not.toBeNull();
      expect(await s.alerts.addAlert({ ...base, seq: 1 })).toBeNull();
      await s.alerts.addAlert({ ...base, seq: 2 });
      expect(await s.alerts.unread(orgId)).toBe(2);
      await s.alerts.markRead(orgId, [first!.id]);
      expect(await s.alerts.unread(orgId)).toBe(1);
      await s.alerts.markRead(orgId);
      expect(await s.alerts.unread(orgId)).toBe(0);
      expect((await s.alerts.alerts(orgId)).map((a) => a.seq)).toEqual([2, 1]);
    });

    it("queues one delivery per alert and channel, claims it once, retries and logs", async () => {
      const [alert] = await s.alerts.alerts(orgId, 1);
      const d = await s.alerts.enqueue({ org_id: orgId, alert_id: alert!.id, channel: "webhook", test: false, body: "{}", target: "https://hooks.example/b" });
      expect(d).not.toBeNull();
      expect(await s.alerts.enqueue({ org_id: orgId, alert_id: alert!.id, channel: "webhook", test: false, body: "{}", target: "https://hooks.example/b" })).toBeNull();
      expect(await s.alerts.enqueue({ org_id: orgId, alert_id: alert!.id, channel: "telegram", test: false, body: "hi", target: "-100123" })).not.toBeNull();
      const claimed = await s.alerts.claimDue(10, [d!.id]);
      expect(claimed.map((x) => x.id)).toEqual([d!.id]);
      expect(await s.alerts.claimDue(10, [d!.id])).toEqual([]);
      await s.alerts.finishDelivery(d!.id, { status: "pending", code: 500, error: "HTTP 500", next_at: new Date(Date.now() - 1000).toISOString() });
      expect((await s.alerts.claimDue(10, [d!.id])).length).toBe(1);
      await s.alerts.finishDelivery(d!.id, { status: "delivered", code: 200, error: null });
      const log = await s.alerts.deliveries(orgId);
      expect(log.find((x) => x.id === d!.id)).toMatchObject({ status: "delivered", attempts: 2, last_code: 200 });
    });

    it("lists organisations", async () => {
      expect((await s.org.list()).some((o) => o.id === orgId)).toBe(true);
    });
  });
}
