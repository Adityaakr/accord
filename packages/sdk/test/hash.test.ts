import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { jcs, jcsSha256 } from "../src/hash.js";

const vectors = JSON.parse(
  readFileSync(new URL("../../../crates/accord-core/tests/jcs_vectors.json", import.meta.url), "utf8"),
) as { name: string; input: unknown; jcs: string; sha256: string }[];

describe("JCS vectors shared with accord-core", () => {
  for (const v of vectors) {
    it(v.name, () => {
      expect(jcs(v.input)).toBe(v.jcs);
      expect(jcsSha256(v.input)).toBe(v.sha256);
    });
  }
});
