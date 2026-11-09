"use client";

// The connected principal and a `Signer` for the SDK. On testnet it is the party's own wallet through NEAR Connect;
// on the local sandbox (`make serve`) it is a labelled stand-in that signs with the sandbox's throwaway keys on the
// local server. On testnet a visitor without a wallet can also use a throwaway key made in this tab (./throwaway.ts):
// it stays in sessionStorage, is never sent to the server, and is gone when the tab closes. Mandates are sealed in
// this browser either way; only ciphertext leaves it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fromBase64, toTxResult, type Signer, type TxResult } from "@accord/sdk";
import { friendlyWalletError, isWalletNetworkError, rawWalletError, walletErrorMessage } from "./txError";
import { useAppConfig } from "@/components/AppConfig";
import { relayAndWait } from "./relayClient";
import { clearThrowawayKey, implicitAccountId, loadThrowawayKey, newThrowawayKey, saveThrowawayKey, throwawaySigner } from "./throwaway";

export type WalletKind = "near-connect" | "sandbox";
/** How the person signed in: their own NEAR wallet, a local sandbox key, or a throwaway testnet key in this tab. */
export type SignInMethod = "wallet" | "sandbox" | "throwaway";

/** The label the app shows for an account signed in with a throwaway key. */
export const THROWAWAY_LABEL = "Throwaway testnet key";

export interface WalletState {
  kind: WalletKind;
  method: SignInMethod | null;
  network: string;
  accountId: string | null;
  signer: Signer | null;
  /** True until the session kept from before a reload (a throwaway key, a connected wallet) has been read back. */
  restoring: boolean;
  connecting: boolean;
  error: string | null;
  connect: (sandboxRole?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** True on testnet, where "Try without a wallet" is offered. Hidden everywhere else. */
  throwawayAvailable: boolean;
  /** Makes a throwaway testnet key in this tab and signs in with it. */
  startThrowaway: () => Promise<void>;
  sandboxPrincipals: { role: string; account: string }[];
}

const Ctx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}

interface ConnectorWallet {
  manifest?: { name?: string; features?: { signDelegateActions?: boolean } };
  signDelegateActions?(p: {
    signerId?: string; network?: string; delegateActions: { receiverId: string; actions: unknown[] }[];
  }): Promise<{ signedDelegateActions: string[] }>;
  signAndSendTransaction(p: { signerId?: string; receiverId: string; actions: unknown[] }): Promise<unknown>;
  signMessage(p: { message: string; recipient: string; nonce: Uint8Array; signerId?: string }): Promise<{ publicKey: string; signature: string }>;
  getAccounts(): Promise<{ accountId: string }[]>;
}
interface Connector {
  connect(): Promise<ConnectorWallet>;
  disconnect(): Promise<void>;
  getConnectedWallet(): Promise<{ wallet: ConnectorWallet; accounts: { accountId: string }[] }>;
  on(event: string, cb: (p: unknown) => void): void;
}

/** Wallets that sign NEP-366 delegate actions send through Accord's relayer on testnet (see /api/relay). */
export const relays = (wallet: ConnectorWallet | null | undefined, chain: string) =>
  chain === "testnet" && wallet?.manifest?.features?.signDelegateActions === true && typeof wallet.signDelegateActions === "function";

async function sendRelayed(wallet: ConnectorWallet, accountId: string, chain: string, receiverId: string, action: unknown): Promise<unknown> {
  const signed = await wallet.signDelegateActions!({ signerId: accountId, network: chain, delegateActions: [{ receiverId, actions: [action] }] });
  const signedDelegate = signed?.signedDelegateActions?.[0];
  if (!signedDelegate) throw new Error("the wallet returned no signed request");
  // a short post that answers with the hash, then status polls until the call is final (./relayClient)
  try {
    return await relayAndWait(signedDelegate);
  } catch (e) {
    throw Object.assign(new Error((e as Error).message), { relay: true });
  }
}

