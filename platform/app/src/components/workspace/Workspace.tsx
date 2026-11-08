"use client";

// Workspaces: one person can be a buyer in one room and a vendor in another, so the app asks how they are using
// Accord today (/enter) and then shows only that role's things: its sidebar, its Home, its rooms. The last choice is
// remembered per account. Roles on chain are unchanged; this only decides what is shown.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PixelName } from "../PixelIcon";
import { useWallet } from "../wallet/WalletProvider";

export type WorkspaceId = "buyer" | "vendor" | "authority" | "reviewer" | "auditor";
export type NavIcon = "home" | "rooms" | "approvals" | "agents" | "recipients" | "record" | "verify" | "deliveries" | "payout";
export interface NavItem { href: string; label: string; icon: NavIcon; match: (p: string) => boolean }

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon: PixelName;
  /** one sentence: who this is for */
  line: string;
  /** what you can do there */
  can: string[];
  planned?: boolean;
  /** the on-chain role whose rooms this workspace shows */
  role: "buyer" | "vendor" | "authority" | null;
  nav: NavItem[];
}

const starts = (s: string) => (p: string) => p.startsWith(s);
const rooms = (p: string) => p.startsWith("/rooms") || p.startsWith("/agreements");

export const WORKSPACES: Workspace[] = [
  {
    id: "buyer", name: "Buyer", icon: "bank", role: "buyer",
    line: "You pay for a service and want every payment held to the terms.",
    can: ["Create deal rooms", "Seal your limits", "Approve and fund", "Run your agent", "Decide exceptions"],
    nav: [
      { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
      { href: "/rooms", label: "Deal rooms", icon: "rooms", match: rooms },
      { href: "/approvals", label: "Approvals", icon: "approvals", match: starts("/approvals") },
      { href: "/agents", label: "Agents", icon: "agents", match: starts("/agents") },
      { href: "/record", label: "Record", icon: "record", match: starts("/record") },
    ],
  },
  {
    id: "vendor", name: "Vendor", icon: "store", role: "vendor",
    line: "You deliver a service and get paid to the account you proved.",
    can: ["Rooms you were invited to", "Seal your floor", "Deliver and claim payments", "Manage your payout account"],
    nav: [
      { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
      { href: "/rooms", label: "Deal rooms", icon: "rooms", match: rooms },
      { href: "/payout", label: "Payout account", icon: "payout", match: starts("/payout") },
      { href: "/deliveries", label: "Deliveries and claims", icon: "deliveries", match: starts("/deliveries") },
      { href: "/record", label: "Record", icon: "record", match: starts("/record") },
    ],
  },
  {
    id: "authority", name: "Settlement authority", icon: "shield", role: "authority",
    line: "You sign off the account your company is paid to.",
    can: ["Approve recipient changes", "Cancel a change during its delay"],
    nav: [
      { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
      { href: "/recipients", label: "Recipient changes", icon: "recipients", match: starts("/recipients") },
    ],
  },
  {
    id: "reviewer", name: "Reviewer", icon: "book", role: null, planned: true,
    line: "You accept a delivery or a milestone before it can be paid.",
    can: ["Accept deliveries and evidence", "Sign off milestones (planned)"],
    nav: [
      { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
      { href: "/approvals", label: "Reviews", icon: "approvals", match: starts("/approvals") },
    ],
  },
  {
    id: "auditor", name: "Auditor", icon: "terminal", role: null,
    line: "You check an agreement from public data. No account needed.",
    can: ["Verify any agreement", "Read the public record", "Export it as CSV"],
    nav: [
      { href: "/verify", label: "Verify", icon: "verify", match: starts("/verify") },
      { href: "/record", label: "Public record", icon: "record", match: starts("/record") },
    ],
  },
];

export const workspaceById = (id: WorkspaceId | null | undefined): Workspace => WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0]!;

interface WorkspaceState { id: WorkspaceId | null; ws: Workspace; choose: (id: WorkspaceId) => void; ready: boolean }
const Ctx = createContext<WorkspaceState | null>(null);
export function useWorkspace(): WorkspaceState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace outside WorkspaceProvider");
  return v;
}

const key = (account: string | null) => `accord-workspace:${account ?? "guest"}`;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [id, setId] = useState<WorkspaceId | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setId((localStorage.getItem(key(w.accountId)) as WorkspaceId | null) ?? null); } catch { setId(null); }
    setReady(true);
  }, [w.accountId]);
  const choose = useCallback((next: WorkspaceId) => {
    setId(next);
    try { localStorage.setItem(key(w.accountId), next); } catch { /* remembered for this page only */ }
  }, [w.accountId]);
  const value = useMemo(() => ({ id, ws: workspaceById(id), choose, ready }), [id, choose, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
