"use client";
import { adminUrl } from "@/lib/admin-url";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/admin/AdminLink";
import { saveEvent, removeEvent } from "./actions";
import {
  SERVICE_EVENT_KINDS,
  SERVICE_EVENT_KIND_LABELS,
  type ServiceEvent,
  type ServiceEventKind,
} from "@/lib/service-events";
import {
  Button,
  Field,
  SectionCard,
  StatusPill,
  TextArea,
  TextInput,
} from "@/app/admin/landing/forms/primitives";

type FormState = {
  id?: string;
  slug: string;
  name: string;
  kind: ServiceEventKind;
  event_date: string;
  location: string;
  attendee_count: string;
  description: string;
};

function toState(e: ServiceEvent | null): FormState {
  return {
    id: e?.id,
    slug: e?.slug ?? "",
    name: e?.name ?? "",
    kind: e?.kind ?? "training",
    event_date: e?.event_date ?? "",
    location: e?.location ?? "",
    attendee_count: e?.attendee_count?.toString() ?? "",
    description: e?.description ?? "",
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function EventForm({ initial }: { initial: ServiceEvent | null }) {
  const [state, setState] = useState<FormState>(toState(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setStatus("saving");
    start(async () => {
      try {
        const slug = state.slug || slugify(state.name) || `event-${Date.now()}`;
        await saveEvent({
          id: state.id,
          slug,
          name: state.name,
          kind: state.kind,
          event_date: state.event_date || null,
          location: state.location || null,
          attendee_count: state.attendee_count
            ? Number(state.attendee_count)
            : null,
          description: state.description || null,
        });
        setStatus("saved");
        if (state.id) setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    });
  }

  function remove() {
    if (!state.id) return;
    if (!confirm("Delete this event? Linked testimonials will be un-linked."))
      return;
    start(async () => {
      try {
        await removeEvent(state.id!);
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            {state.id ? "Edit event" : "New event"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {state.name || "Untitled event"}
          </h1>
        </div>
        <Link
          href={adminUrl("/admin/events")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back
        </Link>
      </div>

      <SectionCard title="Event" slug="what it was">
        <Field label="Name">
          <TextInput
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
            placeholder="e.g. AI Training — 27 June 2026"
          />
        </Field>
        <Field label="Slug (URL-safe id — auto-derived if left blank)">
          <TextInput
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: e.target.value })}
            placeholder="ai-training-20260627"
          />
        </Field>
        <Field label="Kind">
          <select
            value={state.kind}
            onChange={(e) =>
              setState({ ...state, kind: e.target.value as ServiceEventKind })
            }
            className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          >
            {SERVICE_EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {SERVICE_EVENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <TextInput
              type="date"
              value={state.event_date}
              onChange={(e) =>
                setState({ ...state, event_date: e.target.value })
              }
            />
          </Field>
          <Field label="Location">
            <TextInput
              value={state.location}
              onChange={(e) => setState({ ...state, location: e.target.value })}
              placeholder="Singapore"
            />
          </Field>
          <Field label="Attendees">
            <TextInput
              type="number"
              value={state.attendee_count}
              onChange={(e) =>
                setState({ ...state, attendee_count: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Description (optional)">
          <TextArea
            rows={3}
            value={state.description}
            onChange={(e) =>
              setState({ ...state, description: e.target.value })
            }
          />
        </Field>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {state.id ? "Save" : "Create"}
          </Button>
          <StatusPill status={status} />
        </div>
        {state.id && (
          <Button variant="danger" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
