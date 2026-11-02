import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { refreshPendingOrder } from "@/lib/orders";
import { fullTitle, kwacha, longDate, shortDate, clock } from "@/lib/format";
import { OPERATOR_LABEL, prettyPhone } from "@/lib/phone";
import { themeStyle } from "@/lib/themes";
import PaymentWaiter from "@/components/PaymentWaiter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your ticket", robots: { index: false } };

function calendarLink(e: { titleLead: string; title: string; startsAt: Date; venue: string }) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(e.startsAt.getTime() + 4 * 3600e3);
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({ action: "TEMPLATE", text: fullTitle(e), dates: `${f(e.startsAt)}/${f(end)}`, location: e.venue })
  );
}

// The guest's private ticket page. The reference in the URL is the key, so it is only shared by SMS.
export default async function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  await refreshPendingOrder(reference);
  const order = await db.order.findUnique({
    where: { reference },
    include: { event: true, tier: true, tickets: { orderBy: { code: "asc" } } },
  });
  if (!order) notFound();
  const ev = order.event;

  let body: React.ReactNode;
  if (order.status === "PENDING") {
    body = (
      <section className="panel" aria-live="polite">
        <h2>Approve on your phone</h2>
        <div className="wait">
          <div className="spinner" aria-hidden="true" />
          <p style={{ margin: 0 }}>
            We&apos;ve sent a {OPERATOR_LABEL[order.method] ?? "mobile money"} prompt to <strong>{prettyPhone(order.payPhone ?? order.guestPhone)}</strong>.
            <br />
            Enter your PIN to approve <strong>{kwacha(order.amountNgwee)}</strong>.
          </p>
          <p className="note">Keep this page open. Your ticket appears here as soon as the payment clears.</p>
        </div>
        <PaymentWaiter reference={reference} />
      </section>
    );
  } else if (order.status === "FAILED") {
    body = (
      <section className="panel">
        <h2>Payment not completed</h2>
        <p>{order.failureReason || "The payment was declined or timed out."}</p>
        <p className="note">No money was taken for this attempt. You can try again with the same or a different number.</p>
        <div className="e-actions">
          <a className="e-btn" href={`/e/${ev.slug}`}>
            Try again
          </a>
        </div>
      </section>
    );
  } else {
    const qrs = await Promise.all(order.tickets.map((t) => QRCode.toDataURL(t.code, { margin: 1, width: 300, errorCorrectionLevel: "M" })));
    const share = `I'm going to ${fullTitle(ev)} on ${longDate(ev.startsAt)}! ${process.env.APP_URL ?? ""}/e/${ev.slug}`;
    body = (
      <section className="panel">
        <h2>You&apos;re in, {order.guestName.split(" ")[0]}!</h2>
        <p className="note">
          Show {order.tickets.length > 1 ? "each QR code" : "this QR code"} at the door. Save this page or take a screenshot. A link was also sent by SMS to {prettyPhone(order.guestPhone)}.
        </p>
        {order.tickets.map((t, i) => (
          <div className="ticket" key={t.id} data-used={t.status === "CHECKED_IN"}>
            <div style={{ minWidth: 0 }}>
              <h3>{fullTitle(ev)}</h3>
              <dl>
                <dt>Guest</dt>
                <dd>{order.guestName}</dd>
                <dt>Ticket</dt>
                <dd>
                  {order.tier.name}
                  {t.admits > 1 ? ` · admits ${t.admits}` : ""}
                  {order.tickets.length > 1 ? ` · ${i + 1} of ${order.tickets.length}` : ""}
                </dd>
                <dt>When</dt>
                <dd>
                  {shortDate(ev.startsAt)} · {ev.timeText}
                </dd>
                <dt>Where</dt>
                <dd>{ev.venue}</dd>
                <dt>Code</dt>
                <dd className="mono">{t.code}</dd>
                {t.status === "CHECKED_IN" && t.checkedInAt && (
                  <>
                    <dt>Used</dt>
                    <dd>Checked in at {clock(t.checkedInAt)}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrs[i]} alt={`QR code for ticket ${t.code}`} />
            </div>
          </div>
        ))}
        <div className="e-actions">
          <a className="e-btn" href={calendarLink(ev)} target="_blank" rel="noopener">
            Add to calendar
          </a>
          <a className="e-btn ghost" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener">
            Share on WhatsApp
          </a>
        </div>
        <p className="note">
          Paid {kwacha(order.amountNgwee)}
          {order.method !== "free" ? ` with ${OPERATOR_LABEL[order.method]}` : ""} · Order {order.reference}
        </p>
      </section>
    );
  }

  return (
    <div className="event" style={themeStyle(ev.theme)}>
      <div className="inner" style={{ maxWidth: 640, paddingTop: 40, display: "grid", gap: 24 }}>
        <a href={`/e/${ev.slug}`} className="e-kicker" style={{ textDecoration: "none" }}>
          ← {fullTitle(ev)}
        </a>
        {body}
      </div>
    </div>
  );
}
