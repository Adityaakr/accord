"use client";

// The connected principal and a `Signer` for the SDK. On testnet it is the party's own wallet through NEAR Connect;
// on the local sandbox (`make serve`) it is a labelled stand-in that signs with the sandbox's throwaway keys on the
// local server. Mandates are sealed in this browser either way; only ciphertext leaves it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fromBase64, toTxResult, type Signer, type TxResult } from "@accord/sdk";

export type WalletKind = "near-connect" | "sandbox";
/** How the person signed in: their own NEAR wallet, NEAR Auth email (not wired yet), or a local sandbox key. */
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

function connectorSigner(wallet: ConnectorWallet, accountId: string): Signer {
  return {
    accountId,
    async call(contractId, method, args, opts = {}): Promise<TxResult> {
      const outcome = await wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: contractId,
        actions: [{
          type: "FunctionCall",
          params: {
            methodName: method,
            args,
            gas: String(opts.gas ?? 100_000_000_000_000n),
            deposit: String(opts.deposit ?? 0n),
          },
        }],
      });
      return toTxResult(outcome);
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
        setSigner(id ? connectorSigner(wallet, id) : null);
      });
      try {
        const { wallet, accounts } = await c.getConnectedWallet();
        const id = accounts[0]?.accountId ?? null;
        if (live && id) { setAccountId(id); setSigner(connectorSigner(wallet, id)); }
      } catch {
        // no wallet connected yet
      }
    })();
    return () => { live = false; };
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

  const disconnect = useCallback(async () => {
    if (kind === "sandbox") {
      try { localStorage.removeItem("accord-sandbox-principal"); } catch { /* nothing stored */ }
    } else {
      await connector?.disconnect().catch(() => undefined);
    }
    setAccountId(null);
    setSigner(null);
  }, [kind, connector]);

  const method: SignInMethod | null = accountId ? (kind === "sandbox" ? "sandbox" : "wallet") : null;
  const value = useMemo<WalletState>(() => ({
    kind, method, network, accountId, signer, connecting, error, connect, disconnect, sandboxPrincipals,
  }), [kind, method, network, accountId, signer, connecting, error, connect, disconnect, sandboxPrincipals]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
