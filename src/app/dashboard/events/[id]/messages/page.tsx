import { db } from "@/lib/db";
import { requireEvent } from "@/lib/auth";
import { fullTitle, shortDate } from "@/lib/format";
import { setMessageStatus } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

const TABS = [
  ["PENDING", "To approve"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
] as const;

export default async function MessagesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = ((await searchParams).tab ?? "PENDING") as (typeof TABS)[number][0];
  const { event } = await requireEvent(id);

  const [messages, counts] = await Promise.all([
    db.message.findMany({ where: { eventId: id, status: tab }, orderBy: { createdAt: "desc" } }),
    db.message.groupBy({ by: ["status"], where: { eventId: id }, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="wrap main" style={{ maxWidth: 820 }}>
      <div className="main-head">
        <div>
          <a href={`/dashboard/events/${id}`} className="muted" style={{ fontSize: ".85rem" }}>
            ← {fullTitle(event)}
          </a>
          <h1>Messages</h1>
          <p className="muted">
            Approve messages before they appear on the public wall. Private messages are never shown publicly, but approved ones go into the book.
          </p>
        </div>
        <a className="btn primary" href={`/dashboard/events/${id}/book`} target="_blank">
          Open the book ({count("APPROVED")})
        </a>
      </div>

      <div className="seg" role="group" aria-label="Filter messages" style={{ justifySelf: "start" }}>
        {TABS.map(([v, label]) => (
          <a key={v} href={`?tab=${v}`} aria-current={tab === v}>
            {label} ({count(v)})
          </a>
        ))}
      </div>

      {messages.length === 0 && <div className="card muted">Nothing here.</div>}
      {messages.map((m) => (
        <article key={m.id} className="card">
          <div className="card-head">
            <strong>
              {m.name}
              {m.relation && <span className="muted" style={{ fontWeight: 400 }}> · {m.relation}</span>}
            </strong>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`pill ${m.visibility === "PUBLIC" ? "paid" : "checked"}`}>{m.visibility === "PUBLIC" ? "Wall + book" : "Private · book only"}</span>
              <span className="muted" style={{ fontSize: ".8rem" }}>{shortDate(m.createdAt)}</span>
            </span>
          </div>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{m.text}</p>
          {m.memory && (
            <p style={{ margin: 0, whiteSpace: "pre-line" }} className="muted">
              <strong>Memory:</strong> {m.memory}
            </p>
          )}
          {m.photoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/uploads/${m.photoPath}`} alt={`Photo from ${m.name}`} style={{ maxWidth: 260, borderRadius: 10 }} />
          )}
          {m.email && <span className="muted" style={{ fontSize: ".82rem" }}>{m.email}</span>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {m.status !== "APPROVED" && (
              <form action={setMessageStatus.bind(null, m.id, "APPROVED")}>
                <button className="btn primary" type="submit">Approve</button>
              </form>
            )}
            {m.status !== "REJECTED" && (
              <form action={setMessageStatus.bind(null, m.id, "REJECTED")}>
                <button className="btn" type="submit">Reject</button>
              </form>
            )}
            {m.status !== "PENDING" && (
              <form action={setMessageStatus.bind(null, m.id, "PENDING")}>
                <button className="btn" type="submit">Move back to review</button>
              </form>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
