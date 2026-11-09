// A recorded wallet-free try-it run, replayed step by step: agreement a32.accord-v2.testnet, 9 Nov 2026 from 10:35 UTC
// on NEAR testnet, by the e2e script (app/e2e/try-without-wallet.mjs) against the public URL. Every hash below is a
// real transaction, read back from chain (tx.test.fastnear.com, for a32 and for the throwaway account
// 2988206f…37e0). `at` is seconds since the run started: the throwaway key was made at 2 s, and the first transaction
// (the faucet's NEAR) landed at 10 s; later times are block timestamps relative to that one. Nothing here is live.

export const REPLAY_AGREEMENT = "a32.accord-v2.testnet";
export const REPLAY_BUYER = "2988206f6b3d0dcdc9d977257cfa53616791789b746bf987c03f98d9441737e0";
export const REPLAY_DATE = "9 Nov 2026, 10:35 UTC";

export interface ReplayTx { label: string; hash: string }
export interface ReplayStep {
  id: string;
  at: number;
  title: string;
  detail: string;
  /** The contract's refusal code, for the refused step. */
  code?: string;
  txs: ReplayTx[];
}

export const REPLAY_STEPS: ReplayStep[] = [
  { id: "key", at: 2, title: "Throwaway key", detail: "A testnet key made in the browser tab; its implicit account is the buyer. No transaction yet.", txs: [] },
  { id: "faucet", at: 14, title: "Faucet", detail: "Accord's faucet sends 2.35 testnet NEAR and mints 100.00 tUSDC to the account.", txs: [
    { label: "2.35 NEAR", hash: "CgprZkuZhiKMY2CFXRjshRByUwiJ4Dj3VuMFzPoWnMoa" },
    { label: "mint 100 tUSDC", hash: "92dPoDnSpDSvN5dCv8vT3eai6uLo6Jq4WgaetqtCsdnB" },
  ] },
  { id: "room", at: 20, title: "Room opened", detail: "create_agreement on accord-v2.testnet against Accord's demo vendor: the room is a32.accord-v2.testnet.", txs: [
    { label: "create_agreement", hash: "896jfaNWqu6msZ5R6iNM423zTaecPTTa2kWCH9V3KHMK" },
  ] },
  { id: "sealed", at: 36, title: "Mandates sealed", detail: "The buyer's limits (relayed) and the demo vendor's, each encrypted to the Sealed Table; only their hashes are public.", txs: [
    { label: "buyer commit_mandate", hash: "4gPzyZmSng1ywaZYcgNQDLtsHPCwvdy6sTb7njCxNDuR" },
    { label: "vendor commit_mandate", hash: "BkHfcb82oH2Dvx2UaMxGmNTeq9moU4wG9hHdjGrfvjhj" },
  ] },
  { id: "negotiated", at: 92, title: "Negotiated and approved", detail: "The Sealed Table negotiates inside the enclave and the contract checks the signed terms; both sides then approve them.", txs: [
    { label: "start_negotiation", hash: "7Fd5LgjfR7YEsCe4aqP7EAm5SnLYnUzhrk45PwkXaRsC" },
    { label: "buyer approve_terms", hash: "FXtCWPGukMZF6C3E1uGFnWTtMB4CGRqR8iB3BUCbhsPB" },
    { label: "vendor approve_terms", hash: "Hv7f1qB5mZHiCE8yBDEersbFoxC2NhTRwfkysWyApKx1" },
  ] },
  { id: "funded", at: 104, title: "Escrow funded, agent started", detail: "The buyer funds the agreement's escrow with tUSDC and installs the demo agent's key, which can call act and nothing else.", txs: [
    { label: "ft_transfer_call", hash: "GHyBoz8tnon6ChXLB53QyAfmBXfg6P8Jxvr6MajzM6dt" },
    { label: "install_agent_key", hash: "AM3qt4u4CxvF5QgbeFtVsL3Bu21Tk9hyL2NdTpQVxFLV" },
  ] },
  { id: "recipient", at: 146, title: "Recipient bound", detail: "The vendor proposes halcyon-mm.testnet, the Payee job proves it on the vendor's domain, the vendor's authority approves it and the buyer accepts it.", txs: [
    { label: "propose_recipient", hash: "HdbRWeU6BzZUeVr8LyvE4w32xzWtRqEyzNdEabiXvzq8" },
    { label: "approve_recipient", hash: "GmXdoUAXBN6bjBWvo5T5FEhwbe6f7EhqmPtThLjveX9q" },
    { label: "accept_recipient", hash: "FaMe8rZAKQozbf71cYqNoGAuJNqc9JvAgp74MPwrdAYh" },
  ] },
  { id: "paid", at: 176, title: "Paid inside the terms", detail: "The vendor delivers item 1, the buyer accepts it, and the agent pays 16.00 tUSDC to halcyon-mm.testnet, the active recipient.", txs: [
    { label: "submit_delivery", hash: "CpPUQTtTtKctPAYMwgr84einoa3s6kMNDzPvERoiFsni" },
    { label: "accept_delivery", hash: "FjMhrTYQ6eprDZ4LkvKyCfLHyG1AiaQMuDsyHKHHXJAH" },
    { label: "act · paid", hash: "9PGHmWRHqbuL8aWNmk2Ce4UDVXU4wGBXoHreexuxNrAU" },
  ] },
  { id: "refused", at: 188, title: "Redirect refused", code: "ERR_PAYEE_MISMATCH", detail: "Asked to pay 13.00 tUSDC for item 2 to halcyon-markets.testnet, an account the agreement never approved, the agent signs act; the contract refuses it and records the refusal. Nothing moves.", txs: [
    { label: "act · refused", hash: "wFKpA7Vh1VnMeTmXVww8HitFhEDFVDq4nJ35n6At76d" },
  ] },
  { id: "revoked", at: 212, title: "Agent revoked", detail: "The buyer deletes the agent's key from the agreement account in one transaction; anything the agent signs after this is rejected by the network.", txs: [
    { label: "revoke_agent", hash: "D1c2eUCALdB6KDaahrz5ZRKwVwSkAQD82SqGGSx31CU5" },
  ] },
  { id: "finished", at: 258, title: "Finished", detail: "The room closes by mutual_close with the demo vendor (the unspent escrow goes back to the buyer), withdraw_near returns the room's deposit, and the throwaway account deletes itself into the faucet: the faucet got 2.193 NEAR back.", txs: [
    { label: "buyer mutual_close", hash: "Dk34fBquSCbYpEskkprdujJRiSVQiqZ1B8NVdu4ayt69" },
    { label: "vendor mutual_close", hash: "2yeC31cYfwbVJT3dHQwpVLqGdxUSsAANzNZ1dzedr8LA" },
    { label: "close", hash: "FqdeQqnapfRe4M3wp7fza2GsCzW2DsVLzg3iqLkzVwQo" },
    { label: "withdraw_near", hash: "GzbxYw56HmhkFFGJYiaZ3EgTEBaYxqHgMSbqc6QnNpjT" },
    { label: "delete_account", hash: "Akw4wLXBHK4jZbkRxdNddanAJqvAwNb7NCyvtvbGDk9" },
  ] },
];

/** The replay's length: the recorded run, compressed to about a minute. */
export const REPLAY_PLAY_SECS = 60;

/** m:ss of a recorded time. */
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}`;

/** How many steps have appeared `played` seconds into a replay of `steps` lasting `playSecs`. */
export function shownAt(played: number, steps: ReplayStep[] = REPLAY_STEPS, playSecs = REPLAY_PLAY_SECS): number {
  const end = steps.at(-1)!.at;
  return steps.filter((s) => (s.at / end) * playSecs <= played + 1e-9).length;
}
