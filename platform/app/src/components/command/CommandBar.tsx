"use client";

// ⌘K / Ctrl+K: jump to a room by name, open a page, or start an action. Actions only ever navigate: "Revoke the
// agent in <room>" opens that room at its hold-to-revoke control and nothing is signed from here. Outside an input,
// G then D goes to Deal rooms and G then A to Approvals.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./command.module.css";

type Entry = { id: string; group: "Rooms" | "Pages" | "Actions"; label: string; hint?: string; href: string; danger?: boolean };
type MeRoom = { account: string; title: string; agent: "active" | "revoked" | "none" | null; state: string };

const PAGES: Entry[] = [
  { id: "p-home", group: "Pages", label: "Home", href: "/" },
  { id: "p-rooms", group: "Pages", label: "Deal rooms", hint: "G D", href: "/rooms" },
  { id: "p-approvals", group: "Pages", label: "Approvals", hint: "G A", href: "/approvals" },
  { id: "p-agents", group: "Pages", label: "Agents", href: "/agents" },
  { id: "p-recipients", group: "Pages", label: "Recipients", href: "/recipients" },
  { id: "p-record", group: "Pages", label: "Record", href: "/record" },
  { id: "p-settings", group: "Pages", label: "Settings", href: "/settings" },
  { id: "p-verify", group: "Pages", label: "Verify an agreement", href: "/verify" },
  { id: "p-profile", group: "Pages", label: "Profile", href: "/profile" },
];

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function CommandBar() {
  const router = useRouter();
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [rooms, setRooms] = useState<MeRoom[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lastG = useRef(0);

  // rooms for the signed-in account, fetched when the bar opens
  useEffect(() => {
    if (!open || !w.accountId) return;
    let live = true;
    fetch(`/api/me?account=${encodeURIComponent(w.accountId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rooms?: MeRoom[] } | null) => { if (live && d?.rooms) setRooms(d.rooms); })
      .catch(() => {});
    return () => { live = false; };
  }, [open, w.accountId]);

  const entries = useMemo<Entry[]>(() => {
    const actions: Entry[] = [
      { id: "a-new", group: "Actions", label: "New deal room", href: "/agreements/new" },
      { id: "a-approvals", group: "Actions", label: "Review what is waiting on you", href: "/approvals" },
      ...rooms.filter((r) => r.agent === "active").map((r) => ({ id: `a-revoke-${r.account}`, group: "Actions" as const, label: `Revoke the agent in ${r.title}`, hint: "opens the hold control", href: `/agreements/${r.account}#revoke`, danger: true })),
    ];
    const roomEntries: Entry[] = rooms.map((r) => ({ id: `r-${r.account}`, group: "Rooms", label: r.title, hint: r.account, href: `/agreements/${r.account}` }));
    const all = [...roomEntries, ...actions, ...PAGES];
    const s = q.trim().toLowerCase();
    if (!s) return all;
    const words = s.split(/\s+/);
    return all.filter((e) => words.every((x) => `${e.label} ${e.hint ?? ""}`.toLowerCase().includes(x)));
  }, [rooms, q]);

  const close = useCallback(() => { setOpen(false); setQ(""); setSel(0); }, []);
  const go = useCallback((e: Entry | undefined) => {
    if (!e) return;
    close();
    router.push(e.href);
  }, [close, router]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (open || ev.metaKey || ev.ctrlKey || ev.altKey || typing(ev.target)) return;
      const k = ev.key.toLowerCase();
      const now = Date.now();
      if (k === "g") { lastG.current = now; return; }
      if (now - lastG.current < 900) {
        if (k === "d") { lastG.current = 0; router.push(w.accountId ? `/rooms?party=${encodeURIComponent(w.accountId)}` : "/rooms"); }
        if (k === "a") { lastG.current = 0; router.push("/approvals"); }
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("accord:command", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("accord:command", onOpen); };
  }, [open, router, w.accountId]);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 0); }, [open]);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  const onListKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setSel((i) => Math.min(i + 1, entries.length - 1)); }
    if (ev.key === "ArrowUp") { ev.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    if (ev.key === "Enter") { ev.preventDefault(); go(entries[sel]); }
    if (ev.key === "Escape") { ev.preventDefault(); close(); }
  };

  let i = -1;
  const groups = (["Rooms", "Actions", "Pages"] as const).map((g) => ({ g, items: entries.filter((e) => e.group === g) })).filter((x) => x.items.length);

  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Command bar" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onListKey}>
        <div className={styles.inputRow}>
          <span className={styles.kbd} aria-hidden="true">⌘K</span>
          <input ref={input} className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.accountId ? "Search rooms, pages and actions" : "Search pages and actions (sign in to see your rooms)"} aria-label="Search" aria-controls="cmd-list" aria-activedescendant={entries[sel] ? `cmd-${entries[sel].id}` : undefined} />
        </div>
        <ul id="cmd-list" ref={listRef} className={styles.list} role="listbox">
          {groups.map(({ g, items }) => (
            <li key={g} role="presentation">
              <p className={styles.group}>{g}</p>
              <ul role="presentation">
                {items.map((e) => {
                  i += 1;
                  const idx = i;
                  return (
                    <li key={e.id} id={`cmd-${e.id}`} data-i={idx} role="option" aria-selected={idx === sel}
                      className={`${styles.item} ${idx === sel ? styles.on : ""} ${e.danger ? styles.danger : ""}`}
                      onMouseEnter={() => setSel(idx)} onClick={() => go(e)}>
                      <span className={styles.label}>{e.label}</span>
                      {e.hint ? <span className={styles.hint}>{e.hint}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {entries.length === 0 && <li className={styles.none}>Nothing matches “{q}”.</li>}
        </ul>
        <div className={styles.foot}>
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span className={styles.footRight}><kbd>G</kbd><kbd>D</kbd> deal rooms · <kbd>G</kbd><kbd>A</kbd> approvals</span>
        </div>
      </div>
    </div>
  );
}
