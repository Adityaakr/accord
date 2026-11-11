/* Route and CTA map (copy brief ACCORD_WEBSITE_CONTENT.md §F1). Unconfigured external links are empty strings:
   render them only when set (`LINKS.repo && <a …>`); never show a placeholder URL.
   .env: VITE_APP_URL, VITE_REPO_URL, VITE_DEMO_VIDEO_URL, VITE_CONTRACT_ID, VITE_X_POST_URL */
const env = import.meta.env as Record<string, string | undefined>
/* The app is served at <site>/app (the website proxies it; platform/DEPLOY.md). VITE_APP_URL overrides it. */
const app = env.VITE_APP_URL || "/app" // empty (an unset Docker build arg) means the default

/** Primary CTA: always the app (<site>/app/signin). The guided testnet path is LINKS.tryDeal. */
export const PRIMARY_CTA = "Open the app"
/* Three ways to see Accord work, each with one name used on the site and in the README:
   "Run your own deal" (/app/try-it), "Live attack room" (/app/try) and "Watch the replay" (/app/replay). The site's own /try
   page lists the refused attacks and links to all three. */
export const TRY_CTA = "Try a live deal"
export const ATTACK_ROOM = "Live attack room"
export const REPLAY = "Watch the replay"

export const LINKS = {
  /* app routes */
  openDealRoom: `${app}/signin`,
  newDealRoom: `${app}/agreements/new`,
  appVerify: (id: string) => (app ? `${app}/verify/${id}` : `/verify#${id}`),
  testnet: "/#testnet",
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
  /* /demo is retired (it redirects to /#testnet); `demo` stays only until the hero CTA rework drops it */
  demo: "/#testnet",
  tryDeal: `${app}/try-it`,
  replay: `${app}/replay`,
  attackRoom: `${app}/try`,
  /* payment controls (the home page's #payment-controls; the app's /controls holds the same six cards) */
  paymentControls: "/#payment-controls",
  appControls: `${app}/controls`,
  checkPayment: `${app}/check`,
  refusalAlerts: `${app}/settings?tab=alerts`,
  financeExports: `${app}/record?scope=org`,
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
  /* the public repository; VITE_REPO_URL overrides it (an unset Docker build arg is empty, so || keeps the default) */
  repo: env.VITE_REPO_URL || "https://github.com/Adityaakr/accord",
  demoVideo: env.VITE_DEMO_VIDEO_URL ?? "",
  xPost: env.VITE_X_POST_URL ?? "",
  contractId: env.VITE_CONTRACT_ID ?? "",
  outlayerVerifyGuide: "https://app.outlayer.ai/docs/trust-verification",
}

/** True when a value is unset or still a `<placeholder>` */
export const isPlaceholder = (v: string) => !v || (v.startsWith("<") && v.endsWith(">"))
