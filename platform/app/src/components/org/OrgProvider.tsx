"use client";

// The session and the member's organisation, for every page. "Confirm it's you" asks the wallet for one NEP-413
// signature (no transaction, no fee); the server checks it against the account's keys on chain and sets an httpOnly
// cookie. A session lets a member manage the organisation; it never signs anything on chain.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { toBase64 } from "@accord/sdk";
import { useWallet } from "../wallet/WalletProvider";

export type OrgRole = "admin" | "negotiator" | "approver" | "treasurer" | "guardian" | "operator" | "viewer";

export interface OrgData {
  account: string;
  org: { id: string; name: string; domain: string; domain_verified_at: string | null; created_by: string; created_at: string } | null;
  member?: { role: OrgRole; joined_at: string; invited_by: string | null };
  members?: { account_id: string; role: OrgRole; invited_by: string | null; joined_at: string }[];
  invites?: { ref: string; role: OrgRole; email: string | null; created_by: string; expires_at: string }[];
  audit?: { id: string; at: string; actor: string; action: string; detail: Record<string, unknown> | null }[];
  notifications?: Record<string, boolean>;
  domain?: { record: string; file: string } | null;
  email?: boolean;
}

interface OrgState {
  /** The wallet account this browser has proven, when it is the connected one */
  session: string | null;
  checking: boolean;
  confirming: boolean;
  error: string | null;
  confirm: () => Promise<boolean>;
  data: OrgData | null;
  role: OrgRole | null;
  reload: () => Promise<void>;
  /** Calls an organisation route as JSON and reloads; throws the server's message on failure */
  send: (url: string, method: string, body?: unknown) => Promise<unknown>;
}

const Ctx = createContext<OrgState | null>(null);

export function useOrg(): OrgState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrg outside OrgProvider");
  return v;
}

const SESSION_RECIPIENT = "accord-session";

export function OrgProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [proven, setProven] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrgData | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ account: string | null }>)
      .then((b) => { if (live) setProven(b.account); })
      .catch(() => undefined)
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);

  // Signing out of the wallet ends the session too.
  useEffect(() => {
    if (!checking && !w.accountId && proven) {
      void fetch("/api/session", { method: "DELETE" }).then(() => setProven(null));
    }
  }, [checking, w.accountId, proven]);

  const session = proven && proven === w.accountId ? proven : null;

  const reload = useCallback(async () => {
    if (!session) { setData(null); return; }
    const r = await fetch("/api/org", { cache: "no-store" });
    if (r.status === 401) { setProven(null); setData(null); return; }
    const b = (await r.json()) as OrgData & { error?: string };
    if (r.ok) setData(b);
    else setError(b.error ?? `HTTP ${r.status}`);
  }, [session]);

  useEffect(() => { void reload(); }, [reload]);

  const confirm = useCallback(async () => {
    if (!w.accountId || !w.signer?.signMessage) { setError("Connect a wallet that can sign messages first."); return false; }
    setConfirming(true);
    setError(null);
    try {
      const issued = Date.now();
      const message = `accord:session:v1:${w.accountId}:${issued}`;
      const s = await w.signer.signMessage(message, SESSION_RECIPIENT, sha256(utf8ToBytes(message)));
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: w.accountId, public_key: s.publicKey, signature: toBase64(s.signature), issued_at: issued }),
      });
      const b = (await r.json()) as { account?: string; error?: string };
      if (!r.ok || !b.account) throw new Error(b.error ?? `HTTP ${r.status}`);
      setProven(b.account);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setConfirming(false);
    }
  }, [w.accountId, w.signer]);

  const send = useCallback(async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    if (r.status === 401) setProven(null);
    if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
    await reload();
    return b;
  }, [reload]);

  const value = useMemo<OrgState>(() => ({
    session, checking, confirming, error, confirm, data, role: data?.member?.role ?? null, reload, send,
  }), [session, checking, confirming, error, confirm, data, reload, send]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** What each role may be shown in a room. The contract still decides who can sign. */
export type Capability = "seal" | "approve" | "treasury" | "revoke" | "operate" | "open";
const CAN: Record<OrgRole, Capability[]> = {
  admin: ["seal", "approve", "treasury", "revoke", "operate", "open"],
  negotiator: ["seal", "open"],
  approver: ["approve", "open"],
  treasurer: ["treasury", "open"],
  guardian: ["revoke", "open"],
  operator: ["operate", "open"],
  viewer: ["open"],
};
export const can = (role: OrgRole | null, c: Capability) => role === null || CAN[role].includes(c);

export const ROLE_INFO: { role: OrgRole; does: string; signs: string }[] = [
  { role: "admin", does: "Sets up the organisation, members and agents; can do everything below", signs: "Whatever its own wallet is a party to" },
  { role: "negotiator", does: "Seals the organisation's figures for a room and watches the negotiation", signs: "commit_mandate" },
  { role: "approver", does: "Approves agreed terms; on the vendor side, approves the recipient", signs: "approve_terms, approve_recipient" },
  { role: "treasurer", does: "Funds escrow, accepts recipients and deliveries, decides exceptions", signs: "ft_transfer_call, accept_recipient, accept_delivery, approve_exception" },
  { role: "guardian", does: "Revokes an agent in one transaction", signs: "revoke_agent" },
  { role: "operator", does: "Runs rooms day to day and submits deliveries; cannot move money", signs: "submit_delivery" },
  { role: "viewer", does: "Reads rooms, the record and the audit log", signs: "Nothing" },
];
