"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Polls the order while the guest approves the mobile-money prompt, then reloads the page to show the ticket.
export default function PaymentWaiter({ reference }: { reference: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    async function poll() {
      if (stopped) return;
      try {
        const res = await fetch(`/api/orders/${reference}`, { cache: "no-store" });
        const body = await res.json();
        if (body.status && body.status !== "PENDING") return router.refresh();
      } catch {
        // network blip: keep polling
      }
      if (Date.now() - started > 90_000) setSlow(true);
      // Poll every 3 s for the first 3 minutes, then every 15 s.
      setTimeout(poll, Date.now() - started > 180_000 ? 15_000 : 3_000);
    }
    const id = setTimeout(poll, 3_000);
    return () => {
      stopped = true;
      clearTimeout(id);
    };
  }, [reference, router]);

  return slow ? (
    <p className="note">
      Still waiting. If you didn&apos;t get a prompt, dial your network&apos;s mobile money menu to check for pending approvals, or go back and try again.
    </p>
  ) : null;
}
