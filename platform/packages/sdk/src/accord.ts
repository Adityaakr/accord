// `Accord` (the factory) and `AgreementClient` (one agreement): every contract method from INTERFACES.md
// section 11, over a `Chain` for views and a `Signer` for calls.

import { Chain, RPC, TGAS, type Signer, type TxResult } from "./chain.js";
import { deriveDocKey, seal, type DocKey, type Mandate, type Role } from "./sealing.js";
import type {
  ActOutcome, Action, AgreementRecord, AgreementView, Commitment, CreateArgs, DueItem, ExceptionView, FactoryConfig,
  ItemView, Network, PeriodView, RecipientVersion, Receipt, Refusal, Release, StoredObservation, Terms,
} from "./types.js";

export interface AccordOptions {
  network: Network;
  factory: string;
  rpc?: string;
  signer?: Signer;
}

export interface ActResult {
  status: "sent" | "failed" | "refused" | "exception_requested" | "preflight_blocked" | "needs_human";
  code?: string;
  seq?: number;
  txHash?: string;
  reasons?: string[];
  gasBurnt?: bigint;
}

export class Accord {
  readonly chain: Chain;
  readonly network: Network;
  readonly factory: string;
  signer?: Signer;

  constructor(opts: AccordOptions) {
    this.network = opts.network;
    this.factory = opts.factory;
    this.signer = opts.signer;
    this.chain = new Chain(opts.rpc ?? RPC[opts.network]?.rpc ?? "http://127.0.0.1:3030");
  }

  withSigner(signer: Signer): Accord {
    return new Accord({ network: this.network, factory: this.factory, rpc: this.chain.rpcUrl, signer });
  }

  /** The same network, chain and signer on another factory: an agreement's own, read from its state. */
  onFactory(factory: string): Accord {
    if (factory === this.factory) return this;
    return new Accord({ network: this.network, factory, rpc: this.chain.rpcUrl, signer: this.signer });
  }

  agreement(account: string): AgreementClient {
    return new AgreementClient(this, account);
  }

  config(): Promise<FactoryConfig> {
    return this.chain.view(this.factory, "config");
  }

  async release(version?: number): Promise<Release> {
    const r = version === undefined
      ? await this.chain.view<Release | null>(this.factory, "current_release")
      : await this.chain.view<Release | null>(this.factory, "release", { version });
    if (!r) throw new Error(`no release ${version ?? "current"} on ${this.factory}`);
    return r;
  }

  async listAgreements(opts: { party?: string; from?: number; limit?: number } = {}): Promise<AgreementRecord[]> {
    if (opts.party) return this.chain.view(this.factory, "agreements_for", { account: opts.party });
    return this.chain.view(this.factory, "agreements", { from: opts.from ?? null, limit: opts.limit ?? null });
  }

  reports(account: string): Promise<{ agreement: string; seq: number; at: number }[]> {
    return this.chain.view(this.factory, "reports", { account });
  }

  blocked(account: string): Promise<string | null> {
    return this.chain.view(this.factory, "blocked", { account });
  }

  recipientStats(account: string, buyer?: string) {
    return this.chain.view<{ all: { payments: number; total: string }; buyer: { payments: number; total: string } | null }>(
      this.factory, "recipient_stats", { account, buyer: buyer ?? null },
    );
  }

  /** The buyer (the signer) creates an agreement; returns its account id. */
  async createAgreement(args: CreateArgs, opts: { deposit?: bigint } = {}): Promise<{ agreement: string; tx: TxResult }> {
    const signer = this.need();
    const deposit = opts.deposit ?? BigInt((await this.config()).create_deposit);
    const tx = await signer.call(this.factory, "create_agreement", { args }, { gas: 300n * TGAS, deposit });
    if (!tx.ok || typeof tx.value !== "string") {
      throw new Error(`create_agreement: ${tx.failure ?? "refunded (the creation batch failed)"} · tx ${tx.txHash}`);
    }
    return { agreement: tx.value, tx };
  }

  need(): Signer {
    if (!this.signer) throw new Error("this call needs a signer");
    return this.signer;
  }
}

/**
 * The sensitive buyer, authority and party methods take exactly 1 yoctoNEAR, which only a full-access key can attach
 * (from release 4, DECISIONS.md 25). Agreements running the earlier code (releases 1 to 3 share one global contract)
 * refuse any deposit on those methods, so the client attaches it only to agreements that do not run that code.
 */
