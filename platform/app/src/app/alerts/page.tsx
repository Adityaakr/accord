import { AlertsList } from "@/components/org/AlertsList";

export const metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AlertsList />;
}
