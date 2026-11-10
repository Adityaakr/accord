// Finance exports: every payment of an agreement (or of an organisation's rooms) as CSV in three layouts. Pure, so
// the formatters are unit-tested; the routes (api/agreements/[id]/export, api/org/export) read the chain and the
// organisation's references and call these.
//
// Amounts are signed from the viewing party's side: money out of the buyer (negative), money in for the vendor
// (positive), in the token's own unit with exactly 2 decimals (rounded half up from the token's 6). Tokens are never
// mixed: the Accord layout names each row's token; the QuickBooks and Xero layouts import into one bank account, so
// they take rows of a single token and the caller refuses a mixed set (`singleToken`).

export type ExportFormat = "accord" | "qbo" | "qbo4" | "xero";
export const EXPORT_FORMATS: readonly ExportFormat[] = ["accord", "qbo", "qbo4", "xero"];
export type DateOrder = "dmy" | "mdy";

export interface ExportRow {
  /** unix seconds */
  at: number;
  agreement: string;
  title: string;
  item: number;
  /** the organisation's PO or invoice reference for this item or agreement, "" when none */
  reference: string;
  /** raw token units */
  amount: string;
  decimals: number;
  symbol: string;
  token: string;
  recipient: string;
  /** "out" for the buyer, "in" for the vendor's side */
  direction: "out" | "in";
  counterparty: string;
  tx: string | null;
  txUrl: string | null;
  evidenceHash: string | null;
  via: string;
  /** the receipt's status: every receipt on chain is a payment made */
  status: string;
  paymentId: number;
}

/** One CSV cell: quoted when it holds a comma, quote or line break; a leading = + - @ is prefixed so a spreadsheet
 * never runs it as a formula (amounts are written separately and are never escaped this way). */
