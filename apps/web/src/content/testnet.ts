/* What runs on NEAR testnet today, with the transaction behind each claim (8 Nov 2026). Agreement a6.accord-v2.testnet
   ran the full flow on release 3 of factory accord-v2.testnet: the Sealed Table negotiation used the real NEAR AI model
   inside OutLayer's attested enclave; settlement is a test USDC token (tusdc.accord-v1.testnet). */
export const tx = (h: string) => `https://testnet.nearblocks.io/txns/${h}`
export const acct = (a: string) => `https://testnet.nearblocks.io/address/${a}`

export const TESTNET = {
  factory: "accord-v2.testnet",
  factoryUrl: acct("accord-v2.testnet"),
  agreement: "a6.accord-v2.testnet",
  agreementUrl: acct("a6.accord-v2.testnet"),
  token: "tusdc.accord-v1.testnet",
  release: 3,
  releaseUrl: tx("7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh"),
  verify: { ok: ["contract code", "agent key", "sealed outcome", "recipient proof", "record"], partial: ["model attestation (nonce bound in the report; the hardware quote is not checked here)"], notChecked: ["release attestation (the outlayer-verify tool is not installed yet)"] },
}

export type Step = { n: string; title: string; detail: string; href: string; refused?: boolean; mono?: string }
export const FLOW: Step[] = [
  { n: "01", title: "Buyer seals its limits", detail: "Only a commitment and ciphertext go on chain", href: tx("Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk") },
  { n: "02", title: "Vendor seals its limits", detail: "The other side never sees the numbers", href: tx("2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ") },
  { n: "03", title: "Negotiated in the enclave", detail: "35.50 test USDC in 3 items, signed by the Sealed Table", href: tx("GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW"), mono: "35.50 USDC · 3 items" },
  { n: "04", title: "Buyer approves the terms", detail: "Approval recorded on the agreement", href: tx("H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg") },
  { n: "05", title: "Vendor approves the terms", detail: "The agreement starts executing", href: tx("2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT") },
  { n: "06", title: "Buyer funds the escrow", detail: "35.50 test USDC into the agreement's own account", href: tx("2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy"), mono: "35.50 USDC" },
  { n: "07", title: "Recipient proven in the enclave", detail: "Payee checks the vendor's domain", href: tx("6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6") },
  { n: "08", title: "Vendor's authority approves", detail: "A separate account signs off the recipient", href: tx("FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis") },
  { n: "09", title: "Buyer accepts the recipient", detail: "halcyon-mm.testnet is now the only destination", href: tx("3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p") },
  { n: "10", title: "Agent pays inside the terms", detail: "16.50 test USDC to halcyon-mm.testnet", href: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ"), mono: "16.50 USDC" },
  { n: "11", title: "A redirected payment is refused", detail: "ERR_PAYEE_MISMATCH, nothing sent", href: tx("AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"), refused: true, mono: "ERR_PAYEE_MISMATCH" },
  { n: "12", title: "Buyer revokes the agent", detail: "Its next call fails: AccessKeyDoesNotExist", href: tx("4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P"), refused: true, mono: "AccessKeyDoesNotExist" },
]

/* The twelve steps grouped into the four phases of a deal room */
export const PHASES: { label: string; steps: string[] }[] = [
  { label: "Sealed", steps: ["01", "02", "03"] },
  { label: "Agreed", steps: ["04", "05"] },
  { label: "Funded and bound", steps: ["06", "07", "08", "09"] },
  { label: "Paid, refused, revoked", steps: ["10", "11", "12"] },
]

/* Infrastructure behind it */
export const INFRA = [
  { label: "Factory", href: acct("accord-v2.testnet") },
  { label: "Release 3", href: tx("7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh") },
  { label: "Relayer tx", href: tx("DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC") },
  { label: "Attestations", href: "https://testnet-api.outlayer.ai/attestations/13596" },
]

/* make verify on a6, as it printed (9 Nov 2026): each check with what it means in plain words */
export type CheckStatus = "ok" | "partial" | "not checked"
export type Check = { id: string; name: string; meaning: string; status: CheckStatus; href: string }
export const CHECKS: Check[] = [
  { id: "code", name: "Contract code", meaning: "Matches the published release", status: "ok", href: TESTNET.releaseUrl },
  { id: "keys", name: "Agreement keys", meaning: "No full-access key", status: "ok", href: `${acct("a6.accord-v2.testnet")}?tab=accesskeys` },
  { id: "sealed", name: "Sealed outcome", meaning: "Signed inside the enclave", status: "ok", href: tx("GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW") },
  { id: "release", name: "Enclave release", meaning: "Needs the outlayer-verify tool", status: "not checked", href: "https://app.outlayer.ai/docs/trust-verification" },
  { id: "model", name: "Model attestation", meaning: "The real model, fresh nonce bound; hardware quote not checked here", status: "partial", href: "https://testnet-api.outlayer.ai/attestations/13596" },
  { id: "payee", name: "Recipient", meaning: "Proven on the vendor's domain", status: "ok", href: tx("6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6") },
  { id: "record", name: "Record", meaning: "Payments match the receipts", status: "ok", href: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ") },
]
/** "5 ok · 1 partial · 1 not checked": the counts make verify prints, in its order */
export const checkSummary = (checks: { status: CheckStatus }[]) => {
  const n = (s: CheckStatus) => checks.filter((c) => c.status === s).length
  return [`${n("ok")} ok`, n("partial") ? `${n("partial")} partial` : "", n("not checked") ? `${n("not checked")} not checked` : ""].filter(Boolean).join(" · ")
}
export const VERIFY_COMMAND = "make verify DEAL=a6.accord-v2.testnet"
export const VERIFY_RAW = `accord verify · a6.accord-v2.testnet
code      code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok
keys      0 key · none · no full access · ok
sealed    outcome signature ok · commitments match · agreement matches · ok
release   sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · OutLayer attestation record not checked here (needs outlayer-verify) · not checked
model     z-ai/glm-5.3-flash · attestation report fetched with fresh nonce f9e049d1… · nonce bound in the report · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial
payee     halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · ok
record    1 payments · 1 refusals · 0 exceptions · receipts match paid · ok
verify: 5 checks ok · 1 partial · 1 not checked`

/* Transactions behind agreement a6's record, so /verify's live rows link to the exact evidence for a6; any other
   agreement links to its account's transaction list instead. */
export const KNOWN_TX: Record<string, { payment: string; refusal: string; recipientApproval: string; release: string }> = {
  "a6.accord-v2.testnet": {
    payment: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ"),
    refusal: tx("AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"),
    recipientApproval: tx("FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis"),
    release: tx("7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh"),
  },
}
