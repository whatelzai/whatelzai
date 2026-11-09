"use client";
import { useEffect, useRef, useState } from "react";
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
export default function Scanner({
  initialTicket = "",
}: {
  initialTicket?: string;
}) {
  const [ticket, setTicket] = useState(initialTicket),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    stop();
    const ctor = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;
    if (!ctor) {
      setMessage(
        "Use your phone camera to open the ticket, then tap Organizer check-in. You can also paste the ticket link below.",
      );
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (!video.current) return stop();
      video.current.srcObject = stream.current;
      await video.current.play();
      const detector = new ctor({ formats: ["qr_code"] });
      async function scan() {
        if (!stream.current || !video.current) return;
        try {
          const codes = await detector.detect(video.current);
          if (codes[0]) {
            setTicket(codes[0].rawValue);
            setMessage("Ticket scanned. Confirm check-in below.");
            stop();
            return;
          }
        } catch {
          setMessage("Camera scan failed; paste the ticket link instead.");
          stop();
          return;
        }
        timer.current = setTimeout(scan, 250);
      }
      setMessage("Point the camera at the attendee’s QR code.");
      void scan();
    } catch {
      stop();
      setMessage("Camera unavailable. Paste the ticket link below.");
    }
  }
  async function checkin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    stop();
    try {
      const response = await fetch("/api/event-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const result = await response.json();
      setMessage(
        result.error ??
          `${result.status === "checked_in" ? "Checked in" : "Already checked in"}: ${result.name} · ${new Date(result.at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}`,
      );
    } catch {
      setMessage("Connection failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <button type="button" onClick={start}>
        Scan QR with camera
      </button>{" "}
      <button type="button" onClick={stop}>
        Stop camera
      </button>
      <video
        ref={video}
        muted
        playsInline
        style={{
          width: "100%",
          maxWidth: 480,
          display: "block",
          marginBlock: 16,
        }}
        aria-label="QR camera preview"
      />
      <form onSubmit={checkin}>
        <label htmlFor="ticket">Ticket link or ID</label>
        <input
          id="ticket"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 12,
            border: "1px solid",
            marginBlock: 12,
          }}
          autoComplete="off"
        />
        <button disabled={busy} type="submit">
          {busy ? "Checking…" : "Confirm check-in"}
        </button>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
