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
  /* Why it matters (Home · Market-making agreements in Accord). Rows 45–48 continue past the archived 44-row bibliography; re-opened 31 Oct 2026. */
  { n: 45, source: "Kain Warwick, Synthetix founder, on X, via Bitcoinist (paraphrase)", date: "26 Mar 2025", links: ["https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/", "https://x.com/kaiynne/status/1904775834826912170"] },
  { n: 46, source: "Jelle Buth, co-founder of market maker Enflux, in Cointelegraph Magazine, Market maker deals are quietly killing crypto projects (paraphrase)", date: "16 Apr 2025", links: ["https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects"] },
  { n: 47, source: "LO:TECH market-making survey, via The Block (sponsored; LO:TECH is a market maker)", date: "19 Aug 2025", links: ["https://www.theblock.co/post/367243/global-survey-reveals-deep-mistrust-in-crypto-market-making-urgent-call-for-transparency"] },
  { n: 48, source: "Binance market-maker guidance, via Yahoo Finance (paraphrase)", date: "26 Mar 2026", links: ["https://finance.yahoo.com/markets/crypto/articles/binance-requests-market-maker-transparency-191855624.html"] },
]

/* Cited in Under the hood without a number */
export const UNNUMBERED = [
  { label: "NEAR AI Cloud private inference", href: "https://docs.near.ai/cloud/private-inference" },
  { label: "OutLayer getting started", href: "https://app.outlayer.ai/docs/getting-started" },
  { label: "NEAR Intents confidential execution", href: "https://intents.near.org/confidential" },
  { label: "The Accord Project", href: "https://accordproject.org/" },
]
