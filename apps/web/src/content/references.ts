/* The numbered references every footnote marker resolves to (brief §9, all opened 29 Oct 2026).
   Do not add numbers to the site without a row here; do not leave a row unreferenced. */
export type Reference = { n: number; source: string; date: string; links: string[] }

/* Trimmed 30 Oct 2026 to the rows the site links to (the "In their words" source links; rows 36 and 39 restored from the archive on 10 Nov 2026); the full 44-row
   bibliography is kept in content/archive-pre-v6.6/references-full.ts. */
export const REFERENCES: Reference[] = [
  { n: 35, source: "Simon Willison, The lethal trifecta for AI agents (verbatim quote)", date: "16 Jun 2025", links: ["https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/"] },
  { n: 36, source: "Harvard Business Review, How Walmart Automated Supplier Negotiations (Van Hoek, DeWitt, Lacity, Johnson; verbatim quote)", date: "8 Nov 2022", links: ["https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations"] },
  { n: 38, source: "Visa, Find and Buy with AI: Visa Intelligent Commerce (Jack Forestell, verbatim quote)", date: "30 Apr 2025", links: ["https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html"] },
  { n: 39, source: "Mastercard, Mastercard Unveils Agent Pay (Jorn Lambert, verbatim quote)", date: "29 Apr 2025", links: ["https://www.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai/", "https://s25.q4cdn.com/479285134/files/doc_news/Mastercard-Unveils-Agent-Pay-Pioneering-Agentic-Payments-Technology-to-Power-Commerce-in-the-Age-of-AI-2025.pdf"] },
  /* Why it matters (Home · Market-making agreements in Accord). Rows 45–48 continue past the archived 44-row bibliography; re-opened 31 Oct 2026. */
  { n: 45, source: "Kain Warwick, Synthetix founder, on X, via Bitcoinist (paraphrase)", date: "26 Mar 2025", links: ["https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/", "https://x.com/kaiynne/status/1904775834826912170"] },
  { n: 46, source: "Jelle Buth, co-founder of market maker Enflux, in Cointelegraph Magazine, Market maker deals are quietly killing crypto projects (verbatim quote in In their words; paraphrased in Why it matters)", date: "16 Apr 2025", links: ["https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects"] },
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
