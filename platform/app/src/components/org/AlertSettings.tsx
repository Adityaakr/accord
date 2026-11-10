"use client";

// Settings > Alerts: where the organisation hears about a refused payment in a room where it is the buyer. In the
// app (the Alerts page and its badge) always; and, set by an admin, a signed webhook, a Telegram chat and an email
// address. The webhook's signing secret is shown once, when it is created or rotated. Telegram and email need the
// server's TELEGRAM_BOT_TOKEN and RESEND_API_KEY; without them the option says so and stays off.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useOrg } from "./OrgProvider";
import styles from "../finance.module.css";
import ostyles from "./org.module.css";

interface Delivery { id: string; channel: string; test: boolean; target: string; status: string; attempts: number; last_code: number | null; last_error: string | null; next_at: string; created_at: string; delivered_at: string | null }
interface Channels {
  webhook_url: string | null; has_secret: boolean; telegram_chat: string | null; email_to: string | null; updated_by: string | null; updated_at: string | null;
  available: { telegram: boolean; email: boolean; scanning: boolean; dev_http: boolean };
  deliveries: Delivery[];
}

const when = (s: string) => new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const VERIFY = `// Node: check X-Accord-Signature over the raw body
import { createHmac, timingSafeEqual } from "node:crypto";
function verify(secret, header, rawBody) {
  const p = Object.fromEntries(header.split(",").map((x) => x.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(p.t)) > 300) return false;
  const want = createHmac("sha256", secret).update(\`\${p.t}.\${rawBody}\`).digest("hex");
  return want.length === p.v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(p.v1));
}`;

