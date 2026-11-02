"use client";

import { useEffect, useState } from "react";

export default function Countdown({ startsAt }: { startsAt: string }) {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <div className="e-count" aria-hidden="true" style={{ minHeight: 80 }} />;
  const ms = target - now;
  if (ms <= 0) {
    return (
      <div className="e-count">
        <span className="lbl">{ms > -6 * 3600e3 ? "Happening now" : "This event has taken place"}</span>
      </div>
    );
  }
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return (
    <div className="e-count" aria-label={`${d} days, ${h} hours and ${m} minutes to go`}>
      <span className="lbl">Counting down</span>
      <span>
        <b>{d}</b>
        <small>days</small>
      </span>
      <span>
        <b>{String(h).padStart(2, "0")}</b>
        <small>hrs</small>
      </span>
      <span>
        <b>{String(m).padStart(2, "0")}</b>
        <small>min</small>
      </span>
    </div>
  );
}
