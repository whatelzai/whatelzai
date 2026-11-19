"use client";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { addTask, changeTask, saveDocument, prepareDraft } from "./actions";
import {
  connectEmdee,
  connectOpenAI,
  disconnectProvider,
} from "./connections/actions";
import {
  lanes,
  laneLabels,
  statuses,
  type ActionResult,
  type Brief,
  type BriefKind,
  type Task,
} from "@/lib/daily/model";

const field =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-300";
function Feedback({ state }: { state: ActionResult }) {
  return (
    <div aria-live="polite">
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 text-sm text-emerald-800">{state.success}</p>
      ) : null}
    </div>
  );
}
function Submit({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || disabled}
      className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Working…" : children}
    </button>
  );
}
export function NewTask({ day, id }: { day: string; id: string }) {
  const [state, action] = useActionState(addTask, {});
  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
    >
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm font-medium">
        What would move things forward?
        <input
          className={`${field} mt-2`}
          name="title"
          required
          maxLength={240}
          placeholder="One concrete next action"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Focus
          <select name="lane" className={`${field} mt-1`}>
            {lanes.map((l) => (
              <option key={l} value={l}>
                {laneLabels[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Next check-in
          <input
            type="date"
            name="due_on"
            defaultValue={day}
            required
            className={`${field} mt-1`}
          />
        </label>
      </div>
      <Submit>Add proposal</Submit>
      <Feedback state={state} />
    </form>
  );
}
export function TaskRow({ task, day }: { task: Task; day: string }) {
  const [state, action] = useActionState(changeTask, {});
  return (
    <form action={action} className="border-b border-zinc-200 py-5">
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="revision" value={task.revision} />
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>{laneLabels[task.lane]}</span>
        {task.due_on < day && task.status !== "done" && (
          <span className="text-amber-800">
            Carried forward · {task.due_on}
          </span>
        )}
        <span>
          {task.status === "open"
            ? "Accepted"
            : task.status === "proposed"
              ? "Proposal"
              : task.status}
        </span>
      </div>
      <p
        className={`mb-4 text-sm font-medium ${task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-950"}`}
      >
        {task.title}
      </p>
      <details>
        <summary className="cursor-pointer text-xs text-zinc-500">
          Update commitment
        </summary>
        <p className="mt-3 text-xs text-zinc-500">
          Next check-in {task.due_on} ·{" "}
          {task.accepted_on
            ? `Accepted ${task.accepted_on}`
            : "Not yet committed"}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-32 flex-1 text-xs text-zinc-600">
            Status
            <select
              aria-label={`Status for ${task.title}`}
              className={`${field} mt-1`}
              name="status"
              defaultValue={task.status}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {
                    {
                      proposed: "Proposed",
                      open: "Accepted",
                      blocked: "Blocked",
                      waiting: "Waiting",
                      done: "Done",
                      deferred: "Deferred",
                      dropped: "Dropped",
                    }[s]
                  }
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-36 flex-1 text-xs text-zinc-600">
            Next check-in
            <input
              aria-label={`Next check-in for ${task.title}`}
              className={`${field} mt-1`}
              name="due_on"
              type="date"
              required
              defaultValue={task.due_on}
            />
          </label>
          <Submit>Update</Submit>
        </div>
      </details>
      <Feedback state={state} />
    </form>
  );
}
export function BriefEditor({
  day,
  kind,
  brief,
  connected,
  aiReady,
}: {
  day: string;
  kind: BriefKind;
  brief: Brief | null;
  connected: boolean;
  aiReady: boolean;
}) {
  const [body, setBody] = useState(brief?.body ?? "");
  const [state, action] = useActionState(saveDocument, {});
  const [draftState, setDraftState] = useState<ActionResult>({});
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const isMorning = kind === "morning";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="hash" value={brief?.hash ?? ""} />
      <p className="text-sm leading-6 text-zinc-600">
        {isMorning
          ? "What deserves your attention today? Review yesterday’s handoff, decide what matters, and make room for it."
          : "What actually happened? Capture the wins, name the friction, and decide what carries into tomorrow."}
      </p>
      {aiReady ? (
        <details className="rounded-xl border border-zinc-200 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Prepare with AI
          </summary>
          <div className="mt-4 space-y-3">
            <p className="text-xs leading-5 text-zinc-500">
              Uses your commitments and yesterday’s EMDEE closeout. Email,
              calendar and book search are not connected. Up to three attempts
              per brief per day; each call has a 2,000-token output cap. Review
              before saving.
            </p>
            <label className="block text-sm">
              Anything else to consider?
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={8000}
                rows={3}
                className={`${field} mt-1`}
                placeholder={
                  isMorning
                    ? "Available time, energy, fixed commitments…"
                    : "What happened that your task list doesn’t show?"
                }
              />
            </label>
            {body ? (
              <label className="flex items-start gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(e) => setConfirmReplace(e.target.checked)}
                  className="mt-0.5"
                />
                Replace the editor’s current text with a new draft. The saved
                EMDEE document will stay unchanged until I save.
              </label>
            ) : null}
            <button
              type="button"
              disabled={
                !aiReady || !connected || pending || (!!body && !confirmReplace)
              }
              onClick={() =>
                startTransition(async () => {
                  const result = await prepareDraft({ day, kind, notes });
                  if (result.body) {
                    setBody(result.body);
                    setConfirmReplace(false);
                  }
                  setDraftState(result);
                })
              }
              className="rounded-full bg-yellow-300 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
            >
              {pending ? "Preparing…" : "Prepare a draft"}
            </button>
            {!aiReady || !connected ? (
              <p className="text-xs text-zinc-500">
                Connect EMDEE and OpenAI in Connections to enable preparation.
              </p>
            ) : null}
            <Feedback state={draftState} />
          </div>
        </details>
      ) : null}
      <label className="block text-sm font-medium" htmlFor={`${kind}-body`}>
        {isMorning ? "Morning brief" : "Evening closeout"}
      </label>
      <textarea
        id={`${kind}-body`}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={20000}
        rows={14}
        className={`${field} font-mono leading-7`}
        placeholder={
          isMorning
            ? "### What matters today\n\n### My priorities\n\n### Decisions and constraints"
            : "### What moved forward\n\n### What I learned\n\n### Tomorrow’s handoff"
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Submit disabled={!connected || pending}>Save to EMDEE</Submit>
        <span className="text-xs text-zinc-500">
          {brief?.exists
            ? "Existing EMDEE document"
            : "Creates a document in EMDEE"}
        </span>
      </div>
      <p className="text-xs text-zinc-500">
        Markdown supported. Use ### for section headings. Saving this document
        does not change commitment statuses.
      </p>
      <Feedback state={state} />
    </form>
  );
}
export function EmdeeConnectForm({ parentPath }: { parentPath: string }) {
  const [state, action] = useActionState(connectEmdee, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        Briefing parent document
        <input
          name="parent_path"
          required
          defaultValue={parentPath}
          className={`${field} mt-2 font-mono text-xs`}
        />
      </label>
      <p className="text-xs leading-5 text-zinc-500">
        You’ll authorize Whatelzai in EMDEE. Requested access: read documents,
        and write only this parent document and its briefing folder. The parent
        must already exist. EMDEE controls the granted access and expiry.
      </p>
      <Submit>Connect EMDEE</Submit>
      <Feedback state={state} />
    </form>
  );
}
export function OpenAIConnectForm({ model }: { model?: string }) {
  const [state, action] = useActionState(connectOpenAI, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        OpenAI API key
        <input
          type="password"
          autoComplete="off"
          name="key"
          required
          minLength={20}
          maxLength={500}
          className={`${field} mt-2`}
        />
      </label>
      <label className="block text-sm">
        Model ID
        <input
          name="model"
          required
          maxLength={120}
          defaultValue={model ?? ""}
          placeholder="Your chosen API model ID"
          className={`${field} mt-2`}
        />
      </label>
      <p className="text-xs leading-5 text-zinc-500">
        Use a key from your own OpenAI project. The connection check reads model
        access without generating text. Credentials are encrypted on the server
        and never shown again.
      </p>
      <Submit>Verify and save OpenAI</Submit>
      <Feedback state={state} />
    </form>
  );
}
export function DisconnectForm({ provider }: { provider: "emdee" | "openai" }) {
  const [state, action] = useActionState(disconnectProvider, {});
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="provider" value={provider} />
      <Submit>Disconnect {provider === "emdee" ? "EMDEE" : "OpenAI"}</Submit>
      <Feedback state={state} />
    </form>
  );
}
