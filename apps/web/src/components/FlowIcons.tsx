/* Line icons for the Accord Atlas period flow (spec §1.8: 1.5px stroke, currentColor, used only where they carry meaning).
   They replace the template's compliance-seal images, which implied certifications Accord does not hold. */
const base = { width: 40, height: 40, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }

/** Approved conditions: a document with a check */
export const IconTerms = () => (
  <svg {...base}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 14 2 2 4-4" /></svg>
)
/** Observation slot: a clock face (the agreed schedule) */
export const IconSlot = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
/** Attestation: a seal with a check, drawn as a rosette */
export const IconAttest = () => (
  <svg {...base}><path d="M12 3 14.2 5l3-.4.5 3 2.6 1.6-1.3 2.8 1.3 2.8-2.6 1.6-.5 3-3-.4L12 21l-2.2-2-3 .4-.5-3L3.7 14.8 5 12 3.7 9.2 6.3 7.6l.5-3 3 .4z" /><path d="m9 12 2 2 4-4" /></svg>
)
/** Period decision: a fork (pays, or is withheld for people to decide) */
export const IconDecision = () => (
  <svg {...base}><path d="M12 21v-7" /><path d="M12 14 6 8V3" /><path d="m12 14 6-6V3" /><path d="m4 5 2-2 2 2" /><path d="m16 5 2-2 2 2" /></svg>
)
/** Payment on NEAR: a transfer arrow */
export const IconTransfer = () => (
  <svg {...base}><path d="M4 8h14" /><path d="m14 4 4 4-4 4" /><path d="M20 16H6" /><path d="m10 12-4 4 4 4" /></svg>
)
