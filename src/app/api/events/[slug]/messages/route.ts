import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { savePhoto } from "@/lib/uploads";

const Body = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  relation: z.string().trim().max(80).optional(),
  text: z.string().trim().min(1, "Write your message").max(1500, "Keep your message under 1,500 characters"),
  memory: z.string().trim().max(1500, "Keep the memory under 1,500 characters").optional(),
  email: z.string().trim().email("Enter a valid email address or leave it empty").max(120).optional().or(z.literal("")),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

// Anyone can send a message; a ticket is not needed. Sent as multipart form data so a photo can come along.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Could not read the form." }, { status: 400 });

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const parsed = Body.safeParse({
    name: str("name"),
    relation: str("relation"),
    text: str("text"),
    memory: str("memory"),
    email: str("email"),
    visibility: str("visibility") ?? "PUBLIC",
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const event = await db.event.findUnique({ where: { slug }, select: { id: true, published: true, moderateWall: true } });
  if (!event?.published) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let photoPath: string | undefined;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await savePhoto(photo);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  const status = parsed.data.visibility === "PUBLIC" && !event.moderateWall ? "APPROVED" : "PENDING";
  const msg = await db.message.create({
    data: { eventId: event.id, ...parsed.data, email: parsed.data.email || null, photoPath, status },
  });

  return NextResponse.json({
    id: msg.id,
    status: msg.status,
    visibility: msg.visibility,
    // Only echo back what may appear on the wall right away.
    message: msg.status === "APPROVED" ? { id: msg.id, name: msg.name, relation: msg.relation, text: msg.text, photoPath: msg.photoPath, createdAt: msg.createdAt } : null,
  });
}
