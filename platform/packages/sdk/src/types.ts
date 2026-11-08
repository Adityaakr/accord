// Shapes of the contracts' views and arguments (INTERFACES.md sections 3 and 4). Amounts are decimal strings in
// the token's base units; times are unix seconds.

export type Network = "testnet" | "mainnet" | "sandbox";
export type Kind = "procurement" | "market-making";
export type State = "Sealed" | "Attested" | "Executing" | "Settled" | "NoDeal" | "Cancelled";
export type Mode = "live" | "demo";
export type Rating = "allow" | "warn" | "block";
export type Via = "agent" | "claim" | "close";
export type ItemStatus =
  | "Open" | "Delivered" | "Disputed" | "Eligible" | "Paid" | "AssumedPaid" | "Reserved" | "Unfunded";
export type PeriodOutcome = "Open" | "Eligible" | "Withheld" | "Review" | "ResolvedPay" | "ResolvedClosed";
export type RecipientStatus =
  | "Proposed" | "Proven" | "ProofFailed" | "AuthorityApproved" | "Accepted" | "Active" | "Superseded" | "Cancelled";

export const REFUSAL_CODES = [
  "ERR_REVOKED", "ERR_NOT_EXECUTING", "ERR_CANARY", "ERR_NO_RECIPIENT", "ERR_PAYEE_MISMATCH", "ERR_UNKNOWN_ITEM",
  "ERR_ALREADY_PAID", "ERR_NOT_DUE", "ERR_PERIOD_WITHHELD", "ERR_AMOUNT_MISMATCH", "ERR_CAP_EXCEEDED",
  "ERR_INSUFFICIENT_FUNDS", "ERR_IN_FLIGHT",
] as const;
export type RefusalCode = (typeof REFUSAL_CODES)[number];

export interface Params {
  mode: Mode;
  timelock_secs: number;
  claim_delay_secs: number;
  grace_secs: number;
  min_acceptance_window_secs: number;
  max_acceptance_window_secs: number;
  require_two_sided: boolean;
  observation_grace_secs: number;
  refusal_limit: number;
  refusal_window_secs: number;
  agent_allowance: string;
}

export type Evidence = "DeliveryAccepted" | { PeriodEligible: { period: number } };

export interface ItemTerms { id: number; amount: string; due_offset_secs: number; evidence: Evidence }

export interface Venue { RheaDcl: { network: string; contract: string; pool_id: string } }

export interface AtlasTerms {
  retainer_per_period: string;
  periods: number;
  period_secs: number;
  slots_per_period: number;
  pass_threshold: number;
  venue: Venue;
  max_spread_bps: number;
  min_depth_quote: string;
  depth_band_bps: number;
}

export interface Terms {
  v: number;
  kind: Kind;
  token: string;
  decimals: number;
  total: string;
  items: ItemTerms[];
  acceptance_window_secs: number;
  duration_secs: number;
  params_hash: string;
  doc_hash: string;
  atlas: AtlasTerms | null;
}

export interface JobRef { project: string; wasm_hash: string; signing_pubkey: string }

export interface InFlight {
  payment_id: number; item: number; amount: string; recipient: string; via: Via; since_block: number;
  escrow_before: string;
}

export interface AgreementView {
  id: number;
  account: string;
  factory: string;
  release: number;
  kind: Kind;
  title: string;
  state: State;
  negotiation: "AwaitingMandates" | "Done" | { Ready: { attempts: number } } |
    { Requested: { request_nonce: string; at: number; attempt: number } };
  buyer: string;
  vendor: string;
  vendor_authority: string;
  token: string;
  keeper: string;
  outlayer: string;
  model: string;
  jobs: { sealed_table: JobRef; payee: JobRef; observer: JobRef };
  canaries: string[];
  params: Params;
  terms_hash: string | null;
  approvals: { buyer: boolean; vendor: boolean };
  executing_at: number | null;
  ends_at: number | null;
  funded: string;
  paid: string;
  reserved: string;
  refunded: string;
  total: string;
  in_flight: InFlight | null;
  closing: boolean;
  mutual_close: { buyer: boolean; vendor: boolean };
  recipient: { version: number; account: string; domain: string } | null;
  domain: string | null;
  pending_recipient: { version: number; account: string; status: RecipientStatus; active_at: number | null } | null;
  agent_key: string | null;
  revoked_keys: number;
  canary_tripped: boolean;
  refusals: number;
  exceptions: number;
  observation_conflicts: number;
  periods: PeriodOutcome[];
  budget: Budget;
  now: number;
}

