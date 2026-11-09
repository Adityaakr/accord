"use client";

// The room could not be read just now: the page throws here only when every NEAR RPC endpoint was rate limited or
// unreachable (a missing room is a 404). Reads again on its own after a few seconds.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui";

const RETRY_MS = 6_000;

export default function RoomError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => { router.refresh(); reset(); }, RETRY_MS);
    return () => clearTimeout(t);
  }, [reset, router]);
  return (
    <Panel title="Reading the room">
      <p role="status">The network is busy, retrying.</p>
    </Panel>
  );
}
