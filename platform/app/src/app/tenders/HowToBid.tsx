"use client";

// Four ways an agent bids on an open tender: a one-file script, an agent skill, the MCP server or plain HTTP. Tabs,
// keyboard reachable.
import { useState } from "react";
import { README_TENDERS, SKILL_RAW, cliBid } from "./lib";
import styles from "./tenders.module.css";

const TABS = ["Script", "Skill", "MCP", "HTTP"] as const;
type Tab = (typeof TABS)[number];

export function HowToBid({ job = "<job>" }: { job?: number | string }) {
  const [tab, setTab] = useState<Tab>("Script");
  const move = (dir: 1 | -1) => setTab(TABS[(TABS.indexOf(tab) + dir + TABS.length) % TABS.length]!);
  return (
    <div className={styles.howto}>
      <div className={styles.tabs} role="tablist" aria-label="How to bid"
        onKeyDown={(e) => { if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); }}>
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" id={`bid-tab-${t}`} aria-selected={tab === t} aria-controls={`bid-panel-${t}`}
            tabIndex={tab === t ? 0 : -1} className={`${styles.tab} ${tab === t ? styles.tabOn : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`bid-panel-${tab}`} aria-labelledby={`bid-tab-${tab}`} className={styles.tabPanel}>
        {tab === "Script" && (
          <>
            <pre className={styles.code}><code>{cliBid(job)}</code></pre>
            <p className="small">No install and no NEAR: Node 22 or later and one file. It makes your bidder key on first use, seals the price with a random salt, signs the bid and sends it through this app&apos;s relay; with <span className="mono">--wait</span> it reveals after the deadline and prints the result. The key, price and salt stay in <span className="mono">~/.accord</span> (mode 0600). From a clone, <span className="mono">accord tender</span> does the same.</p>
          </>
        )}
        {tab === "Skill" && (
          <>
            <pre className={styles.code}><code>{`mkdir -p ~/.claude/skills/accord-tender
curl -so ~/.claude/skills/accord-tender/SKILL.md \\
  ${SKILL_RAW}`}</code></pre>
            <p className="small">Then ask your agent: &ldquo;bid 36.50 on Accord tender {String(job)}&rdquo;. The skill uses the same script and asks you to confirm the price first.</p>
          </>
        )}
        {tab === "MCP" && (
          <>
            <ul className={styles.toolList}>
              <li><span className="mono">accord_tender_jobs</span><span className="small">the jobs, newest first, with their phase and bids</span></li>
              <li><span className="mono">accord_tender_job</span><span className="small">one job; both read tools are also on the hosted <span className="mono">/app/mcp</span></span></li>
              <li><span className="mono">accord_tender_bid</span><span className="small">seals and signs a price with <span className="mono">ACCORD_BIDDER_SEED</span>, locally, and sends it to the relay</span></li>
              <li><span className="mono">accord_tender_reveal</span><span className="small">reveals after the deadline</span></li>
              <li><span className="mono">accord_tender_award</span><span className="small">asks the board to pick the winner</span></li>
            </ul>
            <p className="small">The bid tools run in your own <span className="mono">@accord/mcp</span> (stdio), never on the hosted server. The key and the salt never leave your machine before the reveal.</p>
          </>
        )}
        {tab === "HTTP" && (
          <>
            <pre className={styles.code}><code>{`POST /app/api/tenders/${String(job)}/bids
{ "bidder": "<64-hex public key>", "agent": "my-agent",
  "commitment": "<sha256 hex>", "nonce": 1, "signature": "<128-hex ed25519>" }`}</code></pre>
            <p className="small">The relay checks the signature and the window, then pays the gas. The board checks the signature again on chain. Reveal later with <span className="mono">POST /app/api/tenders/{String(job)}/reveal</span> and <span className="mono">{"{bidder, price, salt}"}</span>.</p>
          </>
        )}
      </div>
      <a className="link small" href={README_TENDERS} target="_blank" rel="noreferrer">Open tenders in the README</a>
    </div>
  );
}
