import { db } from "@/lib/db";
import { requireEvent } from "@/lib/auth";
import { clock, fullTitle, kwacha, longDate, shortDate, TZ } from "@/lib/format";
import { OPERATOR_LABEL, prettyPhone } from "@/lib/phone";
import { resendTicket, togglePublished } from "../../actions";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string };

const DAY = 864e5;
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in Lusaka time

function SalesChart({ orders }: { orders: { amountNgwee: number; paidAt: Date | null }[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * DAY);
    return { key: dayKey(d), d, v: 0 };
  });
  for (const o of orders) {
    if (!o.paidAt) continue;
    const slot = days.find((x) => x.key === dayKey(o.paidAt!));
    if (slot) slot.v += o.amountNgwee / 100;
  }
  const W = 560, H = 170, L = 46, B = 24, T = 10;
  const raw = Math.max(...days.map((x) => x.v), 1);
  const step = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000].find((s) => raw / s <= 5) ?? 250000;
  const max = Math.ceil(raw / step) * step;
  const bw = (W - L) / days.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kwacha received per day over the last 14 days">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">
            {v >= 1000 ? `${v / 1000}k` : v}
          </text>
        </g>
      ))}
      {days.map((x, i) => {
        const last = i === days.length - 1;
        return (
          <g key={x.key}>
            <rect x={L + i * bw + bw * 0.18} y={y(x.v)} width={bw * 0.64} height={(H - T - B) * (x.v / max)} rx={3} fill="var(--accent)" opacity={last ? 1 : 0.55}>
              <title>
                {shortDate(x.d)}: K{x.v.toLocaleString("en-GB")}
              </title>
            </rect>
            {(i % 2 === 1 || last) && (
              <text x={L + i * bw + bw / 2} y={H - 6} textAnchor="middle">
                {x.d.toLocaleDateString("en-GB", { day: "numeric", timeZone: TZ })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default async function EventOverview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const { q = "", status = "all" } = await searchParams;
  const { user, event } = await requireEvent(id);

  const [tiers, orders, pendingMessages, checkedIn] = await Promise.all([
    db.ticketTier.findMany({ where: { eventId: id }, orderBy: { sortOrder: "asc" } }),
    db.order.findMany({ where: { eventId: id }, include: { tier: true, tickets: true }, orderBy: { createdAt: "desc" } }),
    db.message.count({ where: { eventId: id, status: "PENDING" } }),
    db.ticket.aggregate({ where: { order: { eventId: id }, status: "CHECKED_IN" }, _sum: { admits: true } }),
  ]);

  const paid = orders.filter((o) => o.status === "PAID");
  const seatsSold = paid.reduce((s, o) => s + o.quantity * o.tier.seatsPer, 0);
  const seatCap = tiers.reduce((s, t) => s + t.capacity * t.seatsPer, 0);
  const revenue = paid.reduce((s, o) => s + o.amountNgwee, 0);
  const recentPending = orders.filter((o) => o.status === "PENDING" && o.createdAt.getTime() > Date.now() - DAY);
  const inside = checkedIn._sum.admits ?? 0;
  const feeRate = Number(process.env.LENCO_FEE_PERCENT ?? "0") / 100;
  const fee = Math.round(revenue * feeRate);

  const needle = q.trim().toLowerCase();
  const rows = orders.filter((o) => {
    const st = o.status === "PAID" && o.tickets.length && o.tickets.every((t) => t.status === "CHECKED_IN") ? "checked" : o.status.toLowerCase();
    if (status !== "all" && st !== status) return false;
    if (!needle) return true;
    return [o.guestName, o.guestPhone, o.reference, ...o.tickets.map((t) => t.code)].some((v) => v.toLowerCase().includes(needle));
  });

  const publicUrl = `${process.env.APP_URL ?? ""}/e/${event.slug}`;
  const filter = (v: string, label: string) => (
    <a href={`?status=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={status === v}>
      {label}
    </a>
  );

  return (
    <div className="wrap main">
      <div className="main-head">
        <div>
          <h1>{fullTitle(event)}</h1>
          <p className="muted">
            {longDate(event.startsAt)} · {event.timeText} · {event.venue}
          </p>
          <p className="muted" style={{ fontSize: ".85rem" }}>
            Guest page: <a href={`/e/${event.slug}`} target="_blank">{publicUrl}</a>
            {!event.published && <span className="pill failed" style={{ marginLeft: 8 }}>Hidden from guests</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn" href={`/dashboard/events/${id}/messages`}>
            Messages{pendingMessages ? ` (${pendingMessages} new)` : ""}
          </a>
          <a className="btn" href={`/dashboard/events/${id}/export`}>
            Export CSV
          </a>
          <a className="btn primary" href={`/dashboard/events/${id}/checkin`}>
            Door check-in
          </a>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Seats sold</span>
          <b>{seatsSold}</b>
          <small>of {seatCap} available</small>
          <div className="bar">
            <i style={{ width: `${Math.min(100, seatCap ? (seatsSold / seatCap) * 100 : 0)}%` }} />
          </div>
        </div>
        <div className="kpi">
          <span>Revenue</span>
          <b>{kwacha(revenue)}</b>
          <small>{paid.length} paid orders</small>
        </div>
        <div className="kpi">
          <span>Payments in progress</span>
          <b>{recentPending.length}</b>
          <small>Started in the last 24 hours</small>
        </div>
        <div className="kpi">
          <span>Checked in</span>
          <b>{inside}</b>
          <small>of {seatsSold} expected</small>
        </div>
      </div>

      <div className="two">
        <section className="card chart">
          <div className="card-head">
            <h2>Sales, last 14 days</h2>
            <span className="muted" style={{ fontSize: ".8rem" }}>Kwacha received per day</span>
          </div>
          <SalesChart orders={paid} />
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Ticket types</h2>
          </div>
          <div className="payout">
            {tiers.map((t) => {
              const sold = paid.filter((o) => o.tierId === t.id).reduce((s, o) => s + o.quantity, 0);
              return (
                <div key={t.id}>
                  <span>
                    {t.name} <span className="muted">· {kwacha(t.priceNgwee)}</span>
                  </span>
                  <b>
                    {sold} / {t.capacity}
                  </b>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <span className="muted">Collected via Lenco</span>
              <b>{kwacha(revenue)}</b>
            </div>
            {feeRate > 0 && (
              <div>
                <span className="muted">Estimated fees ({(feeRate * 100).toFixed(1)}%)</span>
                <b>− {kwacha(fee)}</b>
              </div>
            )}
            {user.role === "OWNER" && (
              <form action={togglePublished.bind(null, id)}>
                <button className="btn" type="submit" style={{ width: "100%" }}>
                  {event.published ? "Hide guest page" : "Publish guest page"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Guests</h2>
          <div className="filters">
            <form>
              <input className="input" name="q" defaultValue={q} placeholder="Search name, phone or code" aria-label="Search guests" />
              <input type="hidden" name="status" value={status} />
            </form>
            <div className="seg" role="group" aria-label="Filter by status">
              {filter("all", "All")}
              {filter("paid", "Paid")}
              {filter("checked", "Checked in")}
              {filter("pending", "In progress")}
              {filter("failed", "Failed")}
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Phone</th>
                <th>Ticket</th>
                <th className="num">Qty</th>
                <th className="num">Amount</th>
                <th>Paid with</th>
                <th>Status</th>
                <th>Ticket codes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    {orders.length ? "No guests match." : "No registrations yet. Share the guest page link to start selling."}
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const used = o.tickets.filter((t) => t.status === "CHECKED_IN");
                return (
                  <tr key={o.id}>
                    <td>{o.guestName}</td>
                    <td>{prettyPhone(o.guestPhone)}</td>
                    <td>{o.tier.name}</td>
                    <td className="num">{o.quantity}</td>
                    <td className="num">{kwacha(o.amountNgwee)}</td>
                    <td>{OPERATOR_LABEL[o.method] ?? o.method}</td>
                    <td>
                      {o.status === "PAID" ? (
                        used.length ? (
                          <span className="pill checked">
                            {used.length === o.tickets.length ? "Checked in" : `${used.length} of ${o.tickets.length} in`} {clock(used[0].checkedInAt!)}
                          </span>
                        ) : (
                          <span className="pill paid">Paid</span>
                        )
                      ) : o.status === "PENDING" ? (
                        <span className="pill pending">In progress</span>
                      ) : (
                        <span className="pill failed" title={o.failureReason ?? ""}>
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="mono">{o.tickets.map((t) => t.code).join(", ") || "—"}</td>
                    <td>
                      {o.status !== "FAILED" && (
                        <form action={resendTicket.bind(null, o.id)}>
                          <button className="link-btn" type="submit">
                            {o.status === "PAID" ? "Resend ticket" : "Send reminder"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
