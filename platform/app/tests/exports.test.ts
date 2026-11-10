// Finance exports (src/lib/exports.ts): the Accord layout, QuickBooks Online's 3- and 4-column bank upload, and Xero's
// statement import. Signs from the viewer's side, 2 decimals rounded half up, the dates each tool documents, CSV
// quoting and formula-safe cells, and never two tokens in one bank file.
import { describe, expect, it } from "vitest";
import { amount2, accordCsv, cell, formatCsv, MixedTokens, qbo4Csv, qboCsv, referenceFor, slashDate, xeroCsv, cleanReference, type ExportRow } from "../src/lib/exports";

const at = Date.UTC(2026, 10, 8, 14, 5, 0) / 1000; // 8 Nov 2026 14:05 UTC
const row = (o: Partial<ExportRow> = {}): ExportRow => ({
  at, agreement: "a48.accord-v2.testnet", title: "Market data, Q4", item: 2, reference: "PO-1042", amount: "12345000", decimals: 6,
  symbol: "tUSDC", token: "tusdc.accord-v1.testnet", recipient: "halcyon-mm.testnet", direction: "out", counterparty: "halcyon.testnet",
  tx: "8xTx", txUrl: "https://testnet.nearblocks.io/txns/8xTx", evidenceHash: "abc123", via: "agent", status: "paid", paymentId: 3, ...o,
});

describe("amounts and dates", () => {
  it("writes 2 decimals, rounded half up, signed for the buyer", () => {
    expect(amount2("12345000", 6, true)).toBe("-12.35");
    expect(amount2("12344999", 6, false)).toBe("12.34");
    expect(amount2("1000000000", 6, false)).toBe("1000.00");
    expect(amount2("0", 6, true)).toBe("0.00");
    expect(amount2("5", 0, false)).toBe("5.00");
  });
  it("formats dd/mm/yyyy and mm/dd/yyyy in UTC", () => {
    expect(slashDate(at, "dmy")).toBe("08/11/2026");
    expect(slashDate(at, "mdy")).toBe("11/08/2026");
    // 23:30 UTC is still the 8th, whatever the server's zone
    expect(slashDate(Date.UTC(2026, 10, 8, 23, 30) / 1000, "dmy")).toBe("08/11/2026");
  });
  it("quotes cells and keeps a spreadsheet from running one as a formula", () => {
    expect(cell("a,b")).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(cell("plain")).toBe("plain");
  });
});

describe("layouts", () => {
  it("Accord: every field, the token on each row, ISO dates", () => {
    const [head, line] = accordCsv([row()]).trim().split("\r\n");
    expect(head).toBe("date_utc,agreement,title,item,reference,description,amount,token_symbol,token_account,direction,counterparty,recipient,payment_id,via,transaction,transaction_url,evidence_hash,receipt_status");
    expect(line).toBe('2026-11-08T14:05:00.000Z,a48.accord-v2.testnet,"Market data, Q4",2,PO-1042,"PO-1042 / Market data, Q4 / item 2 / a48.accord-v2.testnet",-12.35,tUSDC,tusdc.accord-v1.testnet,out,halcyon.testnet,halcyon-mm.testnet,3,agent,8xTx,https://testnet.nearblocks.io/txns/8xTx,abc123,paid');
  });
  it("Accord: keeps tUSDC and USDC rows apart, each with its own symbol", () => {
    const csv = accordCsv([row(), row({ symbol: "USDC", token: "3e22", paymentId: 4 })]);
    expect(csv).toContain(",tUSDC,tusdc.accord-v1.testnet,");
    expect(csv).toContain(",USDC,3e22,");
  });
  it("QuickBooks 3 columns: Date, Description, Amount; out negative, in positive", () => {
    expect(qboCsv([row(), row({ direction: "in", paymentId: 4 })])).toBe(
      "Date,Description,Amount\r\n08/11/2026,\"PO-1042 / Market data, Q4 / item 2 / a48.accord-v2.testnet\",-12.35\r\n08/11/2026,\"PO-1042 / Market data, Q4 / item 2 / a48.accord-v2.testnet\",12.35\r\n");
  });
  it("QuickBooks 4 columns: Credit for money in, Debit for money out, the other cell blank", () => {
    const lines = qbo4Csv([row({ reference: "" }), row({ direction: "in", reference: "" })], "mdy").trim().split("\r\n");
    expect(lines[0]).toBe("Date,Description,Credit,Debit");
    expect(lines[1]).toBe('11/08/2026,"Market data, Q4 / item 2 / a48.accord-v2.testnet",,12.35');
    expect(lines[2]).toBe('11/08/2026,"Market data, Q4 / item 2 / a48.accord-v2.testnet",12.35,');
  });
  it("Xero: *Date, *Amount, Payee, Description, Reference; reference falls back to agreement#payment", () => {
    const lines = xeroCsv([row(), row({ reference: "", tx: null, paymentId: 9 })]).trim().split("\r\n");
    expect(lines[0]).toBe("*Date,*Amount,Payee,Description,Reference");
    expect(lines[1]).toBe('08/11/2026,-12.35,halcyon.testnet,"Market data, Q4 / item 2 / a48.accord-v2.testnet / tx 8xTx",PO-1042');
    expect(lines[2]).toBe('08/11/2026,-12.35,halcyon.testnet,"Market data, Q4 / item 2 / a48.accord-v2.testnet",a48.accord-v2.testnet#9');
  });
  it("refuses to put two tokens in one bank file", () => {
    const mixed = [row(), row({ symbol: "USDC", token: "3e22" })];
    expect(() => formatCsv("qbo", mixed)).toThrow(MixedTokens);
    expect(() => formatCsv("xero", mixed)).toThrow(/one token at a time/);
    expect(() => formatCsv("accord", mixed)).not.toThrow();
  });
  it("sorts oldest first", () => {
    const csv = formatCsv("qbo", [row({ at: at + 86400, amount: "2000000" }), row({ amount: "1000000" })]);
    expect(csv.trim().split("\r\n").slice(1).map((l) => l.split(",").at(-1))).toEqual(["-1.00", "-2.00"]);
  });
});

describe("references", () => {
  it("uses the item's own reference, else the agreement's", () => {
    const ref = { reference: "PO-1", items: { "2": "INV-7" } };
    expect(referenceFor(2, ref)).toBe("INV-7");
    expect(referenceFor(1, ref)).toBe("PO-1");
    expect(referenceFor(1, null)).toBe("");
  });
  it("cleans a typed reference to one line of at most 64 characters", () => {
    expect(cleanReference("  PO\n1042 ")).toBe("PO 1042");
    expect(cleanReference("x".repeat(80)).length).toBe(64);
    expect(cleanReference(42)).toBe("");
  });
});
