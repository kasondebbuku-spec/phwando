import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/lenco";
import { applyCollection } from "@/lib/orders";

// Set this URL in the Lenco dashboard (Lenco Pay → Webhooks): https://<your-domain>/api/webhooks/lenco
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-lenco-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string; status?: string; lencoReference?: string; reasonForFailure?: string | null } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = payload.data?.reference;
  if (ref && (payload.event === "collection.successful" || payload.event === "collection.failed")) {
    const order = await db.order.findUnique({ where: { reference: ref } });
    if (order) {
      await applyCollection(order.id, {
        status: payload.event === "collection.successful" ? "successful" : "failed",
        lencoReference: payload.data?.lencoReference ?? "",
        reasonForFailure: payload.data?.reasonForFailure ?? null,
      });
    }
  }

  // Always acknowledge, so Lenco does not keep retrying events we don't use.
  return NextResponse.json({ received: true });
}
