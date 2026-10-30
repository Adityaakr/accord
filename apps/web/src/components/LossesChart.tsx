import { useId, useState } from "react"
import styles from "./LossesChart.module.css"

/* losses.svg (accord-kit website/diagrams), rebuilt as a component so each column is focusable with a tooltip and the
   chart has a table view (spec §5 Column chart). Geometry is the kit's: viewBox 360×172, baseline y 136, 50 px per $10B,
   24 px columns with 4 px rounded tops, gridlines at $10B and $20B, value labels on the first and last column only.
   2021 to 2024 in --muted, 2025 in --fg. Values: FBI IC3 Internet Crime Reports 2025 and 2023 (RESEARCH_PAGE Part B). */

export const LOSSES = [
  { year: 2021, value: 6.9 },
  { year: 2022, value: 10.3 },
  { year: 2023, value: 12.5 },
  { year: 2024, value: 16.6 },
  { year: 2025, value: 20.9 },
] as const

const BASE = 136
const PER_B = 5 // px per $1B
const colX = (i: number) => 62 + i * 60
const top = (v: number) => BASE - v * PER_B
const fmt = (v: number) => `$${v.toFixed(1)}B`

function column(i: number, v: number) {
  const x = colX(i), t = top(v)
  return `M${x},${BASE} V${t + 4} Q${x},${t} ${x + 4},${t} H${x + 20} Q${x + 24},${t} ${x + 24},${t + 4} V${BASE} Z`
}

export function LossesChart() {
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const tableId = useId()
  const last = LOSSES.length - 1

  return (
    <div className={styles.chart}>
      <div className={styles.frame}>
        <svg viewBox="0 0 360 172" className={styles.svg} role="group" aria-label="Losses reported to the FBI's Internet Crime Complaint Center, 2021 to 2025">
          {[0, 10, 20].map((g) => (
            <g key={g}>
              <line x1="44" x2="344" y1={top(g)} y2={top(g)} className={styles.grid} />
              <text x="36" y={top(g) + 3.5} textAnchor="end" className={styles.tick}>{g === 0 ? "$0" : `$${g}B`}</text>
            </g>
          ))}
          {LOSSES.map((d, i) => {
            const latest = i === last
            return (
              <g
                key={d.year}
                tabIndex={0}
                role="img"
                aria-label={`${d.year}: ${fmt(d.value)} reported`}
                className={`${styles.col} ${latest ? styles.latest : ""} ${active === i ? styles.on : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect x={colX(i) - 18} y="10" width="60" height="150" fill="transparent" />
                <path d={column(i, d.value)} className={styles.bar} />
                <text x={colX(i) + 12} y="154" textAnchor="middle" className={styles.year}>{d.year}</text>
                {i === 0 || latest ? (
                  <text x={colX(i) + 12} y={top(d.value) - 7} textAnchor="middle" className={styles.value}>{fmt(d.value)}</text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {active !== null ? (
          <div className={styles.tip} style={{ left: `${((colX(active) + 12) / 360) * 100}%`, top: `${((top(LOSSES[active].value) - 6) / 172) * 100}%` }} aria-hidden="true">
            {LOSSES[active].year} · {fmt(LOSSES[active].value)} reported
          </div>
        ) : null}
      </div>

      <button type="button" className={`t-body-sm ${styles.toggle}`} aria-expanded={table} aria-controls={tableId} onClick={() => setTable((t) => !t)}>
        {table ? "Hide table" : "Show as table"}
      </button>
      {table ? (
        <table id={tableId} className={styles.table}>
          <thead><tr><th scope="col">Year</th><th scope="col">Reported losses</th></tr></thead>
          <tbody>{LOSSES.map((d) => <tr key={d.year}><td className="mono">{d.year}</td><td className="mono">{fmt(d.value)}</td></tr>)}</tbody>
        </table>
      ) : null}
    </div>
  )
}
