import { useState } from "react"
import { LogoMark } from "./Logo"
import styles from "./ResearchStack.module.css"

/* The research page's hero figure: an isometric stack. The Accord room sits on top; under it, one floor per question
   the research answers, lowest floor first in reading order from the top of the page. Each floor shows its label
   and how many sources it holds, lights on hover or focus, and links to its section. */

type Floor = { id: string; label: string; count: number }

const C = Math.cos(Math.PI / 6)
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * 0.5 - z]
const pts = (a: [number, number][]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")

const W = 300, D = 220, H = 30, GAP = 12

function slab(z: number, inset = 0) {
  const x = -W / 2 + inset, y = -D / 2 + inset, w = W - inset * 2, d = D - inset * 2, t = z + H
  return {
    top: pts([P(x, y, t), P(x + w, y, t), P(x + w, y + d, t), P(x, y + d, t)]),
    left: pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, t), P(x, y + d, t)]),
    right: pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, t), P(x + w, y, t)]),
    labelAt: P(x + w * 0.5, y + d, z + H / 2),
    sideAt: P(x + w, y + d * 0.5, z + H / 2),
  }
}

export function ResearchStack({ floors }: { floors: Floor[] }) {
  const [on, setOn] = useState<number | null>(null)
  const n = floors.length
  const total = floors.reduce((a, f) => a + f.count, 0)
  // floors[0] is the first question on the page; draw it at the top, directly under the room
  const zOf = (i: number) => (n - 1 - i) * (H + GAP)
  const roomZ = n * (H + GAP)
  const room = { x: -90, y: -70, w: 180, d: 140, h: 70 }
  const rt = roomZ + room.h
  const rf = {
    top: pts([P(room.x, room.y, rt), P(room.x + room.w, room.y, rt), P(room.x + room.w, room.y + room.d, rt), P(room.x, room.y + room.d, rt)]),
    left: pts([P(room.x, room.y + room.d, roomZ), P(room.x + room.w, room.y + room.d, roomZ), P(room.x + room.w, room.y + room.d, rt), P(room.x, room.y + room.d, rt)]),
    right: pts([P(room.x + room.w, room.y, roomZ), P(room.x + room.w, room.y + room.d, roomZ), P(room.x + room.w, room.y + room.d, rt), P(room.x + room.w, room.y, rt)]),
  }
  const [lx, ly] = P(0, 0, rt)

  return (
    <div className={styles.wrap}>
      <svg viewBox="-320 -400 700 560" className={styles.svg} role="img" aria-label={`The Accord room standing on ${n} floors of research, ${total} sources in all.`}>
        <ellipse cx="0" cy={P(0, 0, 0)[1] + 40} rx="300" ry="90" className={styles.ground} />
        {floors.map((f, i) => ({ f, i })).reverse().map(({ f, i }) => {
          const s = slab(zOf(i))
          const active = on === i
          return (
            <a key={f.id} href={`#${f.id}`} className={`${styles.floor} ${active ? styles.on : ""}`}
              onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} onFocus={() => setOn(i)} onBlur={() => setOn(null)}>
              <polygon points={s.left} className={styles.fl} />
              <polygon points={s.right} className={styles.fr} />
              <polygon points={s.top} className={styles.ft} />
              {/* label on the front-left face, along the slab */}
              <text transform={`matrix(${C} 0.5 0 1 ${s.labelAt[0]} ${s.labelAt[1]})`} textAnchor="middle" dominantBaseline="central" className={styles.label}>
                {String(n - i).padStart(2, "0")}  {f.label}
              </text>
              {/* count on the right face */}
              <text transform={`matrix(${C} -0.5 0 1 ${s.sideAt[0]} ${s.sideAt[1]})`} textAnchor="middle" dominantBaseline="central" className={styles.count}>
                {f.count} source{f.count === 1 ? "" : "s"}
              </text>
            </a>
          )
        })}
        {/* the room */}
        <g className={styles.room}>
          <polygon points={rf.left} className={styles.rl} />
          <polygon points={rf.right} className={styles.rr} />
          <polygon points={rf.top} className={styles.rt} />
        </g>
        <foreignObject x={lx - 70} y={ly - 13} width="140" height="26" className={styles.roomLabelFo}>
          <div className={styles.roomLabel}><LogoMark size={14} /> The room</div>
        </foreignObject>
      </svg>
      <p className={styles.caption}>{n} questions, {total} sources. Choose a floor to read its sources.</p>
    </div>
  )
}