export interface Budget { balance: string; storage_stake: string; liquid: string }

export interface Delivery { evidence_hash: string; uri: string; at: number; window_end: number }

export interface ItemView {
  id: number;
  amount: string;
  due_amount: string;
  due_offset_secs: number;
  due_at: number | null;
  evidence: Evidence;
  status: ItemStatus;
  delivery: Delivery | null;
  eligible_at: number | null;
  exception: { amount: string; waive_evidence: boolean } | null;
  exception_used: boolean;
  pending_exception: number | null;
  settled: string;
}

export interface DueItem { item: number; amount: string; recipient: string | null; eligible_at: number | null }

export interface Refusal {
  seq: number; at: number; block: number; code: RefusalCode; item: number; amount: string; recipient: string;
  signer: string | null; via: Via;
}

export interface RecipientVersion {
  version: number; account: string; domain: string; status: RecipientStatus; rating: Rating | null;
  reasons: string[]; failure: string | null; proposed_at: number; active_at: number | null; proof: string | null;
}

export interface ExceptionView {
  id: number; item: number; amount: string; waive_evidence: boolean; reason: string; by: "agent" | "vendor";
  status: "pending" | "approved" | "rejected"; at: number;
}

export interface PeriodView {
  period: number; outcome: PeriodOutcome; recorded: number; conflict: boolean; passed: number; observed: number;
  uptime_bps: number; starts_at?: number; ends_at?: number; closable_at?: number;
}

export interface BlockRef { height: number; hash: string; time: number }

export interface Observation {
  agreement: string; period: number; slot: number; slot_time: number; venue: Venue; band_bps: number;
  venue_block: BlockRef; mid: string; spread_bps: number; depth_bid: string; depth_ask: string; two_sided: boolean;
}

export interface StoredObservation { observation: Observation; sig: string; hash: string; pass: boolean }

export interface Receipt {
  payment_id: number; item: number; amount: string; recipient: string; via: Via; block: number; at: number;
  evidence_hash: string | null;
}

export interface Commitment {
  commitment: string; ciphertext: string; doc_pubkey: string; doc_key_signer: string; at: number;
}

export interface AgreementRecord {
  id: number; account: string; kind: Kind; title: string; buyer: string; vendor: string; vendor_authority: string;
  release: number; created_at: number;
}

export interface JobRelease { project: string; wasm_hash: string; signing_pubkey: string; pubkey_task_id: number }

export interface Release {
  version: number; mode: "Global" | "Embedded"; code_hash: string; sealed_table: JobRelease; payee: JobRelease;
  observer: JobRelease; mandate_pubkey: string; model: string; published_at: number;
}

export interface FactoryConfig {
  owner: string; token: string; outlayer: string; keeper: string; create_deposit: string; demo_allowed: boolean;
}

export interface CreateArgs {
  kind: Kind;
  title: string;
  vendor: string;
  vendor_authority: string;
  canaries: string[];
  params: Params;
}

export type Action =
  | { Pay: { item: number; amount: string; recipient: string; memo: string | null } }
  | { RequestException: { item: number; amount: string; waive_evidence: boolean; reason: string } };

export type ActOutcome =
  | { Sent: { item: number; amount: string; recipient: string } }
  | { Failed: { item: number; reason: string } }
  | { Refused: { code: RefusalCode; seq: number } }
  | { ExceptionRequested: { id: number } };

export interface AccordEvent { event: string; data: Record<string, unknown> }
