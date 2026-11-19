"use client";
import { adminUrl } from "@/lib/admin-url";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/admin/AdminLink";
import Image from "next/image";
import {
  saveTestimonial,
  removeTestimonial,
  uploadAvatarAction,
} from "./actions";
import {
  TESTIMONIAL_CATEGORIES,
  CATEGORY_LABELS,
  type Affiliation,
  type Testimonial,
  type TestimonialCategory,
  type TestimonialStatus,
  type QuoteAnswer,
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

type FormState = {
  id: string;
  headline: string;
  author_name: string;
  author_avatar_url: string;
  author_email: string;
  author_linkedin_url: string;
  affiliations: Affiliation[];
  outcome_tag: string;
  category: TestimonialCategory;
  status: TestimonialStatus;
  featured: boolean;
  published: boolean;
  sort_order: string;
  admin_note: string;
  improvement_note: string;
  service_event_id: string;
  suggested_question_ids: Set<string>;
  answers: Map<string, string>;
  extra_ids: Set<string>; // extra questions the admin opened besides primary/suggested/answered
};

function toState(t: Testimonial): FormState {
  return {
    id: t.id,
    headline: t.headline ?? "",
    author_name: t.author_name ?? "",
    author_avatar_url: t.author_avatar_url ?? "",
    author_email: t.author_email ?? "",
    author_linkedin_url: t.author_linkedin_url ?? "",
    affiliations:
      t.author_affiliations && t.author_affiliations.length > 0
        ? t.author_affiliations
        : [{ role: "", company: "" }],
    outcome_tag: t.outcome_tag ?? "",
    category: t.category,
    status: t.status,
    featured: t.featured,
    published: t.published,
    sort_order: t.sort_order?.toString() ?? "",
    admin_note: t.admin_note ?? "",
    improvement_note: t.improvement_note ?? "",
    service_event_id: t.service_event_id ?? "",
    suggested_question_ids: new Set(t.suggested_question_ids ?? []),
    answers: new Map(
      (t.quote_answers ?? []).map((a) => [a.question_id, a.answer]),
    ),
    extra_ids: new Set(),
  };
}

const PUBLIC_ORIGIN =
  typeof window === "undefined" ? "https://whatelz.ai" : window.location.origin;

export function TestimonialForm({
  initial,
  completionToken,
  events,
}: {
  initial: Testimonial;
  completionToken: string | null;
  events: ServiceEvent[];
}) {
  const [state, setState] = useState<FormState>(toState(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const questions = TESTIMONIAL_QUESTIONS[state.category] ?? [];
  const completionUrl = completionToken
    ? `${PUBLIC_ORIGIN}/feedback?t=${completionToken}`
    : null;
  const isIncomplete = state.status === "incomplete";

  // Which questions to show as textareas:
  // suggested OR answered OR admin explicitly opened.
  const shownIds = new Set<string>([
    ...state.suggested_question_ids,
    ...state.answers.keys(),
    ...state.extra_ids,
  ]);
  const shownQuestions = questions.filter((q) => shownIds.has(q.id));
  const unshownQuestions = questions.filter((q) => !shownIds.has(q.id));

  function toggleSuggested(qid: string) {
    const next = new Set(state.suggested_question_ids);
    if (next.has(qid)) next.delete(qid);
    else next.add(qid);
    setState({ ...state, suggested_question_ids: next });
  }

  function setAnswer(qid: string, value: string) {
    const next = new Map(state.answers);
    if (value) next.set(qid, value);
    else next.delete(qid);
    setState({ ...state, answers: next });
  }

  function openExtra(qid: string) {
    setState({ ...state, extra_ids: new Set([...state.extra_ids, qid]) });
  }

  function updateAffiliation(i: number, patch: Partial<Affiliation>) {
    setState({
      ...state,
      affiliations: state.affiliations.map((a, j) =>
        i === j ? { ...a, ...patch } : a,
      ),
    });
  }
  function addAffiliation() {
    setState({
      ...state,
      affiliations: [...state.affiliations, { role: "", company: "" }],
    });
  }
  function removeAffiliation(i: number) {
    if (state.affiliations.length === 1) {
      setState({ ...state, affiliations: [{ role: "", company: "" }] });
      return;
    }
    setState({
      ...state,
      affiliations: state.affiliations.filter((_, j) => j !== i),
    });
  }

  function copyLink() {
    if (!completionUrl) return;
    navigator.clipboard.writeText(completionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadAvatarAction(fd);
      setState((s) => ({ ...s, author_avatar_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setStatus("saving");
    start(async () => {
      try {
        const quote_answers: QuoteAnswer[] = questions
          .filter((q) => (state.answers.get(q.id) ?? "").trim().length > 0)
          .map((q) => ({
            question_id: q.id,
            question_text: q.text,
            answer: state.answers.get(q.id)!.trim(),
          }));
        const quote = quote_answers[0]?.answer ?? "";

        const affiliations = state.affiliations.filter(
          (a) => a.role.trim() || a.company.trim(),
        );

        await saveTestimonial({
          id: state.id,
          category: state.category,
          headline: state.headline.trim() || null,
          quote,
          quote_answers,
          author_name: state.author_name,
          author_avatar_url: state.author_avatar_url || null,
          author_email: state.author_email || null,
          author_linkedin_url: state.author_linkedin_url || null,
          author_affiliations: affiliations.length ? affiliations : null,
          outcome_tag: state.outcome_tag || null,
          status: state.status,
          featured: state.featured,
          published: state.published,
          sort_order: state.sort_order ? Number(state.sort_order) : null,
          admin_note: state.admin_note || null,
          improvement_note: state.improvement_note || null,
          suggested_question_ids: Array.from(state.suggested_question_ids),
          service_event_id: state.service_event_id || null,
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this testimonial? This cannot be undone.")) return;
    start(async () => {
      try {
        await removeTestimonial(state.id);
        router.push(adminUrl("/admin/testimonials"));
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
            {isIncomplete ? "Edit prefill" : "Edit testimonial"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {state.author_name || state.author_email || "Untitled"}
          </h1>
        </div>
        <Link
          href={adminUrl("/admin/testimonials")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back
        </Link>
      </div>

      {isIncomplete && completionUrl && (
        <div className="rounded border-2 border-zinc-900 bg-zinc-50 p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Completion link — send to them
          </p>
          <div className="mt-3 flex items-center gap-3">
            <p className="min-w-0 flex-1 break-all font-mono text-sm text-zinc-800">
              {completionUrl}
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 border border-zinc-900 bg-zinc-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white transition-colors hover:bg-[var(--accent)] hover:text-zinc-900"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <SectionCard title="Author" slug="who said it">
        <Field label="Display name">
          <TextInput
            value={state.author_name}
            onChange={(e) =>
              setState({ ...state, author_name: e.target.value })
            }
            placeholder="e.g. Sim Yee L."
          />
        </Field>

        {/* Affiliations */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Role & company (add more than one if needed)
          </p>
          <div className="mt-2 space-y-2">
            {state.affiliations.map((aff, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <TextInput
                  placeholder="Role (e.g. Co-founder)"
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
                  aria-label="Remove"
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

        <Field label="Email (private)">
          <TextInput
            type="email"
            value={state.author_email}
            onChange={(e) =>
              setState({ ...state, author_email: e.target.value })
            }
          />
        </Field>
        <Field label="LinkedIn URL (public — proof of authority)">
          <TextInput
            type="url"
            value={state.author_linkedin_url}
            onChange={(e) =>
              setState({ ...state, author_linkedin_url: e.target.value })
            }
          />
        </Field>

        {/* Avatar upload */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Avatar photo
          </p>
          <div className="mt-3 flex items-center gap-4">
            {state.author_avatar_url ? (
              <Image
                src={state.author_avatar_url}
                alt="Avatar"
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-mono text-xs text-zinc-500">
                —
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 border border-zinc-300 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700 transition-colors hover:border-zinc-900 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload image"}
              </button>
              {state.author_avatar_url && (
                <button
                  type="button"
                  onClick={() => setState({ ...state, author_avatar_url: "" })}
                  className="font-mono text-[10px] uppercase tracking-widest text-red-500 transition-colors hover:text-red-700"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onPickAvatar}
                className="sr-only"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Headline" slug="editorial one-liner">
        <Field label="One-line summary (displayed as card title — safe to distill their voice, do not fabricate)">
          <TextInput
            value={state.headline}
            onChange={(e) => setState({ ...state, headline: e.target.value })}
            placeholder="e.g. Imposter syndrome isn't entirely a bad thing"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Their answers" slug="the testimonial">
        {shownQuestions.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No answers yet. Tick a question below as &ldquo;suggested&rdquo; or
            open one to add an answer.
          </p>
        ) : (
          <div className="space-y-4">
            {shownQuestions.map((q) => (
              <div key={q.id} className="rounded border border-zinc-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    {q.text}
                  </p>
                  <label className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    <input
                      type="checkbox"
                      checked={state.suggested_question_ids.has(q.id)}
                      onChange={() => toggleSuggested(q.id)}
                      className="h-3.5 w-3.5"
                    />
                    Suggested
                  </label>
                </div>
                <TextArea
                  rows={3}
                  value={state.answers.get(q.id) ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Their answer."
                  className="mt-3"
                />
              </div>
            ))}
          </div>
        )}

        {unshownQuestions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Add or suggest another question
            </p>
            <div className="space-y-2">
              {unshownQuestions.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => openExtra(q.id)}
                  className="block w-full border border-zinc-200 bg-white p-3 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
                >
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Polish" slug="admin-only enhancements">
        <Field label="Outcome tag (e.g. → Shipped 3 workflows in 30 days)">
          <TextInput
            value={state.outcome_tag}
            onChange={(e) =>
              setState({ ...state, outcome_tag: e.target.value })
            }
          />
        </Field>
        <Field label="Private admin note (your own tracking, not from them)">
          <TextArea
            rows={2}
            value={state.admin_note}
            onChange={(e) => setState({ ...state, admin_note: e.target.value })}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="What could be improved"
        slug="private feedback from them"
      >
        <p className="text-xs text-zinc-500">
          What they wrote in the &ldquo;could be improved&rdquo; box. Never
          shown publicly. You can edit this if you need to.
        </p>
        <TextArea
          rows={4}
          value={state.improvement_note}
          onChange={(e) =>
            setState({ ...state, improvement_note: e.target.value })
          }
          placeholder="Nothing shared yet."
        />
      </SectionCard>

      <SectionCard title="Placement" slug="where it shows">
        <Field label="Category">
          <select
            value={state.category}
            onChange={(e) =>
              setState({
                ...state,
                category: e.target.value as TestimonialCategory,
                service_event_id: "",
              })
            }
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
          const kinds = CATEGORY_EVENT_KINDS[state.category] ?? [];
          const relevant = kinds.length
            ? events.filter((e) => kinds.includes(e.kind))
            : [];
          if (relevant.length === 0) return null;
          return (
            <Field label="Linked event (optional)">
              <select
                value={state.service_event_id}
                onChange={(e) =>
                  setState({ ...state, service_event_id: e.target.value })
                }
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
        <Field label="Status">
          <select
            value={state.status}
            onChange={(e) =>
              setState({
                ...state,
                status: e.target.value as TestimonialStatus,
              })
            }
            className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          >
            <option value="incomplete">Incomplete — waiting on them</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Sort order (lower = earlier)">
          <TextInput
            type="number"
            value={state.sort_order}
            onChange={(e) => setState({ ...state, sort_order: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.featured}
              onChange={(e) =>
                setState({ ...state, featured: e.target.checked })
              }
              className="h-4 w-4"
            />
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-700">
              Featured on homepage
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.published}
              onChange={(e) =>
                setState({ ...state, published: e.target.checked })
              }
              className="h-4 w-4"
            />
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-700">
              Published (public)
            </span>
          </label>
        </div>
      </SectionCard>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            Save
          </Button>
          <StatusPill status={status} />
        </div>
        <Button variant="danger" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </div>
  );
}
