/* The numbered references every footnote marker resolves to (brief §9, all opened 29 Oct 2026).
   Do not add numbers to the site without a row here; do not leave a row unreferenced. */
export type Reference = { n: number; source: string; date: string; links: string[] }

/* Trimmed 30 Oct 2026 to the rows the site links to (the "In their words" source links); the full 44-row
   bibliography is kept in content/archive-pre-v6.6/references-full.ts. */
export const REFERENCES: Reference[] = [
  { n: 8, source: "Illia Polosukhin, NEAR AI announcement, PR Newswire (verbatim quote)", date: "14 May 2026", links: ["https://tools.prnewswire.com/en-us/live/20813/release/20260514EN59736"] },
  { n: 10, source: "Illia Polosukhin on The Chopping Block (paraphrase)", date: "26 Feb 2026", links: ["https://rosetta.to/u/unchainedcrypto/the-ai-agent-revolution-crypto-isn-t-talking-about-the-chopping-block"] },
  { n: 12, source: "Eddy Lazzarin, a16z crypto, via TechFlow (paraphrase)", date: "28 Apr 2026", links: ["https://www.techflowpost.com/en-US/article/31368"] },
  { n: 13, source: "Haseeb Qureshi at TOKEN2049, via RootData (paraphrase)", date: "7 Oct 2026", links: ["https://www.rootdata.com/news/781111"] },
  { n: 35, source: "Simon Willison, The lethal trifecta for AI agents", date: "16 Jun 2025", links: ["https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/"] },
  { n: 38, source: "Visa, Find and Buy with AI: Visa Intelligent Commerce (Jack Forestell, verbatim quote)", date: "30 Apr 2025", links: ["https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html"] },
]

/* Cited in Under the hood without a number */
export const UNNUMBERED = [
  { label: "NEAR AI Cloud private inference", href: "https://docs.near.ai/cloud/private-inference" },
  { label: "OutLayer getting started", href: "https://app.outlayer.ai/docs/getting-started" },
  { label: "NEAR Intents confidential execution", href: "https://intents.near.org/confidential" },
  { label: "The Accord Project", href: "https://accordproject.org/" },
]