export const ONE_YOCTO = "one-yocto" as const;
/** Agreement code that predates the 1 yoctoNEAR methods: releases 1 to 3 on testnet, used by global hash. */
export const PRE_YOCTO_CODE_HASHES = ["8wMuMRreZfLiVPNjcsPjB2ZkcJJwsKh56BsasVxdpEBN"];

export class AgreementClient {
  constructor(readonly accord: Accord, readonly id: string) {}

  private view<T>(method: string, args: object = {}): Promise<T> {
    return this.accord.chain.view<T>(this.id, method, args);
  }

  private yocto?: Promise<bigint>;

  /** 1 yoctoNEAR for an agreement whose code takes it on the sensitive methods, 0 for the earlier code. */
  private oneYocto(): Promise<bigint> {
    this.yocto ??= this.accord.chain.account(this.id).then(
      (a) => (PRE_YOCTO_CODE_HASHES.includes(a.global_contract_hash ?? a.code_hash) ? 0n : 1n),
      () => 1n,
    );
    return this.yocto;
  }

  private async call(method: string, args: object = {}, tgas = 100n, deposit: bigint | typeof ONE_YOCTO = 0n): Promise<TxResult> {
    const attach = deposit === ONE_YOCTO ? await this.oneYocto() : deposit;
    const tx = await this.accord.need().call(this.id, method, args, { gas: tgas * TGAS, deposit: attach });
    if (!tx.ok) throw new AccordError(method, tx);
    return tx;
  }

  // Views.
  get(): Promise<AgreementView> { return this.view("get_agreement"); }
  terms(): Promise<Terms | null> { return this.view("get_terms"); }
  items(): Promise<ItemView[]> { return this.view("get_items"); }
  dueItems(): Promise<DueItem[]> { return this.view("due_items"); }
  refusals(from?: number, limit?: number): Promise<Refusal[]> {
    return this.view("get_refusals", { from: from ?? null, limit: limit ?? null });
  }
  recipients(): Promise<RecipientVersion[]> { return this.view("get_recipients"); }
  exceptions(): Promise<ExceptionView[]> { return this.view("get_exceptions"); }
  periods(): Promise<PeriodView[]> { return this.view("get_periods"); }
  observations(period: number): Promise<StoredObservation[]> { return this.view("get_observations", { period }); }
  commitments(): Promise<{ buyer: Commitment | null; vendor: Commitment | null }> { return this.view("get_commitments"); }
  documents(): Promise<{ buyer: string; vendor: string } | null> { return this.view("get_documents"); }
  sealedOutput(): Promise<string | null> { return this.view("get_sealed_output"); }
  receipts(): Promise<Receipt[]> { return this.view("get_receipts"); }
  budget() { return this.view<{ balance: string; storage_stake: string; liquid: string }>("get_budget"); }

