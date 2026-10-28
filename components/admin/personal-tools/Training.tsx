"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Play, RotateCcw } from "lucide-react";
import { clock, elapsed } from "@/lib/personal-tools/model";
import { singaporeDay } from "@/lib/daily/model";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import type { ToolProps } from "./ToolsWorkspace";
type SetRow = { exercise: string; reps: string; kg: string; key: string };
const blank = (): SetRow => ({
  exercise: "",
  reps: "",
  kg: "",
  key: crypto.randomUUID(),
});
export default function Training({ data, save, onDirty }: ToolProps) {
  const zh = useAdminPreferences().preferences.language === "zh";
  const [name, setName] = useState(""),
    [day, setDay] = useState(singaporeDay()),
    [sets, setSets] = useState<SetRow[]>([blank()]),
    [note, setNote] = useState(""),
    [id, setId] = useState(() => crypto.randomUUID()),
    [routineId, setRoutineId] = useState(() => crypto.randomUUID()),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [rest, setRest] = useState<number | null>(null),
    [now, setNow] = useState(0),
    [restSeconds, setRestSeconds] = useState(90);
  useEffect(() => {
    if (rest === null) return;
    const tick = () => setNow(Date.now());
    const i = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [rest]);
  const routines = data.records.filter((r) => r.kind === "routine");
  const previous = data.records.find(
    (r) =>
      r.kind === "training" &&
      "name" in r.data &&
      r.data.name.toLowerCase() === name.trim().toLowerCase(),
  );
  const change = (
    key: string,
    field: "exercise" | "reps" | "kg",
    value: string,
  ) =>
    setSets((old) =>
      old.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  const load = (key: string) => {
    const r = data.records.find((r) => r.id === key);
    if (!r || r.data.kind !== "routine") return;
    setName(r.data.name);
    setSets(r.data.exercises.map((exercise) => ({ ...blank(), exercise })));
    setSaved(false);
    setId(crypto.randomUUID());
    setMessage("");
  };
  return (
    <section>
      <h1>{zh ? "训练" : "Train"}</h1>
      {routines.length > 0 && (
        <label>
          {zh ? "已存训练模板" : "Saved routines"}
          <select defaultValue="" onChange={(e) => load(e.target.value)}>
            <option value="">{zh ? "选择模板" : "Choose routine"}</option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {"name" in r.data ? r.data.name : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMessage("");
          const r = await save({
            id,
            revision: 0,
            occurred_on: day,
            data: {
              kind: "training",
              name,
              sets: sets.map((s) => ({
                exercise: s.exercise,
                reps: Number(s.reps),
                kg: Number(s.kg),
              })),
              note,
            },
          });
          if (r) {
            setSaved(true);
            setMessage(zh ? "训练已保存" : "Workout saved.");
          }
        }}
      >
        <div className="tool-two">
          <label>
            {zh ? "训练名称" : "Workout name"}
            <input
              required
              maxLength={100}
              value={name}
              disabled={saved}
              onChange={(e) => setName(e.target.value)}
              placeholder={zh ? "例如：拉" : "e.g. Pull"}
            />
          </label>
          <label>
            {zh ? "日期" : "Date"}
            <input
              type="date"
              required
              value={day}
              max={singaporeDay()}
              disabled={saved}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
        </div>
        {previous && previous.data.kind === "training" && (
          <details>
            <summary>
              {zh ? "上次训练" : "Last session"} · {previous.occurred_on}
            </summary>
            {previous.data.sets.map((s, i) => (
              <p key={i}>
                {s.exercise} · {s.reps} × {s.kg} kg
              </p>
            ))}
          </details>
        )}
        <div className="workout-sets">
          {sets.map((s, i) => (
            <div className="workout-set" key={s.key}>
              <label className="exercise-label">
                {zh ? "动作" : "Exercise"}
                <input
                  required
                  aria-label={`${zh ? "动作" : "Exercise"} ${i + 1}`}
                  maxLength={100}
                  value={s.exercise}
                  disabled={saved}
                  onChange={(e) => change(s.key, "exercise", e.target.value)}
                />
              </label>
              <label>
                {zh ? "次数" : "Reps"}
                <input
                  required
                  aria-label={`${zh ? "次数" : "Reps"} ${i + 1}`}
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={s.reps}
                  disabled={saved}
                  onChange={(e) => change(s.key, "reps", e.target.value)}
                />
              </label>
              <label>
                kg
                <input
                  required
                  aria-label={`kg ${i + 1}`}
                  type="number"
                  min="0"
                  max="1000"
                  step="0.01"
                  value={s.kg}
                  disabled={saved}
                  onChange={(e) => change(s.key, "kg", e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={saved || sets.length === 1}
                aria-label={`${zh ? "移除此组" : "Remove set"} ${i + 1}`}
                onClick={() =>
                  setSets((old) => old.filter((r) => r.key !== s.key))
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
        {!saved && (
          <div className="tool-actions">
            <button
              type="button"
              disabled={sets.length >= 60}
              onClick={() =>
                setSets((old) => [
                  ...old,
                  { ...blank(), exercise: old[old.length - 1]?.exercise || "" },
                ])
              }
            >
              <Plus size={17} />
              {zh ? "加一组" : "Add set"}
            </button>
            <button
              type="button"
              disabled={!name.trim() || sets.some((s) => !s.exercise.trim())}
              onClick={async () => {
                const r = await save({
                  id: routineId,
                  revision: 0,
                  occurred_on: singaporeDay(),
                  data: {
                    kind: "routine",
                    name,
                    exercises: [...new Set(sets.map((s) => s.exercise.trim()))],
                  },
                });
                if (r) {
                  setMessage(zh ? "模板已保存" : "Routine saved.");
                  setRoutineId(crypto.randomUUID());
                  onDirty?.(true);
                }
              }}
            >
              {zh ? "存为模板" : "Save routine"}
            </button>
          </div>
        )}
        <label>
          {zh ? "训练随记（选填）" : "Workout note (optional)"}
          <textarea
            rows={2}
            maxLength={1000}
            disabled={saved}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {!saved ? (
          <button className="tool-primary" type="submit">
            {zh ? "保存训练" : "Save workout"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setId(crypto.randomUUID());
              setSaved(false);
              setSets([blank()]);
              setName("");
              setNote("");
              setMessage("");
            }}
          >
            {zh ? "新训练" : "New workout"}
          </button>
        )}
      </form>
      <div className="rest-timer">
        <strong>{zh ? "组间休息" : "Rest"}</strong>
        <select
          aria-label={zh ? "休息时长" : "Rest duration"}
          value={restSeconds}
          onChange={(e) => {
            setRestSeconds(Number(e.target.value));
            setRest(null);
          }}
        >
          {[60, 90, 120, 180].map((s) => (
            <option key={s} value={s}>
              {s} s
            </option>
          ))}
        </select>
        <output>
          {clock(
            rest === null
              ? restSeconds
              : restSeconds - Math.floor(elapsed(rest, 0, now) / 1000),
          )}
        </output>
        <button
          aria-label={zh ? "开始休息" : "Start rest"}
          onClick={() => {
            const n = Date.now();
            setRest(n);
            setNow(n);
          }}
        >
          <Play size={18} />
        </button>
        <button
          aria-label={zh ? "重置休息" : "Reset rest"}
          onClick={() => setRest(null)}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <p className="tool-hint">
        {zh
          ? "每行代表一组；徒手动作可填0 kg。"
          : "Each row is one set. Use 0 kg for unweighted work."}
      </p>
    </section>
  );
}
