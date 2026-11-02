"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, requireEvent, requireOwner, requireUser } from "@/lib/auth";
import { shortSuffix, slugify } from "@/lib/codes";
import { getTemplate } from "@/lib/themes";
import { sendSms } from "@/lib/sms";
import { fullTitle, shortDate } from "@/lib/format";

export async function signOut() {
  await destroySession();
  redirect("/login");
}

// ---------- Events ----------

const TierInput = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.coerce.number().min(0).max(1_000_000),
  seatsPer: z.coerce.number().int().min(1).max(50),
  capacity: z.coerce.number().int().min(1).max(100_000),
});

const EventInput = z.object({
  template: z.string(),
  titleLead: z.string().trim().max(80),
  title: z.string().trim().min(2, "Give the event a name").max(120),
  honoree: z.string().trim().max(80),
  subtitle: z.string().trim().max(160),
  about: z.string().trim().max(3000),
  verseText: z.string().trim().max(400),
  verseRef: z.string().trim().max(60),
  host: z.string().trim().min(1, "Who is hosting?").max(120),
  venue: z.string().trim().min(1, "Where is it?").max(160),
  dressCode: z.string().trim().max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  timeText: z.string().trim().max(60),
  code: z.string().trim().max(6),
  moderateWall: z.boolean(),
});

export type FormState = { error?: string };

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireOwner();
  const s = (k: string) => String(form.get(k) ?? "");
  const parsed = EventInput.safeParse({
    template: s("template"),
    titleLead: s("titleLead"),
    title: s("title"),
    honoree: s("honoree"),
    subtitle: s("subtitle"),
    about: s("about"),
    verseText: s("verseText"),
    verseRef: s("verseRef"),
    host: s("host"),
    venue: s("venue"),
    dressCode: s("dressCode"),
    date: s("date"),
    time: s("time"),
    timeText: s("timeText"),
    code: s("code"),
    moderateWall: form.get("moderateWall") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const e = parsed.data;

  const names = form.getAll("tierName").map(String);
  const tiers = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i].trim()) continue;
    const t = TierInput.safeParse({
      name: names[i],
      price: form.getAll("tierPrice")[i],
      seatsPer: form.getAll("tierSeats")[i],
      capacity: form.getAll("tierCapacity")[i],
    });
    if (!t.success) return { error: `Check ticket type "${names[i]}": price, seats and capacity must be numbers.` };
    tiers.push(t.data);
  }
  if (!tiers.length) return { error: "Add at least one ticket type. Use price 0 for a free RSVP." };

  // Times are entered in Zambian time (UTC+2, no daylight saving).
  const startsAt = new Date(`${e.date}T${e.time}:00+02:00`);
  const template = getTemplate(e.template);
  const code = (e.code || e.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || "EVT").toUpperCase();
  const theme = String(form.get("theme") || template.theme);

  const event = await db.event.create({
    data: {
      organizationId: user.organizationId,
      slug: `${slugify(e.title) || "event"}-${shortSuffix()}`,
      code,
      template: template.id,
      theme,
      titleLead: e.titleLead,
      title: e.title,
      honoree: e.honoree || null,
      subtitle: e.subtitle,
      about: e.about,
      verseText: e.verseText || null,
      verseRef: e.verseRef || null,
      host: e.host,
      venue: e.venue,
      dressCode: e.dressCode,
      startsAt,
      timeText: e.timeText || startsAt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lusaka" }),
      moderateWall: e.moderateWall,
      tiers: {
        create: tiers.map((t, i) => ({
          name: t.name,
          priceNgwee: Math.round(t.price * 100),
          seatsPer: t.seatsPer,
          capacity: t.capacity,
          sortOrder: i,
          description: t.seatsPer > 1 ? `Admits ${t.seatsPer}` : "",
        })),
      },
    },
  });
  redirect(`/dashboard/events/${event.id}`);
}

export async function togglePublished(eventId: string) {
  const { event } = await requireEvent(eventId);
  await requireOwner();
  await db.event.update({ where: { id: event.id }, data: { published: !event.published } });
  revalidatePath(`/dashboard/events/${eventId}`);
}

// ---------- Guests ----------

export async function resendTicket(orderId: string) {
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, event: { organizationId: user.organizationId } }, include: { event: true } });
  if (!order) return;
  const link = `${process.env.APP_URL ?? ""}/t/${order.reference}`;
  if (order.status === "PAID") {
    await sendSms(order.guestPhone, `Your ticket for ${fullTitle(order.event)}, ${shortDate(order.event.startsAt)}: ${link}`);
  } else {
    await sendSms(order.guestPhone, `Your registration for ${fullTitle(order.event)} is not paid yet. Register again here: ${process.env.APP_URL ?? ""}/e/${order.event.slug}`);
  }
}

// ---------- Messages ----------

export async function setMessageStatus(messageId: string, status: "APPROVED" | "REJECTED" | "PENDING") {
  const user = await requireUser();
  const msg = await db.message.findFirst({ where: { id: messageId, event: { organizationId: user.organizationId } } });
  if (!msg) return;
  await db.message.update({ where: { id: msg.id }, data: { status } });
  revalidatePath(`/dashboard/events/${msg.eventId}/messages`);
}

// ---------- Check-in ----------

export type CheckinResult =
  | { kind: "ok"; name: string; tier: string; admits: number; code: string }
  | { kind: "used"; name: string; at: string; by: string | null; code: string }
  | { kind: "unpaid"; name: string; code: string }
  | { kind: "none"; code: string };

export async function checkIn(eventId: string, rawCode: string): Promise<CheckinResult> {
  const { user, event } = await requireEvent(eventId);
  const code = rawCode.trim().toUpperCase();
  const ticket = await db.ticket.findUnique({ where: { code }, include: { order: { include: { tier: true } } } });
  if (!ticket || ticket.order.eventId !== event.id) return { kind: "none", code };
  if (ticket.order.status !== "PAID") return { kind: "unpaid", name: ticket.order.guestName, code };

  // Only one scanner can win, even if two doors scan the same ticket at once.
  const claimed = await db.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInBy: user.name },
  });
  if (claimed.count === 0) {
    const fresh = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    return { kind: "used", name: ticket.order.guestName, at: fresh.checkedInAt!.toISOString(), by: fresh.checkedInBy, code };
  }
  return { kind: "ok", name: ticket.order.guestName, tier: ticket.order.tier.name, admits: ticket.admits, code };
}
