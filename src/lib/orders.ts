import { db } from "./db";
import { ticketCode } from "./codes";
import { getCollection, type Collection } from "./lenco";
import { sendSms } from "./sms";
import { fullTitle, shortDate } from "./format";

// Marks an order paid and issues its tickets exactly once, whether the webhook,
// a status poll or a free RSVP gets here first.
export async function markOrderPaid(orderId: string, lencoReference?: string) {
  const issued = await db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), lencoReference, failureReason: null },
    });
    if (claimed.count === 0) return null; // already paid

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { tier: true, event: true } });
    // A table ticket is one QR code that admits seatsPer people; seats are one code each.
    const codes = Array.from({ length: order.quantity }, () => ticketCode(order.event.code));
    await tx.ticket.createMany({
      data: codes.map((code) => ({ code, orderId, admits: order.tier.seatsPer })),
    });
    return order;
  });

  if (issued) {
    const url = `${process.env.APP_URL ?? ""}/t/${issued.reference}`;
    await sendSms(
      issued.guestPhone,
      `You're in! ${fullTitle(issued.event)}, ${shortDate(issued.event.startsAt)}, ${issued.event.timeText}. Your ticket: ${url}`,
    );
  }
}

export async function markOrderFailed(orderId: string, reason: string | null) {
  await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "FAILED", failureReason: reason ?? "Payment was not completed" },
  });
}

export async function applyCollection(orderId: string, c: Pick<Collection, "status" | "lencoReference" | "reasonForFailure">) {
  if (c.status === "successful") await markOrderPaid(orderId, c.lencoReference);
  else if (c.status === "failed") await markOrderFailed(orderId, c.reasonForFailure);
}

// Called while the guest waits on the payment screen, in case the webhook is slow or missing.
export async function refreshPendingOrder(reference: string) {
  const order = await db.order.findUnique({ where: { reference } });
  if (!order || order.status !== "PENDING" || order.method === "free") return;
  try {
    const c = await getCollection(reference);
    await applyCollection(order.id, c);
  } catch {
    // Lenco not reachable or the collection not visible yet: try again on the next poll.
  }
}

export function seatsSold(orders: { status: string; quantity: number; tier: { seatsPer: number } }[]) {
  return orders.filter((o) => o.status === "PAID").reduce((s, o) => s + o.quantity * o.tier.seatsPer, 0);
}
