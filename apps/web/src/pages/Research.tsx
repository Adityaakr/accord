import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear, DEFAULT_APPEAR, type AppearEffect } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { ResearchStack } from "../components/ResearchStack"
import styles from "./Research.module.css"

/* ------------------------------------------------------------------
   Research page (/research): docs/website/ACCORD_RESEARCH_PAGE.md Part A, set verbatim (REFILL-V3 row
   `pages/Research.tsx`). Part B of that file is editorial and is not rendered.
   Shell: the template's page hero (PageHero = the 404 page Main) with the header H1 and its paragraph as
   the lead, then one section of sub-sections, each an H3 (`.t-h3`). The six question sub-sections carry
   one card per source in the Testimonial card geometry (Elevation Strong, padding 32, gap 16, radius 4,
   hairline divider): the bold lead-in as the card title, the attribution sentence as the who-line with the
   URL(s) as inline links, then only the labelled blocks the copy gives for that source ("What it
   establishes" / "What it does not establish" / "Design decision it informs"). Where the copy gives blocks
   for a pair of sources (the two Kraken pages) they sit in one card spanning the pair's row.
   "Related approaches, and where each stops" and "Limits of this page" are their own sub-sections of prose.
   No portraits, no logos, no footnote markers.
------------------------------------------------------------------- */

type Block = { label: string; text: ReactNode }

type Source = {
  id: string
  title: string
  /** The attribution/metadata sentence(s), without the URL (a node when the copy sets its URLs inside the sentence) */
  who: ReactNode
  /** One URL, or several printed in order with " · " between them; omitted when `who` carries the links */
  url?: string | string[]
  blocks: Block[]
}

type Question = {
  id: string
  /** Short floor label for the isometric stack */
  short: string
  question: string
  sources: Source[]
  /** Blocks the copy gives for the group of sources rather than for one of them */
  pair?: Block[]
}

const ESTABLISHES = "What it establishes"
const NOT_ESTABLISHES = "What it does not establish"
const INFORMS = "Design decision it informs"

