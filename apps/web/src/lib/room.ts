import { useEffect, useState } from "react"
import { LINKS } from "../content/links"

/* Whether the always-open public room at /app/try is open, read in the browser from the app's own counter endpoint
   (same origin, ${app}/api/inbox/stats: {"open": true, "agreement": "a14.accord-v2.testnet", ...}). The prerendered
   page and the first render say neither: "unknown" until the endpoint answers, and also when it cannot be reached or
   answers something else; "closed" only when it answers {"open": false}. The page never claims a state it has not read. */
export type RoomState = { kind: "unknown" } | { kind: "open"; agreement: string } | { kind: "closed" }

export const ROOM_URL = `${LINKS.app}/try`

export function useRoom(): RoomState {
  const [s, setS] = useState<RoomState>({ kind: "unknown" })
  useEffect(() => {
    let live = true
    fetch(`${LINKS.app}/api/inbox/stats`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ open?: unknown; agreement?: unknown }>) : null))
      .then((b) => {
        if (!live || !b) return
        if (b.open === true && typeof b.agreement === "string") setS({ kind: "open", agreement: b.agreement })
        else if (b.open === false) setS({ kind: "closed" })
      })
      .catch(() => { /* unreachable or not JSON: stay "unknown" */ })
    return () => { live = false }
  }, [])
  return s
}
