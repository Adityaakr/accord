// Public pages (the record, /try, /verify, market making) link an agreement to its room only for a signed-in visitor;
// signed out, to the public read-only check, because a room page sends signed-out visitors to sign-in.
import { describe, expect, it } from "vitest";
import { roomHref } from "../src/lib/roomhref";

describe("roomHref", () => {
  it("signed out: the public verify page", () => expect(roomHref("a6.accord-v2.testnet", false)).toBe("/verify/a6.accord-v2.testnet"));
  it("signed in: the deal room", () => expect(roomHref("a6.accord-v2.testnet", true)).toBe("/agreements/a6.accord-v2.testnet"));
});
