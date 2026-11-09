"use client";

// Sign in, full screen and outside the app: the Accord mark, one line of what Accord is, and the sign-in card on the
// website's teal stage. Once signed in, the next stop is the workspace chooser (/enter), not a dashboard.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInCard } from "@/components/SignInCard";
import { RoomPreview } from "@/components/RoomPreview";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/theme/Theme";
import { useWallet } from "@/components/wallet/WalletProvider";
import { isAccountId } from "@/lib/accountid";
import styles from "./signin.module.css";

/** ?next= is followed only when it is a path inside the app (agreement ids carry dots, never "..") */
const safeNext = (next: string | null) => (next && /^\/[a-z0-9/_.-]*$/i.test(next) && !next.startsWith("//") && !next.includes("..") ? next : null);

export default function SignIn() {
  const w = useWallet();
  const router = useRouter();
  const [room, setRoom] = useState<string | null>(null);
  useEffect(() => {
    // a room link (/agreements/<id>) shows that room's read-only summary above the card
    const m = /^\/agreements\/([a-z0-9._-]+)$/i.exec(safeNext(new URLSearchParams(window.location.search).get("next")) ?? "");
    // only an agreement account: /agreements/new (the new-room form) and anything that is not an account id have no
    // room to read
    const id = m?.[1]?.toLowerCase();
    setRoom(id && id !== "new" && isAccountId(id) ? id : null);
  }, []);
  useEffect(() => {
    if (!w.accountId) return;
    // ?next=/try-it returns a visitor to where they started; only paths inside the app
    // a throwaway testnet key is for trying one deal, so it goes to the guided path unless a ?next= says otherwise
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")) ?? (w.method === "throwaway" ? "/try-it" : "/enter"));
  }, [w.accountId, w.method, router]);
  return (
    <div className={styles.page}>
      <span className={styles.weave} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />
      <header className={styles.top}>
        {/* the site's landing page: a plain link, so the /app basePath is not added */}
        <a href="/" className={styles.brand} aria-label="Accord website"><LogoMark /><span>Accord</span></a>
        <ThemeToggle compact />
      </header>
      <div className={styles.center}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Private deal rooms for agent-to-agent commerce.</h1>
          <p className={styles.lead}>Agents negotiate inside each company&apos;s sealed limits. Both companies approve, and the contract enforces every payment.</p>
        </div>
        {room && <div className={styles.room}><RoomPreview id={room} /></div>}
        <SignInCard title="Sign in" />
        <p className={styles.foot}>
          Checking an agreement? <Link href="/verify" className="link">Verify it without an account</Link>
        </p>
      </div>
    </div>
  );
}
