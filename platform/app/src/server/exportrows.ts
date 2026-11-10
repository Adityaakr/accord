// The rows of a finance export (lib/exports.ts) for rooms read from the chain: each receipt with its transaction
// (from the room's timeline, server/activity.ts), the token's symbol, and the organisation's reference. Also who may
// export a room: a party of the agreement (buyer, vendor or the vendor's settlement authority), or a member of the
// same organisation as one; the side decides the sign (the buyer pays out, the vendor's side is paid).

import "server-only";
import type { AgreementView, Receipt } from "@accord/sdk";
import { KNOWN_FACTORIES } from "@accord/sdk";
import { config, symbolFor } from "./accord";
import { roomActivity } from "./activity";
import { alerts, org } from "./store";
import { paymentTx, type PaymentRow } from "./paymenttx";
import { EXPORT_FORMATS, exportFilename, formatCsv, MixedTokens, referenceFor, type DateOrder, type ExportFormat, type ExportRow } from "@/lib/exports";

export interface Access { orgId: string | null; side: "buyer" | "vendor"; accounts: string[] }

/** The accounts a signed-in person acts for: their organisation's members, or just themselves. */
export async function accountsOf(account: string): Promise<{ orgId: string | null; accounts: string[] }> {
  const m = await org.membership(account);
  if (!m) return { orgId: null, accounts: [account] };
  return { orgId: m.org.id, accounts: (await org.members(m.org.id)).map((x) => x.account_id) };
}

/** Null when the person is not a party of this agreement and no one in their organisation is. */
export async function accessTo(account: string, v: Pick<AgreementView, "buyer" | "vendor" | "vendor_authority">): Promise<Access | null> {
  const { orgId, accounts } = await accountsOf(account);
  if (accounts.includes(v.buyer)) return { orgId, side: "buyer", accounts };
  if (accounts.includes(v.vendor) || accounts.includes(v.vendor_authority)) return { orgId, side: "vendor", accounts };
  return null;
}

const tokenOf = (v: AgreementView) => v.token || (KNOWN_FACTORIES[config().network] ?? []).find((f) => f.factory === v.factory)?.token || "";

export async function rowsFor(v: AgreementView, receipts: Receipt[], side: "buyer" | "vendor", orgId: string | null): Promise<ExportRow[]> {
  if (receipts.length === 0) return [];
  const [activity, ref] = await Promise.all([
    roomActivity({ agreement: v.account, buyer: v.buyer, vendor: v.vendor, authority: v.vendor_authority, keeper: v.keeper }).catch(() => null),
    orgId ? alerts.reference(orgId, v.account).catch(() => null) : Promise.resolve(null),
  ]);
  const timeline = (activity?.entries ?? []) as PaymentRow[];
  const explorer = config().explorer;
  return receipts.map((x) => {
    const tx = paymentTx(x, timeline);
    return {
      at: x.at, agreement: v.account, title: v.title, item: x.item, reference: referenceFor(x.item, ref), amount: x.amount, decimals: 6,
      symbol: symbolFor(v.factory), token: tokenOf(v), recipient: x.recipient, direction: side === "buyer" ? "out" : "in",
      counterparty: side === "buyer" ? v.vendor : v.buyer, tx, txUrl: tx && explorer ? `${explorer}/txns/${tx}` : null,
      evidenceHash: x.evidence_hash, via: x.via, status: "paid", paymentId: x.payment_id,
    };
  });
}


/** The CSV answer for `?format=accord|qbo|qbo4|xero&dates=dmy|mdy&token=<symbol>`. */
export function csvResponse(req: Request, rows: ExportRow[], scope: string): Response {
  const q = new URL(req.url).searchParams;
  const format = (EXPORT_FORMATS as readonly string[]).includes(q.get("format") ?? "") ? (q.get("format") as ExportFormat) : "accord";
  const order: DateOrder = q.get("dates") === "mdy" ? "mdy" : "dmy";
  const token = q.get("token");
  const picked = token ? rows.filter((r) => r.symbol === token) : rows;
  try {
    const body = formatCsv(format, picked, order);
    const symbols = [...new Set(picked.map((r) => r.symbol))];
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8", "cache-control": "no-store",
        "content-disposition": `attachment; filename=${exportFilename(scope, format, format === "accord" ? null : symbols[0] ?? token)}`,
      },
    });
  } catch (e) {
    if (e instanceof MixedTokens) return new Response(`${e.message}\n`, { status: 409, headers: { "content-type": "text/plain; charset=utf-8" } });
    throw e;
  }
}
