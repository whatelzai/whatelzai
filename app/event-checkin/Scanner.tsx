"use client";
import "./scanner.css";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import { Camera, ImagePlus, CheckCircle2, ScanLine } from "lucide-react";
import { parseTicket } from "@/lib/event-checkin-policy";
import { decodeQrSource } from "@/lib/event-qr";
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
export default function Scanner({
  initialTicket = "",
  onCheckedIn,
  autoStart = false,
  autoCheckIn = false,
}: {
  initialTicket?: string;
  onCheckedIn?: () => void;
  autoStart?: boolean;
  autoCheckIn?: boolean;
}) {
  const [ticket, setTicket] = useState(initialTicket),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false),
    [success, setSuccess] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    pending = useRef(false),
    lastScan = useRef({ id: "", at: 0 });
  const id = useId();
  const release = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const stop = useCallback(() => {
    release();
    setCamera(false);
  }, [release]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      release();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [release, stop]);
  async function submitTicket(value: string) {
    if (pending.current) return;
    if (!parseTicket(value)) {
      setMessage("Enter a valid Whatelz ticket link or ID.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setSuccess(false);
    if (!autoCheckIn) stop();
    const run = generation.current;
    setMessage("Checking in…");
    try {
      const response = await fetch("/api/event-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: value }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (
        !response.ok ||
        !["checked_in", "already_checked_in"].includes(result.status) ||
        !result.at
      )
        throw Error(
          result.error || "Check-in could not be confirmed. Please retry.",
        );
      if (run !== generation.current) return;
      setMessage(
        `${result.status === "checked_in" ? "Checked in" : "Already checked in"}: ${result.name} · ${new Date(result.at).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit" })}`,
      );
      setSuccess(true);
      setTicket("");
      onCheckedIn?.();
    } catch (error) {
      if (run !== generation.current) return;
      setTicket(value);
      setMessage(
        error instanceof Error
          ? error.message
          : "Connection failed. Please retry.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function accept(raw: string) {
    const parsed = parseTicket(raw);
    if (!parsed) {
      setMessage("This is not a Whatelz ticket. Try another QR code.");
      return false;
    }
    if (autoCheckIn) {
      if (
        lastScan.current.id === parsed &&
        Date.now() - lastScan.current.at < 8000
      )
        return false;
      lastScan.current = { id: parsed, at: Date.now() };
      await submitTicket(parsed);
      return false; // keep the camera ready for the next attendee
    }
    setTicket(parsed);
    setSuccess(false);
    setMessage("Ticket ready. Confirm check-in below.");
    return true;
  }
  async function start() {
    stop();
    setSuccess(false);
    setTicket("");
    setCamera(true);
    setMessage("Opening camera…");
    const run = generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (run !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      if (!video.current) return stop();
      video.current.srcObject = media;
      await video.current.play();
      if (run !== generation.current) return;
      const ctor = (
        window as unknown as {
          BarcodeDetector?: new (o: { formats: string[] }) => Detector;
        }
      ).BarcodeDetector;
      let detector: Detector | null = null;
      try {
        if (ctor) detector = new ctor({ formats: ["qr_code"] });
      } catch {
        /* use local decoder */
      }
      setMessage("Point the camera at the ticket QR code.");
      async function scan() {
        if (run !== generation.current || !video.current) return;
        try {
          let raw: string | null = null;
          if (detector) {
            try {
              raw = (await detector.detect(video.current))[0]?.rawValue ?? null;
            } catch {
              detector = null;
            }
          }
          if (!detector)
            raw = await decodeQrSource(
              video.current,
              video.current.videoWidth,
              video.current.videoHeight,
            );
          if (run !== generation.current) return;
          if (raw && (await accept(raw))) {
            stop();
            return;
          }
        } catch {
          if (run !== generation.current) return;
          stop();
          setMessage(
            "Camera scan failed. Choose a QR image or paste the ticket link.",
          );
          return;
        }
        if (run === generation.current) timer.current = setTimeout(scan, 300);
      }
      void scan();
    } catch {
      if (run !== generation.current) return;
      stop();
      setMessage(
        "Camera unavailable. Allow camera access, choose a QR image, or paste the ticket link.",
      );
    }
  }
  const startOnOpen = useEffectEvent(() => {
    void start();
  });
  useEffect(() => {
    if (!autoStart) return;
    const frame = requestAnimationFrame(() => startOnOpen());
    return () => cancelAnimationFrame(frame);
  }, [autoStart]);
  async function image(file?: File) {
    if (!file || pending.current) return;
    stop();
    const run = generation.current;
    pending.current = true;
    setBusy(true);
    setSuccess(false);
    setTicket("");
    setMessage("Reading QR image…");
    let bitmap: ImageBitmap | undefined;
    let raw: string | null = null;
    try {
      if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024)
        throw Error("Choose an image smaller than 15 MB.");
      bitmap = await createImageBitmap(file);
      raw = await decodeQrSource(bitmap, bitmap.width, bitmap.height);
      if (!raw)
        throw Error("No QR found. Crop closer to the QR code and try again.");
    } catch (error) {
      if (run === generation.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Image unavailable. Try PNG or JPEG.",
        );
    } finally {
      bitmap?.close();
      pending.current = false;
      setBusy(false);
    }
    if (raw && run === generation.current) await accept(raw);
  }
  async function checkin(e: React.FormEvent) {
    e.preventDefault();
    await submitTicket(ticket);
  }
  return (
    <section className="ticket-scanner" aria-label="Ticket scanner">
      <div className="ticket-scan-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (camera) {
              stop();
              setMessage("Camera stopped.");
            } else {
              void start();
            }
          }}
        >
          <Camera size={20} />
          {camera ? "Stop camera" : "Scan QR"}
        </button>
        <label className="ticket-image-button">
          <ImagePlus size={20} />
          QR image
          <input
            aria-label="Choose QR image"
            type="file"
            accept="image/*"
            disabled={busy || camera}
            onChange={(e) => {
              void image(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <video
        ref={video}
        muted
        playsInline
        hidden={!camera}
        aria-label="QR camera preview"
        style={{
          width: "100%",
          maxHeight: 360,
          objectFit: "cover",
          borderRadius: 16,
          marginBlock: camera ? 16 : 0,
        }}
      />
      <details className="ticket-manual">
        <summary>Ticket link instead</summary>
        <form onSubmit={checkin}>
          <label htmlFor={id}>Ticket link or ID</label>
          <input
            id={id}
            value={ticket}
            disabled={busy || camera}
            maxLength={512}
            onChange={(e) => {
              setTicket(e.target.value);
              setSuccess(false);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Paste ticket link"
          />
          <button disabled={busy || camera || !ticket.trim()} type="submit">
            <ScanLine size={18} />
            {busy ? "Checking…" : autoCheckIn ? "Check in" : "Confirm check-in"}
          </button>
        </form>
      </details>
      <p role="status" aria-live="polite" className="ticket-scan-status">
        {success && <CheckCircle2 size={22} />} {message}
      </p>
    </section>
  );
}
