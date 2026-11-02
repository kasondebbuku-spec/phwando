import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshPendingOrder } from "@/lib/orders";

// Polled by the payment-waiting screen every few seconds.
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  await refreshPendingOrder(reference);
  const order = await db.order.findUnique({ where: { reference }, select: { status: true, failureReason: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}
