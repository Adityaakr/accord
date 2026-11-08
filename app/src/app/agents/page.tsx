import { ComingNext } from "@/components/ComingNext";

export const metadata = { title: "Agents" };

export default function Page() {
  return <ComingNext title="Agents" lead="Every agent key across your rooms: what it can call, where it works, and how to stop it."
    holds={["Each key and its scope: act() on one agreement, nothing else", "The rooms it works in and its last call", "Its refusals, with their codes", "Revoke, one click per room, rejected by the network on the next call", "Connect your own agent through MCP or the CLI"]}
    today={[{ label: "The agent key panel in each deal room", href: "/rooms" }]} />;
}
