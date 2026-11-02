import { db } from "@/lib/db";
import { requireEvent } from "@/lib/auth";
import { fullTitle, longDate } from "@/lib/format";
import { themeStyle } from "@/lib/themes";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Message book" };

// Every approved message (public and private), laid out as a keepsake book.
// Organisers print it, save it as PDF from the browser, or present it on a screen.
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id);
  const messages = await db.message.findMany({ where: { eventId: id, status: "APPROVED" }, orderBy: { createdAt: "asc" } });
  const honoree = event.honoree || fullTitle(event);

  return (
    <div className="event book" style={themeStyle(event.theme)}>
      <style>{`
        .book-page { max-width: 720px; margin: 0 auto; padding-block: 64px; display: grid; gap: 48px; }
        .book-cover { text-align: center; display: grid; gap: 14px; padding-block: 12vh; border-bottom: 1px solid var(--e-line); }
        .book-entry { display: grid; gap: 12px; break-inside: avoid; page-break-inside: avoid; }
        .book-entry p { margin: 0; white-space: pre-line; }
        .book-entry .text { font-size: 1.35rem; font-style: italic; }
        .book-entry .by { font-family: var(--ui); font-size: .85rem; color: var(--e-muted); }
        .book-entry img { max-width: 100%; max-height: 360px; object-fit: contain; justify-self: start; }
        .book-tools { position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end; padding: 12px 0; font-family: var(--ui); }
        @media print { .book-tools, .appbar { display: none !important; } .page { padding: 0; } .event.book { background: #fff !important; color: #111 !important; } .book-entry .by { color: #555; } }
      `}</style>
      <div className="book-page">
        <div className="book-tools">
          <a className="e-btn ghost" href={`/dashboard/events/${id}/messages`}>Back to messages</a>
          <PrintButton />
        </div>
        <section className="book-cover">
          <p className="e-kicker">{longDate(event.startsAt)}</p>
          <h1 className="e-title">
            For <em>{honoree}</em>
          </h1>
          <p className="e-sub">
            {messages.length} message{messages.length === 1 ? "" : "s"} from the people whose lives you have touched
          </p>
        </section>
        {messages.length === 0 && <p className="note">No approved messages yet.</p>}
        {messages.map((m) => (
          <article key={m.id} className="book-entry">
            {m.photoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/uploads/${m.photoPath}`} alt="" />
            )}
            <p className="text">“{m.text}”</p>
            {m.memory && <p>{m.memory}</p>}
            <p className="by">
              — {m.name}
              {m.relation ? `, ${m.relation}` : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
