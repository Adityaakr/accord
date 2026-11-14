import { describe, expect, it } from "vitest";
import { judgeInstances, type InstanceCheck } from "../src/model-node.js";

const inst = (label: string, o: Partial<InstanceCheck> = {}): InstanceCheck =>
  ({ label, signingAddress: "0xaa", tdx: true, tcb: "UpToDate", gpu: label === "gateway" ? "absent" : "ok", failures: [], ...o });

describe("judgeInstances", () => {
  it("is ok when the gateway and every model instance verified, and names each signing key once", () => {
    const r = judgeInstances(inst("gateway", { signingAddress: "0xgw" }), [inst("model instance 1"), inst("model instance 2"), inst("model instance 3", { signingAddress: "0xbb" })]);
    expect(r.status).toBe("ok");
    expect(r.signers).toEqual(["0xaa", "0xbb"]); // the gateway's key is not a model key
    expect(r.detail).toContain("3 model instances");
  });
  it("fails, with no verified key, when one instance of a shared key did not verify", () => {
    const r = judgeInstances(inst("gateway"), [inst("model instance 1"), inst("model instance 2", { tdx: false, failures: ["TDX debug mode"] })]);
    expect(r).toMatchObject({ status: "fail", signers: [] });
    expect(r.detail).toContain("model instance 2: TDX debug mode");
  });
  it("fails when a model instance has no GPU evidence, and when NVIDIA rejects it", () => {
    expect(judgeInstances(inst("gateway"), [inst("model instance 1", { gpu: "absent" })]).status).toBe("fail");
    expect(judgeInstances(inst("gateway"), [inst("model instance 1", { gpu: "failed", failures: ["NRAS did not accept the GPU evidence (HTTP 200)"] })]).status).toBe("fail");
  });
  it("fails when the gateway's quote did not verify", () => {
    expect(judgeInstances(inst("gateway", { tdx: false, failures: ["TCB status OutOfDate"] }), [inst("model instance 1")]).status).toBe("fail");
  });
  it("is not checked, never ok, when the checks could not run (a service unreachable)", () => {
    const r = judgeInstances(inst("gateway"), [inst("model instance 1", { gpu: "failed", failures: ["NRAS error: fetch failed"] })]);
    expect(r).toMatchObject({ status: "not_checked", signers: [] });
  });
  it("is not checked when the report lists no model instance", () => {
    expect(judgeInstances(inst("gateway"), []).status).toBe("not_checked");
  });
});
