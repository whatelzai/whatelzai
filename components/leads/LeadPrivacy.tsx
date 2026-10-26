"use client";
import { useActionState, useState } from "react";
import { saveLeadPrivacy } from "@/app/leads/profile-actions";
import { MobilePicker } from "./MobilePicker";
import type { Lead } from "@/lib/leads/model";

export function LeadPrivacy({ lead }: { lead: Lead }) {
  const [value, setValue] = useState(lead.visibility ?? "team");
  const [state, action, pending] = useActionState(saveLeadPrivacy, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="revision" value={lead.revision} />
      <MobilePicker
        name="visibility"
        label="Who can see this Baobei?"
        value={value}
        onChange={(v) => setValue(v as typeof value)}
        options={[
          { value: "team", label: "Everyone in my team" },
          { value: "private", label: "Only me · Hidden" },
        ]}
      />
      <p className="text-xs leading-5 text-zinc-500">
        Hiding also hides linked HQH/HHH from other members. Existing individual
        exclusions still apply. Only you can edit this profile.
      </p>
      <button
        disabled={pending}
        className="min-h-11 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        {pending ? "Saving…" : "Save visibility"}
      </button>
      <p role="status" className="text-sm">
        {state.error ?? state.success}
      </p>
    </form>
  );
}
