import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { readPhoto } from "@/lib/uploads";

// Photos on approved public messages are visible to everyone; all others only to the event's organisers.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const msg = await db.message.findFirst({ where: { photoPath: file }, include: { event: true } });
  if (!msg) return new Response("Not found", { status: 404 });

  const isPublic = msg.status === "APPROVED" && msg.visibility === "PUBLIC";
  if (!isPublic) {
    const user = await currentUser();
    if (!user || user.organizationId !== msg.event.organizationId) return new Response("Not found", { status: 404 });
  }

  const photo = await readPhoto(file);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