  // Principals.
  async sealMandate(mandate: Mandate, opts: { role: Role; docKey?: DocKey }): Promise<{ commitment: string; txHash: string }> {
    const signer = this.accord.need();
    const a = await this.get();
    // The mandate key of the agreement's own factory's release, whichever factory this client was built for.
    const release = await this.accord.onFactory(a.factory).release(a.release);
    const docKey = opts.docKey ?? (await deriveDocKey(signer, this.id));
    const sealed = seal({
      agreement: this.id, role: opts.role, party: signer.accountId, release: a.release, mandate,
      mandatePubkey: release.mandate_pubkey, docKey,
    });
    const tx = await this.call("commit_mandate", {
      commitment: sealed.commitment, ciphertext: sealed.ciphertext,
      doc_pubkey: docKey.publicKey, doc_key_signer: docKey.signer,
    }, 30n);
    return { commitment: sealed.commitment, txHash: tx.txHash };
  }
  startNegotiation() { return this.call("start_negotiation", {}, 300n); }
  approveTerms(termsHash: string) { return this.call("approve_terms", { terms_hash: termsHash }, 30n, ONE_YOCTO); }
  cancel() { return this.call("cancel", {}, 30n); }
  async fund(amount: string): Promise<TxResult> {
    const a = await this.get();
    const tx = await this.accord.need().call(
      a.token, "ft_transfer_call", { receiver_id: this.id, amount, msg: "fund" }, { gas: 100n * TGAS, deposit: 1n },
    );
    if (!tx.ok) throw new AccordError("fund", tx);
    return tx;
  }
  proposeRecipient(account: string, domain: string) {
    return this.call("propose_recipient", { account, domain }, 300n);
  }
  approveRecipient(version: number) { return this.call("approve_recipient", { version }, 30n, ONE_YOCTO); }
  acceptRecipient(version: number, opts: { acknowledgeWarnings?: boolean } = {}) {
    return this.call("accept_recipient", { version, acknowledge_warnings: opts.acknowledgeWarnings ?? false }, 50n, ONE_YOCTO);
  }
  activateRecipient(version: number) { return this.call("activate_recipient", { version }, 50n); }
  cancelRecipientChange(version: number) { return this.call("cancel_recipient_change", { version }, 30n); }
  installAgentKey(publicKey: string, allowance: string) {
    return this.call("install_agent_key", { public_key: publicKey, allowance }, 50n, ONE_YOCTO);
  }
  revokeAgent() { return this.call("revoke_agent", {}, 30n); }
  submitDelivery(item: number, evidenceHash: string, uri: string) {
    return this.call("submit_delivery", { item, evidence_hash: evidenceHash, uri }, 30n);
  }
  acceptDelivery(item: number) { return this.call("accept_delivery", { item }, 30n, ONE_YOCTO); }
  disputeDelivery(item: number, reason: string) { return this.call("dispute_delivery", { item, reason }, 30n); }
  requestException(e: { item: number; amount: string; waiveEvidence: boolean; reason: string }) {
    return this.call("request_exception", { item: e.item, amount: e.amount, waive_evidence: e.waiveEvidence, reason: e.reason }, 30n);
  }
  approveException(id: number) { return this.call("approve_exception", { id }, 30n, ONE_YOCTO); }
  rejectException(id: number) { return this.call("reject_exception", { id }, 30n); }
  resolvePeriod(period: number, pay: boolean) { return this.call("resolve_period", { period, pay }, 30n, ONE_YOCTO); }
  closePeriod(period: number) { return this.call("close_period", { period }, 50n); }
  recordObservation(observation: unknown, sig: string) {
    return this.call("record_observation", { observation, sig }, 50n);
  }
  async claim(item: number): Promise<ActResult> {
    return actResult(await this.call("claim", { item }, 80n));
  }
  close() { return this.call("close", {}, 200n); }
  mutualClose() { return this.call("mutual_close", {}, 200n, ONE_YOCTO); }
  withdrawNear() { return this.call("withdraw_near", {}, 30n, ONE_YOCTO); }
  resolveStaleLock() { return this.call("resolve_stale_lock", {}, 80n); }

  // The agent: the signer is the agreement account itself, signing with its one function-call key.
  async act(action: Action): Promise<ActResult> {
    const signer = this.accord.need();
    if (signer.accountId !== this.id) throw new Error(`the agent signs as ${this.id}, not ${signer.accountId}`);
    const tx = await signer.call(this.id, "act", { action }, { gas: 80n * TGAS });
    if (!tx.ok) throw new AccordError("act", tx);
    return actResult(tx);
  }
  pay(p: { item: number; amount: string; recipient: string; memo?: string }): Promise<ActResult> {
    return this.act({ Pay: { item: p.item, amount: p.amount, recipient: p.recipient, memo: p.memo ?? null } });
  }
  agentRequestException(e: { item: number; amount: string; waiveEvidence: boolean; reason: string }): Promise<ActResult> {
    return this.act({ RequestException: { item: e.item, amount: e.amount, waive_evidence: e.waiveEvidence, reason: e.reason } });
  }
}

export function actResult(tx: TxResult): ActResult {
  const v = tx.value as ActOutcome | null;
  const base = { txHash: tx.txHash, gasBurnt: tx.gasBurnt };
  if (v && "Refused" in v) return { ...base, status: "refused", code: v.Refused.code, seq: v.Refused.seq };
  if (v && "Sent" in v) return { ...base, status: "sent" };
  if (v && "Failed" in v) return { ...base, status: "failed", reasons: [v.Failed.reason] };
  if (v && "ExceptionRequested" in v) return { ...base, status: "exception_requested", seq: v.ExceptionRequested.id };
  return { ...base, status: "failed", reasons: [`unexpected outcome ${JSON.stringify(v)}`] };
}

export class AccordError extends Error {
  constructor(readonly method: string, readonly tx: TxResult) {
    super(`${method}: ${tx.failure ?? "failed"} · tx ${tx.txHash}`);
  }
  get code(): string | undefined {
    return this.tx.failure;
  }
}
