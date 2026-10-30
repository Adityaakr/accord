import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Mono } from "../components/Mono"
import { FormButton, type FormButtonState } from "../components/FormButton"
import { LINKS, isPlaceholder } from "../content/links"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify (spec §4 "Verify a live agreement"): PageHero, the lookup form (the page's primary action), then the
   attestation chain as a vertical checklist of six cards, each with a copyable command where one exists.
   Copy: the spec §4 row and the Docs page's "How you check it" lines (docs/website/ACCORD_WEBSITE_FINAL_COPY.md).
   The lookup opens /record?agreement=<id> only when VITE_ACCORD_API_URL is set; otherwise the field is disabled.
------------------------------------------------------------------- */

const API = (import.meta.env as Record<string, string | undefined>).VITE_ACCORD_API_URL

const LEAD =
  "One screen that walks through an agreement's attestation chain: job id, measurement on OutLayer's register, the outlayer-verify output, commitment hashes, refusal events on the explorer, the payment on NEAR."

const CONTRACT = isPlaceholder(LINKS.contractId) ? "<contract>" : LINKS.contractId

type Step = { id: string; title: string; text: ReactNode; command?: string }

const STEPS: Step[] = [
  {
    id: "job-id",
    title: "Job id",
    text: <>The negotiation, the payee binding and the observer run in attested TDX enclaves; each run is a job with an id.</>,
  },
  {
    id: "measurement",
    title: "Measurement on OutLayer's register",
    text: <>The contract accepts a result only when the job's measurement is approved on OutLayer's register contract.</>,
  },
  {
    id: "outlayer-verify",
    title: <>The <Mono>outlayer-verify</Mono> output</> as unknown as string,
    text: <>Attestation shows which code ran on which inputs; the check exits <Mono>0</Mono>.</>,
    command: "outlayer-verify job <id>",
  },
  {
    id: "commitments",
    title: "Commitment hashes",
    text: (
      <>
        Each company seals its mandate in the browser and only a commitment hash is recorded; the commitments in the output must match the ones on
        chain, and the per-response signatures are checked offline against the transcript hash the enclave published.
      </>
    ),
    command: "make verify-negotiation JOB=<id>",
  },
  {
    id: "refusals",
    title: "Refusal events on the explorer",
    text: (
      <>
        Every refusal is an event with its reason; read the events on the testnet explorer, and after a revocation the agent's key is shown gone.
      </>
    ),
    command: `near account list-keys ${CONTRACT}`,
  },
  {
    id: "base-transaction",
    title: "The payment on NEAR",
    text: <>Each USDC transfer is a public NEAR transaction made by the contract itself; read it on the testnet explorer, as with any stablecoin payment.</>,
  },
]

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

        {/* The attestation chain, as a checklist */}
        <div className={styles.block}>
          <h2 className={`t-h4 ${styles.subheading}`}>The attestation chain, step by step.</h2>
          <ol className={styles.steps} aria-label="Six verification steps">
            {STEPS.map((s, i) => (
              <Appear key={s.id} as="li" className={styles.step} effect={stepAppear(i)}>
                <div className={styles.stepHead}>
                  <Mono className={styles.stepNo}>{String(i + 1).padStart(2, "0")}</Mono>
                  <h3 className={`t-h5 ${styles.stepTitle}`}>{s.title}</h3>
                </div>
                <p className={`t-body-sm ${styles.stepText}`}>{s.text}</p>
                {s.command ? (
                  <div className={styles.chipRow}>
                    <Mono className={styles.chip}>{s.command}</Mono>
                    <CopyButton text={s.command} />
                  </div>
                ) : null}
              </Appear>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
