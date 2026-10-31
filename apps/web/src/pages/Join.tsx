import { useState, type FormEvent } from "react"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { FormButton, type FormButtonState } from "../components/FormButton"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* /join (spec §4 "Be the counterparty"): three steps drawn as the same numbered chain as /verify, then a request
   form that posts to ${VITE_ACCORD_API_URL}/join (no key, honest states, honeypot, 2,000-character cap).
   Copy: docs/website/ACCORD_WEBSITE_FINAL_COPY.md (How it works, Privacy and control, FAQ "no agent"). */

const API = (import.meta.env as Record<string, string | undefined>).VITE_ACCORD_API_URL
const LEAD = "Accord is pre-launch and early access is by request. Join as a token project, a market maker, an integration partner, a vendor or a buyer. In a deal room your position stays sealed; the other side sees only the agreed terms."

const STEPS = [
  { title: "Seal your mandate", text: "Each company seals its mandate in the browser; only a commitment hash is recorded. No one outside the enclave can read it." },
  { title: "Negotiate, with or without an agent", text: "The Sealed Table negotiates the terms. If you have no agent, a person on your side negotiates through the application against the other side's agent." },
  { title: "Both sides approve", text: "Both companies approve the terms before they take effect. Visible to both: the approved terms, the schedule, every payment, exception and refusal." },
]

type Status = { kind: "idle" | "sending" | "sent" | "error"; msg?: string }

function JoinForm() {
  const configured = Boolean(API)
  /* Pre-launch: without a request endpoint, requests go by email when VITE_CONTACT_EMAIL is set */
  const email = (import.meta.env as Record<string, string | undefined>).VITE_CONTACT_EMAIL ?? ""
  const canSend = configured || Boolean(email)
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  const roleParam = params.get("role") ?? ""
  const initialRole = ["project", "market-maker", "partner", "vendor", "buyer"].includes(roleParam) ? roleParam : "project"
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [message, setMessage] = useState("")
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSend) return
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (data.website) return
    if (!data.message?.trim()) { setStatus({ kind: "error", msg: "Write a message first." }); return }
    if (!configured) {
      const body = `Organisation: ${data.organisation || ""}\nRole: ${data.role}\nContact: ${data.contact || ""}\n\n${data.message}`
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Accord early access: ${data.role}`)}&body=${encodeURIComponent(body)}`
      setStatus({ kind: "sent", msg: "Your email app has the request ready to send." })
      return
    }
    setStatus({ kind: "sending" })
    try {
      const r = await fetch(`${API!.replace(/\/$/, "")}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organisation: data.organisation, role: data.role, contact: data.contact, message: data.message }) })
      setStatus(r.ok ? { kind: "sent", msg: "Request received. We will reply to the contact you gave." } : { kind: "error", msg: "Your submission was not completed. Review the details and try again." })
    } catch {
      setStatus({ kind: "error", msg: "The request store is unreachable; nothing was sent. Try again in a minute." })
    }
  }
  const btn: FormButtonState = !canSend ? "disabled" : status.kind === "sending" ? "loading" : status.kind === "error" ? "error" : "default"
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.field}><p className={`t-body-sm ${styles.fieldLabel}`}>Organisation</p><input className={styles.input} name="organisation" disabled={!canSend} /></label>
      <label className={styles.field}><p className={`t-body-sm ${styles.fieldLabel}`}>Role</p>
        <select className={styles.input} name="role" disabled={!canSend} defaultValue={initialRole}>
          <option value="project">Token project</option><option value="market-maker">Market maker</option><option value="partner">Integration partner</option><option value="vendor">Vendor</option><option value="buyer">Buyer</option>
        </select>
      </label>
      <label className={styles.field}><p className={`t-body-sm ${styles.fieldLabel}`}>Contact</p><input className={styles.input} name="contact" type="email" disabled={!canSend} /></label>
      <label className={styles.field}><p className={`t-body-sm ${styles.fieldLabel}`}>Message</p>
        <textarea className={styles.input} style={{ height: 120, padding: 16, resize: "vertical" }} name="message" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} disabled={!canSend} />
        <p className={`t-body-sm ${styles.weak}`}>{message.length} / 2,000</p>
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      <div className={styles.submitRow}>
        <FormButton state={btn} label="Request early access" className={styles.submit} />
        <p className={`t-body-sm ${styles.weak}`} role="status">{!canSend ? "Early-access requests open shortly. Watch this page." : status.msg}</p>
      </div>
    </form>
  )
}

export function Join() {
  usePageMeta("Accord: Request early access", LEAD)
  return (
    <div className={styles.page}>
      <PageHero pill="Early access" title="Request early access." lead={LEAD} />
      <section id="join" className={`section ${styles.main}`}>
        <div className={styles.block}>
          <h2 className={`t-h4 ${styles.subheading}`}>How you join.</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <Appear key={s.title} as="li" className={styles.step} effect={{ ...appear(`${i * 0.05}s` as `${number}s`), threshold: 0.2 }}>
                <div className={styles.stepHead}>
                  <span className={`mono ${styles.stepNo}`}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={`t-h5 ${styles.stepTitle}`}>{s.title}</h3>
                </div>
                <p className={`t-body-sm ${styles.stepText}`}>{s.text}</p>
              </Appear>
            ))}
          </ol>
        </div>
        <Appear as="div" className={styles.card} effect={{ ...appear("0s"), threshold: 0.2 }}>
          <h2 className={`t-h5 ${styles.cardTitle}`}>Request to join</h2>
          <JoinForm />
        </Appear>
      </section>
    </div>
  )
}
