import { usePageMeta } from "../lib/meta"
import { useRef, useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { motion, useInView, type Transition } from "motion/react"
import { Appear, EASE_APPEAR, EASE_UI, toTransition, type FramerTween } from "../lib/motion"
import { Dots } from "../components/Dots"
import { FormButton, type FormButtonState } from "../components/FormButton"
import styles from "./Contact.module.css"

/* ------------------------------------------------------------------
   Contact page (WebPageNode G9l6HTB3t, path /contact): Desktop breakpoint MStrxXPdo,
   Tablet ppYmpHsbZ, Phone ZBTrd25sT. Layout template vLUWo2njy (Nav/Footer) comes from App.tsx.
   Page content = "Main" Oi8H4FaLL (elementId "hero"): vertical stack, align center, gap 64,
   max-width 760, padding 48px 0, width 1fr, scroll-margin-top 200.
   Tablet: gap 56 · Phone: gap 48, padding 48px 16px.
   Every value below is copied from the Framer tree.
------------------------------------------------------------------- */

/* appearEffect trigger "onMount": opacity 0 → 1, y 32 → 0, tween 1s ease [0.12,0.23,0.5,1] (plays once on mount) */
const mount = (delay: `${number}s`): FramerTween => ({ type: "tween", ease: EASE_APPEAR, duration: "1s", delay })
function Mount({ delay, className, as = "div", children }: { delay: `${number}s`; className?: string; as?: "div" | "section"; children?: ReactNode }) {
  const Tag = as === "section" ? motion.section : motion.div
  return (
    <Tag className={className} initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={toTransition(mount(delay))}>
      {children}
    </Tag>
  )
}

/* textEffect: trigger onMount, tokenization "word", style {opacity 0, y 32px, blur 10px},
   per-token tween ease [0.12,0.23,0.5,1]; `delay` = start delay, transition.delay (0.04s) = stagger */
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

/* Dots zIzwj1IWA: absolute left 0 top 0, 920×780 (aspectRatio 1.18), overflow hidden, z 0, fill dots.png
   loopEffect: opacity → 0.5, repeatType mirror, repeatDelay 0s, pauseOffscreen, tween 2s ease [0.44,0,0.56,1] */
function LoopingDots() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const loop: Transition = { type: "tween", ease: EASE_UI, duration: 2, delay: 0, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }
  return (
    <motion.div ref={ref} className={styles.dotsWrap} initial={{ opacity: 1 }} animate={inView ? { opacity: 0.5, transition: loop } : { opacity: 1, transition: { duration: 0 } }} aria-hidden="true">
      <Dots className={styles.dots} />
    </motion.div>
  )
}

/* IconNodes kxr9GukKq ("Mails") and iEuv0E4EF ("Phone Call"): Lucide set Y7SpbVH16cWqMhj75z1M,
   24×24, color White ($control__P_DcoRcrY), stroke width 1.4 ($control__JEeZYcamG), opacity 0.9 */
const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--white)",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: styles.icon,
  "aria-hidden": true,
}
function MailsIcon() {
  return (
    <svg {...iconProps}>
      <rect width="16" height="13" x="6" y="4" rx="2" />
      <path d="m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7" />
      <path d="M2 8v11c0 1.1.9 2 2 2h14" />
    </svg>
  )
}

/* FormSelectNode MqTZJAWLQ options (formSelectOptions) */
const SUBJECTS = [
  { value: "", title: "Select…", disabled: true },
  { value: "Getting started", title: "Getting started" },
  { value: "Market-making agreements", title: "Market-making agreements" },
  { value: "Integration or partnership", title: "Integration or partnership" },
  { value: "Security", title: "Security" },
  { value: "Press", title: "Press" },
  { value: "Other", title: "Other" },
]

/* The team's address (.env VITE_CONTACT_EMAIL). Unset: no address is shown and the form is disabled with a pointer to
   /join, so a message is never silently dropped. Set: the form opens the visitor's email app addressed to it. */
