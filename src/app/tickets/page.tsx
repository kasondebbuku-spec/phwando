"use client";

import Link from "next/link";
import { useState } from "react";

type Found = { reference: string; event: string; startsAt: string; timeText: string; venue: string; tier: string; quantity: number; status: string };

export default function FindTicketPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [orders, setOrders] = useState<Found[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Try again.");
      return null;
    }
    return json;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/tickets/code", { phone });
    if (r) {
      setDevCode(r.devCode);
      setStep(2);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const r = await post("/api/tickets/verify", { phone, code });
    if (r) {
      setOrders(r.orders);
      setStep(3);
    }
  }

  return (
    <main className="page">
      <div className="narrow">
        <div>
          <Link href="/" className="brand" style={{ marginBottom: 20 }}>
            <span className="brand-mark">P</span>Phwando
          </Link>
          <h1>Find my ticket</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Lost the SMS? Get your QR ticket back with a one-time code sent to your phone.
          </p>
        </div>

        {step === 1 && (
          <form className="card" onSubmit={sendCode}>
            <div className="field">
              <label htmlFor="lk-phone">Phone number you registered with</label>
              <input className="input" id="lk-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="097X XXX XXX" required />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send me a code"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="card" onSubmit={verify}>
            <div className="field">
              <label htmlFor="lk-otp">6-digit code sent to {phone}</label>
              <input className="input mono" id="lk-otp" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
            </div>
            {devCode && (
              <p className="pill pending" style={{ justifySelf: "start" }}>
                Development only: your code is {devCode}
              </p>
            )}
            {error && <p className="error">{error}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn primary" type="submit" disabled={busy}>
                Show my tickets
              </button>
              <button className="btn" type="button" onClick={() => { setStep(1); setCode(""); setError(""); }}>
                Use a different number
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <>
            {orders.length === 0 && (
              <div className="card">
                <strong>No tickets for {phone}</strong>
                <span className="muted">Check the number, or register on the event page.</span>
              </div>
            )}
            {orders.map((o) => (
              <a key={o.reference} href={`/t/${o.reference}`} className="card" style={{ textDecoration: "none" }}>
                <strong>{o.event}</strong>
                <span className="muted">
                  {new Date(o.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {o.timeText} · {o.venue}
                </span>
                <span>
                  {o.quantity} × {o.tier}{" "}
                  {o.status === "PAID" ? <span className="pill paid">Paid</span> : <span className="pill pending">Awaiting payment</span>}
                </span>
                <span className="link-btn">Open ticket →</span>
              </a>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
