"use client";
import { useActionState } from "react";
import { prepareWeekly } from "./actions";
export function WeeklyForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(prepareWeekly, {
    message: "",
  });
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm leading-6 text-zinc-600">
        Create last week’s summary now, or retry a failed run. This uses your
        connected OpenAI model and saves the synthesis to EMDEE. Existing
        summaries and source entries are preserved. Up to three attempts per
        week, including failures.
      </p>
      <button
        disabled={disabled || pending}
        className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Preparing…" : "Prepare last week’s summary"}
      </button>
      {state.message ? (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
