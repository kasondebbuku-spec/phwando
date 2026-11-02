import { db } from "@/lib/db";
import { requireEvent } from "@/lib/auth";
import { fullTitle } from "@/lib/format";
import CheckinScanner from "@/components/CheckinScanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Door check-in" };

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id);
  const [expected, inside] = await Promise.all([
    db.ticket.aggregate({ where: { order: { eventId: id, status: "PAID" } }, _sum: { admits: true } }),
    db.ticket.aggregate({ where: { order: { eventId: id }, status: "CHECKED_IN" }, _sum: { admits: true } }),
  ]);

  return (
    <div className="narrow">
      <div>
        <a href={`/dashboard/events/${id}`} className="muted" style={{ fontSize: ".85rem" }}>
          ← {fullTitle(event)}
        </a>
        <h1>Door check-in</h1>
      </div>
      <CheckinScanner eventId={id} expected={expected._sum.admits ?? 0} initialInside={inside._sum.admits ?? 0} />
    </div>
  );
}
