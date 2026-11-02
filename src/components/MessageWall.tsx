"use client";

import { useRef, useState } from "react";

export type WallMessage = { id: string; name: string; relation: string | null; text: string; photoPath: string | null; createdAt: string };

type Props = {
  slug: string;
  heading: string;
  honoree: string | null; // e.g. "Pastor Benjamin Mwape"
  moderated: boolean;
  initial: WallMessage[];
};

export default function MessageWall({ slug, heading, honoree, moderated, initial }: Props) {
  const [messages, setMessages] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<null | "PRIVATE" | "PENDING" | "APPROVED">(null);
  const formRef = useRef<HTMLFormElement>(null);
  const who = honoree || "the host";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/events/${slug}/messages`, { method: "POST", body: new FormData(e.currentTarget) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Your message could not be sent. Try again.");
    if (body.message) setMessages([{ ...body.message, createdAt: body.message.createdAt }, ...messages]);
    setSent(body.visibility === "PRIVATE" ? "PRIVATE" : body.status);
    formRef.current?.reset();
  }

  return (
    <section className="wall" id="messages">
      <div className="wall-head">
        <h2>{heading}</h2>
        <span className="note">You don&apos;t need a ticket to send a message</span>
      </div>

      <div className="e-grid" style={{ paddingTop: 0 }}>
        <div className="e-section">
          <p>
            Share a message, a prayer or blessing, or a memory of how {who} has touched your life.
            {honoree && <> Every approved message is collected into a keepsake book presented to {who} on the day.</>}
          </p>
          {sent && (
            <p className="note" role="status" style={{ border: "1px solid var(--e-accent)", padding: 14, color: "var(--e-ink)" }}>
              {sent === "PRIVATE"
                ? `Thank you. Your message will go straight into the book for ${who}.`
                : sent === "PENDING"
                  ? "Thank you. Your message will appear on the wall once an organiser approves it."
                  : "Thank you. Your message is on the wall."}
            </p>
          )}
        </div>

        <form ref={formRef} className="panel" onSubmit={submit} encType="multipart/form-data">
          <h2>Send a message</h2>
          <div className="row2">
            <div className="field">
              <label htmlFor="m-name">Your name</label>
              <input className="input" id="m-name" name="name" required maxLength={60} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="m-relation">How you know {honoree ? "them" : "the host"} (optional)</label>
              <input className="input" id="m-relation" name="relation" maxLength={80} placeholder="e.g. Church member since 2015" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="m-text">Your message, prayer or blessing</label>
            <textarea className="input" id="m-text" name="text" required maxLength={1500} rows={4} placeholder={honoree ? `Dear ${honoree.split(" ").slice(0, 2).join(" ")}…` : "Write your message…"} />
          </div>
          <div className="field">
            <label htmlFor="m-memory">A favourite memory or testimony (optional)</label>
            <textarea className="input" id="m-memory" name="memory" maxLength={1500} rows={3} placeholder="A moment you'll never forget…" />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="m-photo">Add a photo (optional)</label>
              <input className="input" id="m-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            </div>
            <div className="field">
              <label htmlFor="m-email">Your email (optional, never shown)</label>
              <input className="input" id="m-email" name="email" type="email" maxLength={120} autoComplete="email" />
            </div>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ color: "var(--e-muted)", fontSize: ".82rem", marginBottom: 6 }}>Who should see your message?</legend>
            <label className="tier">
              <input type="radio" name="visibility" value="PUBLIC" defaultChecked />
              <span>
                <strong>Show it on the public wall{moderated ? " after approval" : ""}</strong>
                <small>Also included in the book.</small>
              </span>
              <span />
            </label>
            <label className="tier">
              <input type="radio" name="visibility" value="PRIVATE" />
              <span>
                <strong>Only {who} and the organisers</strong>
                <small>Included in the book, never shown publicly.</small>
              </span>
              <span />
            </label>
          </fieldset>
          {error && <p className="error">{error}</p>}
          <button className="e-btn" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send my message"}
          </button>
        </form>
      </div>

      <div className="notes">
        {messages.length === 0 && <p className="note">No messages on the wall yet. Be the first.</p>}
        {messages.map((m) => (
          <article className="note-card" key={m.id}>
            {m.photoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/uploads/${m.photoPath}`} alt="" style={{ width: "100%", marginBottom: 12 }} loading="lazy" />
            )}
            <p>“{m.text}”</p>
            <span>
              — {m.name}
              {m.relation ? `, ${m.relation}` : ""} · {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
