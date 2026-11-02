import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashCode, otp } from "@/lib/codes";
import { normalisePhone } from "@/lib/phone";
import { sendSms } from "@/lib/sms";

// Step 1 of "find my ticket": text a 6-digit code to the phone.
export async function POST(req: Request) {
  const { phone: raw } = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalisePhone(raw ?? "");
  if (!phone) return NextResponse.json({ error: "Enter a Zambian mobile number like 097X XXX XXX." }, { status: 400 });

  const recent = await db.loginCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 15 * 60e3) } } });
  if (recent >= 3) return NextResponse.json({ error: "Too many codes requested. Wait 15 minutes and try again." }, { status: 429 });

  const code = otp();
  await db.loginCode.create({ data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + 10 * 60e3) } });
  await sendSms(phone, `Your Phwando ticket code is ${code}. It expires in 10 minutes.`);

  // Until an SMS provider is connected, show the code on screen in development only.
  const devCode = process.env.NODE_ENV !== "production" && !process.env.SMS_PROVIDER ? code : undefined;
  return NextResponse.json({ sent: true, devCode });
}
