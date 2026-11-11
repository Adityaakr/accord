// Small shared helpers for the open tender pages: labels, tones and the job's token.
import { TENDER_TOKENS, type TenderJob, type TenderPhase, type TenderToken } from "@accord/sdk";
import type { Tone } from "@/components/ui";

/** Teal while a tender takes part or ends in an agreement, neutral when decided, muted when it stopped. */
export const PHASE_TONE: Record<TenderPhase, Tone> = {
  open: "teal", revealing: "teal", closed: "neutral", awarded: "neutral", linked: "teal", no_valid_bid: "muted", cancelled: "muted",
};

export const PHASE_LABEL: Record<TenderPhase, string> = {
  open: "open", revealing: "revealing", closed: "closed", awarded: "awarded", linked: "linked", no_valid_bid: "no valid bid", cancelled: "cancelled",
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

/** The job's token, or null for a token this app does not know (its decimals are then unknown: never guess). */
export const tokenOf = (id: string): TenderToken | null => TENDER_TOKENS.find((t) => t.id === id) ?? null;

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

/** The commands that link an agent running elsewhere to `account`'s dashboard. */
export const linkScript = (account: string): string => `curl -sO ${SCRIPT_URL}\nnode tender-bid.mjs link ${account}`;
export const linkCli = (account: string): string => `accord tender link ${account}`;
