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
  verify: { ok: ["contract code", "agent key", "sealed outcome", "enclave release (with outlayer-verify installed)", "recipient proof", "record"], partial: ["model attestation (nonce bound in the report; the hardware quote is not checked here)"], notChecked: [] as string[] },
}

export type Step = { n: string; title: string; detail: string; href: string; refused?: boolean; mono?: string }
export const FLOW: Step[] = [
  { n: "01", title: "Buyer seals its limits", detail: "Only a commitment and ciphertext go on chain", href: tx("Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk") },
  { n: "02", title: "Vendor seals its limits", detail: "The other side never sees the numbers", href: tx("2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ") },
  { n: "03", title: "Negotiated in the enclave", detail: "35.50 test USDC in 3 items, signed by the Sealed Table", href: tx("GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW"), mono: "35.50 tUSDC · 3 items" },
  { n: "04", title: "Buyer approves the terms", detail: "Approval recorded on the agreement", href: tx("H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg") },
  { n: "05", title: "Vendor approves the terms", detail: "The agreement starts executing", href: tx("2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT") },
  { n: "06", title: "Buyer funds the escrow", detail: "35.50 test USDC into the agreement's own account", href: tx("2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy"), mono: "35.50 tUSDC" },
  { n: "07", title: "Recipient proven in the enclave", detail: "Payee checks the vendor's domain", href: tx("6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6") },
  { n: "08", title: "Vendor's authority approves", detail: "A separate account signs off the recipient", href: tx("FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis") },
  { n: "09", title: "Buyer accepts the recipient", detail: "halcyon-mm.testnet is now the only destination", href: tx("3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p") },
  { n: "10", title: "Agent pays inside the terms", detail: "16.50 test USDC to halcyon-mm.testnet", href: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ"), mono: "16.50 tUSDC" },
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
  { label: "Release 4", href: tx("EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU") },
  { label: "Relayer tx", href: tx("DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC") },
  { label: "Attestations", href: "https://testnet-api.outlayer.ai/attestations/by-request/13596" },
]

/* make verify on a6, as it printed with outlayer-verify installed (10 Nov 2026): each check with what it means in plain
   words. Without the tool, release is not checked and the verdict reads 5 ok · 1 partial · 1 not checked. */
export type CheckStatus = "ok" | "partial" | "not checked"
export type Check = { id: string; name: string; meaning: string; status: CheckStatus; href: string }
export const CHECKS: Check[] = [
  { id: "code", name: "Contract code", meaning: "Matches the published release", status: "ok", href: TESTNET.releaseUrl },
  { id: "keys", name: "Agreement keys", meaning: "No full-access key", status: "ok", href: `${acct("a6.accord-v2.testnet")}?tab=accesskeys` },
  { id: "sealed", name: "Sealed outcome", meaning: "Signed inside the enclave", status: "ok", href: tx("GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW") },
  { id: "release", name: "Enclave release", meaning: "The three job runs, proven by outlayer-verify", status: "ok", href: "https://github.com/out-layer/outlayer-verify" },
  { id: "model", name: "Model attestation", meaning: "The model as served now, fresh nonce bound; the run's attestation is in the sealed outcome", status: "partial", href: "https://testnet-api.outlayer.ai/attestations/by-request/13596" },
  { id: "payee", name: "Recipient", meaning: "Proven on the vendor's domain", status: "ok", href: tx("6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6") },
  { id: "record", name: "Record", meaning: "Payments match the receipts", status: "ok", href: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ") },
]
/** "6 ok · 1 partial": the counts make verify prints, in its order */
export const checkSummary = (checks: { status: CheckStatus }[]) => {
  const n = (s: CheckStatus) => checks.filter((c) => c.status === s).length
  return [`${n("ok")} ok`, n("partial") ? `${n("partial")} partial` : "", n("not checked") ? `${n("not checked")} not checked` : ""].filter(Boolean).join(" · ")
}
export const VERIFY_COMMAND = "make verify DEAL=a6.accord-v2.testnet"
export const VERIFY_RAW = `accord verify · a6.accord-v2.testnet
code      code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok
keys      0 keys · none · no full access · ok
sealed    outcome signature ok · commitments match · agreement matches · ok
release   sealed-table run 13682 = task 28492 · wasm 7c832ce9… · outlayer-verify proven · payee run 13672 = task 28478 · wasm 24071443… · outlayer-verify proven · observer run 13683 = task 28493 · wasm 8240179a… · outlayer-verify proven · ok
model     z-ai/glm-5.3-flash · attestation report fetched with fresh nonce 1a7f6315… · nonce bound in the report · the model is attested as served now; the run's own attestation is bound in the signed outcome (sealed check) · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial
payee     halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · authority approved · buyer accepted · active · ok
record    1 payment · 1 refusal (1 in the log) · 0 exceptions · 0 set aside · 0 observation conflicts · receipts match paid · ok
verify: 6 checks ok · 1 partial`

/* Transactions behind agreement a6's record, so /verify's live rows link to the exact evidence for a6; any other
   agreement links to its account's transaction list instead. */
export const KNOWN_TX: Record<string, { payment: string; refusal: string; recipientApproval?: string; release: string }> = {
  "a6.accord-v2.testnet": {
    payment: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ"),
    refusal: tx("AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"),
    recipientApproval: tx("FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis"),
    release: tx("7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh"),
  },
  "a10.accord-v2.testnet": {
    payment: tx("Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm"),
    refusal: tx("51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu"),
    release: tx("EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU"),
  },
  "a1.accord-usdc.testnet": {
    payment: tx("E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2"),
    refusal: tx("9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB"),
    release: tx("H5UYzV98Rwx68W2mvbQRqJ6bss9ZRRxDwi5LxKVJHmcg"),
  },
}

/* The factories and the transaction that published each release on each (publish_release), so a code check links
   to the right one. Release 4 (the security-review fixes, DECISIONS 25 and 26) is current on both since 9 Nov 2026; an
   agreement keeps the release it was created on. */
export const FACTORIES = ["accord-v2.testnet", "accord-usdc.testnet"] as const
export const RELEASE_TX: Record<string, Record<number, string>> = {
  "accord-v2.testnet": { 3: tx("7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh"), 4: tx("EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU") },
  "accord-usdc.testnet": { 3: tx("H5UYzV98Rwx68W2mvbQRqJ6bss9ZRRxDwi5LxKVJHmcg"), 4: tx("GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai") },
}

/* Later proofs, from DECISIONS 26 (9 Nov 2026). a6 above stays the original walkthrough. Each row is one proof with
   the transactions behind it; a row with no transaction links the agreement's account. */
export type Proof = { title: string; agreement: string; mono?: string; refused?: boolean; txs: string[]; /** What each tx is, when a step has several */ txLabels?: string[] }
export const RELEASE4 = {
  release: 4,
  agreement: "a10.accord-v2.testnet",
  agreementUrl: acct("a10.accord-v2.testnet"),
  code: "ECgsrZwy…",
  publish: tx("EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU"),
  current: tx("J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC"),
  usdcPublish: tx("GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai"),
  usdcCurrent: tx("5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ"),
  verify: "make verify DEAL=a10.accord-v2.testnet",
  verifyResult: "code = release 4 · 6 ok · 1 partial",
  steps: [
    { title: "Negotiated in the enclave", agreement: "a10.accord-v2.testnet", mono: "33.00 tUSDC · 3 items", txs: [] },
    { title: "Buyer funds the escrow", agreement: "a10.accord-v2.testnet", mono: "33.00 tUSDC", txs: [tx("2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22")] },
    { title: "Agent pays item 1", agreement: "a10.accord-v2.testnet", mono: "12.00 tUSDC", txs: [tx("Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm")] },
    { title: "A redirected payment is refused", agreement: "a10.accord-v2.testnet", mono: "ERR_PAYEE_MISMATCH", refused: true, txs: [tx("51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu")] },
    { title: "Attack: redirect, altered amount, canary", agreement: "a11.accord-v2.testnet", mono: "0.00 moved · key deleted", refused: true, txs: [tx("HvwpdKDs64sA5zuj37iK8B1N1kKDadh4VoeU8n3LwMSv"), tx("3cTDxHzVH29Uiw6kZceFmuuUkhnBiBp5JYW65bsewLvh"), tx("DPpVoMX9KKYXppXvrM6HqorDYsDd9ndQy8YniKDvMsXT")] },
    { title: "Revoke, then a new key pays item 2", agreement: "a13.accord-v2.testnet", mono: "AccessKeyDoesNotExist", refused: true, txs: [tx("8b8FC1HeiHCTJcUaga87zWuNCg6LTgYGYDzRptdHh2H3"), tx("DfgMURQANtnBq2LziGaELXabw9tvzqhYQXq71hXjzNDT"), tx("24mdebXgCkMZFyekdDyxv3YQzJS1iaxckrfnN2aRY9Fe")], txLabels: ["revoke", "new key", "pay item 2"] },
  ] as Proof[],
}
export const CIRCLE = {
  factory: "accord-usdc.testnet",
  token: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
  agreement: "a1.accord-usdc.testnet",
  agreementUrl: acct("a1.accord-usdc.testnet"),
  release: 3,
  verify: "make verify DEAL=a1.accord-usdc.testnet",
  steps: [
    { title: "Buyer funds the escrow", agreement: "a1.accord-usdc.testnet", mono: "14.00 USDC", txs: [tx("4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no")] },
    { title: "Agent pays item 1", agreement: "a1.accord-usdc.testnet", mono: "5.00 USDC", txs: [tx("E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2")] },
    { title: "A redirected payment is refused", agreement: "a1.accord-usdc.testnet", mono: "ERR_PAYEE_MISMATCH", refused: true, txs: [tx("9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB")] },
    { title: "Buyer revokes the agent", agreement: "a1.accord-usdc.testnet", mono: "AccessKeyDoesNotExist", refused: true, txs: [tx("FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW")] },
  ] as Proof[],
}
