"use client";

// A link to an agreement from a public page (the record, /try, /verify). A deal room is for the signed-in parties;
// signed out (or while a session is being restored) the link goes to the agreement's public read-only check at
// /verify/<id> instead, so a visitor never lands on the sign-in page by following a row.

import Link from "next/link";
import type { ReactNode } from "react";
import { roomHref } from "@/lib/roomhref";
import { useWallet } from "./wallet/WalletProvider";

export function RoomLink({ id, className, children, signedOut }: {
  id: string;
  className?: string;
  children?: ReactNode;
  /** What to render instead when signed out (for example nothing, on the verify page itself). */
  signedOut?: ReactNode;
}) {
  const w = useWallet();
  const signedIn = !!w.accountId && !w.restoring;
  if (!signedIn && signedOut !== undefined) return <>{signedOut}</>;
  return <Link className={className} href={roomHref(id, signedIn)}>{children ?? id}</Link>;
}