function connectorSigner(wallet: ConnectorWallet, accountId: string, chain: string): Signer {
  const name = wallet.manifest?.name ?? "Your wallet";
  return {
    accountId,
    async call(contractId, method, args, opts = {}): Promise<TxResult> {
      const action = {
        type: "FunctionCall",
        params: {
          methodName: method,
          args,
          gas: String(opts.gas ?? 100_000_000_000_000n),
          deposit: String(opts.deposit ?? 0n),
        },
      };
      // In a NEP-366 meta transaction the relayer pays any NEAR the delegate attaches, so only calls that attach at most
      // 1 yoctoNEAR go through Accord's relayer; a call that attaches more (create_agreement's room deposit) is signed
      // and paid by the person's own wallet.
      const deposit = BigInt(opts.deposit ?? 0n);
      let outcome: unknown;
      try {
        outcome = relays(wallet, chain) && deposit <= 1n
          ? await sendRelayed(wallet, accountId, chain, contractId, action)
          : await wallet.signAndSendTransaction({ signerId: accountId, receiverId: contractId, actions: [action] });
      } catch (e) {
        if ((e as { relay?: boolean }).relay) throw new Error(`Accord's relayer could not send this transaction: ${(e as Error).message}.`);
        throw new Error(walletErrorMessage(e, name, chain));
      }
      try {
        return toTxResult(outcome);
      } catch {
        throw new Error(`${name} sent the transaction but returned no readable result. Check the room in a moment.`);
      }
    },
    async signMessage(message, recipient, nonce) {
      let s: { publicKey: string; signature: string };
      try {
        s = await wallet.signMessage({ message, recipient, nonce, signerId: accountId });
      } catch (e) {
        throw new Error(friendlyWalletError(e, name));
      }
      return { signature: fromBase64(s.signature), publicKey: s.publicKey };
    },
  };
}

function sandboxSigner(role: string, accountId: string): Signer {
  return {
    accountId,
    async call(contractId, method, args, opts = {}): Promise<TxResult> {
      const res = await fetch("/api/dev/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          as: role, contractId, method, args,
          gas: String(opts.gas ?? 100_000_000_000_000n), deposit: String(opts.deposit ?? 0n),
        }),
      });
      const body = (await res.json()) as { tx?: unknown; error?: string };
      if (!res.ok || !body.tx) throw new Error(body.error ?? `HTTP ${res.status}`);
      return toTxResult(body.tx);
    },
    async signMessage(message, recipient, nonce) {
      const res = await fetch("/api/dev/sign-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ as: role, message, recipient, nonce: Array.from(nonce) }),
      });
      const body = (await res.json()) as { signature: string; publicKey: string };
      return { signature: fromBase64(body.signature), publicKey: body.publicKey };
    },
  };
}

