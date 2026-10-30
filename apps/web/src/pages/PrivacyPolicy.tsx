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
      <h5 className={`t-h5 ${styles.sectionTitle}`}>{title}</h5>
      {children}
    </motion.div>
  )
}

/* Body Small rich text (single paragraph) */
function Body({ children }: { children: ReactNode }) {
  return <p className={`t-body-sm ${styles.rich}`}>{children}</p>
}

export function PrivacyPolicy() {
  usePageMeta("Accord: Privacy", "What this site stores and for how long.")
  return (
    <div className={styles.page}>
      {/* Main R7DaFnuPM */}
      <section id="hero" className={`section ${styles.main}`}>
        {/* Title fQDNvHm7F */}
        <div className={styles.titleGroup}>
          {/* Tag gxZFQKKDY: appearEffect onInView, threshold 0.5, {opacity 0, y 32}, tween 1s [0.12,0.23,0.5,1] */}
          <Appear className={styles.tag}>
            <div className={styles.indicator} />
            <p className={`t-body-sm ${styles.tagText}`}>February 17, 2026</p>
          </Appear>
          {/* Title cxHZaenz6: textEffect delay 0.1s, 0.8s per word, stagger 0.04s */}
          <WordReveal as="h1" className={`t-h1 ${styles.title}`} text="Privacy policy" delay={0.1} duration={0.8} stagger={0.04} />
          {/* Description SJ3HgRWEB: textEffect delay 0.2s, 0.6s per word, stagger 0.04s */}
          <WordReveal
            as="p"
            className={`t-body-lg ${styles.description}`}
            text="Welcome to Accord. This Privacy policy explains how we collect, use, and protect your personal information when you use our website."
            delay={0.2}
            duration={0.6}
            stagger={0.04}
          />
        </div>

        {/* Sections ytF4ldnHg */}
        <div className={styles.sections}>
          {/* Section oPzH_1zRb */}
          <Section title="1. Information We Collect">
            {/* Paragraph T3DsQ_FFH */}
            <div className={styles.paragraph}>
              <Body>1.1 Personal Information</Body>
              <Body>We may collect personal information, such as your name, email address, and other contact details when you voluntarily provide it to us. For example, when you register for an account, subscribe to newsletters, or contact us through the website.</Body>
            </div>
            {/* Paragraph jRZukmTyJ */}
            <div className={styles.paragraph}>
              <Body>1.2 Usage Information</Body>
              <Body>We may collect information about your use of the website, including your IP address, browser type, device information, and pages visited. This information helps us analyze trends, administer the site, and improve user experience.</Body>
            </div>
          </Section>

          {/* Section k_wmZeEvV: Description GGd3bVymh: TextBlock p + TextBulletList (4 items) */}
          <Section title="2. How We Use Your Information">
            <div className={`t-body-sm ${styles.rich}`}>
              <p>We use the collected information for various purposes, including:</p>
              <ul>
                <li>Providing and maintaining the website</li>
                <li>Communicating with you about your account and our services</li>
                <li>Sending newsletters, promotional materials, and other information you request</li>
                <li>Analyzing website usage and improving our services</li>
              </ul>
            </div>
          </Section>

          {/* Section jCurdaEKI */}
          <Section title="3. Sharing Your Information">
            <Body>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this Privacy Policy. We may share information with trusted third-party service providers who assist us in operating our website or conducting our business.</Body>
          </Section>

          {/* Section rLNTiQCpE */}
          <Section title="4. Cookies and Similar Technologies">
            <Body>We use cookies and similar technologies to enhance your experience on our website. You can control cookies through your browser settings, but disabling them may affect your ability to use certain features of the site.</Body>
          </Section>

          {/* Section VloRP64Ls */}
          <Section title="5. Your Choices">
            <Body>You can manage your communication preferences by unsubscribing from newsletters or adjusting your account settings. You may also contact us to update or delete your personal information.</Body>
          </Section>

          {/* Section s9y6sEjuq */}
          <Section title="6. Security">
            <Body>We take reasonable measures to protect the security of your personal information. However, no method of transmission over the internet or electronic storage is without risk. Therefore, we cannot guarantee absolute security.</Body>
          </Section>

          {/* Section LCfTnTwn5 */}
          <Section title="7. Children's Privacy">
            <Body>Our website is not directed to individuals under the age of 18. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to remove such information.</Body>
          </Section>

          {/* Section nb6OzCIqh */}
          <Section title="8. Changes to This Privacy Policy">
            <Body>We may update this Privacy Policy periodically. We will notify you of any changes by posting the new Privacy Policy on this page. Your continued use of the website after such modifications will constitute your acknowledgment of the modified Privacy Policy.</Body>
          </Section>

          {/* Section hRvTx2mba: Description i7cmmEuAf: linkStylePreset FTn6Ho50C ("Link inline"),
              run link mailto:contact@accord.com, openInNewTab */}
          <Section title="9. Contact Us">
            <Body>
              If you have questions, contact us at{" "}
              <a href="mailto:contact@accord.com" target="_blank" rel="noopener noreferrer" className="ls-link-inline">
                contact@accord.com
              </a>
            </Body>
          </Section>
        </div>
      </section>
    </div>
  )
}
