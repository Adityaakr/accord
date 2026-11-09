// NEAR account id rules (nomicon.io/DataStructures/Account): 2 to 64 characters, lowercase letters and digits in
// parts joined by `.`, each part's runs separated by a single `-` or `_`. A 64-hex implicit account passes too.

const ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** True when `s` is a well-formed NEAR account id; says nothing about whether the account exists. */
export function isAccountId(s: string): boolean {
  return s.length >= 2 && s.length <= 64 && ACCOUNT_ID.test(s);
}