const CONTACT_EMAIL = (import.meta.env as Record<string, string | undefined>).VITE_CONTACT_EMAIL ?? ""

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function Contact() {
  usePageMeta("Accord: Contact", "Contact the Accord team about market-making agreements, integrations, security or press. Accord runs on NEAR testnet.")
  const [sent, setSent] = useState(false)
  const [subject, setSubject] = useState("")
  const buttonState: FormButtonState = !CONTACT_EMAIL ? "disabled" : sent ? "success" : "default"

  /* The form opens the visitor's email app with the message filled in; nothing is sent until they send it there */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!CONTACT_EMAIL) return
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const body = `${d["First name"]} ${d["Last name"]}\n${d.Email}${d.Phone ? `\n${d.Phone}` : ""}\n\n${d.Message}`
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Accord: ${d.Subject}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div id="hero" className={`section ${styles.main}`}>
      <LoopingDots />

      {/* Title pawoIAmUw: vertical, gap 16, overflow hidden, width 1fr */}
      <div className={styles.title}>
        {/* Tag vfhhKyZrv: appear onInView (y 32, 1s, delay 0), horizontal gap 8, align center */}
        <Appear className={styles.tag}>
          {/* Indicator nA5ekZz99: 14×8, radius 9999, fill White */}
          <span className={styles.tagIndicator} aria-hidden="true" />
          {/* Text r0gQIENP6: Body Small */}
          <p className={`t-body-sm ${styles.tagText}`}>Contact us</p>
        </Appear>
        {/* Title arEJg_OLP: H1, Text Strong, word reveal delay 0.1s, 0.8s/word, stagger 0.04s */}
        <WordReveal as="h1" className={`t-h1 ${styles.heading}`} text="Get in touch with us" delay={0.1} duration={0.8} stagger={0.04} />
        {/* Description yzoU7K91a: Body Large, Text Medium, left, word reveal delay 0.2s, 0.6s/word, stagger 0.04s */}
        <WordReveal as="p" className={`t-body-lg ${styles.description}`} text="Questions about Accord or an agreement type? Write to us." delay={0.2} duration={0.6} stagger={0.04} />
      </div>

      {/* Content ton4m9Ta_: vertical, gap 16, overflow clip, align center, justify center, width 1fr */}
      <div className={styles.content}>
        {/* Section ff4jcUMWS: horizontal, gap 16, overflow clip, align/justify center, width 1fr (Phone: vertical) */}
        <section className={styles.cards}>
          {/* Contact card lne7ukrAP: appear onMount delay 0 */}
          <Mount className={styles.card} delay="0s">
            {/* Icon tcZ7sKphm: 64×64, 1px solid Elevation Weak, radius 999, overflow clip, centered */}
            <div className={styles.iconCircle}>
              <MailsIcon />
            </div>
            {/* Text kZQsGzYul: vertical gap 8, width 1fr */}
            <div className={styles.cardText}>
              <h2 className={`t-h5 ${styles.cardTitle}`}>{CONTACT_EMAIL ? "Email us" : "Getting started"}</h2>
              <p className={`t-body-sm ${styles.cardDescription}`}>
                {CONTACT_EMAIL ? (
                  <>Write to{" "}<a href={`mailto:${CONTACT_EMAIL}`} className="ls-link-inline">{CONTACT_EMAIL}</a></>
                ) : (
                  <>Accord runs on NEAR testnet. To start a deal room, see <Link to="/join" className="ls-link-inline">how to start</Link>.</>
                )}
              </p>
            </div>
          </Mount>
          {/* Contact card WSmojpkE5: appear onMount delay 0.1s */}
          <Mount className={styles.card} delay="0.1s">
            {/* Icon GswGvCcsR */}
            <div className={styles.iconCircle}>
              <ShieldIcon />
            </div>
            <div className={styles.cardText}>
              <h2 className={`t-h5 ${styles.cardTitle}`}>Check it yourself</h2>
              <p className={`t-body-sm ${styles.cardDescription}`}>
                Each claim and its limit is on <Link to="/security" className="ls-link-inline">Security</Link>; commands are in the{" "}
                <Link to="/docs" className="ls-link-inline">Docs</Link>.
              </p>
            </div>
          </Mount>
        </section>

        {/* Section Mq6GVQtUz: appear onMount delay 0.2s, fill Elevation Strong, vertical gap 32,
            padding 32px 24px 40px 24px, radius 4, overflow hidden, width 1fr */}
        <Mount as="section" className={styles.formCard} delay="0.2s">
          {/* Title qi266Z9YY: vertical gap 8, justify end */}
          <div className={styles.formTitle}>
            <h2 className={`t-h5 ${styles.formHeading}`}>Fill out the form</h2>
            <p className={`t-body-sm ${styles.formDescription}`}>
              {CONTACT_EMAIL ? "Submitting opens your email app with the message filled in; nothing is sent until you send it there." : "The form opens once our inbox is connected. Until then, request early access on the early-access page."}
            </p>
          </div>

          {/* Form EA0JgLfRv: vertical, gap 20 (Phone 16), overflow hidden, align start, width 1fr */}
          <form className={styles.form} onSubmit={onSubmit}>
            {/* Row Y4Va5mQ4B: horizontal gap 16 (Phone: vertical) */}
            <div className={styles.row}>
              {/* fVMZznP_o */}
              <label className={styles.field}>
                <p className={`t-body-sm ${styles.fieldLabel}`}>First name*</p>
                {/* R9MpwYv0J */}
                <input className={styles.input} type="text" name="First name" placeholder="Jane" required />
              </label>
              {/* EdltBfAeA */}
              <label className={styles.field}>
                <p className={`t-body-sm ${styles.fieldLabel}`}>Last name*</p>
                {/* XOPfjLvY7 */}
                <input className={styles.input} type="text" name="Last name" placeholder="Doe" required />
              </label>
            </div>
            {/* Row ZBH4c0iQx */}
            <div className={styles.row}>
              {/* jcHiAm1xV */}
              <label className={styles.field}>
                <p className={`t-body-sm ${styles.fieldLabel}`}>Email*</p>
                {/* Ou8RZy7PO */}
                <input className={styles.input} type="email" name="Email" placeholder="jane@company.com" required />
              </label>
              {/* xOM9JFFLb */}
              <label className={styles.field}>
                <p className={`t-body-sm ${styles.fieldLabel}`}>Phone</p>
                {/* CR_xyCA37 */}
                <input className={styles.input} type="tel" name="Phone" placeholder="Optional" />
              </label>
            </div>
            {/* P_FZgaNG9 */}
            <label className={styles.field}>
              <p className={`t-body-sm ${styles.fieldLabel}`}>Subject*</p>
              {/* MqTZJAWLQ: FormSelectNode */}
              <select
                className={`${styles.input} ${styles.select} ${subject === "" ? styles.selectPlaceholder : ""}`}
                name="Subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECTS.map((o) => (
                  <option key={o.title} value={o.value} disabled={o.disabled}>
                    {o.title}
                  </option>
                ))}
              </select>
            </label>
            {/* Kvgtfaxij */}
            <label className={styles.field}>
              <p className={`t-body-sm ${styles.fieldLabel}`}>Your message*</p>
              {/* Pw8FXbtST: textarea, min-height 100, resizable */}
              <textarea className={`${styles.input} ${styles.textarea}`} name="Message" placeholder="Type your message..." required />
            </label>
            {/* GSGU3hc0J: Form Button instance */}
            <FormButton state={buttonState} label="Write the email" className={styles.submit} />
            <p className={`t-body-sm ${styles.formDescription}`} role="status">{sent ? "Your email app has the message ready to send." : ""}</p>
          </form>
        </Mount>
      </div>
    </div>
  )
}
