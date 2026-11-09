/** Where a public page links an agreement: its deal room when someone is signed in, else its public, read-only
 * check at /verify/<id> (a room page sends signed-out visitors to sign-in). */
export function roomHref(id: string, signedIn: boolean): string {
  return signedIn ? `/agreements/${id}` : `/verify/${id}`;
}