const QUESTIONS: Question[] = [
  {
    id: "attack-trends",
    short: "Attacks",
    question: "How often do these attacks happen, and are they growing?",
    sources: [
      {
        id: "ic3-2025",
        title: "Internet Crime Report 2025.",
        who: "FBI Internet Crime Complaint Center, published April 2026. Annual statistics from complaints filed with the FBI.",
        url: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf",
        blocks: [
          {
            label: ESTABLISHES,
            text: "1,008,597 complaints and $20.877 billion in reported losses in 2025, 26 percent more than in 2024. Business email compromise accounted for 24,768 complaints and $3,046,598,558 in losses. 22,364 complaints referenced artificial intelligence, with $893,346,472 in losses, and the report notes that \"AI-enabled synthetic content is becoming increasingly difficult to detect and easier to make\".",
          },
          {
            label: NOT_ESTABLISHES,
            text: "losses that were never reported, or anything about agents that pay under agreed terms. The largest category in the total is investment fraud; the category closest to Accord's case is business email compromise, which the homepage shows separately.",
          },
          {
            label: INFORMS,
            text: "in Accord a payment destination never comes from a message, and a payment request that does not match the approved terms is refused.",
          },
        ],
      },
      {
        id: "ic3-2023",
        title: "Internet Crime Report 2023.",
        who: "FBI Internet Crime Complaint Center, published March 2024.",
        url: "https://ic3.gov/annualreport/reports/2023_ic3report.pdf",
        blocks: [
          {
            label: ESTABLISHES,
            text: "reported losses of $6.9 billion in 2021, $10.3 billion in 2022 and $12.5 billion in 2023. With the 2025 report's $16.6 billion for 2024 and $20.877 billion for 2025, these are the five values in the homepage chart.",
          },
          { label: NOT_ESTABLISHES, text: "whether the growth reflects more crime, more reporting, or both." },
          { label: INFORMS, text: "none on its own; it dates the trend shown on the homepage." },
        ],
      },
      {
        id: "afp-2026",
        title: "2026 AFP Payments Fraud and Control Survey.",
        who: "Association for Financial Professionals, press release, 14 April 2026. Survey of 465 treasury practitioners at US organisations, conducted January 2026, reporting 2025.",
        url: "https://www.financialprofessionals.org/about/learn-more/press-releases/Details/over-75-percent-of-us-firms-experienced-payments-fraud-in-2025-while-ai-adoption-for-fraud-mitigation-lags/",
        blocks: [
          { label: ESTABLISHES, text: "74% of organisations were affected by business email compromise in 2025, and 76% of US organisations experienced attempted or actual payments fraud." },
          { label: NOT_ESTABLISHES, text: "how much was lost, or anything about payments made by agents. It is a survey of practitioners, not a count of incidents." },
          { label: INFORMS, text: "a message can never change where an Accord payment goes; the recipient is fixed when both companies approve the terms." },
        ],
      },
      {
        id: "chainalysis-2025",
        title: "Crypto theft in 2025.",
        who: "Chainalysis, blog post, 18 December 2025, ahead of its 2026 Crypto Crime Report.",
        url: "https://www.chainalysis.com/blog/crypto-hacking-stolen-funds-2026/",
        blocks: [
          { label: ESTABLISHES, text: "over $3.4 billion was stolen in crypto from January through early December 2025, with the February compromise of Bybit alone accounting for $1.5 billion." },
          { label: NOT_ESTABLISHES, text: "that agents were involved; most of the value came from a few large service compromises." },
          { label: INFORMS, text: "agreement funds sit in each agreement's own account with no full-access key, and only the contract can send them." },
        ],
      },
      {
        id: "deloitte-genai-fraud",
        title: "Generative AI is expected to magnify the risk of deepfakes and other fraud in banking.",
        who: "Deloitte Center for Financial Services, 29 May 2024. A forecast built from the FBI's fraud categories under conservative, base and aggressive adoption scenarios.",
        url: "https://www.deloitte.com/us/en/insights/industry/financial-services/deepfake-banking-fraud-risk-on-the-rise.html",
        blocks: [
          { label: ESTABLISHES, text: "Deloitte predicts generative AI could enable fraud losses of $40 billion in the United States by 2027, from $12.3 billion in 2023, a compound annual growth rate of 32%." },
          { label: NOT_ESTABLISHES, text: "a measured loss. It is the forecast of one firm, and its conservative scenario is lower." },
          { label: INFORMS, text: "Accord does not try to detect convincing fakes; a payment that does not match the approved terms is refused however convincing the request." },
        ],
      },
      {
        id: "grok-bankr-incident",
        title: "The Grok and Bankr incident, as reported.",
        /* The copy sets each URL inside the sentence, after its own outlet. */
        who: (
          <>
            Cointelegraph Magazine, Dilip Kumar Patairya, 13 May 2026,{" "}
            <SourceLink url="https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection" />; Giskard, 7 May 2026,{" "}
            <SourceLink url="https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet" />. Secondary
            reporting of a public incident.
          </>
        ),
        blocks: [
          {
            label: ESTABLISHES,
            text: "in May 2026 an attacker replied to Grok on X with a message in Morse code. Grok translated it; the translation was an instruction to send 3 billion DRB tokens to the attacker's address, and Bankr's bot executed it from a Grok-linked wallet, on Base according to Cointelegraph. Reported values run from $150,000 to $174,000, and Giskard reports that about 80 percent was later returned. Both accounts say that an NFT sent to the wallet beforehand had widened what the bot was allowed to do.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "anything about Accord. Bankr is a general-purpose wallet bot, not a system for paying under agreed terms, and nothing here suggests that Accord would have prevented the incident.",
          },
          {
            label: INFORMS,
            text: "in Accord the output of a model is never a payment instruction; only a request that matches the approved terms and the authorised recipient is signed.",
          },
        ],
      },
    ],
  },
  {
    id: "confidential-mandates",
    short: "Confidential mandates",
    question: "Why keep negotiating mandates confidential?",
    sources: [
      {
        id: "ndai",
        title: "NDAI Agreements.",
        who: "Matthew Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem and Rohan Parikh. arXiv 2502.07924, submitted 11 February 2025. Theoretical paper with a bargaining model.",
        url: "https://arxiv.org/abs/2502.07924",
        blocks: [
          {
            label: ESTABLISHES,
            text: "in a model where a seller must reveal an information good to be paid and risks having it taken, delegating disclosure and payment to tamper-proof programs (AI agents in trusted execution environments) lets the seller reveal safely; the authors describe such solutions as an \"ironclad NDA\". Because real agents err, the model adds budget caps and acceptance thresholds and finds they preserve most of the gains.",
          },
          {
            label: NOT_ESTABLISHES,
            /* One word of the owner's sentence is on the copy rules' forbidden list; "protect" stands in for it. */
            text: "that arbitrary commercial negotiations become fair, optimal or fully private; the results are for a modelled hold-up problem, with full guarantees only within what the enclave can protect.",
          },
          {
            label: INFORMS,
            text: "the Sealed Table runs the negotiation inside an attested enclave, hard limits from both mandates are checked by code, and both companies approve before anything binds.",
          },
        ],
      },
      {
        id: "near-ai-private-usdc",
        title: "NEAR AI Brings Private USDC Stablecoin Payments to the Agentic Economy.",
        who: "NEAR AI press release, 14 May 2026. Commercial announcement by the host of the hackathon Accord is built for.",
        url: "https://www.prnewswire.co.uk/news-releases/near-ai-brings-private-usdc-stablecoin-payments-to-the-agentic-economy-302772315.html",
        blocks: [
          {
            label: ESTABLISHES,
            text: "the announcement quotes NEAR's co-founder, Illia Polosukhin: \"Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger.\" It argues for confidential stablecoin settlement as a baseline for business agents.",
          },
          {
            label: NOT_ESTABLISHES,
            text:
              "that Accord provides confidential settlement. Accord keeps the negotiation and both mandates confidential; the payment schedule and the USDC transfers are public on NEAR. The statement is cited as motivation for the broader problem, and the part Accord addresses today is the negotiation, not the settlement. Nothing here implies that NEAR or its co-founder has reviewed or endorsed Accord.",
          },
          {
            label: INFORMS,
            text: "the Sealed Table's confidentiality, and the honesty of the privacy boundary stated on the Security page.",
          },
        ],
      },
      {
        id: "myerson-satterthwaite",
        title: "Efficient Mechanisms for Bilateral Trading.",
        who: "Roger Myerson and Mark Satterthwaite. Journal of Economic Theory 29(2), 1983. Theoretical result.",
        url: "https://doi.org/10.1016/0022-0531(83)90048-0",
        blocks: [
          {
            label: ESTABLISHES,
            text: "when a buyer and a seller each hold private information about value, no trading mechanism is at once efficient, incentive-compatible, individually rational and budget-balanced.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "that any particular mechanism, including a sealed negotiation, produces fair or efficient outcomes.",
          },
          {
            label: INFORMS,
            text: "Accord presents the Sealed Table as a mechanism both sides commit to in advance, and makes no claim about efficiency or fairness of the resulting terms.",
          },
        ],
      },
      {
        id: "chatterjee-samuelson",
        title: "Bargaining under Incomplete Information.",
        who: "Kalyan Chatterjee and William Samuelson. Operations Research 31(5), 1983. Theoretical model of the sealed-bid double auction.",
        url: "https://doi.org/10.1287/opre.31.5.835",
        blocks: [
          {
            label: ESTABLISHES,
            text: "the properties of a mechanism in which both parties submit sealed bids and trade occurs at a price between them, under private information.",
          },
          { label: INFORMS, text: "the lineage of the Sealed Table." },
        ],
      },
      {
        id: "negotiationarena",
        title: "How Well Can LLMs Negotiate? NegotiationArena Platform and Analysis.",
        who: "Federico Bianchi, Patrick John Chia, Mert Yuksekgonul, Jacopo Tagliabue, Dan Jurafsky and James Zou. arXiv 2402.05863, 8 February 2024; presented at ICML 2024. Experimental benchmark.",
        url: "https://arxiv.org/abs/2402.05863",
        blocks: [
          {
            label: ESTABLISHES,
            text: "in benchmark negotiations between language-model agents, behavioural tactics change outcomes; agents that pretended to be desperate improved their payoffs by about 20 percent against a standard GPT-4 counterpart, and the agents showed measurable irrational behaviours.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "savings or outcomes for real commercial negotiations; the setting is a benchmark with modelled scenarios.",
          },
          {
            label: INFORMS,
            text: "deterministic code checks every proposal against both mandates' hard limits before it leaves the enclave, a pair of mandates is negotiated once, and people approve the terms.",
          },
        ],
      },
    ],
  },
  {
    id: "agent-authority",
    short: "Agent authority",
    question: "How does an agent demonstrate its authority?",
    sources: [
      {
        id: "a16z-frontier",
        title: "The missing infrastructure for AI agents: 5 ways blockchains can help.",
        who: "Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville. a16z Frontier, 16 April 2026. Expert essay.",
        url: "https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/",
        blocks: [
          {
            label: ESTABLISHES,
            text: "the authors' argument that agents acting as economic actors need portable identity tied to a principal and its permissions, transparent execution logs so \"people can check whether their delegate stayed within bounds\", and scoped delegation tools that \"let users define, at the smart contract level, what an agent can and cannot do\".",
          },
          { label: NOT_ESTABLISHES, text: "a standard, a measurement, or any view of Accord." },
          {
            label: INFORMS,
            text: "the buyer's agent holds a function-call key restricted to one method on one contract; the approved terms are its whole authority; every refusal is a public event.",
          },
        ],
      },
      {
        id: "ap2",
        title: "Announcing the Agent Payments Protocol (AP2).",
        who: "Google Cloud, 16 September 2025. Commercial announcement of an open protocol.",
        url: "https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol",
        blocks: [
          {
            label: ESTABLISHES,
            text: "AP2 defines signed mandates (an intent mandate capturing the user's instructions, a cart mandate recording the approved items and price) as verifiable credentials, so that a payment carries evidence of the user's authorisation, with more than 60 collaborating organisations.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "a negotiation protocol between two parties' agents, on-chain enforcement, or any statement about keeping a buyer's limits from the merchant (the announcement does not address it).",
          },
          {
            label: INFORMS,
            text: "Accord's approved terms are an authorisation record both companies sign; they could be expressed in a mandate format such as AP2's. AP2 is prior art for the receipt; Accord's contribution is how the terms are reached and how they are enforced on the funds.",
          },
        ],
      },
      {
        id: "near-access-keys",
        title: "Access keys.",
        who: "NEAR Protocol documentation. Technical documentation.",
        url: "https://docs.near.org/protocol/access-keys",
        blocks: [
          {
            label: ESTABLISHES,
            text: "NEAR accounts can hold function-call access keys restricted to named methods on a named contract, with an allowance that covers gas only.",
          },
          {
            label: INFORMS,
            text: (
              <>
                the agent's key can call <code className="mono">act</code> on the agreement contract and nothing else, and can be deleted in one transaction.
              </>
            ),
          },
        ],
      },
    ],
  },
  {
    id: "malicious-instructions",
    short: "Malicious instructions",
    question: "What should constrain an agent that follows malicious instructions?",
    sources: [
      {
        id: "lethal-trifecta",
        title: "The lethal trifecta for AI agents.",
        who: "Simon Willison, 16 June 2025. Practitioner essay.",
        url: "https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/",
        blocks: [
          {
            label: ESTABLISHES,
            text: "an agent that combines access to private data, exposure to untrusted content and the ability to communicate externally can be tricked by an attacker into sending that data to the attacker.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "anything about payments. Applying the reasoning to unauthorised payments (the ability to pay replaces the ability to exfiltrate) is Accord's design interpretation.",
          },
          {
            label: INFORMS,
            text: "the demonstration agent is assumed to be compromised by whatever arrives in its inbox; the contract, not the agent, decides what can be paid.",
          },
        ],
      },
      {
        id: "owasp-llm01",
        title: "LLM01:2025 Prompt Injection.",
        who: "OWASP Top 10 for LLM Applications, 2025. Security guidance from a standards body.",
        url: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
        blocks: [
          {
            label: ESTABLISHES,
            text: "prompt injection is the first-ranked risk; \"indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files\"; recommended mitigations include constraining model behaviour, enforcing privilege control and requiring human approval for high-risk actions.",
          },
          { label: NOT_ESTABLISHES, text: "that any system eliminates prompt injection." },
          {
            label: INFORMS,
            text: "the agent's privileges are bounded by the contract (one key, one method, approved terms, authorised recipient), exceptions require human approval, and Accord does not claim to prevent injection, only to bound what it can cause.",
          },
        ],
      },
      {
        id: "anthropic-chrome",
        title: "Piloting Claude in Chrome.",
        who: "Anthropic, 25 August 2025 (updated November and December 2025). The model maker's own red-teaming of a browser agent, run in autonomous mode.",
        url: "https://claude.com/blog/claude-for-chrome",
        blocks: [
          { label: ESTABLISHES, text: "across 123 prompt-injection test cases representing 29 attack scenarios, deliberate attacks succeeded 23.6% of the time without safety mitigations and 11.2% of the time with them." },
          { label: NOT_ESTABLISHES, text: "the rate for any other model, product or later version; Anthropic reports further improvements after this test." },
          { label: INFORMS, text: "Accord does not rely on the model resisting every injection; the contract checks each payment whatever the agent was told." },
        ],
      },
      {
        id: "ncsc-prompt-injection",
        title: "Prompt injection is not SQL injection (it may be worse).",
        who: "UK National Cyber Security Centre, blog post, 8 December 2025, with the NCSC announcement \"Mistaking AI vulnerability could lead to large-scale breaches\", 10 December 2025. Guidance from a national cyber security authority.",
        url: [
          "https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection",
          "https://www.ncsc.gov.uk/news/mistaking-ai-vulnerability-could-lead-to-large-scale-breaches",
        ],
        blocks: [
          {
            label: ESTABLISHES,
            text: "current language models \"simply do not enforce a security boundary between instructions and data inside a prompt\"; prompt injection \"may never be totally mitigated in the way SQL injection attacks can be\"; design protections should \"focus more on deterministic (non-LLM) safeguards that constrain the actions\" of the system.",
          },
          { label: NOT_ESTABLISHES, text: "anything about payments or about Accord; the guidance is general." },
          {
            label: INFORMS,
            text: "Accord assumes the agent will be steered by what it reads and puts every payment decision in deterministic code: the contract's checks on each payment, and the Sealed Table's limit check on each proposal.",
          },
        ],
      },
      {
        id: "owasp-agentic-2026",
        title: "OWASP Top 10 for Agentic Applications for 2026.",
        who: "OWASP GenAI Security Project, 9 December 2025. Security framework, described by OWASP as globally peer-reviewed.",
        url: "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
        blocks: [
          {
            label: ESTABLISHES,
            text: "ten risks specific to agents, among them agent goal hijack (ASI01), tool misuse and exploitation (ASI02), identity and privilege abuse (ASI03) and insecure inter-agent communication (ASI07).",
          },
          {
            label: NOT_ESTABLISHES,
            text: "that any product addresses these risks. The tags in the homepage figure \"Where each attack stops\" are Accord's own mapping of each attack to the closest entry, not OWASP's.",
          },
          {
            label: INFORMS,
            text: "least privilege for the agent's key, a check on every payment, and a limit check on every proposal exchanged between agents.",
          },
        ],
      },
    ],
  },
  {
    id: "payment-destinations",
    short: "Payment destinations",
    question: "How should payment destinations be established and changed?",
    sources: [
      {
        id: "ic3-bec",
        title: "Business Email Compromise.",
        who: "FBI Internet Crime Complaint Center, crime information page. Law-enforcement guidance.",
        url: "https://www.ic3.gov/CrimeInfo/BEC",
        blocks: [
          {
            label: ESTABLISHES,
            text: "business email compromise is \"a sophisticated scam targeting both businesses and individuals performing a transfer of funds\", typically through a compromised or spoofed business email account; the FBI advises confirming requests to change account information with the intended recipient through a secondary channel.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "figures on this page; the IC3 annual reports carry the statistics.",
          },
          {
            label: INFORMS,
            text: "in Accord a payment destination is never taken from a message. The recipient proves control of its domain, the recipient's own settlement authority approves the destination, the buyer accepts it, and a change requires a fresh proof, the authority's approval and a 24-hour delay.",
          },
        ],
      },
      {
        id: "confirmation-of-payee",
        title: "Confirmation of Payee.",
        who: "Pay.UK. Live industry service, launched 2020.",
        url: "https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/",
        blocks: [
          {
            label: ESTABLISHES,
            text: "\"Confirmation of Payee (CoP) is an account name-checking service designed to help reduce misdirected payments\", run before a payment is initiated; more than 300 organisations have implemented it and more than two million checks are completed every day; the Payment Systems Regulator mandated its expansion in 2024.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "anything about stablecoins, agents or domain control. CoP matches an account name at a bank; Payee binds a destination to a domain the recipient controls and an approval by the recipient's authority. The purpose is shared; the mechanism is different.",
          },
          {
            label: INFORMS,
            text: "a recipient check is expected practice for human payments; Payee is the equivalent step for payments an agent requests.",
          },
        ],
      },
    ],
  },
  {
    id: "evidence-to-release",
    short: "Evidence to release",
    question: "What evidence is sufficient to release a payment?",
    sources: [
      {
        id: "kraken-book",
        title: "Kraken WebSocket API v2, book channel.",
        who: "Exchange documentation.",
        url: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book",
        blocks: [
          {
            label: ESTABLISHES,
            text: "a public order-book feed \"describes the individual price levels in the book with aggregated order quantities at each level\"; messages carry price and quantity only, with no account or order identifiers.",
          },
        ],
      },
      {
        id: "kraken-executions",
        title: "Kraken WebSocket API v2, executions channel.",
        who: "Exchange documentation.",
        url: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions",
        blocks: [
          {
            label: ESTABLISHES,
            text: "the executions channel \"streams order status and execution events for this account\" and \"contains account specific data, an authentication token is required\".",
          },
        ],
      },
      {
        id: "menkveld-wang",
        title: "How do designated market makers create value for small-caps?",
        who: "Albert J. Menkveld and Ting Wang. Journal of Financial Markets 16(3), 571 to 603, 2013. Empirical event study of 74 Euronext stocks.",
        url: "https://doi.org/10.1016/j.finmar.2012.12.003",
        blocks: [
          {
            label: ESTABLISHES,
            text: "contracts in which a designated market maker guarantees a minimum liquidity supply for a fixed annual fee raised liquidity, lowered liquidity risk and produced an average abnormal return of 3.5 percent; the market makers traded more and took losses on high-spread days, when the obligation was likely binding.",
          },
          {
            label: NOT_ESTABLISHES,
            text: "results for crypto venues or for agreements measured the way Accord's market-making agreements measure them.",
          },
          {
            label: INFORMS,
            text: "a liquidity agreement with a stated obligation is a known, valuable contract; a market-making agreement in Accord makes the obligation measurable each period and ties the retainer to the measurement.",
          },
        ],
      },
      {
        id: "bessembinder-hao-zheng",
        title: "Market Making Contracts, Firm Value, and the IPO Decision.",
        who: "Hendrik Bessembinder, Jia Hao and Kuncheng Zheng. Journal of Finance 70(5), 1997 to 2028, 2015. Theory with empirical discussion.",
        url: "https://doi.org/10.1111/jofi.12285",
        blocks: [
          {
            label: ESTABLISHES,
            text: "the authors argue that \"firm value and welfare are improved by a contract where the firm engages a designated market maker\", most of all when uncertainty about value and information asymmetry are high.",
          },
          { label: NOT_ESTABLISHES, text: "how such contracts should be monitored or enforced." },
          {
            label: INFORMS,
            text: "the party paying for liquidity has a documented reason to pay; Accord's contribution is to pay against measured conditions rather than a report.",
          },
        ],
      },
    ],
    pair: [
      {
        label: "What the pair does not establish",
        text: "any integration or relationship between Accord and Kraken. The two pages are cited to show a distinction that holds at any venue: public order-book data describes aggregate market conditions, while attributing orders and fills to a participant requires that participant's authenticated account data.",
      },
      {
        label: INFORMS,
        text: "The market-making agreement's observer reads public order-book data and therefore measures conditions, not contribution. The market-making page says so beside the claim. Account-attributed verification, using the market maker's authenticated feed inside the enclave, is planned and not implemented.",
      },
    ],
  },
]

