"use client";

// Profile: who is signed in, how, and on which network. The account is the person's own; disconnecting ends the
// session in this browser and changes nothing on chain.

import Link from "next/link";
import { useAppConfig } from "@/components/AppConfig";
import { useFinish } from "@/components/wallet/useFinish";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./profile.module.css";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/Theme";
import { Identicon } from "@/components/account/Identicon";
import { AccountId } from "@/components/account/AccountId";

const METHOD = { wallet: "NEAR wallet (HOT Connect)", sandbox: "Local sandbox key", throwaway: "Throwaway testnet key (this tab only)" } as const;

export default function Profile() {
  const router = useRouter();
  const w = useWallet();
  const f = useFinish();
  const c = useAppConfig();
  if (!w.accountId) {
    return (
      <div className="container">
        <div className={styles.head}><h1 className="h2">Profile</h1></div>
        <p className="body">You are not signed in. <Link href="/signin" className="link">Sign in</Link> to see your account.</p>
      </div>
    );
  }
  const explorer = c.explorer ? `${c.explorer}/address/${w.accountId}` : null;
  return (
    <div className="container">
      <div className={styles.head}>
        <Identicon id={w.accountId} size={52} radius={14} />
        <div>
          <p className="eyebrow">Profile</p>
          <h1 className="h2"><AccountId id={w.accountId} /></h1>
        </div>
      </div>
      <dl className={styles.rows}>
        <div><dt>NEAR account</dt><dd><AccountId id={w.accountId} copy />{explorer ? <> · <a className="link" href={explorer} target="_blank" rel="noreferrer">explorer</a></> : null}</dd></div>
        <div><dt>Signed in with</dt><dd>{w.method ? METHOD[w.method] : "Unknown"}</dd></div>
        <div><dt>Network</dt><dd className="mono">{w.network}</dd></div>
        <div><dt>Factory</dt><dd className="mono">{c.factory}</dd></div>
        <div><dt>Theme</dt><dd><ThemeToggle /></dd></div>
        <div><dt>Keys</dt><dd>{w.method === "throwaway" ? "A throwaway testnet key made in this tab. It is kept in this tab's sessionStorage, never sent to Accord's server, and gone when you close the tab. Test funds only." : w.method === "sandbox" ? "This is a throwaway sandbox key on this machine. On testnet and mainnet your keys stay in your own wallet." : "Your keys stay in your wallet. Accord never holds a key that can approve terms or move funds."}</dd></div>
      </dl>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={f.running}
          onClick={() => { if (w.method === "throwaway" && f.available) { void f.run().then((ok) => { if (ok) router.replace("/signin"); }); return; } void w.disconnect().then(() => router.replace("/signin")); }}>
          {w.method !== "throwaway" ? "Disconnect" : f.running ? "Returning test NEAR…" : "Reset"}
        </button>
        {f.error && <p className="small" role="alert">{f.error} <button type="button" className="link small" onClick={() => void w.disconnect().then(() => router.replace("/signin"))}>Reset anyway</button></p>}
        <Link href="/enter" className="small weak">Change workspace</Link>
        <Link href="/settings" className="small weak">Organisation and members</Link>
      </div>
    </div>
  );
}
