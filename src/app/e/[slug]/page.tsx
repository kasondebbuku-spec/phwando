import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { fullTitle, longDate } from "@/lib/format";
import { getTemplate, themeStyle } from "@/lib/themes";
import Countdown from "@/components/Countdown";
import RegisterPanel from "@/components/RegisterPanel";
import MessageWall from "@/components/MessageWall";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.event.findUnique({
    where: { slug },
    include: {
      tiers: { orderBy: { sortOrder: "asc" } },
      messages: { where: { status: "APPROVED", visibility: "PUBLIC" }, orderBy: { createdAt: "desc" }, take: 60 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await load((await params).slug);
  if (!event) return {};
  return {
    title: fullTitle(event),
    description: `${longDate(event.startsAt)} · ${event.timeText} · ${event.venue}`,
    openGraph: { title: fullTitle(event), description: `${longDate(event.startsAt)} · ${event.venue}` },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await load((await params).slug);
  if (!event || !event.published) notFound();
  const t = getTemplate(event.template);

  // Seats still available per tier (paid orders plus payments started in the last 15 minutes).
  const held = await db.order.groupBy({
    by: ["tierId"],
    where: {
      eventId: event.id,
      OR: [{ status: "PAID" }, { status: "PENDING", createdAt: { gte: new Date(Date.now() - 15 * 60e3) } }],
    },
    _sum: { quantity: true },
  });
  const tiers = event.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    description: tier.description,
    priceNgwee: tier.priceNgwee,
    left: Math.max(0, tier.capacity - (held.find((h) => h.tierId === tier.id)?._sum.quantity ?? 0)),
  }));
  const isPast = event.startsAt.getTime() + 6 * 3600e3 < Date.now();

  return (
    <div className="event" style={themeStyle(event.theme)}>
      <div className="inner">
        <section className="e-hero">
          <div>
            <p className="e-kicker">
              {t.kicker} · hosted by {event.host}
            </p>
            <h1 className="e-title">
              {event.titleLead && (
                <>
                  {event.titleLead}
                  <br />
                </>
              )}
              <em>{event.title}</em>
            </h1>
            {event.subtitle && <p className="e-sub">{event.subtitle}</p>}
          </div>
          <div className="e-facts">
            <div className="e-fact">
              <span>When</span>
              <span>
                {longDate(event.startsAt)}
                <br />
                {event.timeText}
              </span>
            </div>
            <div className="e-fact">
              <span>Where</span>
              <span>{event.venue}</span>
            </div>
            {event.dressCode && (
              <div className="e-fact">
                <span>Dress</span>
                <span>{event.dressCode}</span>
              </div>
            )}
          </div>
        </section>

        <Countdown startsAt={event.startsAt.toISOString()} />

        <div className="e-grid">
          <section className="e-section">
            <h2>The celebration</h2>
            {event.about && <p>{event.about}</p>}
            {event.verseText && (
              <blockquote className="verse">
                “{event.verseText}”{event.verseRef && <cite>{event.verseRef}</cite>}
              </blockquote>
            )}
            <p style={{ fontFamily: "var(--ui)", fontSize: ".9rem", color: "var(--e-muted)" }}>
              Already registered? <a href="/tickets">Find your ticket</a> with your phone number.
            </p>
          </section>
          {isPast ? (
            <section className="panel">
              <h2>This event has taken place</h2>
              <p className="note">Thank you to everyone who celebrated with us.</p>
            </section>
          ) : (
            <RegisterPanel slug={event.slug} tiers={tiers} />
          )}
        </div>

        <MessageWall
          slug={event.slug}
          heading={t.wall}
          honoree={event.honoree}
          moderated={event.moderateWall}
          initial={event.messages.map((m) => ({
            id: m.id,
            name: m.name,
            relation: m.relation,
            text: m.text,
            photoPath: m.photoPath,
            createdAt: m.createdAt.toISOString(),
          }))}
        />

        <footer className="e-foot">
          <span>
            © {event.startsAt.getFullYear()} {event.host} · {event.venue}
          </span>
          <span>
            Tickets by <Link href="/">Phwando</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
