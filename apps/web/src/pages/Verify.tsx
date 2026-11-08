import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { VerifyChecks } from "../components/TestnetRecord"
import { FormButton, type FormButtonState } from "../components/FormButton"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify (spec §4 "Verify a live agreement"): PageHero, the lookup form (the page's primary action), then the
   checks `make verify` ran on the live testnet agreement, as one terminal card (TestnetRecord VerifyChecks): each
   check in plain words with its result, and the raw output behind a disclosure.
   The lookup opens /record?agreement=<id> only when VITE_ACCORD_API_URL is set; otherwise the field is disabled.
------------------------------------------------------------------- */

const API = (import.meta.env as Record<string, string | undefined>).VITE_ACCORD_API_URL

const LEAD =
  "One command checks a live agreement from public data, with no keys: the contract code, the agreement's keys, the Sealed Table release, the sealed outcome, the model attestation, the recipient and the record."

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

export function Verify() {
  usePageMeta("Accord: Verify an agreement", "Check an Accord agreement from public data, with no keys. Agreement a6.accord-v2.testnet on NEAR testnet passes six checks, from contract code to the record.")
  return (
    <div className={styles.page}>
      <PageHero pill="Verify" title="Verify this agreement." lead={LEAD} />

      <section id="verify" className={`section ${styles.main}`}>
        {/* The primary action */}
        <Appear as="div" className={styles.card} effect={{ ...appear("0s"), threshold: 0.2 }}>
          <h2 className={`t-h5 ${styles.cardTitle}`}>Verify this agreement</h2>
          <LookupForm />
        </Appear>

        {/* make verify on the live testnet agreement */}
        <div className={styles.block}>
          <h2 className={`t-h4 ${styles.subheading}`}>What make verify checks.</h2>
          <VerifyChecks />
          <p className={`t-body-sm ${styles.weak}`}>Reads public data only. No keys, no account.</p>
        </div>
      </section>
    </div>
  )
}
