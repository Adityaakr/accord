import { useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { usePageMeta } from "../lib/meta"
import { Arrow } from "../components/Arrow"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import { DOC_PAGES } from "../content/docs/pages"
import { DocsLayout, GROUPS } from "./docs/DocsLayout"
import { Block } from "./docs/Blocks"
import tl from "../styles/Timeline.module.css"
import styles from "./docs/Docs.module.css"

/* /docs: the docs overview. What Accord is in three lines, then every docs page by section. The single-page docs
   this replaced used #anchors; those land on the page that now holds that content. */

const OLD_ANCHORS: Record<string, string> = {
  try: "/docs/quickstart",
  near: "/docs/near",
  "near-ai-cloud": "/docs/near",
  "near-outlayer": "/docs/near",
  "near-agreement-contract": "/docs/near",
  "near-named-accounts": "/docs/near",
  "near-usdc": "/docs/near",
  "not-yet": "/docs/security",
  commands: "/docs/cli",
  contracts: "/docs/contracts",
  references: "/docs/references",
}

export function Docs() {
  usePageMeta("Accord: Documentation", "Accord documentation: a quickstart on NEAR testnet, the concepts, how it runs on NEAR, the commands, the contracts and endpoints, and how to verify an agreement yourself.")
  const { hash } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const to = OLD_ANCHORS[hash.slice(1)]
    if (to) navigate(to, { replace: true })
  }, [hash, navigate])

  let n = 0
  return (
    <div className={styles.page}>
      <DocsLayout page={null}>
        <header className={styles.header}>
          <h1 className={`t-h2 ${styles.title}`}>Documentation</h1>
          <p className={`t-body-lg ${styles.lead}`}>
            Accord is the private deal room and control plane for agent-to-agent commerce. Agents negotiate inside each company&apos;s sealed limits,
            both companies approve the terms, and the agreement&apos;s own NEAR contract pays only what was approved, to the authorised recipient.
            Everything here runs on NEAR testnet with test USDC.
          </p>
          <div className={styles.headerActions}>
            <Button variant="primary" href={LINKS.tryDeal}>Try a deal in 3 minutes</Button>
            <Button variant="secondary" href="/docs/quickstart">Read the quickstart</Button>
          </div>
        </header>

        <Block b={{ kind: "figure", figure: "hero", caption: "Illustrative. [Deal rooms](/docs/quickstart) · [the agreement's steps](/docs/concepts#lifecycle) · [the activity and refusal log](/docs/concepts#refusals)" }} />

        {GROUPS.map((g) => (
          <section key={g} className={styles.section}>
            <div className={tl.group}>
              <h2 className={tl.groupLabel}><span>{g}</span></h2>
              <ol className={tl.rows}>
                {DOC_PAGES.filter((p) => p.group === g).map((p) => (
                  <li key={p.slug} className={`${tl.row} ${styles.docRow}`}>
                    <span className={`mono ${tl.num}`}>{String(++n).padStart(2, "0")}</span>
                    <span className={styles.rowMain}>
                      <Link to={`/docs/${p.slug}`} className={styles.overviewLink}>{p.title}<Arrow /></Link>
                      <span className={styles.rowDetail}>{p.summary}</span>
                    </span>
                    <span />
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}

        <section className={styles.section}>
          <div className={tl.group}>
            <h2 className={tl.groupLabel}><span>On the site</span></h2>
            <ol className={tl.rows}>
              {[
                { to: "/verify", title: "Verify an agreement", detail: "Run the public checks on any agreement in your browser, with no keys." },
                { to: "/record", title: "Inspect agreement a6", detail: "Twelve steps, the payment and the refusal, each with its transaction." },
              ].map((r) => (
                <li key={r.to} className={`${tl.row} ${styles.docRow}`}>
                  <span className={`mono ${tl.num}`}>{String(++n).padStart(2, "0")}</span>
                  <span className={styles.rowMain}>
                    <Link to={r.to} className={styles.overviewLink}>{r.title}<Arrow /></Link>
                    <span className={styles.rowDetail}>{r.detail}</span>
                  </span>
                  <span />
                </li>
              ))}
            </ol>
          </div>
        </section>
      </DocsLayout>
    </div>
  )
}
