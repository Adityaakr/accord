/* The docs site's content model (/docs/*). Pages are data; pages/docs/* renders them in the timeline language.

   Inline text (every `text`, `body`, `see`, `detail`, `claim`, `limit` string) supports two marks only:
     `code`            → mono
     [label](href)     → a link; "/..." is a site route, "http..." opens in a new tab
   Nothing else is parsed. No em-dashes, sentence case. */

/** Screenshots shipped under public/docs/<id>.webp (dark). Captured from the running app on NEAR testnet. */
export type ImageId =
  | "tryit-signed-out"   // /app/try-it before sign-in: the guided steps and the sign-in options
  | "tryit-signed-in"    // /app/try-it signed in: steps with test funds, room creation
  | "room"               // a deal room: header with state, terms, recipient, activity
  | "room-demo-panel"    // the room's Demo counterparty panel (vendor side automated)
  | "agent-paid"         // the demo agent panel after paying the due item inside the terms
  | "agent-refused"      // the demo agent panel after a redirected payment: ERR_PAYEE_MISMATCH
  | "verify"             // the site's /verify page checking a6.accord-v2.testnet
  | "record"             // the site's /record page for a6

export type DocImage = { id: ImageId; alt: string; caption?: string }

export type DocRow = {
  /** left column, short (a name, a command, a state) */
  name: string
  /** right column, mono, short (a value, an id, a code) */
  value?: string
  /** a link for the value (explorer page, tx, docs page) */
  href?: string
  /** one or two sentences under the name */
  detail?: string
  /** colour: teal for a pass, red only for a refusal or a revocation */
  tone?: "ok" | "refused"
}

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "rows"; label?: string; rows: DocRow[] }
  | { kind: "steps"; label?: string; steps: { title: string; body?: string; see?: string; image?: DocImage }[] }
  | { kind: "code"; label?: string; code: string; caption?: string }
  | { kind: "image"; image: DocImage }
  | { kind: "note"; text: string }
  /** two narrow screenshots side by side, one figure */
  | { kind: "pair"; images: [DocImage, DocImage]; caption?: string }
  /** a drawn figure from the site: the home hero's product view, or the contract's gates */
  | { kind: "figure"; figure: "hero" | "gates"; caption: string }
  /** a guarantee with its limit beside it (GOAL.md "Claims and their limits", verbatim) */
  | { kind: "claims"; rows: { claim: string; limit: string }[] }

export type DocSection = { id: string; title: string; blocks: DocBlock[] }

export type DocPage = {
  /** route: /docs/<slug> */
  slug: string
  /** sidebar group */
  group: "Get started" | "Concepts" | "Build on NEAR" | "Trust"
  title: string
  /** one sentence: the page's lead and its sidebar/overview description */
  summary: string
  sections: DocSection[]
}
