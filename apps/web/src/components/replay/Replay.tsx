import { AttackReplay } from "./AttackReplay"
import { AtlasReplay } from "./AtlasReplay"
import { parseAtlas, parseAttack } from "./parse"

/* Picks the replay for a raw output block. Returns null when the text does not parse, so the caller shows the raw
   block instead: a replay never draws anything the block does not say. */
export function Replay({ kind, code, label, caption }: { kind: "attack" | "atlas"; code: string; label?: string; caption?: string }) {
  if (kind === "attack") {
    const d = parseAttack(code)
    return d ? <AttackReplay data={d} raw={code} label={label} caption={caption} /> : null
  }
  const d = parseAtlas(code)
  return d ? <AtlasReplay data={d} raw={code} label={label} caption={caption} /> : null
}

export const canReplay = (kind: "attack" | "atlas", code: string) => (kind === "attack" ? parseAttack(code) : parseAtlas(code)) !== null
