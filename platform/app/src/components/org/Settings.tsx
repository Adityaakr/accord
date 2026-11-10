"use client";

// Settings (docs/build/PLATFORM.md section 6): the organisation and its domain, members and roles, notification choices,
// developers (connecting an agent through MCP) and billing. Roles are advisory: they shape what each member is
// shown; the contract checks every signer, and every money action is signed in a member's own wallet.

import Link from "next/link";
import { useState } from "react";
import { useAppConfig } from "../AppConfig";
import { useWallet } from "../wallet/WalletProvider";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import { ConfirmYou } from "./ConfirmYou";
import { DomainProof } from "./DomainProof";
import { AlertSettings } from "./AlertSettings";
import { ROLE_INFO, useOrg, type OrgRole } from "./OrgProvider";
import styles from "./org.module.css";

type Tab = "organisation" | "members" | "notifications" | "alerts" | "developers" | "billing";
const TABS: [Tab, string][] = [["organisation", "Organisation"], ["members", "Members and roles"], ["notifications", "Notifications"], ["alerts", "Alerts"], ["developers", "Developers"], ["billing", "Billing"]];
const ROLES = ROLE_INFO.map((r) => r.role);
const date = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const dateTime = (s: string) => new Date(s).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Settings({ tab }: { tab: Tab }) {
  const w = useWallet();
  const o = useOrg();

  const head = (
    <div className={styles.head}>
      <div>
        <h1 className="h2">Settings</h1>
        <p className={styles.lead}>Your organisation, its people and what each of them is shown. The contract checks every signer.</p>
      </div>
      {o.data?.org && <span className={styles.rolePill}>{o.data.org.name} · {o.role}</span>}
    </div>
  );

  if (!w.accountId) return <div className="container">{head}<Stage><SignInCard /></Stage></div>;
  if (!o.session) return <div className="container">{head}<Stage><ConfirmYou why="Settings change your organisation." /></Stage></div>;
  if (o.data && !o.data.org) {
    return (
      <div className="container">{head}
        <div className={styles.strip}><p><strong>No organisation yet.</strong> Create one for your company, or join one with an invitation.</p><Link href="/onboarding" className={styles.btn}>Set up an organisation</Link></div>
      </div>
    );
  }
  if (!o.data) return <div className="container">{head}<div className="small faint">Loading…</div></div>;

  return (
    <div className="container">
      {head}
      <nav className={styles.tabs} role="tablist" aria-label="Settings">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/settings?tab=${id}`} role="tab" aria-selected={tab === id} className={styles.tab} scroll={false}>{label}</Link>
        ))}
      </nav>
      {tab === "organisation" && <Organisation />}
      {tab === "members" && <Members />}
      {tab === "notifications" && <Notifications />}
      {tab === "alerts" && <AlertSettings />}
      {tab === "developers" && <Developers />}
      {tab === "billing" && <Billing />}
    </div>
  );
}

function Organisation() {
  const o = useOrg();
  const org = o.data!.org!;
  const admin = o.role === "admin";
  const [name, setName] = useState(org.name);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async () => {
    try { await o.send("/api/org", "PATCH", { name }); setMsg({ ok: true, text: "Saved." }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  return (
    <div className={styles.grid2}>
      <div className={styles.form} style={{ gap: 20 }}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2 className="h5">Organisation</h2>{org.domain_verified_at ? <span className={styles.badgeOk}>domain verified</span> : <span className={styles.badgeWait}>domain not verified</span>}</div>
          <dl className={styles.rows}>
            <dt>Name</dt>
            <dd>{admin ? (
              <span className={styles.inline}>
                <input className={styles.input} style={{ maxWidth: 280, height: 34 }} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Organisation name" />
                <button type="button" className={styles.btn} onClick={() => void save()} disabled={name.trim() === org.name || !name.trim()}>Save</button>
              </span>
            ) : org.name}</dd>
            <dt>Domain</dt><dd className="mono">{org.domain}</dd>
            <dt>Created</dt><dd>{date(org.created_at)} by <span className="mono">{org.created_by}</span></dd>
            <dt>Your role</dt><dd><span className={styles.rolePill}>{o.role}</span></dd>
          </dl>
          {msg && <p className={msg.ok ? `${styles.note} ${styles.ok}` : styles.error} role="status">{msg.text}</p>}
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2 className="h5">Prove the domain</h2></div>
          <p className="small">Counterparties see a verified domain next to your organisation&apos;s name. This is separate from Payee, which binds a payment recipient to a domain inside each deal room.</p>
          <DomainProof />
        </section>
      </div>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2 className="h5">Audit log</h2><span className="small faint">every change, newest first</span></div>
        {(o.data!.audit ?? []).length === 0 ? <p className="small">Nothing yet.</p> : (
          <div className={styles.form} style={{ gap: 0 }}>
            {o.data!.audit!.map((a) => (
              <div key={a.id} className={styles.toggle} style={{ alignItems: "flex-start" }}>
                <div className={styles.form} style={{ gap: 2 }}>
                  <span style={{ color: "var(--text-strong)" }}>{describe(a.action, a.detail)}</span>
                  <span className={styles.mono}>{a.actor}</span>
                </div>
                <span className={styles.mono} style={{ flex: "none" }}>{dateTime(a.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function describe(action: string, d: Record<string, unknown> | null): string {
  const x = d ?? {};
  switch (action) {
    case "org.created": return `Created the organisation for ${String(x.domain)}`;
    case "org.renamed": return `Renamed the organisation to ${String(x.name)}`;
    case "domain.verified": return `Verified the domain through ${x.via === "dns" ? "DNS" : "the file"}`;
    case "invite.created": return `Invited ${x.email ? String(x.email) : "someone by link"} as ${String(x.role)}`;
    case "invite.accepted": return `Joined as ${String(x.role)}`;
    case "invite.revoked": return "Withdrew an invitation";
    case "member.role": return `Changed ${String(x.account)} from ${String(x.from)} to ${String(x.to)}`;
    case "member.removed": return `Removed ${String(x.account)}`;
    case "alerts.channels": return `Changed where alerts go${x.rotated ? " and rotated the webhook secret" : ""}`;
    default: return action;
  }
}

function Members() {
  const o = useOrg();
  const w = useWallet();
  const admin = o.role === "admin";
  const [role, setRole] = useState<OrgRole>("approver");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<{ url: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const act = async (f: () => Promise<unknown>, done?: string) => {
    setMsg(null);
    try { await f(); if (done) setMsg({ ok: true, text: done }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const invite = () => act(async () => {
    const b = (await o.send("/api/org/invites", "POST", { role, email: email || undefined })) as { link: string; emailed: boolean };
    setLink({ url: b.link, emailed: b.emailed });
    setCopied(false);
    setEmail("");
  });
  const members = o.data!.members ?? [];
  return (
    <div className={styles.form} style={{ gap: 24 }}>
      <section>
        <div className={styles.panelHead} style={{ marginBottom: 10 }}><h2 className="h5">Members</h2><span className="small faint">{members.length} {members.length === 1 ? "member" : "members"}</span></div>
        <div className={styles.table}>
          <div className={`${styles.tHead} ${styles.memberCols}`}><span>Account</span><span>Role</span><span>Joined</span><span /></div>
          {members.map((m) => (
            <div key={m.account_id} className={`${styles.tRow} ${styles.memberCols}`}>
              <span className={styles.mono} style={{ color: "var(--text-strong)" }}>{m.account_id}{m.account_id === w.accountId && <span className={styles.you}>you</span>}</span>
              <span>
                <span className={styles.label}>Role</span>
                {admin ? (
                  <select className={styles.select} value={m.role} aria-label={`Role of ${m.account_id}`}
                    onChange={(e) => void act(() => o.send("/api/org/members", "PATCH", { account: m.account_id, role: e.target.value }), `${m.account_id} is now ${e.target.value}.`)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : <span className={styles.rolePill}>{m.role}</span>}
              </span>
              <span className={styles.weakText}><span className={styles.label}>Joined</span>{date(m.joined_at)}{m.invited_by ? <> · invited by <span className="mono">{m.invited_by}</span></> : " · created the organisation"}</span>
              <span>{admin && m.account_id !== w.accountId && (
                <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void act(() => o.send("/api/org/members", "DELETE", { account: m.account_id }), `Removed ${m.account_id}.`)}>Remove</button>
              )}</span>
            </div>
          ))}
        </div>
        {msg && <p className={msg.ok ? `${styles.note} ${styles.ok}` : styles.error} role="status" style={{ marginTop: 10 }}>{msg.text}</p>}
      </section>

      {admin && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2 className="h5">Invite a member</h2><span className="small faint">the link works once, for 72 hours</span></div>
          <div className={styles.inline}>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as OrgRole)} aria-label="Role for the new member">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className={styles.input} style={{ maxWidth: 280, height: 34 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={o.data!.email ? "email (optional)" : "email, for your records (optional)"} type="email" aria-label="Email (optional)" />
            <button type="button" className={styles.btn} onClick={() => void invite()}>Create invitation link</button>
          </div>
          {link && (
            <div className={styles.linkBox}>
              <code>{link.url}</code>
              <button type="button" className={styles.copy} onClick={() => { void navigator.clipboard?.writeText(link.url).then(() => setCopied(true)); }}>{copied ? "Copied" : "Copy link"}</button>
            </div>
          )}
          <p className={styles.note}>{o.data!.email ? (link?.emailed ? "Sent by email as well." : "Add an email to send the link as well.") : "Email delivery starts when an email provider is configured; until then, send the link yourself. Only a hash of it is stored."}</p>
          {(o.data!.invites ?? []).length > 0 && (
            <div className={styles.table}>
              <div className={`${styles.tHead} ${styles.inviteCols}`}><span>Role</span><span>For</span><span>Expires</span><span /></div>
              {o.data!.invites!.map((i) => (
                <div key={i.ref} className={`${styles.tRow} ${styles.inviteCols}`}>
                  <span><span className={styles.rolePill}>{i.role}</span></span>
                  <span className={styles.weakText}>{i.email ?? "anyone with the link"}</span>
                  <span className={styles.mono}>{dateTime(i.expires_at)}</span>
                  <span><button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void act(() => o.send("/api/org/invites", "DELETE", { ref: i.ref }), "Invitation withdrawn.")}>Withdraw</button></span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <div className={styles.panelHead} style={{ marginBottom: 10 }}><h2 className="h5">What each role is shown</h2><span className="small faint">the on-chain signer is the real control</span></div>
        <div className={styles.table}>
          <div className={`${styles.tHead} ${styles.matrixCols}`}><span>Role</span><span>Does</span><span>Signs on NEAR</span></div>
          {ROLE_INFO.map((r) => (
            <div key={r.role} className={`${styles.tRow} ${styles.matrixCols}`}>
              <span><span className={styles.rolePill}>{r.role}</span></span>
              <span className={styles.weakText}>{r.does}</span>
              <span className={styles.mono}>{r.signs}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const EVENTS: [string, string, string][] = [
  ["refusal", "A payment is refused", "The contract refused an agent's payment; the code and amount are included."],
  ["hold", "A payment is held for you", "An exception or a review period needs a decision."],
  ["approval", "Your approval is needed", "Terms to approve, a recipient to accept, a delivery to review."],
  ["recipient", "A recipient change is proposed", "Sent to every member, whatever their role."],
  ["revoked", "An agent is revoked", "Someone revoked an agent key in one of your rooms."],
  ["paid", "A payment is made", "Each payment to an approved recipient."],
];

function Notifications() {
  const o = useOrg();
  const prefs = o.data!.notifications ?? {};
  const value = (k: string) => (k in prefs ? prefs[k] : k !== "paid");
  const [error, setError] = useState<string | null>(null);
  const flip = async (k: string) => {
    setError(null);
    try { await o.send("/api/org/notifications", "PUT", { prefs: { ...Object.fromEntries(EVENTS.map(([e]) => [e, value(e)])), [k]: !value(k) } }); } catch (e) { setError((e as Error).message); }
  };
  return (
    <section className={styles.panel} style={{ maxWidth: 720 }}>
      <div className={styles.panelHead}><h2 className="h5">Tell me when</h2><span className={styles.badgeWait}>saved per member</span></div>
      <p className="small">Your choices are saved now. Refused payments already reach your organisation in the app and on the channels in <Link className="link" href="/settings?tab=alerts">Alerts</Link>; the other events are kept as choices until they are sent too.</p>
      <div>
        {EVENTS.map(([k, label, hint]) => (
          <div key={k} className={styles.toggle}>
            <div className={styles.form} style={{ gap: 2 }}><span style={{ color: "var(--text-strong)" }}>{label}</span><span className="small faint">{hint}</span></div>
            <button type="button" role="switch" aria-checked={value(k)} aria-label={label} className={styles.switchBtn} onClick={() => void flip(k)} />
          </div>
        ))}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}

function Developers() {
  const cfg = useAppConfig();
  return (
    <div className={styles.grid2}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2 className="h5">Connect an agent</h2><span className="small faint">read only</span></div>
        <p className="small">Agents reach Accord through its MCP server: they read agreements, run a preflight and request payments through the contract&apos;s gates. The agent&apos;s key is created in the room by the buyer and can call <span className="mono">act()</span> on that agreement and nothing else.</p>
        <div className={styles.record}>
          <div className={styles.recordRow}><span>stdio</span><code className={styles.code}>npx accord-mcp</code><span /></div>
          <div className={styles.recordRow}><span>HTTP</span><code className={styles.code}>accord-mcp --http 7777</code><span /></div>
          <div className={styles.recordRow}><span>endpoint</span><code className={styles.code}>http://127.0.0.1:7777/mcp</code><span /></div>
        </div>
        <p className="small">Set in the agent&apos;s environment, never in Accord:</p>
        <div className={styles.record}>
          <div className={styles.recordRow}><span>network</span><code className={styles.code}>NEAR_NETWORK={cfg.network === "sandbox" ? "sandbox" : cfg.network}</code><span /></div>
          <div className={styles.recordRow}><span>factory</span><code className={styles.code}>ACCORD_FACTORY={cfg.factory}</code><span /></div>
          <div className={styles.recordRow}><span>room</span><code className={styles.code}>AGENT_AGREEMENT=&lt;agreement account&gt;</code><span /></div>
          <div className={styles.recordRow}><span>key</span><code className={styles.code}>ACCORD_AGENT_KEY=&lt;the key shown once in the room&gt;</code><span /></div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2 className="h5">What the agent can do</h2></div>
        <dl className={styles.rows}>
          <dt>Read</dt><dd>agreements, items due, receipts, refusals</dd>
          <dt>Check</dt><dd>a preflight before paying a recipient</dd>
          <dt>Request</dt><dd>a payment or an exception through <span className="mono">act()</span></dd>
          <dt>Cannot</dt><dd>change a recipient, fund escrow, approve terms or move funds any other way</dd>
        </dl>
        <p className="small">API keys for reading the organisation&apos;s rooms from your own systems come later; today every read is public chain data.</p>
        <Link href="/docs" className="link small">Commands and contract methods</Link>
      </section>
    </div>
  );
}

function Billing() {
  return (
    <section className={styles.panel} style={{ maxWidth: 720 }}>
      <div className={styles.panelHead}><h2 className="h5">Plan</h2><span className={styles.badgeOk}>Developer preview</span></div>
      <dl className={styles.rows}>
        <dt>Charges</dt><dd>None during the developer preview.</dd>
        <dt>Network fees</dt><dd>Paid in NEAR by whoever signs a transaction, as on any NEAR app.</dd>
        <dt>Accord fee</dt><dd>No percentage of payment amounts. Production pricing is published before launch.</dd>
      </dl>
    </section>
  );
}
