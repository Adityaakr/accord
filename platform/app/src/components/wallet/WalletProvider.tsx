"use client";

// The connected principal and a `Signer` for the SDK. On testnet it is the party's own wallet through NEAR Connect;
// on the local sandbox (`make serve`) it is a labelled stand-in that signs with the sandbox's throwaway keys on the
// local server. Mandates are sealed in this browser either way; only ciphertext leaves it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fromBase64, toTxResult, type Signer, type TxResult } from "@accord/sdk";
import { isWalletNetworkError, rawWalletError, walletErrorMessage } from "./txError";

export type WalletKind = "near-connect" | "sandbox";
/** How the person signed in: their own NEAR wallet, NEAR Auth email (testnet), or a local sandbox key. */
export type SignInMethod = "wallet" | "email" | "sandbox";

export interface WalletState {
  kind: WalletKind;
  method: SignInMethod | null;
  network: string;
  accountId: string | null;
  signer: Signer | null;
  connecting: boolean;
  error: string | null;
  connect: (sandboxRole?: string) => Promise<void>;
  /** NEAR Auth email sign-in (testnet only); null where it is not offered. */
  connectEmail: (() => Promise<void>) | null;
  /** For an email session: proves the account to the server with the Auth0 ID token instead of a signed message. */
  proveEmail: (() => Promise<string>) | null;
  disconnect: () => Promise<void>;
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
  const res = await fetch("/api/relay", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signedDelegate }),
  });
  const body = (await res.json().catch(() => ({}))) as { outcome?: unknown; error?: string };
  if (!res.ok || !body.outcome) throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { relay: true });
  return body.outcome;
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
      let outcome: unknown;
      try {
        outcome = relays(wallet, chain)
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
      const s = await wallet.signMessage({ message, recipient, nonce, signerId: accountId });
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
  const [connector, setConnector] = useState<Connector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxPrincipals, setSandboxPrincipals] = useState<{ role: string; account: string }[]>([]);
  const [via, setVia] = useState<"wallet" | "email" | null>(null);
  const emailOffered = kind !== "sandbox" && chain === "testnet";

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
      return;
    }
    let live = true;
    // Some wallets also reject their own internal promises when their RPC fails; the signer already shows that
    // inline, so keep it from surfacing as an uncaught runtime error.
    const quiet = (ev: PromiseRejectionEvent) => {
      if (isWalletNetworkError(rawWalletError(ev.reason))) ev.preventDefault();
    };
    window.addEventListener("unhandledrejection", quiet);
    (async () => {
      const { NearConnector } = await import("@hot-labs/near-connect");
      const c = new NearConnector({ network: chain }) as unknown as Connector;
      if (!live) return;
      setConnector(c);
      c.on("wallet:signOut", () => { setAccountId(null); setSigner(null); });
      c.on("wallet:signIn", async () => {
        const { wallet, accounts } = await c.getConnectedWallet();
        const id = accounts[0]?.accountId ?? null;
        setAccountId(id);
        setSigner(id ? connectorSigner(wallet, id, chain) : null);
        setVia(id ? "wallet" : null);
      });
      try {
        const { wallet, accounts } = await c.getConnectedWallet();
        const id = accounts[0]?.accountId ?? null;
        if (live && id) { setAccountId(id); setSigner(connectorSigner(wallet, id, chain)); setVia("wallet"); return; }
      } catch {
        // no wallet connected yet
      }
      // No wallet: an email (NEAR Auth) session may still be open in this browser.
      if (chain === "testnet") {
        const fa = await import("./fastauth");
        if (live && (await fa.emailSignedIn())) {
          const { accountId: id, signer: s } = await fa.emailSigner();
          if (live) { setAccountId(id); setSigner(s); setVia("email"); }
        }
      }
    })();
    return () => { live = false; window.removeEventListener("unhandledrejection", quiet); };
  }, [kind, chain]);

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
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, [kind, connector, sandboxPrincipals]);

  const connectEmail = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const fa = await import("./fastauth");
      await fa.emailLogin();
      const { accountId: id, signer: s } = await fa.emailSigner();
      // The server verifies the login, derives the same account from the MPC contract and funds it once if it is new.
      const r = await fetch("/api/fastauth/session", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: await fa.emailIdToken() }),
      });
      const b = (await r.json()) as { account?: string; error?: string };
      if (!r.ok || b.account !== id) throw new Error(b.error ?? "the server derived a different account; sign in again");
      setAccountId(id);
      setSigner(s);
      setVia("email");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const proveEmail = useCallback(async () => {
    const fa = await import("./fastauth");
    const r = await fetch("/api/fastauth/session", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: await fa.emailIdToken() }),
    });
    const b = (await r.json()) as { account?: string; error?: string };
    if (!r.ok || !b.account) throw new Error(b.error ?? `HTTP ${r.status}`);
    return b.account;
  }, []);

  const disconnect = useCallback(async () => {
    if (via === "email") {
      await (await import("./fastauth")).emailLogout();
    } else if (kind === "sandbox") {
      try { localStorage.removeItem("accord-sandbox-principal"); } catch { /* nothing stored */ }
    } else {
      await connector?.disconnect().catch(() => undefined);
    }
    setAccountId(null);
    setSigner(null);
    setVia(null);
  }, [kind, connector, via]);

  const method: SignInMethod | null = accountId ? (kind === "sandbox" ? "sandbox" : via === "email" ? "email" : "wallet") : null;
  const value = useMemo<WalletState>(() => ({
    kind, method, network, accountId, signer, connecting, error, connect,
    connectEmail: emailOffered ? connectEmail : null,
    proveEmail: via === "email" ? proveEmail : null,
    disconnect, sandboxPrincipals,
  }), [kind, method, network, accountId, signer, connecting, error, connect, emailOffered, connectEmail, via, proveEmail, disconnect, sandboxPrincipals]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
