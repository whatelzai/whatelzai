"use client";
import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Check, Flower2, Mic } from "lucide-react";
import { clock, elapsed } from "@/lib/personal-tools/model";
import { singaporeDay } from "@/lib/daily/model";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import type { ToolProps } from "./ToolsWorkspace";
export default function SessionTimer({
  kind,
  data,
  save,
  onDirty,
}: ToolProps & { kind: "meditation" | "practice" }) {
  const zh = useAdminPreferences().preferences.language === "zh";
  const [duration, setDuration] = useState(kind === "practice" ? 60 : 300),
    [started, setStarted] = useState<number | null>(null),
    [banked, setBanked] = useState(0),
    [now, setNow] = useState(0),
    [topic, setTopic] = useState(""),
    [note, setNote] = useState(""),
    [saved, setSaved] = useState(false),
    [id, setId] = useState(() => crypto.randomUUID());
  const ms = elapsed(started, banked, now),
    finished = ms >= duration * 1000,
    seconds = Math.min(duration, Math.floor(ms / 1000));
  useEffect(() => {
    if (started === null) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [started]);
  useEffect(() => {
    if (started === null) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [started]);
  const toggle = () => {
    onDirty?.(true);
    const n = Date.now();
    setNow(n);
    if (started !== null) {
      setBanked(elapsed(started, banked, n));
      setStarted(null);
    } else setStarted(n);
  };
  const reset = () => {
    onDirty?.(false);
    setStarted(null);
    setBanked(0);
    setNow(0);
    setSaved(false);
    setId(crypto.randomUUID());
  };
  const Icon = kind === "practice" ? Mic : Flower2;
  const title =
    kind === "practice"
      ? zh
        ? "一分钟讲清楚"
        : "One minute, clearly"
      : zh
        ? "静心"
        : "Meditate";
  const recent = data.records.filter((r) => r.kind === kind).slice(0, 5);
  return (
    <section className="timer-tool">
      <h1>{title}</h1>
      <div className={"timer-face " + kind}>
        <Icon size={32} />
        <output aria-label={zh ? "剩余时间" : "Time remaining"}>
          {clock(duration - seconds)}
        </output>
        <span>
          {finished
            ? zh
              ? "已到时间"
              : "Time complete"
            : started !== null
              ? zh
                ? "进行中"
                : "In progress"
              : zh
                ? "准备好就开始"
                : "Start when ready"}
        </span>
      </div>
      {banked === 0 && started === null && !saved && kind === "meditation" && (
        <div className="preset-row">
          {[3, 5, 10, 20].map((m) => (
            <button
              key={m}
              aria-pressed={duration === m * 60}
              onClick={() => setDuration(m * 60)}
            >
              {m} {zh ? "分钟" : "min"}
            </button>
          ))}
        </div>
      )}
      {kind === "practice" && (
        <label>
          {zh
            ? "主题与听众想学会什么"
            : "Topic / what should the listener learn?"}
          <input
            value={topic}
            maxLength={200}
            onChange={(e) => setTopic(e.target.value)}
            disabled={saved}
          />
        </label>
      )}
      <div className="tool-actions">
        {!saved && !finished && (
          <button className="tool-primary" onClick={toggle}>
            {started !== null ? <Pause size={18} /> : <Play size={18} />}
            {started !== null ? (zh ? "暂停" : "Pause") : zh ? "开始" : "Start"}
          </button>
        )}
        <button onClick={reset}>
          <RotateCcw size={18} />
          {zh ? "重置" : "Reset"}
        </button>
      </div>
      {(seconds > 0 || finished) && !saved && (
        <>
          <label>
            {zh ? "随记（选填）" : "Reflection (optional)"}
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </label>
          <button
            className="tool-primary"
            onClick={async () => {
              const n = Date.now();
              const s = Math.min(
                duration,
                Math.floor(elapsed(started, banked, n) / 1000),
              );
              setBanked(s * 1000);
              setStarted(null);
              if (s < 1) return;
              const r = await save({
                id,
                revision: 0,
                occurred_on: singaporeDay(),
                data: { kind, seconds: s, topic, note },
              });
              if (r) setSaved(true);
            }}
          >
            <Check size={18} />
            {zh ? "结束并保存" : "Finish & save"}
          </button>
        </>
      )}
      {saved && <p role="status">{zh ? "已保存" : "Session saved."}</p>}
      <p className="tool-hint">
        {zh
          ? "锁屏后返回会重新计算时间。关闭页面前请保存；后台声音不作保证。"
          : "Time catches up after screen lock. Save before closing; background sound is not guaranteed."}
      </p>
      <details>
        <summary>{zh ? "最近记录" : "Recent sessions"}</summary>
        {recent.length === 0 ? (
          <p>{zh ? "尚无记录" : "No saved sessions yet."}</p>
        ) : (
          recent.map((r) => (
            <p key={r.id}>
              {r.occurred_on} ·{" "}
              {"seconds" in r.data ? clock(r.data.seconds) : ""}
              {"topic" in r.data && r.data.topic ? " · " + r.data.topic : ""}
            </p>
          ))
        )}
      </details>
    </section>
  );
}
