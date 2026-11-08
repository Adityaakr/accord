import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { motion, type Transition } from "motion/react"
import { Appear, EASE_APPEAR, EASE_UI, toTransition } from "../lib/motion"
import styles from "./PrivacyPolicy.module.css"

/* ------------------------------------------------------------------
   Privacy Policy page (WebPageNode Ivq1YZFwy, path /privacy-policy)
   Desktop breakpoint Zs7Hv4Vnw; Tablet clcriRn3Y; Phone WXwyzmg4Y.
   The breakpoint uses layout template vLUWo2njy: Nav/Footer/Smooth Scroll
   (tXrJmbIK2) are provided by App.tsx. Every value is copied from the Framer tree.
------------------------------------------------------------------- */

/* textEffect: trigger onMount, tokenization "word", style {opacity 0, y 32px, blur 10px},
   per-word tween ease [0.12,0.23,0.5,1]; `delay` = effect delay, `stagger` = transition.delay */
function WordReveal({ as: Tag, className, text, delay, duration, stagger }: { as: "h1" | "p"; className: string; text: string; delay: number; duration: number; stagger: number }) {
  const words = text.split(" ")
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => {
        const t: Transition = { type: "tween", ease: EASE_APPEAR, duration, delay: delay + i * stagger }
        return (
          <span key={i} aria-hidden="true">
            <motion.span className={styles.word} initial={{ opacity: 0, y: 32, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={t}>
              {w}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </span>
        )
      })}
    </Tag>
  )
}

/* Section frames (oPzH_1zRb, k_wmZeEvV, jCurdaEKI, rLNTiQCpE, VloRP64Ls, s9y6sEjuq, LCfTnTwn5, nb6OzCIqh, hRvTx2mba):
   appearEffect trigger onMount, enter {opacity 0, y 32}, tween 0.8s ease [0.44,0,0.56,1] delay 0.4s, stagger 0s */
const SECTION_APPEAR = toTransition({ type: "tween", ease: EASE_UI, duration: "0.8s", delay: "0.4s" })

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div className={styles.sectionBlock} initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={SECTION_APPEAR}>
      <h2 className={`t-h5 ${styles.sectionTitle}`}>{title}</h2>
      {children}
    </motion.div>
  )
}

/* Body Small rich text (single paragraph) */
function Body({ children }: { children: ReactNode }) {
  return <p className={`t-body-sm ${styles.rich}`}>{children}</p>
}

export function PrivacyPolicy() {
  usePageMeta("Accord: Privacy policy", "What the Accord website collects, where it goes and what it never does: no analytics, no tracking cookies, and only what you choose to send.")
  return (
    <div className={styles.page}>
      {/* Main R7DaFnuPM */}
      <section id="hero" className={`section ${styles.main}`}>
        {/* Title fQDNvHm7F */}
        <div className={styles.titleGroup}>
          {/* Tag gxZFQKKDY: appearEffect onInView, threshold 0.5, {opacity 0, y 32}, tween 1s [0.12,0.23,0.5,1] */}
          <Appear className={styles.tag}>
            <div className={styles.indicator} />
            <p className={`t-body-sm ${styles.tagText}`}>8 November 2026</p>
          </Appear>
          {/* Title cxHZaenz6: textEffect delay 0.1s, 0.8s per word, stagger 0.04s */}
          <WordReveal as="h1" className={`t-h1 ${styles.title}`} text="Privacy policy" delay={0.1} duration={0.8} stagger={0.04} />
          {/* Description SJ3HgRWEB: textEffect delay 0.2s, 0.6s per word, stagger 0.04s */}
          <WordReveal
            as="p"
            className={`t-body-lg ${styles.description}`}
            text="What this website collects, where it goes and what it never does. This page covers the site, not the product."
            delay={0.2}
            duration={0.6}
            stagger={0.04}
          />
        </div>

        {/* Sections ytF4ldnHg: rewritten 8 Nov 2026 to describe what this site actually does (it replaced the template's
            account, newsletter and cookie text, none of which applied). Keep it in step with the code: the form in
            pages/Contact.tsx, the inbox in lib/live.ts, the theme in components/ThemeToggle.tsx. */}
        <div className={styles.sections}>
          <Section title="1. What this site collects">
            <div className={`t-body-sm ${styles.rich}`}>
              <p>Only what you choose to send:</p>
              <ul>
                <li>The contact form: your name, email, optional phone, subject and message.</li>
                <li>The demonstration inbox on /try: the sender, subject and text of the message you send to the demonstration agent.</li>
              </ul>
            </div>
          </Section>

          <Section title="2. Where it goes">
            <div className={`t-body-sm ${styles.rich}`}>
              <ul>
                <li>Contact messages open in your own email app addressed to us.</li>
                <li>Messages to the demonstration inbox are public: the agent reads them and every refusal is shown on /try and /record. Do not put personal information in them.</li>
              </ul>
            </div>
          </Section>

          <Section title="3. What we do not do">
            <Body>This site has no analytics, no advertising and no tracking cookies, and we do not sell or share what you send. Agreements, payments and refusals on NEAR testnet are public there by design.</Body>
          </Section>

          <Section title="4. Your browser and our host">
            <Body>Your browser keeps one setting for this site, the light or dark theme, in local storage; clear your site data to remove it. Fonts load from Google Fonts, which receives your IP address when they load. Our hosting provider may keep standard request logs, such as IP address and time, to run and protect the service.</Body>
          </Section>

          <Section title="5. How long we keep it">
            <Body>Contact messages are kept while we reply, and deleted when you ask. Demonstration inbox messages stay on the public record of the demonstration.</Body>
          </Section>

          <Section title="6. Your choices">
            <Body>Ask us to see, correct or delete anything you sent through the contact page. This site is not directed to children.</Body>
          </Section>

          <Section title="7. Changes">
            <Body>When this policy changes, the date at the top of the page changes with it.</Body>
          </Section>
        </div>
      </section>
    </div>
  )
}
