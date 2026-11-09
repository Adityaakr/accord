// NEAR account ids, checked before the app navigates to or reads one, so a typo gets a plain answer ("not a NEAR
// account id") instead of a lookup of a URL-encoded string. The rule is NEAR's own: 2 to 64 characters, lowercase
// letters and digits in parts separated by `.`, each part may join runs with a single `-` or `_`. Pure, so it is
// unit-tested.

const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function isAccountId(s: string): boolean {
  return s.length >= 2 && s.length <= 64 && ACCOUNT_ID.test(s);
}

/** A route segment as the visitor typed it: decoded once (a malformed escape stays as it is). */
export function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * What a search box's text means: the account id to open (trimmed and lowercased, as NEAR ids are lowercase), or why
 * it cannot be one.
 */
export function parseAgreementInput(raw: string): { id: string } | { error: string } {
  const s = raw.trim().toLowerCase();
  if (!s) return { error: "Enter an agreement account, for example a6.accord-v2.testnet." };
  if (!isAccountId(s)) return { error: `"${raw.trim()}" is not a NEAR account id. Agreement accounts look like a6.accord-v2.testnet.` };
  return { id: s };
}
