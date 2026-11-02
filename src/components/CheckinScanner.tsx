"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { checkIn, type CheckinResult } from "@/app/dashboard/actions";

// Minimal typing for the browser's built-in QR reader (Chrome on Android, Edge, Samsung Internet).
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function CheckinScanner({ eventId, expected, initialInside }: { eventId: string; expected: number; initialInside: number }) {
  const [inside, setInside] = useState(initialInside);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState<"off" | "on" | "unsupported" | "denied">("off");
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const submit = useCallback(
    (raw: string) => {
      const c = raw.trim();
      if (!c) return;
      start(async () => {
        const r = await checkIn(eventId, c);
        setResult(r);
        if (r.kind === "ok") {
          setInside((n) => n + r.admits);
          navigator.vibrate?.(80);
        } else {
          navigator.vibrate?.([60, 60, 60]);
        }
      });
    },
    [eventId],
  );

  useEffect(() => {
    if (camera !== "on") return;
    let stopped = false;
    const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
    async function loop() {
      if (stopped || !videoRef.current) return;
      try {
        const found = await detector.detect(videoRef.current);
        const value = found[0]?.rawValue;
        const now = Date.now();
        // Ignore the same code held in front of the camera for a few seconds.
        if (value && (value !== lastScan.current.code || now - lastScan.current.at > 4000)) {
          lastScan.current = { code: value, at: now };
          submit(value);
        }
      } catch {
        // frame not ready yet
      }
      setTimeout(loop, 350);
    }
    loop();
    return () => {
      stopped = true;
    };
  }, [camera, submit]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function startCamera() {
    if (!window.BarcodeDetector || !navigator.mediaDevices) return setCamera("unsupported");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamera("on");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      setCamera("denied");
    }
  }

  return (
    <>
      <p className="muted" style={{ margin: 0 }}>
        <strong style={{ color: "var(--ink)" }}>{inside}</strong> of {expected} guests inside
      </p>
      <div className="bar">
        <i style={{ width: `${expected ? Math.min(100, (inside / expected) * 100) : 0}%` }} />
      </div>

      <div className="scan-box">
        {camera === "on" && <video ref={videoRef} playsInline muted />}
        <div className="frame" />
        {camera !== "on" && (
          <p>
            {camera === "unsupported"
              ? "This browser can't scan QR codes. Use Chrome on Android, or type the code below."
              : camera === "denied"
                ? "Camera access was blocked. Allow it in the browser settings, or type the code below."
                : ""}
          </p>
        )}
        {camera === "off" && (
          <button className="btn primary" onClick={startCamera} style={{ position: "absolute" }}>
            Start camera
          </button>
        )}
      </div>

      <form
        style={{ display: "flex", gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
          setCode("");
        }}
      >
        <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or type a ticket code" aria-label="Ticket code" style={{ flex: 1, minWidth: 0 }} autoCapitalize="characters" />
        <button className="btn primary" type="submit" disabled={pending}>
          Check in
        </button>
      </form>

      <div aria-live="polite">
        {result?.kind === "ok" && (
          <div className="result ok">
            <b>Admit {result.admits}</b>
            <span>
              {result.name} · {result.tier}
            </span>
            <span className="mono">{result.code}</span>
          </div>
        )}
        {result?.kind === "used" && (
          <div className="result warn">
            <b>Already checked in</b>
            <span>
              {result.name} entered at {time(result.at)}
              {result.by ? ` (scanned by ${result.by})` : ""}. Check ID before admitting.
            </span>
          </div>
        )}
        {result?.kind === "unpaid" && (
          <div className="result warn">
            <b>Payment not completed</b>
            <span>{result.name} can pay on the event page from their phone.</span>
          </div>
        )}
        {result?.kind === "none" && (
          <div className="result bad">
            <b>Ticket not found</b>
            <span>{result.code} is not a ticket for this event.</span>
          </div>
        )}
      </div>
    </>
  );
}
