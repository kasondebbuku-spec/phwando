"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tier = { id: string; name: string; description: string; priceNgwee: number; left: number };
type Operator = "airtel" | "mtn" | "zamtel";

const NETWORKS: { id: Operator; label: string }[] = [
  { id: "airtel", label: "Airtel Money" },
  { id: "mtn", label: "MTN MoMo" },
  { id: "zamtel", label: "Zamtel Kwacha" },
];

const kwacha = (n: number) => (n === 0 ? "Free" : "K" + (n / 100).toLocaleString("en-GB"));

function guessOperator(phone: string): Operator | null {
  const d = phone.replace(/\D/g, "").replace(/^260/, "").replace(/^0/, "");
  return d[1] === "7" ? "airtel" : d[1] === "6" ? "mtn" : d[1] === "5" ? "zamtel" : null;
}

export default function RegisterPanel({ slug, tiers }: { slug: string; tiers: Tier[] }) {
  const router = useRouter();
  const firstOpen = tiers.find((t) => t.left > 0) ?? tiers[0];
  const [step, setStep] = useState<1 | 2>(1);
  const [tierId, setTierId] = useState(firstOpen?.id);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!firstOpen) return null;
  const tier = tiers.find((t) => t.id === tierId) ?? firstOpen;
  const total = tier.priceNgwee * qty;
  const soldOut = tiers.every((t) => t.left === 0);
  const maxQty = Math.min(10, tier.left);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/events/${slug}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId: tier.id, quantity: qty, name, phone, email, operator: operator ?? undefined, payPhone: payPhone || phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.error ?? "Something went wrong. Try again.");
    }
    // The ticket page waits for the payment to be approved, then shows the QR tickets.
    router.push(`/t/${body.reference}`);
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter your full name so we can put it on the ticket.");
    if (phone.replace(/\D/g, "").length < 9) return setError("Enter a phone number like 097X XXX XXX. Your ticket is sent there.");
    if (total === 0) return void submit();
    setPayPhone(payPhone || phone);
    setOperator(operator ?? guessOperator(phone));
    setStep(2);
  }

  const steps = ["Details", total ? "Pay" : "Confirm", "Ticket"];
  const stepBar = (
    <div className="steps">
      {steps.map((s, i) => (
        <span key={s} aria-current={i + 1 === step ? "step" : undefined}>
          {s}
        </span>
      ))}
    </div>
  );

  if (soldOut) {
    return (
      <section className="panel">
        <h2>Sold out</h2>
        <p className="note">All tickets have been taken. Contact the organisers if you&apos;d like to join a waiting list.</p>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="panel" aria-live="polite">
        <h2>Pay {kwacha(total)}</h2>
        {stepBar}
        <p className="note">
          {qty} × {tier.name} for {name}
        </p>
        <div className="networks" role="group" aria-label="Mobile money network">
          {NETWORKS.map((n) => (
            <button type="button" key={n.id} className="net" aria-pressed={operator === n.id} onClick={() => setOperator(n.id)}>
              <strong>{n.label}</strong>
              <small>Prompt on your phone</small>
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="p-phone">Number that will pay</label>
          <input className="input" id="p-phone" inputMode="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="e-actions">
          <button className="e-btn" onClick={submit} disabled={busy || !operator}>
            {busy ? "Sending prompt…" : `Pay ${kwacha(total)}`}
          </button>
          <button className="e-btn ghost" onClick={() => setStep(1)} disabled={busy}>
            Back
          </button>
        </div>
        <p className="note">You&apos;ll get a prompt on your phone. Enter your PIN to approve, and your ticket is issued straight away.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Get your ticket</h2>
      {stepBar}
      <form onSubmit={next} style={{ display: "grid", gap: 16 }} noValidate>
        <div className="tiers">
          {tiers.map((t) => (
            <label className="tier" key={t.id} data-soldout={t.left === 0}>
              <input type="radio" name="tier" value={t.id} checked={t.id === tier.id} disabled={t.left === 0} onChange={() => { setTierId(t.id); setQty(1); }} />
              <span>
                <strong>{t.name}</strong>
                <small>
                  {t.description}
                  {t.left === 0 ? " · Sold out" : t.left <= 10 ? ` · Only ${t.left} left` : ""}
                </small>
              </span>
              <span className="price">{kwacha(t.priceNgwee)}</span>
            </label>
          ))}
        </div>
        <div className="field">
          <label htmlFor="r-name">Full name</label>
          <input className="input" id="r-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As it should appear on your ticket" />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="r-phone">Phone (WhatsApp)</label>
            <input className="input" id="r-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="097X XXX XXX" />
          </div>
          <div className="field">
            <label htmlFor="r-email">Email (optional)</label>
            <input className="input" id="r-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="note">How many?</span>
          <div className="qty">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One less">
              −
            </button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="One more">
              +
            </button>
          </div>
        </div>
        <div className="total">
          <span>Total</span>
          <b>{kwacha(total)}</b>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="e-btn" type="submit" disabled={busy}>
          {total ? "Continue to payment" : busy ? "Confirming…" : "Confirm my place"}
        </button>
      </form>
    </section>
  );
}
