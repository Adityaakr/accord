import { usePageMeta } from "../lib/meta"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
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
function PhoneCallIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14.05 2a9 9 0 0 1 8 7.94" />
      <path d="M14.05 6A5 5 0 0 1 18 10" />
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

/* FormSelectNode MqTZJAWLQ options (formSelectOptions) */
const SUBJECTS = [
  { value: "", title: "Select…", disabled: true },
  { value: "Customer support", title: "Customer support" },
  { value: "Investment options", title: "Investment options" },
  { value: "Partnership & Business Inquiries", title: "Partnership & Business Inquiries" },
  { value: "Other", title: "Other" },
]

export function Contact() {
  usePageMeta("Accord: Contact", "Get in touch with the Accord team.")
  const [buttonState, setButtonState] = useState<FormButtonState>("default")
  const [subject, setSubject] = useState("")
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  /* Form EA0JgLfRv: formSubmitButtonId GSGU3hc0J, formButtonPendingVariant Loading (CqDOqLP8H),
     formButtonSuccessVariant Success (lZoMH0RkI). Framer Forms posts to its own backend; we simulate it. */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (buttonState === "loading") return
    // TODO: wire submit endpoint: new FormData(e.currentTarget) holds
    // "First name", "Last name", "Email", "Phone", "Subject", "Message"
    setButtonState("loading")
    timer.current = window.setTimeout(() => setButtonState("success"), 1000)
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
        <WordReveal as="p" className={`t-body-lg ${styles.description}`} text="We’re here to help and answer any questions you may have." delay={0.2} duration={0.6} stagger={0.04} />
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
              <h5 className={`t-h5 ${styles.cardTitle}`}>Email us</h5>
              <p className={`t-body-sm ${styles.cardDescription}`}>
                Have a question? Our team is ready to help, contact us at{" "}
                <a href="mailto:contact@accord.com" target="_blank" rel="noopener" className="ls-link-inline">
                  contact@accord.com
                </a>
              </p>
            </div>
          </Mount>
          {/* Contact card WSmojpkE5: appear onMount delay 0.1s */}
          <Mount className={styles.card} delay="0.1s">
            {/* Icon GswGvCcsR */}
            <div className={styles.iconCircle}>
              <PhoneCallIcon />
            </div>
            {/* Text gA1FQQJi_ */}
            <div className={styles.cardText}>
              <h5 className={`t-h5 ${styles.cardTitle}`}>Contact team</h5>
              <p className={`t-body-sm ${styles.cardDescription}`}>
                Prefer to talk instead? You can now easily reach our team at{" "}
                <a href="tel:+1 (234) 567 890" target="_blank" rel="noopener" className="ls-link-inline">
                  +1 (234) 567 890
                </a>
              </p>
            </div>
          </Mount>
        </section>

        {/* Section Mq6GVQtUz: appear onMount delay 0.2s, fill Elevation Strong, vertical gap 32,
            padding 32px 24px 40px 24px, radius 4, overflow hidden, width 1fr */}
        <Mount as="section" className={styles.formCard} delay="0.2s">
          {/* Title qi266Z9YY: vertical gap 8, justify end */}
          <div className={styles.formTitle}>
            <h5 className={`t-h5 ${styles.formHeading}`}>Fill out the form</h5>
            <p className={`t-body-sm ${styles.formDescription}`}>After you submit the form, our team will reach out to you as quickly as possible.</p>
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
                <input className={styles.input} type="email" name="Email" placeholder="jane@accord.com" required />
              </label>
              {/* xOM9JFFLb */}
              <label className={styles.field}>
                <p className={`t-body-sm ${styles.fieldLabel}`}>Phone</p>
                {/* CR_xyCA37 */}
                <input className={styles.input} type="tel" name="Phone" placeholder="+ 1 (234) 567 890" />
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
            <FormButton state={buttonState} className={styles.submit} />
          </form>
        </Mount>
      </div>
    </div>
  )
}
