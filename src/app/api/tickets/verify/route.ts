import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalisePhone } from "@/lib/phone";
import { fullTitle } from "@/lib/format";
import { hashCode } from "@/lib/codes";

// Step 2 of "find my ticket": check the code and list that phone's orders.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; code?: string };
  const phone = normalisePhone(body.phone ?? "");
  const code = (body.code ?? "").trim();
  if (!phone || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from the SMS." }, { status: 400 });

  const login = await db.loginCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!login || login.attempts >= 5) {
    return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
  }
  if (login.codeHash !== hashCode(phone, code)) {
    await db.loginCode.update({ where: { id: login.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "That code doesn't match. Check the SMS and try again." }, { status: 400 });
  }
  await db.loginCode.update({ where: { id: login.id }, data: { usedAt: new Date() } });

  const orders = await db.order.findMany({
    where: { guestPhone: phone, status: { in: ["PAID", "PENDING"] } },
    include: { event: true, tier: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      reference: o.reference,
      event: fullTitle(o.event),
      startsAt: o.event.startsAt,
      timeText: o.event.timeText,
      venue: o.event.venue,
      tier: o.tier.name,
      quantity: o.quantity,
      status: o.status,
    })),
  });
}
