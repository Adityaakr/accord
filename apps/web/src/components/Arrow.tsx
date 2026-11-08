/* The one arrow for links: a 12px stroke icon in currentColor, centred on the text's cap height, hidden from
   accessible names. On hover of its link or button it nudges 2px in its direction (global.css `.arrow-icon`). */

export type ArrowDir = "up-right" | "right" | "down"

const PATHS: Record<ArrowDir, string> = {
  "up-right": "M3.5 8.5 8.5 3.5M4.5 3.5h4v4",
  right: "M2 6h8M6.5 2.5 10 6l-3.5 3.5",
  down: "M6 2v8M2.5 6.5 6 10l3.5-3.5",
}

export function Arrow({ dir = "right", className }: { dir?: ArrowDir; className?: string }) {
  return (
    <svg
      className={`arrow-icon arrow-${dir}${className ? ` ${className}` : ""}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[dir]} />
    </svg>
  )
}