/** `network` is the app config's label: "local sandbox", "testnet" or "mainnet". */
export function WalletProvider({ network, children }: { network: string; children: ReactNode }) {
  const kind: WalletKind = network === "local sandbox" ? "sandbox" : "near-connect";
  const chain: "mainnet" | "testnet" = network === "mainnet" ? "mainnet" : "testnet";
  const { rpc } = useAppConfig();
  const throwawayAvailable = kind === "near-connect" && network === "testnet";
  const [throwaway, setThrowaway] = useState(false);
  const [connector, setConnector] = useState<Connector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sandboxPrincipals, setSandboxPrincipals] = useState<{ role: string; account: string }[]>([]);

  useEffect(() => {
    if (kind === "sandbox") {
      fetch("/api/dev/principals")
        .then((r) => r.json() as Promise<{ role: string; account: string }[]>)
        .then(setSandboxPrincipals)
        .catch(() => setSandboxPrincipals([]));
      try {
        const saved = JSON.parse(localStorage.getItem("accord-sandbox-principal") ?? "null") as { role: string; account: string } | null;
        if (saved) {
          setAccountId(saved.account);
          setSigner(sandboxSigner(saved.role, saved.account));
        }
      } catch {
        // storage unavailable: start disconnected
      }
      setRestoring(false);
      return;
    }
    let live = true;
    // Some wallets also reject their own internal promises when their RPC fails; the signer already shows that
    // inline, so keep it from surfacing as an uncaught runtime error.
    const quiet = (ev: PromiseRejectionEvent) => {
      if (isWalletNetworkError(rawWalletError(ev.reason))) ev.preventDefault();
    };
    window.addEventListener("unhandledrejection", quiet);
    // a throwaway key in this tab's sessionStorage (testnet only) signs in again on reload
    const kept = throwawayAvailable ? loadThrowawayKey() : null;
    if (kept) {
      const id = implicitAccountId(kept);
      setAccountId(id);
      setSigner(throwawaySigner(kept, { rpc }));
      setThrowaway(true);
      setRestoring(false);
    }
    // a wallet extension that never answers must not hold the page: give up waiting after a few seconds
    const cap = window.setTimeout(() => setRestoring(false), 4000);
    (async () => {
      const { NearConnector } = await import("@hot-labs/near-connect");
      const c = new NearConnector({ network: chain }) as unknown as Connector;
      if (!live) return;
      setConnector(c);
      c.on("wallet:signOut", () => { setAccountId(null); setSigner(null); });
      c.on("wallet:signIn", async () => {
        const { wallet, accounts } = await c.getConnectedWallet();
        const id = accounts[0]?.accountId ?? null;
        // connecting a real wallet replaces the throwaway key
        if (id) { clearThrowawayKey(); setThrowaway(false); }
        setAccountId(id);
        setSigner(id ? connectorSigner(wallet, id, chain) : null);
      });
      try {
        const { wallet, accounts } = await c.getConnectedWallet();
        const id = accounts[0]?.accountId ?? null;
        if (live && id && !kept) { setAccountId(id); setSigner(connectorSigner(wallet, id, chain)); }
      } catch {
        // no wallet connected yet
      }
      if (live) setRestoring(false);
    })().catch(() => { if (live) setRestoring(false); });
    return () => { live = false; window.clearTimeout(cap); window.removeEventListener("unhandledrejection", quiet); };
  }, [kind, chain, throwawayAvailable, rpc]);

  const startThrowaway = useCallback(async () => {
    setError(null);
    if (!throwawayAvailable) { setError("A throwaway key is offered on testnet only."); return; }
    const kp = loadThrowawayKey() ?? newThrowawayKey();
    if (!saveThrowawayKey(kp)) { setError("This browser blocks sessionStorage, so a throwaway key cannot be kept. Connect a wallet instead."); return; }
    const id = implicitAccountId(kp);
    setAccountId(id);
    setSigner(throwawaySigner(kp, { rpc }));
    setThrowaway(true);
  }, [throwawayAvailable, rpc]);

  const connect = useCallback(async (sandboxRole?: string) => {
    setError(null);
    if (kind === "sandbox") {
      const p = sandboxPrincipals.find((x) => x.role === sandboxRole) ?? sandboxPrincipals[0];
      if (!p) { setError("make serve is not running"); return; }
      setAccountId(p.account);
      setSigner(sandboxSigner(p.role, p.account));
      try { localStorage.setItem("accord-sandbox-principal", JSON.stringify(p)); } catch { /* not stored */ }
      return;
    }
    if (!connector) return;
    setConnecting(true);
    try {
      await connector.connect();
    } catch (e) {
      setError(friendlyWalletError(e, "Your wallet"));
    } finally {
      setConnecting(false);
    }
  }, [kind, connector, sandboxPrincipals]);

  const disconnect = useCallback(async () => {
    if (throwaway) {
      // Reset: the key is deleted from this tab; its test funds stay with the account on testnet
      clearThrowawayKey();
      setThrowaway(false);
    } else if (kind === "sandbox") {
      try { localStorage.removeItem("accord-sandbox-principal"); } catch { /* nothing stored */ }
    } else {
      await connector?.disconnect().catch(() => undefined);
    }
    setAccountId(null);
    setSigner(null);
  }, [kind, connector, throwaway]);

  const method: SignInMethod | null = accountId ? (throwaway ? "throwaway" : kind === "sandbox" ? "sandbox" : "wallet") : null;
  const value = useMemo<WalletState>(() => ({
    kind, method, network, accountId, signer, restoring, connecting, error, connect, disconnect, throwawayAvailable, startThrowaway, sandboxPrincipals,
  }), [kind, method, network, accountId, signer, restoring, connecting, error, connect, disconnect, throwawayAvailable, startThrowaway, sandboxPrincipals]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
