// The relay keeps a timelocked reveal only if it opens no earlier than bidding closes; it reads the round from the
// tlock stanza without decrypting. No network here: the live round trip ran against drand quicknet (docs/runs.md).
import { describe, expect, it } from "vitest";
import { timelockRoundOf } from "../src/timelock.js";

const armor = (header: string) =>
  `-----BEGIN AGE ENCRYPTED FILE-----\n${Buffer.from(header).toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END AGE ENCRYPTED FILE-----\n`;

describe("timelockRoundOf", () => {
  it("reads the round from a tlock stanza", () => {
    expect(timelockRoundOf(armor(`age-encryption.org/v1\n-> tlock 33894230 ${"52db9ba7".repeat(8)}\nabc\n--- x\n`))).toBe(33894230);
  });
  it("is null for anything else", () => {
    expect(timelockRoundOf(armor("age-encryption.org/v1\n-> X25519 abc\n"))).toBeNull();
    expect(timelockRoundOf("not a ciphertext")).toBeNull();
  });
});
