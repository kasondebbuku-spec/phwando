import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fullTitle, kwacha, longDate } from "@/lib/format";
import { getTemplate, getTheme } from "@/lib/themes";

export const metadata = { title: "Events" };

export default async function Dashboard() {
  const user = await requireUser();
  const events = await db.event.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { startsAt: "asc" },
    include: { orders: { where: { status: "PAID" }, select: { amountNgwee: true, quantity: true } }, _count: { select: { messages: { where: { status: "PENDING" } } } } },
  });
  const now = Date.now();
  const upcoming = events.filter((e) => e.startsAt.getTime() > now - 12 * 3600e3);
  const past = events.filter((e) => e.startsAt.getTime() <= now - 12 * 3600e3).reverse();

  const list = (items: typeof events) => (
    <div className="event-list">
      {items.map((e) => {
        const revenue = e.orders.reduce((s, o) => s + o.amountNgwee, 0);
        const orders = e.orders.length;
        return (
          <a key={e.id} href={`/dashboard/events/${e.id}`} className="card event-card">
            <span className="muted" style={{ fontSize: ".8rem" }}>
              <span className="swatch" style={{ background: getTheme(e.theme).accent }} />
              {getTemplate(e.template).label} · {longDate(e.startsAt)}
            </span>
            <strong style={{ fontSize: "1.05rem", lineHeight: 1.3 }}>{fullTitle(e)}</strong>
            <span className="muted" style={{ fontSize: ".85rem" }}>{e.venue}</span>
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".85rem" }}>
              <span>
                {orders} paid order{orders === 1 ? "" : "s"} · {kwacha(revenue)}
              </span>
              {e._count.messages > 0 && <span className="pill pending">{e._count.messages} to approve</span>}
              {!e.published && <span className="pill failed">Hidden</span>}
            </span>
          </a>
        );
      })}
    </div>
  );

  return (
    <div className="wrap main">
      <div className="main-head">
        <div>
          <h1>{user.organization.name}</h1>
          <p className="muted">{upcoming.length} upcoming event{upcoming.length === 1 ? "" : "s"}</p>
        </div>
        {user.role === "OWNER" && (
          <a className="btn primary" href="/dashboard/events/new">
            + New event
          </a>
        )}
      </div>
      {upcoming.length ? list(upcoming) : <div className="card muted">No upcoming events. Create one to get a guest page and start selling tickets.</div>}
      {past.length > 0 && (
        <>
          <h2 style={{ margin: "12px 0 0", fontSize: "1rem" }}>Past events</h2>
          {list(past)}
        </>
      )}
    </div>
  );
}
