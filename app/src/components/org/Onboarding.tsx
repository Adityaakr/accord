"use client";

// After the first sign-in: create the organisation (name and domain) or join one with an invitation, then prove the
// domain. The one place outside a deal room where the teal stage and a floating card appear.

import { AccountId } from "@/components/account/AccountId";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "../wallet/WalletProvider";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import { ConfirmYou } from "./ConfirmYou";
import { useOrg } from "./OrgProvider";
import { DomainProof } from "./DomainProof";
import styles from "./org.module.css";

export function Onboarding() {
  const w = useWallet();
  const o = useOrg();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  let card;
  if (!w.accountId) card = <SignInCard title="Sign in to set up your organisation" />;
  else if (!o.session) card = <ConfirmYou why="Before you create or join an organisation, confirm this account is yours." />;
  else if (o.data?.org && created) {
    card = (
      <div className={styles.card}>
        <p className={styles.steps}>Step 2 of 2</p>
        <p className={styles.cardTitle}>Prove you control {o.data.org.domain}</p>
        <p className={styles.cardLead}>Counterparties see a verified domain next to your organisation&apos;s name. Add one of these, then check.</p>
        <DomainProof />
        <button type="button" className={styles.primary} onClick={() => router.push("/settings?tab=members")}>Continue to members</button>
        <Link href="/" className={`${styles.note}`} style={{ textAlign: "center" }}>Do this later</Link>
      </div>
    );
  } else if (o.data?.org) {
    card = (
      <div className={styles.card}>
        <p className={styles.cardTitle}>You are in {o.data.org.name}</p>
        <p className={styles.cardLead}>Your role is <span className={styles.rolePill}>{o.data.member?.role}</span>. An account belongs to one organisation.</p>
        <button type="button" className={styles.primary} onClick={() => router.push("/settings")}>Open settings</button>
      </div>
    );
  } else {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        if (mode === "create") {
          await o.send("/api/org", "POST", { name, domain });
          setCreated(true);
        } else {
          const token = link.trim().split("/invite/").pop()?.split(/[?#]/)[0] ?? "";
          if (!token) throw new Error("Paste the invitation link you were sent.");
          router.push(`/invite/${token}`);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    };
    card = (
      <form className={styles.card} onSubmit={submit}>
        <p className={styles.steps}>Step 1 of 2</p>
        <p className={styles.cardTitle}>Set up your organisation</p>
        <p className={styles.cardLead}>Your company in Accord: its people, what each of them can do, and the deal rooms they share.</p>
        <div className={styles.switch} role="group" aria-label="Create or join">
          <button type="button" aria-pressed={mode === "create"} onClick={() => setMode("create")}>Create an organisation</button>
          <button type="button" aria-pressed={mode === "join"} onClick={() => setMode("join")}>Join with an invite</button>
        </div>
        {mode === "create" ? (
          <>
            <label className={styles.field}>Organisation name
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Labs" maxLength={80} required />
            </label>
            <label className={styles.field}>Company domain
              <input className={styles.input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="northwind.xyz" required inputMode="url" autoCapitalize="off" />
            </label>
            <p className={styles.note}>You become its first admin. You prove the domain in the next step.</p>
          </>
        ) : (
          <>
            <label className={styles.field}>Invitation link
              <input className={styles.input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/invite/…" required autoCapitalize="off" />
            </label>
            <p className={styles.note}>An admin of the organisation sends this link. It works once and expires after 72 hours.</p>
          </>
        )}
        <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Working…" : mode === "create" ? "Create the organisation" : "Open the invitation"}</button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.note}>Signed in as <AccountId id={w.accountId} /></p>
      </form>
    );
  }

  return (
    <div className="container">
      <div className={styles.head}>
        <div>
          <p className="eyebrow">Organisation</p>
          <h1 className="h2">Set up your organisation</h1>
          <p className={styles.lead}>Roles decide what each member is shown. The contract still checks every signer, and every payment is signed in a member&apos;s own wallet.</p>
        </div>
      </div>
      <Stage tall>{card}</Stage>
    </div>
  );
}
