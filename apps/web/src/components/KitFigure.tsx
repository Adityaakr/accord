import styles from "./KitFigure.module.css"

/* The kit's drawn figures (accord-kit website/diagrams/*.svg), inlined so they inherit the site's tokens.
   The SVGs read --fg, --muted, --line, --surface-2, --accent and --refuse; KitFigure.module.css maps those onto the
   template's dark tokens, and the kit's display font is swapped for Host Grotesk. Labels are never redrawn here.
   `lanes`: groups each "<!-- lane N -->" block into a focusable <g> so hovering or focusing one dims the others. */

const KIT_FONT = /Satoshi, Manrope, system-ui, sans-serif/g

function groupLanes(svg: string): string {
  const parts = svg.split(/<!-- lane \d+ -->/)
  if (parts.length < 2) return svg
  const head = parts[0]
  const lanes = parts.slice(1)
  const last = lanes[lanes.length - 1]
  // The strip under the lanes (what the contract does not stop) follows the last lane; keep it outside the groups.
  const stripAt = last.search(/<rect x="40" y="488"/)
  let tail = ""
  if (stripAt > -1) {
    tail = last.slice(stripAt)
    lanes[lanes.length - 1] = last.slice(0, stripAt)
  } else {
    const end = last.lastIndexOf("</svg>")
    tail = last.slice(end)
    lanes[lanes.length - 1] = last.slice(0, end)
  }
  return head + lanes.map((l) => `<g class="kit-lane" tabindex="0">${l}</g>`).join("") + tail
}

type Props = {
  svg: string
  /** Minimum drawing width in px; below it the plate scrolls horizontally instead of shrinking the labels. */
  minWidth?: number
  lanes?: boolean
  className?: string
}

export function KitFigure({ svg, minWidth, lanes, className = "" }: Props) {
  let html = svg.replace(KIT_FONT, "Host Grotesk, sans-serif")
  if (lanes) html = groupLanes(html)
  return (
    <div className={`${styles.plate} ${className}`}>
      <div
        className={`${styles.drawing} ${lanes ? styles.lanes : ""}`}
        style={minWidth ? { minWidth } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
