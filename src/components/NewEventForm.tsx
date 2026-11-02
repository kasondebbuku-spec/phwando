"use client";

import { useActionState, useState } from "react";
import { createEvent, type FormState } from "@/app/dashboard/actions";
import { TEMPLATES, THEMES } from "@/lib/themes";

type TierDraft = { key: number; name: string; price: string; seats: string; capacity: string };

export default function NewEventForm({ defaultHost }: { defaultHost: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createEvent, {});
  const [template, setTemplate] = useState("birthday");
  const [theme, setTheme] = useState(TEMPLATES[0].theme);
  const [tiers, setTiers] = useState<TierDraft[]>([{ key: 1, name: "General admission", price: "250", seats: "1", capacity: "150" }]);

  const update = (key: number, patch: Partial<TierDraft>) => setTiers(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  return (
    <form action={action} className="main">
      <section className="card">
        <div className="card-head">
          <h2>Type of event</h2>
        </div>
        <div className="templates">
          {TEMPLATES.map((t) => {
            const th = THEMES[t.theme];
            return (
              <label key={t.id} className="tpl">
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={template === t.id}
                  onChange={() => {
                    setTemplate(t.id);
                    setTheme(t.theme);
                  }}
                />
                <span className="chip" style={{ background: th.bg, color: th.accent }}>
                  Aa
                </span>
                {t.label}
              </label>
            );
          })}
        </div>
        <div className="field">
          <label htmlFor="theme">Colour theme</label>
          <select className="input" id="theme" name="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {Object.entries(THEMES).map(([id, t]) => (
              <option key={id} value={id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Details</h2>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="titleLead">Line above the name (optional)</label>
            <input className="input" id="titleLead" name="titleLead" placeholder="e.g. Happy 40th Birthday," />
          </div>
          <div className="field">
            <label htmlFor="title">Event name</label>
            <input className="input" id="title" name="title" required placeholder="e.g. Pastor Benjamin Mwape" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="honoree">Who it honours (optional)</label>
            <input className="input" id="honoree" name="honoree" placeholder="Used on the message wall and book" />
          </div>
          <div className="field">
            <label htmlFor="subtitle">Tagline (optional)</label>
            <input className="input" id="subtitle" name="subtitle" placeholder="e.g. Celebrating forty years of God's faithfulness" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="about">About the event</label>
          <textarea className="input" id="about" name="about" rows={4} placeholder="What guests can expect on the day" />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="verseText">Scripture or quote (optional)</label>
            <input className="input" id="verseText" name="verseText" />
          </div>
          <div className="field">
            <label htmlFor="verseRef">Reference (optional)</label>
            <input className="input" id="verseRef" name="verseRef" placeholder="e.g. Numbers 6:24–25" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="host">Hosted by</label>
            <input className="input" id="host" name="host" required defaultValue={defaultHost} />
          </div>
          <div className="field">
            <label htmlFor="venue">Venue</label>
            <input className="input" id="venue" name="venue" required placeholder="e.g. Falls Way Events, Main Hall" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input className="input" id="date" name="date" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="time">Start time (Zambian time)</label>
            <input className="input" id="time" name="time" type="time" required defaultValue="18:00" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="timeText">Time as guests should see it (optional)</label>
            <input className="input" id="timeText" name="timeText" placeholder="e.g. 6 pm till late" />
          </div>
          <div className="field">
            <label htmlFor="dressCode">Dress code (optional)</label>
            <input className="input" id="dressCode" name="dressCode" placeholder="e.g. Smart / formal" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="code">Ticket code prefix (optional)</label>
            <input className="input mono" id="code" name="code" maxLength={6} placeholder="e.g. BM40" />
          </div>
          <label className="field" style={{ alignContent: "end" }}>
            <span className="lbl">Message wall</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="moderateWall" defaultChecked /> Approve public messages before they show
            </span>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Tickets</h2>
          <span className="muted" style={{ fontSize: ".82rem" }}>Price 0 makes it a free RSVP</span>
        </div>
        <div className="tier-rows">
          {tiers.map((t) => (
            <div className="tier-row" key={t.key}>
              <div className="field">
                <label>Ticket name</label>
                <input className="input" name="tierName" value={t.name} onChange={(e) => update(t.key, { name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Price (K)</label>
                <input className="input" name="tierPrice" type="number" min="0" step="1" value={t.price} onChange={(e) => update(t.key, { price: e.target.value })} />
              </div>
              <div className="field">
                <label>People per ticket</label>
                <input className="input" name="tierSeats" type="number" min="1" value={t.seats} onChange={(e) => update(t.key, { seats: e.target.value })} />
              </div>
              <div className="field">
                <label>How many to sell</label>
                <input className="input" name="tierCapacity" type="number" min="1" value={t.capacity} onChange={(e) => update(t.key, { capacity: e.target.value })} />
              </div>
              <button type="button" className="btn" onClick={() => setTiers(tiers.filter((x) => x.key !== t.key))} disabled={tiers.length === 1} aria-label={`Remove ${t.name}`}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn"
          style={{ justifySelf: "start" }}
          onClick={() => setTiers([...tiers, { key: Date.now(), name: "Table of 8", price: "3600", seats: "8", capacity: "10" }])}
        >
          + Add ticket type
        </button>
      </section>

      {state.error && <p className="error">{state.error}</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: "start", padding: "12px 22px" }}>
        {pending ? "Creating…" : "Create event & guest page"}
      </button>
    </form>
  );
}
