import { Suspense } from "react";
import { CheckPayment } from "./CheckPayment";

export const metadata = {
  title: "Check a payment",
  description: "Before signing, see whether an agreement's contract would pay or refuse a payment, gate by gate. A read-only simulation from chain state.",
};

// Public, no sign-in (components/Chrome.tsx PUBLIC and READ_ONLY). The form keeps its values in the address
// (?agreement=&item=&amount=&recipient=), so a check can be shared or bookmarked; the answer comes from /api/check.
export default function CheckPage() {
  return (
    <Suspense fallback={null}>
      <CheckPayment />
    </Suspense>
  );
}
