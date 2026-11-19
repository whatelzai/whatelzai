"use client";
import { adminUrl } from "@/lib/admin-url";

import { useState, useTransition } from "react";
import Link from "@/components/admin/AdminLink";
import { createPrefillTestimonial } from "../actions";
import {
  TESTIMONIAL_CATEGORIES,
  CATEGORY_LABELS,
  type Affiliation,
  type TestimonialCategory,
} from "@/lib/testimonials";
import { TESTIMONIAL_QUESTIONS } from "@/lib/testimonial-questions";
import { CATEGORY_EVENT_KINDS, type ServiceEvent } from "@/lib/service-events";
import {
  Button,
  Field,
  SectionCard,
  StatusPill,
  TextArea,
  TextInput,
} from "@/app/admin/landing/forms/primitives";

export function NewPrefillForm({ events }: { events: ServiceEvent[] }) {
  const [author_name, setName] = useState("");
  const [affiliations, setAffiliations] = useState<Affiliation[]>([
    { role: "", company: "" },
  ]);
  const [author_email, setEmail] = useState("");
  const [author_linkedin_url, setLinkedin] = useState("");
  const [category, setCategory] = useState<TestimonialCategory>("peer");
  const [suggested, setSuggested] = useState<Set<string>>(new Set());
  const [admin_note, setNote] = useState("");
  const [service_event_id, setEventId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [pending, start] = useTransition();

  const questions = TESTIMONIAL_QUESTIONS[category] ?? [];

  function toggle(qid: string) {
    const next = new Set(suggested);
    if (next.has(qid)) next.delete(qid);
    else next.add(qid);
    setSuggested(next);
  }

  function updateAffiliation(i: number, patch: Partial<Affiliation>) {
    setAffiliations(
      affiliations.map((a, j) => (i === j ? { ...a, ...patch } : a)),
    );
  }
  function addAffiliation() {
    setAffiliations([...affiliations, { role: "", company: "" }]);
  }
  function removeAffiliation(i: number) {
    if (affiliations.length === 1) {
      setAffiliations([{ role: "", company: "" }]);
      return;
    }
    setAffiliations(affiliations.filter((_, j) => j !== i));
  }

  function create() {
    setStatus("saving");
    start(async () => {
      try {
        const affs = affiliations.filter(
          (a) => a.role.trim() || a.company.trim(),
        );
        await createPrefillTestimonial({
          category,
          author_name: author_name || undefined,
          author_email: author_email || undefined,
          author_linkedin_url: author_linkedin_url || undefined,
          author_affiliations: affs.length ? affs : undefined,
          suggested_question_ids: Array.from(suggested),
          admin_note: admin_note || undefined,
          service_event_id: service_event_id || undefined,
        });
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
            Testimonials
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            New prefill
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fill what you know. Save. You&rsquo;ll get a link to send them.
          </p>
        </div>
        <Link
          href={adminUrl("/admin/testimonials")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back
        </Link>
      </div>

      <SectionCard title="Who is this for?" slug="anchor">
        <Field label="Display name">
          <TextInput
            value={author_name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sim Yee L."
          />
        </Field>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Role & company (add more than one if needed)
          </p>
          <div className="mt-2 space-y-2">
            {affiliations.map((aff, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <TextInput
                  placeholder="Role"
                  value={aff.role}
                  onChange={(e) =>
                    updateAffiliation(i, { role: e.target.value })
                  }
                />
                <TextInput
                  placeholder="Company / team"
                  value={aff.company}
                  onChange={(e) =>
                    updateAffiliation(i, { company: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeAffiliation(i)}
                  className="self-center font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition-colors hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAffiliation}
            className="mt-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
          >
            + Add another role
          </button>
        </div>

        <Field label="Email (anchor point — helps track them)">
          <TextInput
            type="email"
            value={author_email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="LinkedIn URL">
          <TextInput
            type="url"
            value={author_linkedin_url}
            onChange={(e) => setLinkedin(e.target.value)}
          />
        </Field>
        <Field label="Category (defines which questions they see)">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TestimonialCategory);
              setSuggested(new Set());
              setEventId("");
            }}
            className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          >
            {TESTIMONIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>

        {(() => {
          const kinds = CATEGORY_EVENT_KINDS[category] ?? [];
          const relevant = kinds.length
            ? events.filter((e) => kinds.includes(e.kind))
            : [];
          if (relevant.length === 0) return null;
          return (
            <Field label="Linked event (optional)">
              <select
                value={service_event_id}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
              >
                <option value="">— None —</option>
                {relevant.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
          );
        })()}
      </SectionCard>

      <SectionCard title="Suggested questions" slug="what to nudge">
        <p className="text-xs text-zinc-500">
          The primary question shows by default. Tick any extras you&rsquo;d
          especially like them to answer — those open by default too and get a
          yellow highlight.
        </p>
        <div className="space-y-2">
          {questions.map((q) => (
            <label
              key={q.id}
              className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                suggested.has(q.id)
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <input
                type="checkbox"
                checked={suggested.has(q.id)}
                onChange={() => toggle(q.id)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm text-zinc-800">
                {q.text}
                {q.primary && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    primary
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Private note" slug="for your own tracking">
        <Field label="Not shown to the recipient">
          <TextArea
            rows={2}
            value={admin_note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </SectionCard>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-6">
        <Button onClick={create} disabled={pending}>
          Create prefill link
        </Button>
        {status === "saving" && <StatusPill status="saving" />}
        {status === "error" && <StatusPill status="error" />}
      </div>
    </div>
  );
}