/* "Related approaches, and where each stops": one paragraph per approach, the URL as its link. */
type Approach = { id: string; text: string; url?: string | string[] }

const RELATED_LEAD = "Described from their own public material, as prior art rather than as competitors."

const RELATED: Approach[] = [
  {
    id: "pactum",
    text: "One-sided negotiation services such as Pactum negotiate for one company at scale. The Harvard Business Review case on Walmart (Remko Van Hoek, Michael DeWitt, Mary Lacity and Travis Johnson, 8 November 2022) reports the system \"negotiating and closing agreements with 68% of suppliers approached\"; Harvard's Program on Negotiation, drawing on the same authors, reports that the earlier Canada pilot with 89 suppliers \"closed deals with 64% of the suppliers\" in \"an average of 11 days\" (Katie Shonk, 28 July 2026). They address the case where one company runs the agent; Accord addresses the case where both do.",
    url: [
      "https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations",
      "https://www.pon.harvard.edu/daily/negotiation-skills-daily/chatbot-negotiations-what-can-ai-do-for-you/",
    ],
  },
  {
    id: "outlayer",
    text: "Agent custody and policy wallets such as OutLayer's custody product offer address allowlists, per-transaction and daily limits, approval thresholds and an instant freeze, configured by the wallet's owner. These are payer-side controls. Payee adds the recipient's side of the destination, and the two can be combined.",
    url: "https://app.outlayer.ai/docs/agent-custody",
  },
  {
    id: "ap2-related",
    text: "Signed payment mandates (Google's AP2, above) standardise the authorisation record between a user, an agent and a merchant, and are complementary to the approval step in a deal room.",
  },
  {
    id: "dealproof",
    text: "Enclave-based negotiation prototypes, such as Dealproof from ETHGlobal New York, run agent negotiations inside a confidential virtual machine, with escrow release described as planned. Accord binds the enclave's output to on-chain commitments and to the authorised recipient.",
    url: "https://github.com/kkoci/Dealproof",
  },
  {
    id: "forgd",
    text: "Market-maker ratings, such as the Forgd leaderboard on DefiLlama, publish spread, depth and uptime scores from data firms share. They inform; they do not pay or withhold.",
    url: "https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama",
  },
]

