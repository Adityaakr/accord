import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Mono } from "../components/Mono"
import { FormButton, type FormButtonState } from "../components/FormButton"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify (spec §4 "Verify a live agreement"): PageHero, the lookup form (the page's primary action), then the
   checks `make verify` runs, as a vertical checklist of seven cards, each with the line it prints, and the summary line.
   Copy: kit v7 INTERFACES.md section 10 ("Make targets and the lines they print"), the printed lines as written there;
   values in angle brackets are filled in at run time.
   The lookup opens /record?agreement=<id> only when VITE_ACCORD_API_URL is set; otherwise the field is disabled.
------------------------------------------------------------------- */

const API = (import.meta.env as Record<string, string | undefined>).VITE_ACCORD_API_URL

const LEAD =
  "One command checks a live agreement from public data, with no keys: the contract code, the agreement's keys, the Sealed Table release, the sealed outcome, the model attestation, the recipient and the record."

const VERIFY_COMMAND = "make verify DEAL=<agreement>"

type Step = { id: string; title: string; line: string }

/* Verbatim from INTERFACES.md section 10, `make verify` */
const FIRST_LINE = "accord verify · <agreement>"
const STEPS: Step[] = [
  { id: "code", title: "Contract code", line: "code      code hash <8>… = release <v> (<global by hash | embedded>) · no deploy method · ok" },
  { id: "keys", title: "Agreement keys", line: "keys      <0 | 1> key · FunctionCall · receiver self · methods [act] · no full access · ok" },
  { id: "release", title: "Sealed Table release", line: "release   sealed-table wasm <8>… · keys from pubkey run <task id> · attestation verified · seed binding <shown | not exposed> · ok" },
  { id: "sealed", title: "Sealed outcome", line: "sealed    outcome signature ok · commitments match · nonce matches · ok" },
  { id: "model", title: "Model attestation", line: "model     <model> · gateway TDX <ok | not checked> · model TDX <ok | not checked> · GPU <ok | not checked> · fresh nonce bound · ok" },
  { id: "payee", title: "Recipient", line: "payee     <recipient> · proof <domain> · authority approved · buyer accepted · active · ok" },
  { id: "record", title: "Record", line: "record    <n> payments · <n> refusals · <n> exceptions · <n> set aside · <n> observation conflicts · events match state · ok" },
]
const SUMMARY_LINE = "verify: <n> checks ok"

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")

  useEffect(() => {
    if (state === "idle") return
    const t = window.setTimeout(() => setState("idle"), 1600)
    return () => window.clearTimeout(t)
  }, [state])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <button type="button" className={`t-body-sm ${styles.copy}`} onClick={copy} aria-live="polite" aria-label={`Copy ${text}`}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  )
}

/* The lookup: a job id or agreement id → /record?agreement=<id> (only when the API is configured) */
function LookupForm() {
  const navigate = useNavigate()
  const configured = Boolean(API)
  const [id, setId] = useState("")
  const [note, setNote] = useState<string | null>(null)
  const state: FormButtonState = configured ? "default" : "disabled"

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!configured) return
    const value = id.trim()
    if (!value) { setNote("Enter a job id or agreement id first."); return }
    navigate(`/record?agreement=${encodeURIComponent(value)}`)
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} aria-describedby="verify-status" noValidate>
      <label className={styles.field}>
        <p className={`t-body-sm ${styles.fieldLabel}`}>Job id or agreement id</p>
        <input
          className={`${styles.input} mono`}
          type="text"
          name="agreement"
          autoComplete="off"
          spellCheck={false}
          value={id}
          onChange={(e) => { setId(e.target.value); setNote(null) }}
          disabled={!configured}
        />
      </label>
      <div className={styles.submitRow}>
        <FormButton state={state} label="Verify this agreement" className={styles.submit} />
        <p id="verify-status" className={`t-body-sm ${styles.weak}`} role="status">
          {!configured ? "The verification endpoint is not configured." : note}
        </p>
      </div>
    </form>
  )
}

const stepAppear = (i: number) => ({ ...appear(`${Math.min(i, 3) * 0.05}s` as `${number}s`), threshold: 0.2 })

export function Verify() {
  usePageMeta("Accord: Verify this agreement", LEAD)
  return (
    <div className={styles.page}>
      <PageHero pill="Verify" title="Verify this agreement." lead={LEAD} />

      <section id="verify" className={`section ${styles.main}`}>
        {/* The primary action */}
        <Appear as="div" className={styles.card} effect={{ ...appear("0s"), threshold: 0.2 }}>
          <h2 className={`t-h5 ${styles.cardTitle}`}>Verify this agreement</h2>
          <LookupForm />
        </Appear>

        {/* The checks `make verify` runs, as a checklist */}
        <div className={styles.block}>
          <h2 className={`t-h4 ${styles.subheading}`}>What make verify checks, line by line.</h2>
          <div className={styles.chipRow}>
            <Mono className={styles.chip}>{VERIFY_COMMAND}</Mono>
            <CopyButton text={VERIFY_COMMAND} />
          </div>
          <p className={`t-body-sm ${styles.weak}`}>
            The block starts with <Mono>{FIRST_LINE}</Mono>. Values in angle brackets are real values at run time.
          </p>
          <ol className={styles.steps} aria-label="Seven verification checks">
            {STEPS.map((s, i) => (
              <Appear key={s.id} as="li" className={styles.step} effect={stepAppear(i)}>
                <div className={styles.stepHead}>
                  <Mono className={styles.stepNo}>{String(i + 1).padStart(2, "0")}</Mono>
                  <h3 className={`t-h5 ${styles.stepTitle}`}>{s.title}</h3>
                </div>
                <div className={styles.chipRow}>
                  <Mono className={`${styles.chip} ${styles.line}`}>{s.line}</Mono>
                </div>
              </Appear>
            ))}
          </ol>
          <p className={`t-body-sm ${styles.weak}`}>
            It ends with <Mono>{SUMMARY_LINE}</Mono>. It fetches NEAR AI's attestation report without a key when the endpoint allows it; otherwise it uses <Mono>NEARAI_API_KEY</Mono> if set, or the hosted relay at <Mono>/api/verify/&lt;id&gt;</Mono> with a nonce it generates itself, and prints which.
          </p>
        </div>
      </section>
    </div>
  )
}
