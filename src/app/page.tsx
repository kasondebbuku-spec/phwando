import Link from "next/link";
import { THEMES } from "@/lib/themes";

export default function Home() {
  const t = THEMES.ruby;
  return (
    <main className="page">
      <div className="wrap" style={{ display: "grid", gap: 40, paddingTop: "6vh" }}>
        <Link href="/" className="brand">
          <span className="brand-mark">P</span>Phwando
        </Link>
        <section style={{ display: "grid", gap: 18, maxWidth: 680 }}>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 400, fontSize: "clamp(2.4rem, 6vw, 4rem)", lineHeight: 1.05, margin: 0, textWrap: "balance" }}>
            Invitations, tickets and the door, <em style={{ color: "var(--accent)" }}>in one place</em>.
          </h1>
          <p className="muted" style={{ fontSize: "1.1rem", margin: 0, maxWidth: "56ch" }}>
            For hotels, venues, churches and families. Publish a beautiful event page, take payment by Airtel Money, MTN MoMo or Zamtel Kwacha, send QR tickets by SMS and check guests in from any phone.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn primary" href="/login">
              Organiser sign in
            </a>
            <a className="btn" href="/tickets">
              Find my ticket
            </a>
          </div>
        </section>
        <section className="kpis" aria-label="What's included">
          {[
            ["Event page", "Themed for birthdays, weddings, galas, conferences and church events."],
            ["Mobile money", "Payments confirm automatically through Lenco. No screenshots to check."],
            ["QR tickets", "Sent by SMS. Guests recover lost tickets with a one-time code."],
            ["Door check-in", "Scan with a phone camera. Each ticket admits once."],
          ].map(([h, p]) => (
            <div className="kpi" key={h} style={{ borderTop: `3px solid ${t.accent}` }}>
              <strong>{h}</strong>
              <small style={{ fontSize: ".88rem" }}>{p}</small>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
