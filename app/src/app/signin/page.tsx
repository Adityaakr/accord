"use client";

import Link from "next/link";
import { SignInCard } from "@/components/SignInCard";
import { Stage } from "@/components/Stage";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./signin.module.css";

export default function SignIn() {
  const w = useWallet();
  return (
    <div className="container">
      <div className={styles.wrap}>
        <Stage tall>
          {w.accountId ? (
            <div className={styles.done}>
              <p className="eyebrow">Signed in</p>
              <p className="h3 mono">{w.accountId}</p>
              <Link href="/" className={styles.primary}>Go to Home</Link>
            </div>
          ) : (
            <SignInCard />
          )}
        </Stage>
      </div>
    </div>
  );
}
