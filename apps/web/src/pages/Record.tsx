import { usePageMeta } from "../lib/meta"
import { PageHero } from "../components/PageHero"
import { PhaseTimeline, ProofGroup } from "../components/PhaseTimeline"
import { AgreementRecord } from "../components/AgreementRecord"
import { QuietLink } from "../components/QuietLink"
import { CopyButton } from "../components/CopyButton"
import { CIRCLE, RELEASE4, TESTNET, INFRA } from "../content/testnet"
import { useLive } from "../lib/live"
import tl from "../styles/Timeline.module.css"
import styles from "./Record.module.css"

/* /record ("Inspect an agreement"): one centred column in the timeline language (styles/Timeline.module.css):
   agreement a6's twelve steps in four phases, each with its transaction, then its record (state, items, recipient,
   last transfer, what it holds) and its refusal log, all linked to the explorer. */

export function Record() {
  usePageMeta("Accord: Public record", "Agreement a6.accord-v2.testnet on NEAR testnet, each step linked to its transaction, from the sealed limits to a refused redirect.")
  const live = useLive()
  return (
    <div className={styles.page}>
      <PageHero centered pill="Execution record" title="Inspect an agreement." lead="Every step, payment and refusal of agreement a6, each one a transaction you can open." />

      <section id="record" className={`section ${styles.section}`}>
        <div className={tl.column}>
          <div className={tl.head}>
            <span className={tl.headLabel}>Agreement</span>
            <span className={styles.headValue}>
              <QuietLink href={TESTNET.agreementUrl} className={styles.headLink}>{TESTNET.agreement}</QuietLink>
              <CopyButton text={TESTNET.agreement} />
            </span>
          </div>
          <PhaseTimeline />
          <AgreementRecord v={live} />
          <ProofGroup
            label="Latest on release 4"
            meta={<QuietLink href={`/verify?agreement=${RELEASE4.agreement}`}>verify a10</QuietLink>}
            proofs={RELEASE4.steps}
            note={<>Release 4 carries the security-review fixes and is current on both factories since 9 Nov 2026 (<QuietLink href={RELEASE4.publish} mono={false}>published</QuietLink>); agreements created before it, a6 among them, keep release 3. The proofs ran again on new agreements a10, a11 and a13.</>}
          />
          <ProofGroup
            label="Circle USDC"
            meta={<QuietLink href={`/verify?agreement=${CIRCLE.agreement}`}>verify a1</QuietLink>}
            proofs={CIRCLE.steps}
            note={<>The second factory, <span className="mono">{CIRCLE.factory}</span>, settles in Circle&apos;s testnet USDC. Agreement a1 was created on its release 3.</>}
          />
          <div className={`${tl.foot} ${styles.foot}`}>
            <span className={`mono ${tl.weak}`}>release {TESTNET.release} · test USDC</span>
            {INFRA.map((i) => <QuietLink key={i.label} href={i.href} mono={false} className={styles.infra}>{i.label}</QuietLink>)}
            <QuietLink href={`/verify`} mono={false} className={styles.infra}>Verify it</QuietLink>
          </div>
        </div>
      </section>
    </div>
  )
}
