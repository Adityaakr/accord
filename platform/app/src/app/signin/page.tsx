"use client";

// Sign in, full screen and outside the app: the Accord mark, one line of what Accord is, and the sign-in card on the
// website's teal stage. Once signed in, the next stop is the workspace chooser (/enter), not a dashboard.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInCard } from "@/components/SignInCard";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/theme/Theme";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./signin.module.css";

export default function SignIn() {
  const w = useWallet();
  const router = useRouter();
  useEffect(() => {
    if (!w.accountId) return;
    // ?next=/try-it returns a visitor to where they started; only paths inside the app
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && /^\/[a-z0-9/_-]*$/i.test(next) && !next.startsWith("//") ? next : "/enter");
  }, [w.accountId, router]);
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
        <SignInCard title="Sign in" />
        <p className={styles.foot}>
          Checking an agreement? <Link href="/verify" className="link">Verify it without an account</Link>
        </p>
      </div>
    </div>
  );
}
