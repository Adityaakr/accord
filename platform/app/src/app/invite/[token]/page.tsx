import { InvitePage } from "@/components/org/Invite";

export const metadata = { title: "Invitation" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitePage token={token} />;
}
