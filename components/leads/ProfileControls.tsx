"use client";
import { MobilePicker } from "./MobilePicker";
import { useActionState, useState } from "react";
import { saveLeadPhoto, saveVisibility } from "@/app/leads/profile-actions";
import type { Visibility } from "@/lib/leads/sharing";
import type { Lead } from "@/lib/leads/model";
export function PhotoEditor({ lead }: { lead: Lead }) {
  const [state, action, pending] = useActionState(saveLeadPhoto, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="revision" value={lead.revision} />
      <label className="block text-sm font-medium">
        Profile photo
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block max-w-full text-sm"
        />
      </label>
      <p className="text-xs text-zinc-500">
        JPG, PNG or WebP · up to 3 MB. Visible with the Baobei profile; hiding
        the profile also hides its photo.
      </p>
      <div className="flex gap-3">
        <button
          disabled={pending}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          {pending ? "Saving…" : "Save photo"}
        </button>
        {lead.has_photo && (
          <button
            name="remove"
            value="true"
            disabled={pending}
            className="text-sm text-zinc-500"
          >
            Remove photo
          </button>
        )}
      </div>
      <p role="status" className="text-sm">
        {state.error ?? state.success}
      </p>
    </form>
  );
}
function Recipient({
  recipient,
  grant,
  leads,
  limited,
}: {
  recipient: { id: string; label: string };
  grant?: Visibility;
  leads: { id: string; name: string }[];
  limited: boolean;
}) {
  const [mode, setMode] = useState(grant?.mode ?? "all");
  const [state, action, pending] = useActionState(saveVisibility, {});
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-zinc-50 p-4">
      <input type="hidden" name="recipient" value={recipient.id} />
      <input type="hidden" name="revision" value={grant?.revision ?? 0} />
      <p className="text-sm font-medium">{recipient.label}</p>
      <MobilePicker
        name="mode"
        label={`Visibility for ${recipient.label}`}
        value={mode}
        onChange={(value) => setMode(value as typeof mode)}
        options={[
          { value: "none", label: "Hide all from this person" },
          { value: "selected", label: "Only selected Baobeis" },
          { value: "all", label: "Default team access" },
        ]}
      />
      {mode === "selected" && (
        <fieldset disabled={limited}>
          <legend className="mb-2 text-xs text-zinc-500">
            Choose who to share
          </legend>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {leads.slice(0, 500).map((lead) => (
              <label
                key={lead.id}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="lead"
                  value={lead.id}
                  defaultChecked={grant?.lead_ids.includes(lead.id)}
                />
                {lead.name}
              </label>
            ))}
          </div>
          {limited && (
            <p>
              More than 500 leads. Selected sharing is unavailable; existing
              settings are preserved.
            </p>
          )}
        </fieldset>
      )}
      {mode === "all" && (
        <p className="text-xs text-zinc-600">
          Allows current and future team-visible Baobeis. Profiles set to Only
          me stay hidden.
        </p>
      )}
      <button
        disabled={pending || (limited && mode === "selected")}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        {pending ? "Saving…" : "Save visibility"}
      </button>
      <p role="status" className="text-sm">
        {state.error ?? state.success}
      </p>
    </form>
  );
}
export function LeadSharing({
  recipients,
  grants,
  leads,
  limited,
}: {
  recipients: { id: string; label: string }[];
  grants: Visibility[];
  leads: { id: string; name: string }[];
  limited: boolean;
}) {
  const people = [
    ...recipients,
    ...grants
      .filter((g) => !recipients.some((r) => r.id === g.recipient_id))
      .map((g) => ({
        id: g.recipient_id,
        label: "Previously selected member",
      })),
  ];
  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-3 open:w-full">
      <summary className="cursor-pointer text-sm font-medium">
        Individual access exceptions
        {grants.some((g) => g.mode !== "none") && (
          <span className="ml-2 text-zinc-500">
            {grants.filter((g) => g.mode !== "none").length}
          </span>
        )}
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-500">
          Team-visible profiles are readable by default. These settings can
          exclude selected team members. Only me on a profile overrides every
          exception. Contact details, private remarks, activity notes and Chat
          stay private.
        </p>
        <p className="text-xs text-zinc-500">
          Only activated team accounts appear here. Hidden linked profiles also
          restrict their HQH/HHH.
        </p>
        {people.map((r) => (
          <Recipient
            key={`${r.id}-${grants.find((g) => g.recipient_id === r.id)?.revision ?? 0}`}
            recipient={r}
            grant={grants.find((g) => g.recipient_id === r.id)}
            leads={leads}
            limited={limited}
          />
        ))}
        {!people.length && (
          <p className="text-sm text-zinc-500">
            No other activated team accounts yet.
          </p>
        )}
      </div>
    </details>
  );
}
