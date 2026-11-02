import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { orderReference } from "@/lib/codes";
import { collectMobileMoney, LencoError } from "@/lib/lenco";
import { markOrderPaid } from "@/lib/orders";
import { detectOperator, normalisePhone } from "@/lib/phone";

const Body = z.object({
  tierId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim(),
  email: z.string().trim().email("Enter a valid email address or leave it empty").max(120).optional().or(z.literal("")),
  operator: z.enum(["airtel", "mtn", "zamtel"]).optional(),
  payPhone: z.string().trim().optional(),
});

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form and try again");
  const input = parsed.data;

  const phone = normalisePhone(input.phone);
  if (!phone) return fail("Enter a Zambian mobile number like 097X XXX XXX. Your ticket is sent there.");

  const event = await db.event.findUnique({ where: { slug }, include: { tiers: true } });
  if (!event || !event.published) return fail("This event is not taking registrations.", 404);
  if (event.startsAt.getTime() + 6 * 3600e3 < Date.now()) return fail("This event has already taken place.");

  const tier = event.tiers.find((t) => t.id === input.tierId);
  if (!tier) return fail("Choose a ticket type.");

  // Count paid orders plus payments started in the last 15 minutes, so two guests can't buy the last seat.
  const held = await db.order.aggregate({
    where: {
      tierId: tier.id,
      OR: [{ status: "PAID" }, { status: "PENDING", createdAt: { gte: new Date(Date.now() - 15 * 60e3) } }],
    },
    _sum: { quantity: true },
  });
  const taken = held._sum.quantity ?? 0;
  if (taken + input.quantity > tier.capacity) {
    const left = Math.max(0, tier.capacity - taken);
    return fail(left ? `Only ${left} left for ${tier.name}.` : `${tier.name} is sold out.`);
  }

  const amountNgwee = tier.priceNgwee * input.quantity;
  const free = amountNgwee === 0;

  let payPhone: string | null = null;
  let operator = input.operator ?? null;
  if (!free) {
    payPhone = normalisePhone(input.payPhone || input.phone);
    if (!payPhone) return fail("Enter the mobile money number that will pay.");
    operator = operator ?? detectOperator(payPhone);
    if (!operator) return fail("Choose Airtel Money, MTN MoMo or Zamtel Kwacha.");
  }

  const order = await db.order.create({
    data: {
      reference: orderReference(),
      eventId: event.id,
      tierId: tier.id,
      quantity: input.quantity,
      amountNgwee,
      guestName: input.name,
      guestPhone: phone,
      guestEmail: input.email || null,
      method: free ? "free" : operator!,
      payPhone,
    },
  });

  if (free) {
    await markOrderPaid(order.id);
    return NextResponse.json({ reference: order.reference });
  }

  try {
    const c = await collectMobileMoney({
      reference: order.reference,
      amountKwacha: amountNgwee / 100,
      phone: payPhone!,
      operator: operator!,
    });
    await db.order.update({ where: { id: order.id }, data: { lencoReference: c.lencoReference } });
    if (c.status === "failed") {
      await db.order.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: c.reasonForFailure } });
      return fail(c.reasonForFailure || "The payment could not be started. Check the number and try again.");
    }
  } catch (e) {
    await db.order.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: "Could not reach the payment provider" } });
    console.error("Lenco collection failed", e);
    return fail(e instanceof LencoError ? `Payment could not be started: ${e.message}` : "Payment could not be started. Try again in a moment.", 502);
  }

  return NextResponse.json({ reference: order.reference });
}
