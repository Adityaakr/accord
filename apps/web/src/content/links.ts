/* Route and CTA map (docs/website/ACCORD_WEBSITE_CONTENT.md §F1). Unconfigured external links are empty strings:
   render them only when set (`LINKS.repo && <a …>`); never show a placeholder URL.
   .env: VITE_APP_URL, VITE_REPO_URL, VITE_DEMO_VIDEO_URL, VITE_CONTRACT_ID, VITE_X_POST_URL */
const env = import.meta.env as Record<string, string | undefined>
const app = env.VITE_APP_URL ?? ""

/** Primary CTA: the app route once it is live; until then (pre-launch) an early-access request on /join. */
export const PRIMARY_CTA = app ? "Open a deal room" : "Request early access"

export const LINKS = {
  /* app routes (fall back to the demo page while the app is unavailable) */
  openDealRoom: app ? `${app}/agreements/new` : "/join",
  useCases: "/#use-cases",
  exampleAgreement: "/#market-making",
  marketMaking: "/use-cases/market-making",
  verifyDomain: app ? `${app}/payee` : "/product/payee",
  verify: "/verify",
  join: "/join",
  tryInbox: "/try",
  recipientProfile: app ? `${app}/payee` : "/product/payee",
  app,
  /* site routes */
  demo: "/demo",
  securityDemo: "/demo#security",
  record: "/record",
  product: "/product",
  sealedTable: "/product/sealed-table",
  agreementControls: "/product#premise",
  payee: "/product/payee",
  security: "/security",
  docs: "/docs",
  research: "/research",
  contact: "/contact",
  privacy: "/privacy-policy",
  /* external, optional */
  repo: env.VITE_REPO_URL ?? "",
  demoVideo: env.VITE_DEMO_VIDEO_URL ?? "",
  xPost: env.VITE_X_POST_URL ?? "",
  contractId: env.VITE_CONTRACT_ID ?? "",
  outlayerVerifyGuide: "https://app.outlayer.ai/docs/trust-verification",
}

/** True when a value is unset or still a `<placeholder>` */
export const isPlaceholder = (v: string) => !v || (v.startsWith("<") && v.endsWith(">"))
