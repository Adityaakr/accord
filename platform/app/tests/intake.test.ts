// The new room flow's working brief: only the title is required, typed figures must make sense, and the facts shown
// back on the invite card and the seal page leave out what was not filled.
import { describe, expect, it } from "vitest";
import { EMPTY_INTAKE, briefErrors, briefFacts, milestones, sampleBrief } from "../src/app/agreements/new/intake";

describe("briefErrors", () => {
  it("asks only for a title on an empty brief", () => {
    expect(Object.keys(briefErrors("procurement", "", EMPTY_INTAKE))).toEqual(["title"]);
    expect(briefErrors("market-making", "Q1 retainer", EMPTY_INTAKE)).toEqual({});
  });
  it("refuses a target above the ceiling and malformed amounts", () => {
    const e = briefErrors("procurement", "Room", { ...EMPTY_INTAKE, ceiling: "40", target: "41", termWeeks: "0" });
    expect(e.target).toMatch(/above the ceiling/);
    expect(e.termWeeks).toBeDefined();
    expect(briefErrors("procurement", "Room", { ...EMPTY_INTAKE, ceiling: "1.1234567" }).ceiling).toBeDefined();
  });
  it("refuses more passing readings than readings, and a malformed pair", () => {
    const e = briefErrors("market-making", "Room", { ...EMPTY_INTAKE, slots: "4", threshold: "6", pair: "NEAR-USDC" });
    expect(e.threshold).toBeDefined();
    expect(e.pair).toBeDefined();
  });
  it("accepts both samples as they are", () => {
    for (const kind of ["procurement", "market-making"] as const) {
      for (const circle of [false, true]) {
        const s = sampleBrief(kind, circle);
        expect(briefErrors(kind, s.title, { ...EMPTY_INTAKE, ...s.intake })).toEqual({});
      }
    }
  });
});

describe("briefFacts", () => {
  it("lists only filled figures, with the limit each is sealed as", () => {
    const f = briefFacts("procurement", { ...EMPTY_INTAKE, ceiling: "40", milestones: [{ name: "Pipeline", deliverable: "" }, { name: " ", deliverable: "" }] }, "tUSDC");
    expect(f).toEqual([
      { label: "Milestones", value: "Pipeline", sealAs: "max_items" },
      { label: "Budget ceiling", value: "40 tUSDC", sealAs: "max_total" },
    ]);
    expect(milestones(EMPTY_INTAKE)).toEqual([]);
    expect(briefFacts("market-making", EMPTY_INTAKE, "USDC")).toEqual([]);
  });
});
