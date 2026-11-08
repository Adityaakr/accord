import { Settings } from "@/components/org/Settings";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const TABS = ["organisation", "members", "notifications", "developers", "billing"] as const;
export type SettingsTab = (typeof TABS)[number];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <Settings tab={(TABS as readonly string[]).includes(tab ?? "") ? (tab as SettingsTab) : "organisation"} />;
}