const LIMITS =
  "Crime statistics count reported losses, not all losses. Theory is theory: the bargaining results describe models, not Accord's outcomes. Benchmarks are benchmarks: NegotiationArena does not predict a customer's savings. Equity-market studies are not crypto-market studies. Documentation shows what an interface provides, not that Accord integrates with it. The working product has to supply its own evidence, which is what the demonstration agreements and the refusal log are for."

const HERO_LEAD =
  "Accord's design responds to problems that researchers, standards bodies, payment networks and practitioners have documented. This page lists those sources by the question each one answers, states what each establishes and what it does not, and names the design decision it informs. Findings are the authors' own; the connection to Accord is ours. Nothing here implies that any author or organisation has reviewed or endorsed Accord."

/* Screenshots of each source as published (captured 30 Oct 2026, public/research/src). Sources with no capture (PDFs,
   pages behind a bot check) get a typeset cover instead. */
const SHOTS = new Set(["a16z-frontier","ap2","bessembinder-hao-zheng","chatterjee-samuelson","confirmation-of-payee","grok-bankr-incident","ic3-bec","kraken-book","kraken-executions","lethal-trifecta","menkveld-wang","myerson-satterthwaite","ncsc-prompt-injection","ndai","near-access-keys","near-ai-private-usdc","negotiationarena","owasp-llm01"])
const SHOT_URL: Record<string, string> = { "grok-bankr-incident": "https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection" }
const firstUrl = (u?: string | string[]) => (Array.isArray(u) ? u[0] : u) ?? ""
const host = (u: string) => u.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "")