export function AlertSettings() {
  const o = useOrg();
  const admin = o.role === "admin";
  const [c, setC] = useState<Channels | null>(null);
  const [url, setUrl] = useState("");
  const [chat, setChat] = useState("");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/org/channels", { cache: "no-store" });
    if (!r.ok) return;
    const b = (await r.json()) as Channels;
    setC(b);
    return b;
  }, []);
  useEffect(() => {
    void load().then((b) => { if (b) { setUrl(b.webhook_url ?? ""); setChat(b.telegram_chat ?? ""); setEmail(b.email_to ?? ""); } });
  }, [load]);

  const call = async (method: string, payload: unknown) => {
    const r = await fetch("/api/org/channels", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const b = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) throw new Error(String(b.error ?? `HTTP ${r.status}`));
    return b;
  };
  const save = async (rotate = false) => {
    setMsg(null); setBusy(true);
    try {
      const b = await call("PUT", { webhook_url: url, telegram_chat: chat, email_to: email, rotate });
      if (typeof b.secret === "string") setSecret(b.secret);
      setMsg({ ok: true, text: rotate ? "New secret created. The old one no longer signs." : "Saved." });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const test = async (channel: string) => {
    setMsg(null); setBusy(true);
    try {
      const b = (await call("POST", { action: "test", channel })) as { results: { channel: string; ok: boolean; code: number | null; error: string | null }[] };
      const x = b.results[0];
      setMsg(x?.ok ? { ok: true, text: `Test sent by ${x.channel}${x.code ? ` · HTTP ${x.code}` : ""}.` } : { ok: false, text: `Test ${x?.channel ?? channel} failed: ${x?.error ?? "no answer"}. It is retried on the schedule below.` });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  if (!c) return <p className="small faint">Loading…</p>;
  const dirty = url !== (c.webhook_url ?? "") || chat !== (c.telegram_chat ?? "") || email !== (c.email_to ?? "");

  return (
    <div className={ostyles.grid2}>
      <div className={ostyles.form} style={{ gap: 20 }}>
        <section className={ostyles.panel}>
          <div className={ostyles.panelHead}><h2 className="h5">Refused payments</h2><span className={ostyles.badgeOk}>in the app, always</span></div>
          <p className="small">When the contract refuses a payment by an agent in a room where your organisation is the buyer (a redirect, a changed amount, an item not due, a canary, or the fifth refusal that revokes the key), Accord adds it to <Link className="link" href="/alerts">Alerts</Link> and sends it on the channels below. {c.available.scanning ? "The app checks your rooms about once a minute, whether or not anyone has a page open." : "Checking is off on this server (ALERTS=off)."}</p>
        </section>

        <section className={ostyles.panel}>
          <div className={ostyles.panelHead}><h2 className="h5">Webhook</h2>{c.webhook_url ? <span className={ostyles.badgeOk}>on</span> : <span className={ostyles.badgeWait}>off</span>}</div>
          <label className={styles.field}><span>HTTPS URL that receives a signed JSON POST</span>
            <input className={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/accord" disabled={!admin} aria-label="Webhook URL" />
          </label>
          <p className={styles.note}>Public https addresses only: Accord refuses private, loopback and link-local addresses after resolving the name, follows no redirects, and waits 8 s.{c.available.dev_http ? " This server is in development: http://localhost is allowed too." : ""}</p>
          {secret && (
            <div className={styles.stack}>
              <div className={styles.secret}><code>{secret}</code><button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void navigator.clipboard?.writeText(secret)}>Copy</button></div>
              <p className={`${styles.note} ${styles.warn}`}>Shown once. Keep it with your receiver; Accord never shows it again.</p>
            </div>
          )}
          {!secret && c.has_secret && <p className={styles.note}>A signing secret is set. Rotate it to see a new one.</p>}
          <details className={styles.details}>
            <summary>How to check the signature</summary>
            <p className={styles.note} style={{ margin: "8px 0" }}>Header <span className="mono">X-Accord-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</span>, an HMAC-SHA256 with your secret over <span className="mono">&lt;t&gt;.&lt;raw body&gt;</span>. Reject a timestamp older than 5 minutes. Failed sends retry after 30 s, 2 min, 10 min, 1 h and 6 h.</p>
            <pre className={styles.pre}>{VERIFY}</pre>
          </details>
          {admin && (
            <div className={ostyles.inline}>
              <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void test("webhook")} disabled={busy || !c.webhook_url || dirty}>Send test</button>
              <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void save(true)} disabled={busy || !c.webhook_url || dirty}>Rotate secret</button>
            </div>
          )}
        </section>

        <section className={ostyles.panel}>
          <div className={ostyles.panelHead}><h2 className="h5">Telegram</h2>{!c.available.telegram ? <span className={ostyles.badgeWait}>unavailable</span> : c.telegram_chat ? <span className={ostyles.badgeOk}>on</span> : <span className={ostyles.badgeWait}>off</span>}</div>
          {c.available.telegram ? (
            <>
              <label className={styles.field}><span>Chat id (add Accord&apos;s bot to the chat first)</span>
                <input className={styles.input} value={chat} onChange={(e) => setChat(e.target.value)} placeholder="-1001234567890" disabled={!admin} aria-label="Telegram chat id" />
              </label>
              {admin && <div className={ostyles.inline}><button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void test("telegram")} disabled={busy || !c.telegram_chat || dirty}>Send test</button></div>}
            </>
          ) : <p className={styles.note}>Telegram alerts start when this server has a bot token (TELEGRAM_BOT_TOKEN).</p>}
        </section>

        <section className={ostyles.panel}>
          <div className={ostyles.panelHead}><h2 className="h5">Email</h2>{!c.available.email ? <span className={ostyles.badgeWait}>unavailable</span> : c.email_to ? <span className={ostyles.badgeOk}>on</span> : <span className={ostyles.badgeWait}>off</span>}</div>
          {c.available.email ? (
            <>
              <label className={styles.field}><span>Address</span>
                <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="treasury@northwind.example" type="email" disabled={!admin} aria-label="Alert email" />
              </label>
              {admin && <div className={ostyles.inline}><button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void test("email")} disabled={busy || !c.email_to || dirty}>Send test</button></div>}
            </>
          ) : <p className={styles.note}>Email alerts start when this server has an email provider key (RESEND_API_KEY). Until then, use the webhook, Telegram or the in-app list.</p>}
        </section>

        {admin ? (
          <div className={ostyles.inline}>
            <button type="button" className={styles.btn} onClick={() => void save()} disabled={busy || !dirty}>Save channels</button>
            {msg && <span className={`${styles.note} ${msg.ok ? styles.ok : styles.warn}`} role="status">{msg.text}</span>}
          </div>
        ) : <p className={styles.note}>Only an admin can change where alerts go.</p>}
      </div>

      <section className={ostyles.panel}>
        <div className={ostyles.panelHead}><h2 className="h5">Delivery log</h2><span className="small faint">newest first</span></div>
        {c.deliveries.length === 0 ? <p className="small">Nothing sent yet.</p> : (
          <div className={styles.log}>
            {c.deliveries.map((d) => (
              <div key={d.id} className={styles.logRow}>
                <span className={styles.mono}>{d.channel}{d.test ? " · test" : ""}</span>
                <span className={styles.mono}>
                  {when(d.created_at)} · {d.attempts} attempt{d.attempts === 1 ? "" : "s"}{d.last_code ? ` · HTTP ${d.last_code}` : ""}
                  {d.last_error && d.status !== "delivered" ? ` · ${d.last_error}` : ""}{d.status === "pending" && d.attempts > 0 ? ` · next ${when(d.next_at)}` : ""}
                </span>
                <span className={`${styles.status} ${styles[`s_${d.status}`] ?? ""}`}>{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
