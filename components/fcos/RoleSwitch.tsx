"use client";
import { useState } from "react";
import { roleLabels, type WeosRole } from "@/lib/weos-roles";
export function RoleSwitch({
  current = "beacon",
  compact = false,
}: {
  current?: WeosRole;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(role: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/weos/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw Error("Could not switch view. Try again.");
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch view");
      setBusy(false);
    }
  }
  return (
    <section
      className={
        compact
          ? "px-2 text-sm"
          : "rounded-2xl border border-zinc-200 bg-white p-4 text-sm"
      }
    >
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span>View weOS as</span>
        <select
          aria-label="View weOS as"
          className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
          disabled={busy}
          value={current}
          onChange={(e) => void change(e.target.value)}
        >
          {(["beacon", "blaze", "torch", "ember"] as WeosRole[]).map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
      </label>
      <p
        className={compact ? "sr-only" : "mt-2 text-xs leading-5 text-zinc-500"}
      >
        {current === "beacon"
          ? "Your account stays Beacon. Preview another role without opening anyone else’s account."
          : `${roleLabels[current]} test view · you are still Beacon. Chat is interactive; other actions stay read-only.`}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
