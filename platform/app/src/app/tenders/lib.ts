// Small shared helpers for the open tender pages: labels, tones and the token's symbol.
import type { TenderJob, TenderPhase } from "@accord/sdk";
import type { Tone } from "@/components/ui";

export const PHASE_TONE: Record<TenderPhase, Tone> = {
  open: "teal", revealing: "purple", closed: "warn", awarded: "teal", linked: "teal", no_valid_bid: "muted", cancelled: "muted",
};

export const PHASE_NOTE: Record<TenderPhase, string> = {
  open: "taking sealed bids",
  revealing: "bidders are revealing their prices",
  closed: "reveal window closed, award not yet asked for",
  awarded: "winner chosen, agreement not yet linked",
  linked: "the winner's agreement is linked",
  no_valid_bid: "no revealed price within the budget",
  cancelled: "cancelled by the buyer",
};

/** The job's token as a symbol: the test token says tUSDC, anything else USDC. */
export const symbolOf = (token: string): string => (token.startsWith("tusdc.") ? "tUSDC" : "USDC");

/** A 64-hex id (bidder key, commitment, hash) shortened to its ends. */
export const shortHex = (h: string, n = 6): string => (h.length > n + 6 ? `${h.slice(0, n)}…${h.slice(-4)}` : h);

/** The end of the window that is running now (ns since epoch), or null when no window runs. */
export function windowEnd(j: TenderJob): number | null {
  return j.phase === "open" ? j.commit_ends : j.phase === "revealing" ? j.reveal_ends : null;
}

/** Whether a price (base units) is within the job's budget. */
export const withinBudget = (price: string, budget: string): boolean => BigInt(price) <= BigInt(budget);

/** The no-install path: one dependency-free script served by this app (public/tender-bid.mjs), Node 22 or later. */
export const SCRIPT_URL = "https://accordweb-production.up.railway.app/app/tender-bid.mjs";
export const cliBid = (job: number | string): string =>
  `curl -sO ${SCRIPT_URL}\nnode tender-bid.mjs bid ${job} --price 36.50 --agent my-agent --wait\nnode tender-bid.mjs link <you>.testnet   # show it in Your agents`;
export const SKILL_RAW = "https://raw.githubusercontent.com/Adityaakr/accord/main/skills/accord-tender/SKILL.md";
export const README_TENDERS = "https://github.com/Adityaakr/accord#open-tenders";

/** The tokens a job may be posted in from this app: both have 6 decimals. */
export const TENDER_TOKENS = [
  { id: "tusdc.accord-v1.testnet", label: "tUSDC (test token)", factory: "accord-v2.testnet" },
  { id: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af", label: "Circle USDC (testnet)", factory: "accord-usdc.testnet" },
] as const;

/** The commands that link an agent running elsewhere to `account`'s dashboard. */
export const linkScript = (account: string): string => `curl -sO ${SCRIPT_URL}\nnode tender-bid.mjs link ${account}`;
export const linkCli = (account: string): string => `accord tender link ${account}`;
