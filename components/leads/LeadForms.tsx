"use client";
import { MobilePicker } from "./MobilePicker";
import { Plus, X } from "lucide-react";
import { useActionState, useState, useRef } from "react";
import {
  setLeadPriority,
  createLead,
  saveLead,
  addActivity,
  updateActivity,
} from "@/app/leads/actions";
import {
  regions,
  memberships,
  stages,
  goals,
  activityStatuses,
  type Lead,
  type Activity,
  type ActionResult,
} from "@/lib/leads/model";
const input =
  "mt-2 min-h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-base";
const button =
  "rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50";
function Message({ state }: { state: ActionResult }) {
  return (
    <p
      role="status"
      className={state.error ? "text-red-700" : "text-green-700"}
    >
      {state.error || state.success}
    </p>
  );
}
function Select({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange?: (value: string) => void;
}) {
  return (
    <MobilePicker
      name={name}
      label={label}
      options={options.map((x) => ({ value: x, label: x }))}
      {...(onChange ? { value, onChange } : { defaultValue: value })}
    />
  );
}

export function NewLead() {
  const [state, action, pending] = useActionState(createLead, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Add baobei"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-zinc-900 transition hover:bg-yellow-400 active:scale-95"
      >
        <Plus size={24} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="new-baobei-title"
        className="fixed inset-x-3 bottom-3 top-auto mx-auto mb-0 mt-auto max-h-[85dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-[28px] border-0 bg-white p-6 text-zinc-900 shadow-2xl backdrop:bg-zinc-900/25 sm:inset-0 sm:my-auto sm:h-fit"
        onClose={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
            trigger.current?.focus({ preventScroll: true });
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="new-baobei-title" className="text-xl font-semibold">
            Add a baobei
          </h2>
          <button
            type="button"
            aria-label="Close add baobei"
            onClick={() => dialog.current?.close()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form action={action} className="space-y-4">
          <label className="block text-sm font-medium text-zinc-600">
            Name
            <input
              name="name"
              required
              maxLength={160}
              placeholder="Their name"
              className={input}
            />
          </label>
          <Select
            name="region"
            label="Community"
            value="Unassigned"
            options={regions}
          />
          <Message state={state} />
          <button
            disabled={pending}
            className="min-h-12 w-full rounded-full bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add baobei"}
          </button>
        </form>
      </dialog>
    </>
  );
}
export function LeadEditor({ lead }: { lead: Lead }) {
  const [state, action, pending] = useActionState(saveLead, {});
  const [draft, setDraft] = useState(lead);
  const change = (name: string, value: string) =>
    setDraft((previous) => ({ ...previous, [name]: value }));
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="revision" value={lead.revision} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Name
          <input
            name="name"
            value={draft.name}
            onChange={(event) => change("name", event.target.value)}
            required
            maxLength={160}
            className={input}
          />
        </label>
        <Select
          name="region"
          label="Community"
          value={draft.region}
          onChange={(value) => change("region", value)}
          options={regions}
        />
        <Select
          name="membership"
          label="Club membership"
          value={draft.membership}
          onChange={(value) => change("membership", value)}
          options={memberships}
        />
        <Select
          name="stage"
          label="Current stage"
          value={draft.stage}
          onChange={(value) => change("stage", value)}
          options={stages}
        />
        <Select
          name="goal"
          label="Goal"
          value={draft.goal}
          onChange={(value) => change("goal", value)}
          options={goals}
        />
      </div>
      <p className="text-sm text-zinc-500">
        Membership and stage are your records. They do not create an account or
        change anyone’s access.
      </p>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Their story</h2>
        {(
          [
            {
              name: "relationship",
              label: "How we know each other",
              max: 2000,
            },
            {
              name: "story",
              label: "Personal story and background",
              max: 10000,
            },
            {
              name: "interests",
              label: "Interests, aspirations and priorities",
              max: 4000,
            },
            { name: "concerns", label: "Questions and concerns", max: 4000 },
            {
              name: "notes",
              label: "Sales remarks and follow-up notes",
              max: 10000,
            },
          ] as const
        ).map((f) => (
          <label key={f.name} className="block">
            {f.label}
            <textarea
              name={f.name}
              value={draft[f.name]}
              onChange={(event) => change(f.name, event.target.value)}
              rows={3}
              maxLength={f.max}
              className={input}
            />
          </label>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Next follow-up</h2>
        <label className="block">
          Next action
          <input
            name="next_action"
            value={draft.next_action}
            onChange={(event) => change("next_action", event.target.value)}
            maxLength={1000}
            className={input}
          />
        </label>
        <label className="block">
          Follow-up date
          <input
            type="date"
            name="follow_up_on"
            value={draft.follow_up_on || ""}
            onChange={(event) => change("follow_up_on", event.target.value)}
            className={input}
          />
        </label>
      </section>
      <details className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4">
        <summary className="cursor-pointer">
          Contact and personal details (optional)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              { name: "email", label: "Email", type: "email", max: 254 },
              { name: "phone", label: "Phone", type: "tel", max: 80 },
              { name: "birthday", label: "Birthday", type: "date", max: 10 },
              { name: "zodiac", label: "Zodiac sign", type: "text", max: 80 },
            ] as const
          ).map((f) => (
            <label key={f.name}>
              {f.label}
              <input
                name={f.name}
                type={f.type}
                maxLength={f.max}
                value={draft[f.name] || ""}
                onChange={(event) => change(f.name, event.target.value)}
                className={input}
              />
            </label>
          ))}
        </div>
      </details>
      <Message state={state} />
      <button className={button} disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
export function NewActivity({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addActivity, {});
  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4"
    >
      <h3 className="font-semibold">Record an activity</h3>
      <input type="hidden" name="lead_id" value={leadId} />
      <label className="block">
        Event or conversation
        <input name="title" required maxLength={240} className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Date
          <input name="activity_on" type="date" required className={input} />
        </label>
        <Select
          name="status"
          label="Status"
          value="To invite"
          options={activityStatuses}
        />
      </div>
      <label className="block">
        Notes
        <textarea name="notes" rows={2} maxLength={4000} className={input} />
      </label>
      <Message state={state} />
      <button className={button} disabled={pending}>
        {pending ? "Recording…" : "Record activity"}
      </button>
    </form>
  );
}
export function ActivityStatus({ activity }: { activity: Activity }) {
  const [state, action, pending] = useActionState(updateActivity, {});
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={activity.id} />
      <input type="hidden" name="lead_id" value={activity.lead_id} />
      <input type="hidden" name="revision" value={activity.revision} />
      <Select
        name="status"
        label="Update status"
        value={activity.status}
        options={activityStatuses}
      />
      <button className={button} disabled={pending}>
        Save status
      </button>
      <Message state={state} />
    </form>
  );
}

export function LeadPriority({ lead }: { lead: Lead }) {
  const [state, action, pending] = useActionState(setLeadPriority, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="revision" value={lead.revision} />
      <input type="hidden" name="priority" value={String(!lead.is_priority)} />
      <button
        disabled={pending}
        className="min-h-11 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {lead.is_priority
          ? "★ Priority lead · remove"
          : "☆ Add to priority leads"}
      </button>
      <Message state={state} />
    </form>
  );
}
