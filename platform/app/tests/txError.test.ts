import { describe, expect, it } from "vitest";
import { CANCELLED, friendlyWalletError, walletErrorMessage } from "../src/components/wallet/txError";

describe("wallet errors read as plain copy", () => {
  it("a declined or closed request is a cancellation", () => {
    for (const raw of ["User rejected", new Error("User rejected the request."), { code: 4001, message: "rejected" }, "Wallet closed", "Cancelled"]) {
      expect(friendlyWalletError(raw)).toBe(CANCELLED);
    }
    expect(walletErrorMessage(new Error("User rejected"), "Meteor", "testnet")).toBe(`${CANCELLED} Nothing was sent.`);
  });
  it("other failures name the wallet and keep a short reason", () => {
    expect(friendlyWalletError(new Error("boom"), "Meteor")).toBe("Meteor could not complete the request (boom). Try again.");
    expect(friendlyWalletError(new Error("Failed to fetch"), "Nightly")).toMatch(/could not reach the network/);
  });
});
