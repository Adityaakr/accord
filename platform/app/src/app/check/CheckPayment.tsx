"use client";

// Check a payment: the agreement, an item from its list, an amount (prefilled with the item's approved amount) and a
// recipient (prefilled with the active one), answered by /api/check: "Would be paid" or "Would be refused" with the
// contract's code, each gate on its own line, and the approved values beside the entered ones. The answer is a
// read-only simulation from chain state at one block; the page says so under every answer.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { CheckForm, PaymentCheck } from "@accord/sdk/check";
import { isAccountId } from "@/lib/accountid";
import { withBase } from "@/lib/basePath";
import styles from "./check.module.css";

type Result = PaymentCheck & { defaulted?: string[] };

/** Base units in whole tokens, every significant decimal and at least two. */
function toTokens(base: string, decimals: number): string {
  const v = BigInt(base);
  const unit = 10n ** BigInt(decimals);
  const frac = (v % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  const places = Math.min(decimals, Math.max(2, frac.length));
  return `${(v / unit).toString()}.${(v % unit).toString().padStart(decimals, "0").slice(0, places)}`;
}

/** Whole tokens as typed ("12", "12.5") to base units, or null when the token cannot express it. */
function toBase(text: string, decimals: number): string | null {
  const m = text.trim().replace(/,/g, "").match(/^(\d{1,30})(?:\.(\d*))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > decimals) return null;
  return (BigInt(m[1]!) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0")).toString();
}

const when = (t: number) => new Date(t * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

function defaultItem(form: CheckForm): number | null {
  const pick = form.items.find((i) => i.status === "Eligible") ?? form.items.find((i) => !["Paid", "AssumedPaid", "Unfunded"].includes(i.status)) ?? form.items[0];
  return pick ? pick.id : null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 503) throw new Error("The network is busy. Check again in a moment.");
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export function CheckPayment() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = useRef({
    agreement: params.get("agreement") ?? "",
    item: params.get("item"),
    amount: params.get("amount"),
    recipient: params.get("recipient"),
    block: params.get("block"),
  });
  const [agreement, setAgreement] = useState(initial.current.agreement);
  const [form, setForm] = useState<CheckForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [item, setItem] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const autoRun = useRef(Boolean(initial.current.agreement && initial.current.item !== null));

  const id = agreement.trim().toLowerCase();
  const idValid = isAccountId(id);

  // the agreement's items and recipient, once the id is a NEAR account id
  useEffect(() => {
    setForm(null);
    setFormError(null);
    setResult(null);
    if (!idValid) return;
    let live = true;
    const t = window.setTimeout(async () => {
      setLoadingForm(true);
      try {
        const f = await getJson<CheckForm>(`/api/check?agreement=${encodeURIComponent(id)}`);
        if (!live) return;
        setForm(f);
        const first = initial.current;
        const fromLink = first.agreement.trim().toLowerCase() === id && first.item !== null;
        const chosen = fromLink && f.items.some((i) => String(i.id) === first.item) ? Number(first.item) : defaultItem(f);
        setItem(chosen);
        const approved = f.items.find((i) => i.id === chosen)?.amount;
        // an amount in the link is base units, as the API takes it
        setAmount(fromLink && first.amount && /^\d+$/.test(first.amount) ? toTokens(first.amount, f.token.decimals) : approved ? toTokens(approved, f.token.decimals) : "");
        setRecipient(fromLink && first.recipient ? first.recipient : f.recipient ?? "");
      } catch (e) {
        if (live) setFormError((e as Error).message);
      } finally {
        if (live) setLoadingForm(false);
      }
    }, 350);
    return () => { live = false; window.clearTimeout(t); };
  }, [id, idValid]);

  const base = form ? toBase(amount, form.token.decimals) : null;
  const amountError = form && amount.trim() !== "" && base === null ? `At most ${form.token.decimals} decimals, digits only.` : null;
  const canCheck = Boolean(form && item !== null && base !== null && recipient.trim());

  const run = useCallback(async (q: { agreement: string; item: number; amount: string; recipient: string; block?: string | null }) => {
    setChecking(true);
    setCheckError(null);
    const qs = new URLSearchParams({ agreement: q.agreement, item: String(q.item), amount: q.amount, recipient: q.recipient });
    if (q.block) qs.set("block", q.block);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    try {
      setResult(await getJson<Result>(`/api/check?${qs.toString()}`));
    } catch (e) {
      setResult(null);
      setCheckError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, [pathname, router]);

  // a shared link with an item checks at once
  useEffect(() => {
    if (!autoRun.current || !form || item === null || base === null || !recipient.trim()) return;
    autoRun.current = false;
    void run({ agreement: id, item, amount: base, recipient: recipient.trim(), block: initial.current.block });
  }, [form, item, base, recipient, id, run]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canCheck || item === null || base === null) return;
    void run({ agreement: id, item, amount: base, recipient: recipient.trim() });
  };

  const onItem = (v: string) => {
    const n = Number(v);
    setItem(n);
    setResult(null);
    const approved = form?.items.find((i) => i.id === n)?.amount;
    if (approved && form) setAmount(toTokens(approved, form.token.decimals));
  };

  const unit = form?.token.symbol ?? "";
  const agreementHint = !id ? "For example a48.accord-v2.testnet." : !idValid ? "Not a NEAR account id. Agreement accounts look like a48.accord-v2.testnet." : formError ?? (loadingForm ? "Reading the agreement…" : form ? `${form.title} · ${form.state} · ${form.kind}` : "");

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <span className={styles.pill}><span className={styles.indicator} aria-hidden="true" />Check a payment</span>
        <h1 className={styles.title}>Would the contract pay this?</h1>
        <p className={styles.heroLead}>Enter a payment before anyone signs it. The check runs the agreement&apos;s own payment rules over its current chain state and shows each gate. No sign-in, no key, no transaction.</p>
      </header>

      <form className={styles.col} onSubmit={submit} noValidate>
        <div className={styles.group}>
          <div className={styles.groupLabel}><span className={styles.groupName}>Payment</span>{form && <span className={`mono ${styles.groupMeta}`}>block {form.block}</span>}</div>
          <div className={styles.rows}>
            <label className={styles.row} data-invalid={(id && !idValid) || formError ? "" : undefined}>
              <span className={`mono ${styles.num}`}>01</span>
              <span className={styles.name}>Agreement</span>
              <span className={styles.control}>
                <span className={styles.box}>
                  <input className={`${styles.input} ${styles.mono}`} value={agreement} onChange={(e) => setAgreement(e.target.value)}
                    placeholder="a48.accord-v2.testnet" spellCheck={false} autoCapitalize="none" autoComplete="off" aria-describedby="check-agreement-hint" />
                </span>
                <span id="check-agreement-hint" className={(id && !idValid) || formError ? styles.fieldError : styles.hint}>{agreementHint}</span>
              </span>
            </label>
            <label className={styles.row}>
              <span className={`mono ${styles.num}`}>02</span>
              <span className={styles.name}>Item</span>
              <span className={styles.control}>
                <span className={styles.box}>
                  <select className={`${styles.input} ${styles.select}`} value={item ?? ""} onChange={(e) => onItem(e.target.value)} disabled={!form || form.items.length === 0}>
                    {!form && <option value="">Enter an agreement first</option>}
                    {form && form.items.length === 0 && <option value="">No items yet</option>}
                    {form?.items.map((i) => (
                      <option key={i.id} value={i.id}>{`Item ${i.id} · ${toTokens(i.amount, form.token.decimals)} ${unit} · ${i.status}`}</option>
                    ))}
                  </select>
                </span>
              </span>
            </label>
            <label className={styles.row} data-invalid={amountError ? "" : undefined}>
              <span className={`mono ${styles.num}`}>03</span>
              <span className={styles.name}>Amount</span>
              <span className={styles.control}>
                <span className={styles.box}>
                  <input className={`${styles.input} ${styles.mono}`} value={amount} onChange={(e) => { setAmount(e.target.value); setResult(null); }}
                    inputMode="decimal" placeholder="0.00" disabled={!form} autoComplete="off" />
                  {unit && <span className={styles.unit}>{unit}</span>}
                </span>
                <span className={amountError ? styles.fieldError : styles.hint}>{amountError ?? (!form || item === null ? "" : base === form.items.find((i) => i.id === item)?.amount ? "The item's approved amount." : `The item's approved amount is ${toTokens(form.items.find((i) => i.id === item)?.amount ?? "0", form.token.decimals)} ${unit}.`)}</span>
              </span>
            </label>
            <label className={styles.row}>
              <span className={`mono ${styles.num}`}>04</span>
              <span className={styles.name}>Recipient</span>
              <span className={styles.control}>
                <span className={styles.box}>
                  <input className={`${styles.input} ${styles.mono}`} value={recipient} onChange={(e) => { setRecipient(e.target.value); setResult(null); }}
                    placeholder="halcyon-mm.testnet" spellCheck={false} autoCapitalize="none" autoComplete="off" disabled={!form} />
                </span>
                <span className={styles.hint}>{!form ? "" : !form.recipient ? "The agreement has no active recipient yet." : recipient.trim() === form.recipient ? "The active authorised recipient." : <>The active authorised recipient is <span className="mono">{form.recipient}</span>.</>}</span>
              </span>
            </label>
          </div>
        </div>
        <div className={styles.buttons}>
          <button type="submit" className={styles.primary} disabled={!canCheck || checking}>
            {checking ? <><span className={styles.spinner} aria-hidden="true" />Checking</> : "Check payment"}
          </button>
        </div>
        {checkError && <p className={styles.error} role="alert">{checkError}</p>}
      </form>

      {result && <Answer r={result} />}
    </div>
  );
}

function Answer({ r }: { r: Result }) {
  const dec = r.token.decimals;
  const sym = r.token.symbol;
  const amt = (v: string | null) => (v === null ? "none" : `${toTokens(v, dec)} ${sym}`);
  const pay = r.verdict === "pay";
  const recipientSame = r.approved.recipient === r.entered.recipient;
  const amountSame = r.approved.amount === r.entered.amount;
  const api = withBase(`/api/check?agreement=${encodeURIComponent(r.agreement)}&item=${r.entered.item}&amount=${r.entered.amount}&recipient=${encodeURIComponent(r.entered.recipient)}`);
  return (
    <section className={styles.col} aria-live="polite" aria-label="Result">
      <div className={`${styles.verdict} ${pay ? styles.verdictPay : styles.verdictRefuse}`}>
        <span className={styles.verdictMark} aria-hidden="true">{pay ? "✓" : "✕"}</span>
        <div className={styles.verdictText}>
          <h2 className={styles.verdictTitle}>
            {pay ? "Would be paid" : <>Would be refused: <span className={`mono ${styles.code}`}>{r.code}</span></>}
          </h2>
          <p className={styles.verdictLine}>{r.summary}</p>
        </div>
      </div>

      {r.time_dependent && <p className={styles.timeNote}><span className={styles.timeDot} aria-hidden="true" />{r.time_dependent.detail}</p>}

      <div className={styles.group}>
        <div className={styles.groupLabel}><span className={styles.groupName}>Approved and entered</span></div>
        <dl className={styles.compare}>
          <div className={styles.cRow}>
            <dt>Recipient</dt>
            <dd><span className={styles.cLabel}>approved</span><span className="mono">{r.approved.recipient ?? "none"}</span></dd>
            <dd data-differs={recipientSame ? undefined : ""}><span className={styles.cLabel}>entered</span><span className="mono">{r.entered.recipient}</span></dd>
          </div>
          <div className={styles.cRow}>
            <dt>Amount</dt>
            <dd><span className={styles.cLabel}>approved</span><span className="mono">{amt(r.approved.amount)}</span></dd>
            <dd data-differs={amountSame ? undefined : ""}><span className={styles.cLabel}>entered</span><span className="mono">{amt(r.entered.amount)}</span></dd>
          </div>
        </dl>
      </div>

      <div className={styles.group}>
        <div className={styles.groupLabel}><span className={styles.groupName}>Gate by gate</span><span className={styles.groupMeta}>in the contract&apos;s order; the first failure is its answer</span></div>
        <ol className={styles.gates}>
          {r.gates.map((g) => (
            <li key={g.gate} className={styles.gate}>
              <span className={`mono ${styles.num}`}>{String(g.gate).padStart(2, "0")}</span>
              <span className={styles.gateName}>{g.label}</span>
              <span className={styles.gateDetail}>{g.detail}</span>
              <span className={styles.gateState}>
                <span className={`${styles.mark} ${g.pass === null ? styles.markNone : g.pass ? styles.markPass : styles.markFail}`}
                  aria-label={g.pass === null ? "not evaluated" : g.pass ? "passes" : "fails"}>
                  {g.pass === null ? "–" : g.pass ? "✓" : "✕"}
                </span>
                {g.code && <span className={`mono ${styles.gateCode}`}>{g.code}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.foot}>
        <p className={styles.note}>{r.note}</p>
        <p className={styles.meta}>
          <span className="mono">{r.agreement}</span><span className={styles.dot}>·</span>
          block <span className="mono">{r.checked_at_block}</span><span className={styles.dot}>·</span>
          <span className="mono">{when(r.checked_at)}</span><span className={styles.dot}>·</span>
          release <span className="mono">{r.release}</span>
        </p>
        <details className={styles.details}>
          <summary>Not checked here</summary>
          <ul>{r.not_checked.map((n) => <li key={n}>{n}</li>)}</ul>
        </details>
        <p className={styles.meta}>
          <a className={styles.link} href={api} target="_blank" rel="noreferrer">This answer as JSON</a><span className={styles.dot}>·</span>
          <Link className={styles.link} href={`/verify/${r.agreement}`}>Verify the agreement</Link>
        </p>
      </div>
    </section>
  );
}
