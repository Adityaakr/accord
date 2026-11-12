// Window events the wallet layer sends to the rest of the page.

/** Dispatched after this tab's wallet sends a transaction, so the header re-reads its balances (useBalances). */
export const BALANCES_CHANGED = "accord:balances-changed";
