"use client";
import { useState } from "react";
import { manageMember } from "./actions";
import type { MemberModel } from "@/lib/member-ai/model";
export function MemberControls({
  userId,
  model,
}: {
  userId: string;
  model: MemberModel;
}) {
  const [selected, setSelected] = useState(model),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function save() {
    setBusy(true);
    setNotice("");
    try {
      const result = await manageMember({
        action: "access",
        userId,
        active: true,
        model: selected,
      });
      setNotice(result.error ?? result.success ?? "");
    } catch {
      setNotice("Could not save the model. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-xs text-zinc-600">
        Assistant model
        <select
          aria-label="Assistant model"
          value={selected}
          onChange={(event) => setSelected(event.target.value as MemberModel)}
          disabled={busy}
          className="mt-1 block w-full rounded-lg border p-2 text-sm"
        >
          <option value="gpt-6-luna">GPT-6 Luna · economical</option>
          <option value="gpt-6.1-sol">GPT-6.1 Sol</option>
        </select>
      </label>
      <button
        disabled={busy || selected === model}
        onClick={save}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save model"}
      </button>
      <p role="status" className="text-sm">
        {notice}
      </p>
    </div>
  );
}