export function cell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Exactly 2 decimals, rounded half up, from raw units; signed. No thousands separator (both importers reject one). */
export function amount2(raw: string | bigint, decimals: number, negative: boolean): string {
  let v = BigInt(raw);
  if (v < 0n) v = -v;
  let cents: bigint;
  if (decimals >= 2) {
    const div = 10n ** BigInt(decimals - 2);
    cents = (v + div / 2n) / div;
  } else {
    cents = v * 10n ** BigInt(2 - decimals);
  }
  const s = `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
  return negative && cents !== 0n ? `-${s}` : s;
}

/** dd/mm/yyyy or mm/dd/yyyy in UTC. */
export function slashDate(at: number, order: DateOrder): string {
  const d = new Date(at * 1000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return order === "mdy" ? `${mm}/${dd}/${d.getUTCFullYear()}` : `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** The one-line description every layout carries. Plain ASCII separators, so a bank import never garbles one. */
export function describe(r: ExportRow): string {
  const ref = r.reference ? `${r.reference} / ` : "";
  return `${ref}${r.title} / item ${r.item} / ${r.agreement}`;
}

const lines = (rows: string[][]) => rows.map((row) => row.join(",")).join("\r\n") + "\r\n";
const signed = (r: ExportRow) => amount2(r.amount, r.decimals, r.direction === "out");

/** Accord's own layout: every field a reconciliation needs, one token per row, ISO 8601 UTC dates. */
export function accordCsv(rows: readonly ExportRow[]): string {
  const head = ["date_utc", "agreement", "title", "item", "reference", "description", "amount", "token_symbol", "token_account",
    "direction", "counterparty", "recipient", "payment_id", "via", "transaction", "transaction_url", "evidence_hash", "receipt_status"];
  return lines([head, ...rows.map((r) => [
    new Date(r.at * 1000).toISOString(), r.agreement, r.title, String(r.item), r.reference, describe(r), signed(r), r.symbol, r.token,
    r.direction, r.counterparty, r.recipient, String(r.paymentId), r.via, r.tx ?? "", r.txUrl ?? "", r.evidenceHash ?? "", r.status,
  ].map((v, i) => (i === 6 ? v : cell(v))))]);
}

// QuickBooks Online bank transaction upload (Banking > Upload transactions > CSV). Intuit documents exactly two
// layouts: 3 columns "Date, Description, Amount" with payments negative and deposits positive, or 4 columns "Date,
// Description, Credit, Debit" with the headers named just Credit and Debit, zeros deleted (cells left blank), one date
// format throughout, and recommends dd/mm/yyyy. Intuit, "Format CSV files in Excel to get bank transactions into
// QuickBooks": https://quickbooks.intuit.com/learn-support/en-global/help-article/bank-transactions/format-csv-files-excel-bank-transactions-quickbooks/L4BjLWckq_ROW_en
// (read 10 Nov 2026; the US article shows m/d/yyyy examples, hence `order`). In the 4-column layout Credit is money in
// and Debit money out, both written as positive numbers.

/** QuickBooks Online, 3 columns: Date, Description, Amount (money out negative). */
export function qboCsv(rows: readonly ExportRow[], order: DateOrder = "dmy"): string {
  singleToken(rows);
  return lines([["Date", "Description", "Amount"], ...rows.map((r) => [slashDate(r.at, order), cell(describe(r)), signed(r)])]);
}

/** QuickBooks Online, 4 columns: Date, Description, Credit, Debit (both positive; the unused one blank). */
export function qbo4Csv(rows: readonly ExportRow[], order: DateOrder = "dmy"): string {
  singleToken(rows);
  return lines([["Date", "Description", "Credit", "Debit"], ...rows.map((r) => {
    const v = amount2(r.amount, r.decimals, false);
    return [slashDate(r.at, order), cell(describe(r)), r.direction === "in" ? v : "", r.direction === "out" ? v : ""];
  })]);
}

// Xero bank statement import (Bank account > Manage account > Import a statement > CSV). Xero's statement CSV
// template has the columns "*Date, *Amount, Payee, Description, Reference, Cheque Number" (asterisk = required), one
// signed Amount column (money out negative), and dates in the organisation's regional format (dd/mm/yyyy for most
// regions, mm/dd/yyyy for the US). Xero Central, "Import a bank statement": https://central.xero.com/s/article/Import-a-bank-statement
// and "Bank statement files you can import into Xero": https://central.xero.com/s/article/Bank-statement-files-you-can-import-into-Xero
// (the pages render with JavaScript; the column names are those of the template the import screen offers). Xero maps
// the columns on import, so the header names are the template's own.

/** Xero: *Date, *Amount, Payee, Description, Reference. */
export function xeroCsv(rows: readonly ExportRow[], order: DateOrder = "dmy"): string {
  singleToken(rows);
  return lines([["*Date", "*Amount", "Payee", "Description", "Reference"], ...rows.map((r) => [
    slashDate(r.at, order), signed(r), cell(r.counterparty), cell(`${r.title} / item ${r.item} / ${r.agreement}${r.tx ? ` / tx ${r.tx}` : ""}`),
    cell(r.reference || `${r.agreement}#${r.paymentId}`),
  ])]);
}

export class MixedTokens extends Error {
  constructor(public symbols: string[]) {
    super(`these payments are in ${symbols.join(" and ")}; export one token at a time (token=${symbols[0]})`);
  }
}

/** Throws when the rows hold more than one token: a bank import must never add tUSDC and USDC together. */
export function singleToken(rows: readonly ExportRow[]): void {
  const s = [...new Set(rows.map((r) => r.token))];
  if (s.length > 1) throw new MixedTokens([...new Set(rows.map((r) => r.symbol))]);
}

export function formatCsv(format: ExportFormat, rows: readonly ExportRow[], order: DateOrder = "dmy"): string {
  const sorted = [...rows].sort((a, b) => a.at - b.at || a.paymentId - b.paymentId);
  switch (format) {
    case "accord": return accordCsv(sorted);
    case "qbo": return qboCsv(sorted, order);
    case "qbo4": return qbo4Csv(sorted, order);
    case "xero": return xeroCsv(sorted, order);
  }
}

export function exportFilename(scope: string, format: ExportFormat, symbol: string | null): string {
  const base = scope.replace(/[^a-z0-9.-]+/gi, "-");
  return `accord-${base}-${format}${symbol ? `-${symbol}` : ""}.csv`;
}

/** The reference a row carries: the item's own, else the agreement's. */
export function referenceFor(item: number, ref: { reference: string; items: Record<string, string> } | null): string {
  if (!ref) return "";
  return ref.items[String(item)]?.trim() || ref.reference.trim();
}

/** Cleans what a person typed as a reference: trimmed, one line, at most 64 characters. */
export function cleanReference(v: unknown): string {
  return typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, 64) : "";
}
