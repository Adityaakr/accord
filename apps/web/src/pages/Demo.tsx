import { usePageMeta } from "../lib/meta"
import { Appear, type AppearEffect } from "../lib/motion"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import styles from "./Demo.module.css"

/* /demo: docs/website/ACCORD_WEBSITE_CONTENT.md C (editorial fallback while no deployment is available), D2 "Recorded demo",
   A8 "Security demonstration" (anchor #security, the target of LINKS.securityDemo). Public copy set verbatim.
   The player renders only when LINKS.demoVideo is configured; otherwise the card carries the fallback sentence. */

const FALLBACK = "The public demonstration is being prepared. Production availability, supported assets and pricing have not been announced."

/* About row children appear: slide from x ±100 → 0, spring stiffness 240 / damping 80 / mass 1 */
const slide = (x: -100 | 100): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x, y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 240, damping: 80, mass: 1, delay: "0s" } },
})

/* The player card is taller than half a phone viewport; keep it triggerable. */
const cardAppear: AppearEffect = {
  threshold: 0.1,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay: "0.1s" } },
}

/* D2 "Recorded demo": a 16:9 player when the video link is configured, else the fallback sentence in the same frame */
function DemoCard() {
  const src = LINKS.demoVideo
  return (
    <Appear className={styles.player} effect={cardAppear}>
      <p className={`t-body-sm ${styles.playerLabel}`}>Recorded demo</p>
      <div className={styles.frame}>
        {src ? (
          <iframe className={styles.video} src={src} title="Recorded demo" allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <p className={`t-body-lg ${styles.placeholderText}`}>{FALLBACK}</p>
          </div>
        )}
      </div>
    </Appear>
  )
}

export function Demo() {
  usePageMeta("Accord: Demonstration", "Watch the Accord demonstration.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Demo"
        title="Watch the demo"
        lead={FALLBACK}
        actions={[{ label: "Inspect an agreement", href: LINKS.record, variant: "secondary" }]}
      />

      {/* Recorded demo */}
      <section id="recorded-demo" className={`section ${styles.demo}`}>
        <DemoCard />
      </section>

      {/* A8 Security demonstration (About section row y_CVc9JIP geometry) */}
      <section id="security" className={`section ${styles.security}`}>
        <div className={styles.row}>
          <Appear
            effect={slide(-100)}
            className={styles.image}
            style={{ backgroundImage: 'url("/assets/content-image-6.png")' }}
            role="img"
            aria-label="AI Agents panel listing trading, risk and portfolio agents"
          />
          <Appear effect={slide(100)} className={styles.content}>
            <div className={styles.text}>
              <h2 className={`t-h3 ${styles.rowTitle}`}>Change the instruction. Test the boundary.</h2>
              <p className={`t-body-lg ${styles.rowBody}`}>An agent can receive a convincing message that contradicts the deal. The payment decision should still follow the approved conditions.</p>
              <p className={`t-body-lg ${styles.rowBody}`}>
                Watch a demo agent attempt to change a recipient or payment amount. Inspect the request, the contract's response and the resulting agreement record.
              </p>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" href="/#try">Test the demo agent</Button>
              <Button variant="secondary" href={LINKS.record}>Inspect an agreement</Button>
            </div>
          </Appear>
        </div>
      </section>
    </div>
  )
}
