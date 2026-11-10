"use client";

// Download every payment as CSV for finance: Accord's own layout, QuickBooks Online (3 or 4 columns) or Xero, with
// the date order the books use. QuickBooks and Xero import into one bank account, so with rooms in both tUSDC and
// USDC the token is picked; the Accord layout carries each row's token.

import { useState } from "react";
import { withBase } from "@/lib/basePath";
import styles from "./finance.module.css";

const FORMATS: [string, string][] = [
  ["accord", "Accord (all fields)"], ["qbo", "QuickBooks Online, 3 columns"], ["qbo4", "QuickBooks Online, 4 columns"], ["xero", "Xero bank statement"],
];

export function ExportMenu({ api, symbols, disabled }: { api: string; symbols: string[]; disabled?: boolean }) {
  const [format, setFormat] = useState("accord");
  const [dates, setDates] = useState("dmy");
  const [token, setToken] = useState(symbols[0] ?? "");
  const bank = format !== "accord";
  const q = new URLSearchParams({ format, ...(bank ? { dates } : {}), ...(bank && token ? { token } : {}) });
  return (
    <div className={styles.menu}>
      <label className={styles.field}><span>Format</span>
        <select className={styles.select} value={format} onChange={(e) => setFormat(e.target.value)}>
          {FORMATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      {bank && (
        <label className={styles.field}><span>Dates</span>
          <select className={styles.select} value={dates} onChange={(e) => setDates(e.target.value)}>
            <option value="dmy">dd/mm/yyyy</option><option value="mdy">mm/dd/yyyy (US)</option>
          </select>
        </label>
      )}
      {bank && symbols.length > 1 && (
        <label className={styles.field}><span>Token</span>
          <select className={styles.select} value={token} onChange={(e) => setToken(e.target.value)}>
            {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <a className={styles.btn} href={disabled ? undefined : withBase(`${api}?${q}`)} aria-disabled={disabled} download>Download CSV</a>
    </div>
  );
}
