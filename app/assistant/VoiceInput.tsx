"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, X, LoaderCircle, RotateCcw } from "lucide-react";
import { encodeVoice } from "@/lib/member-ai/media";
export function VoiceInput({
  disabled,
  onText,
  onNotice,
  onActive,
}: {
  disabled: boolean;
  onText: (text: string) => void;
  onNotice: (text: string) => void;
  onActive: (active: boolean) => void;
}) {
  const [phase, setPhase] = useState<
    "idle" | "starting" | "recording" | "transcribing" | "retry"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const session = useRef<{
    stream: MediaStream;
    context: AudioContext;
    node: ScriptProcessorNode;
    source: MediaStreamAudioSourceNode;
    mute: GainNode;
    chunks: Float32Array[];
    count: number;
    timer: number;
  } | null>(null);
  const pending = useRef<{ bytes: Uint8Array; id: string } | null>(null);
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const release = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    window.clearInterval(s.timer);
    s.node.onaudioprocess = null;
    s.node.disconnect();
    s.source.disconnect();
    s.mute.disconnect();
    s.stream.getTracks().forEach((t) => t.stop());
    void s.context.close();
    return s;
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      release();
      controller.current?.abort();
    };
  }, [release]);
  async function transcribe() {
    if (!pending.current) return;
    setPhase("transcribing");
    onActive(true);
    onNotice("Turning your recording into text…");
    const form = new FormData();
    form.set("requestId", pending.current.id);
    form.set(
      "audio",
      new Blob([pending.current.bytes.buffer as ArrayBuffer], {
        type: "audio/wav",
      }),
      "recording.wav",
    );
    controller.current = new AbortController();
    try {
      const r = await fetch("/api/member/assistant/transcribe", {
        method: "POST",
        body: form,
        signal: controller.current.signal,
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error ?? "Transcription unavailable.");
      if (!alive.current) return;
      onText(data.text);
      onNotice(
        data.text
          ? "Review your dictated message before sending."
          : "No speech was detected.",
      );
      pending.current = null;
      setPhase("idle");
    } catch (e) {
      if (alive.current) {
        setPhase("retry");
        onNotice(
          e instanceof Error
            ? e.message
            : "Recording interrupted. Retry this recording to check its result.",
        );
      }
    } finally {
      if (alive.current) onActive(false);
    }
  }
  function stop(cancel = false) {
    const s = release();
    if (!s) return;
    if (cancel) {
      pending.current = null;
      setPhase("idle");
      onActive(false);
      onNotice("Recording discarded.");
      return;
    }
    if (s.count < s.context.sampleRate / 10) {
      setPhase("idle");
      onActive(false);
      onNotice("Record a little longer, then try again.");
      return;
    }
    pending.current = {
      bytes: encodeVoice(s.chunks, s.context.sampleRate),
      id: crypto.randomUUID(),
    };
    void transcribe();
  }
  async function start() {
    if (disabled || phase !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      onNotice(
        "Voice recording is unavailable in this browser. You can use your keyboard’s microphone instead.",
      );
      return;
    }
    setPhase("starting");
    onActive(true);
    onNotice("Allow microphone access to dictate.");
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      context = new AudioContext();
      await context.resume();
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        void context.close();
        return;
      }
      const source = context.createMediaStreamSource(stream),
        node = context.createScriptProcessor(4096, 1, 1),
        mute = context.createGain();
      mute.gain.value = 0;
      const s = {
        stream,
        context,
        node,
        source,
        mute,
        chunks: [] as Float32Array[],
        count: 0,
        timer: 0,
      };
      session.current = s;
      node.onaudioprocess = (e) => {
        if (session.current !== s) return;
        const input = e.inputBuffer.getChannelData(0);
        if (s.count < s.context.sampleRate * 60) {
          s.chunks.push(new Float32Array(input));
          s.count += input.length;
        }
        if (s.count >= s.context.sampleRate * 60) stop();
      };
      source.connect(node);
      node.connect(mute);
      mute.connect(context.destination);
      const started = Date.now();
      s.timer = window.setInterval(() => {
        setSeconds(Math.min(60, Math.floor((Date.now() - started) / 1000)));
        if (Date.now() - started >= 60000) stop();
      }, 250);
      setSeconds(0);
      setPhase("recording");
      onNotice("Recording for up to 60 seconds… Tap stop to transcribe.");
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      if (context) void context.close();
      if (alive.current) {
        setPhase("idle");
        onActive(false);
        onNotice(
          "Microphone access was unavailable. Check your browser permission and try again.",
        );
      }
    }
  }
  return (
    <>
      {phase === "recording" && (
        <span className="sr-only" role="status">
          Recording {seconds} seconds
        </span>
      )}
      <button
        type="button"
        disabled={
          (disabled && (phase === "idle" || phase === "retry")) ||
          phase === "starting" ||
          phase === "transcribing"
        }
        aria-label={
          phase === "recording"
            ? `Stop and transcribe recording (${seconds}s)`
            : phase === "retry"
              ? "Retry transcription"
              : "Dictate a message"
        }
        onClick={() =>
          phase === "recording"
            ? stop()
            : phase === "retry"
              ? void transcribe()
              : void start()
        }
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${phase === "recording" ? "bg-red-50 text-red-600" : "text-zinc-500 hover:bg-zinc-100"} disabled:opacity-40`}
      >
        {phase === "transcribing" || phase === "starting" ? (
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        ) : phase === "recording" ? (
          <Square size={18} fill="currentColor" aria-hidden="true" />
        ) : phase === "retry" ? (
          <RotateCcw size={19} aria-hidden="true" />
        ) : (
          <Mic size={21} aria-hidden="true" />
        )}
      </button>
      {(phase === "recording" || phase === "retry") && (
        <button
          type="button"
          aria-label="Discard recording"
          onClick={() => {
            if (phase === "recording") stop(true);
            else {
              pending.current = null;
              setPhase("idle");
              onNotice("Recording discarded.");
            }
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-500"
        >
          <X size={17} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
