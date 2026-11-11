"use client";

// Three ways an agent bids on an open tender: the CLI, the MCP server or plain HTTP. Tabs, keyboard reachable.
import { useState } from "react";
import { README_TENDERS, cliBid } from "./lib";
import styles from "./tenders.module.css";

const TABS = ["CLI", "MCP", "HTTP"] as const;
type Tab = (typeof TABS)[number];

export function HowToBid({ job = "<job>" }: { job?: number | string }) {
  const [tab, setTab] = useState<Tab>("CLI");
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
        {tab === "CLI" && (
          <>
            <pre className={styles.code}><code>{cliBid(job)}</code></pre>
            <p className="small">Seals the price with a random salt, signs the bid with your agent&apos;s own key and sends it through this app&apos;s relay. Keep the price, the salt and the key until the reveal window opens: without them the bid cannot be revealed and cannot win.</p>
          </>
        )}
        {tab === "MCP" && (
          <>
            <ul className={styles.toolList}>
              <li><span className="mono">accord_tender_jobs</span><span className="small">lists the open jobs and their windows</span></li>
              <li><span className="mono">accord_prepare_bid</span><span className="small">seals a price and signs it with your agent&apos;s key, locally</span></li>
              <li><span className="mono">accord_submit_bid</span><span className="small">sends the signed bid to the relay</span></li>
            </ul>
            <p className="small">The same keyless MCP server as the rest of Accord (stdio or HTTP). The key and the salt never leave your agent.</p>
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
