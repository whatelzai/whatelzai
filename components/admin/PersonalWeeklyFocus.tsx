"use client";
import { useState, type FormEvent } from "react";
import { useAdminPreferences } from "./AdminPreferences";
import type { PersonalFocus } from "@/lib/personal/model";
export function PersonalWeeklyFocus({
  initial,
  week,
  available,
}: {
  initial: PersonalFocus | null;
  week: string;
  available: boolean;
}) {
  const { t } = useAdminPreferences();
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [area, setArea] = useState(initial?.area ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const areas = [
    "Money Management",
    "AI Products & Assets",
    "Personal Brand",
    "Network Marketing",
    "Day Job",
    "Teaching & Contribution",
    "Health Management",
    "Energy Management",
  ];
  async function save(done: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/personal-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_of: week,
          title,
          area,
          done,
          revision: saved?.revision ?? 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw Error(d.error || "Could not save.");
      setSaved(d.focus);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save(saved?.done ?? false);
  }
  if (!available)
    return (
      <p role="alert">
        {t("Your personal outcome could not be loaded. Refresh to try again.")}
      </p>
    );
  return (
    <div className="personal-week-focus" data-focusing={editing || undefined}>
      {!editing && saved ? (
        <>
          <p className="personal-meta">
            {t(areas[saved.area - 1])} ·{" "}
            {t(saved.done ? "Done this week" : "Chosen for this week")}
          </p>
          <h3>{saved.title}</h3>
          <div className="personal-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(!saved.done)}
            >
              {t(
                busy ? "Saving…" : saved.done ? "Reopen outcome" : "Mark done",
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              {t("Edit outcome")}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <label>
            {t("One outcome for this week")}
            <input
              name="personal-outcome"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={240}
              required
              placeholder={t("Something specific I want to move forward.")}
              disabled={busy}
            />
          </label>
          <label>
            {t("Life area")}
            <select
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              disabled={busy}
            >
              {areas.map((a, i) => (
                <option key={a} value={i + 1}>
                  {t(a)}
                </option>
              ))}
            </select>
          </label>
          <div className="personal-actions">
            <button type="submit" disabled={busy || !title.trim()}>
              {t(busy ? "Saving…" : "Choose this outcome")}
            </button>
            {saved ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setTitle(saved.title);
                  setArea(saved.area);
                  setEditing(false);
                  setError("");
                }}
              >
                {t("Cancel")}
              </button>
            ) : null}
          </div>
          <p className="personal-meta">
            {t(
              "One personal outcome, chosen by you. Your Mandala is a direction, not 64 weekly obligations.",
            )}
          </p>
        </form>
      )}
      {error ? (
        <p role="alert" className="personal-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