function Shot({ s }: { s: Source }) {
  const url = firstUrl(s.url) || SHOT_URL[s.id] || ""
  return (
    <a className={styles.shot} href={url || undefined} target="_blank" rel="noopener noreferrer" aria-label={`${s.title} (opens the source)`}>
      <span className={styles.chrome}><span className={styles.dots}><i /><i /><i /></span><span className={styles.addr}>{url ? host(url) : "source"}</span></span>
      {SHOTS.has(s.id) ? (
        <img src={`/research/src/${s.id}.jpg`} alt="" loading="lazy" className={styles.shotImg} />
      ) : (
        <span className={styles.cover}><span className={styles.coverKind}>{url.endsWith(".pdf") ? "PDF" : "Document"}</span><span className={styles.coverTitle}>{s.title.replace(/\.$/, "")}</span></span>
      )}
    </a>
  )
}

/** The URL as the copy prints it, without the scheme */
const urlLabel = (url: string) => url.replace(/^https?:\/\//, "")

function SourceLink({ url }: { url: string }) {
  return (
    <a className="ls-link-inline" href={url} target="_blank" rel="noopener noreferrer">
      {urlLabel(url)}
    </a>
  )
}

/** One or more URLs, as the copy prints them: several are separated by " · " */
function SourceLinks({ url }: { url: string | string[] }) {
  const urls = Array.isArray(url) ? url : [url]
  return (
    <>
      {urls.map((u, i) => (
        <span key={u}>
          {i > 0 ? " · " : null}
          <SourceLink url={u} />
        </span>
      ))}
    </>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className={styles.blocks}>
      {blocks.map((b) => (
        <div key={b.label} className={styles.block}>
          <h4 className={`t-h6 ${styles.blockLabel}`}>{b.label}</h4>
          <p className={`t-body-sm ${styles.blockText}`}>{b.text}</p>
        </div>
      ))}
    </div>
  )
}

/* The template's appear (y 32, 1s, EASE_APPEAR); the trigger is relaxed because a source card is taller than half a phone viewport. */
const CARD_APPEAR: AppearEffect = { ...DEFAULT_APPEAR, threshold: 0.1 }

export function Research() {
  usePageMeta("Accord: Research", "The research behind the room, source by source.")
  return (
    <div className={styles.page}>
      <PageHero pill="Research" title="The research behind the room." lead={HERO_LEAD} />
      <section className={`section ${styles.stackSection}`} aria-label="The six questions, as the floors under the room">
        <ResearchStack floors={QUESTIONS.map((q) => ({ id: q.id, label: q.short, count: q.sources.length }))} />
      </section>

      <section id="questions" className={`section ${styles.main}`}>
        {QUESTIONS.map((q) => (
          <div key={q.id} id={q.id} className={styles.question}>
            <Appear className={styles.questionHeading} effect={appear("0s")}>
              <span className={styles.floorTag}>Floor {String(QUESTIONS.length - QUESTIONS.indexOf(q)).padStart(2, "0")} · {q.short}</span>
              <h2 className={`t-h3 ${styles.questionTitle}`}>{q.question}</h2>
            </Appear>

            <div className={styles.grid}>
              {q.sources.map((s, i) => (
                <Appear key={s.id} id={s.id} className={styles.card} effect={CARD_APPEAR} delay={0.08 * i}>
                  <Shot s={s} />
                  <div className={styles.cardBody}>
                    <h3 className={`t-h5 ${styles.title}`}>{s.title}</h3>
                    <p className={`t-body-sm ${styles.who}`}>
                      {s.who}
                      {s.url ? (<>{" "}{(Array.isArray(s.url) ? s.url : [s.url]).map((u, k) => <a key={u} className={`ls-link-inline ${styles.src}`} href={u} target="_blank" rel="noopener noreferrer">{k === 0 ? "Source" : `Source ${k + 1}`} ↗</a>)}</>) : null}
                    </p>
                    {s.blocks.length ? (
                      <div className={styles.lead}>
                        <span className={styles.leadLabel}>{s.blocks[0].label}</span>
                        <p className={`t-body-sm ${styles.blockText} ${s.blocks.length > 1 ? styles.clamp : ""}`}>{s.blocks[0].text}</p>
                      </div>
                    ) : null}
                    {s.blocks.length > 1 ? (
                      <details className={styles.more}>
                        <summary>More</summary>
                        <Blocks blocks={s.blocks.slice(1)} />
                      </details>
                    ) : null}
                  </div>
                </Appear>
              ))}
              {q.pair ? (
                <Appear id={`${q.id}-pair`} className={`${styles.card} ${styles.pair}`} effect={CARD_APPEAR} delay={0.1 * q.sources.length}>
                  <Blocks blocks={q.pair} />
                </Appear>
              ) : null}
            </div>
          </div>
        ))}

        <div id="related-approaches" className={styles.question}>
          <Appear className={styles.questionHeading} effect={appear("0s")}>
            <h2 className={`t-h3 ${styles.questionTitle}`}>Related approaches, and where each stops</h2>
            <p className={`t-body-lg ${styles.questionLead}`}>{RELATED_LEAD}</p>
          </Appear>
          <div className={styles.prose}>
            {RELATED.map((a, i) => (
              <Appear key={a.id} as="p" className={`t-body-lg ${styles.paragraph}`} effect={CARD_APPEAR} delay={0.1 * i}>
                {a.text}
                {a.url ? (
                  <>
                    {" "}
                    <SourceLinks url={a.url} />
                  </>
                ) : null}
              </Appear>
            ))}
          </div>
        </div>

        <div id="limits" className={styles.question}>
          <Appear className={styles.questionHeading} effect={appear("0s")}>
            <h2 className={`t-h3 ${styles.questionTitle}`}>Limits of this page</h2>
          </Appear>
          <div className={styles.prose}>
            <Appear as="p" className={`t-body-lg ${styles.paragraph}`} effect={CARD_APPEAR}>
              {LIMITS}
            </Appear>
          </div>
        </div>
      </section>
    </div>
  )
}
