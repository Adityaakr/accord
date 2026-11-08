// The app's demo domain: the list form of accord.json with pairs registered in the last 24 hours. Every proof from
// this domain carries demo_domain: true and every screen says "demo domain".
import { config } from "@/server/accord";
import { demoVendors } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const vendors = await demoVendors();
  return Response.json({
    accord: "1",
    network: config().network === "mainnet" ? "mainnet" : "testnet",
    entries: vendors.map((v) => ({ recipient: v.recipient, settlement_authority: v.authority })),
    contact: "Accord demo domain",
  });
}
