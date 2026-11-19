"use client";
import { adminUrl } from "@/lib/admin-url";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/admin/AdminLink";
import {
  Button,
  Field,
  SectionCard,
  StatusPill,
  TextArea,
  TextInput,
} from "@/app/admin/landing/forms/primitives";
import {
  TESTIMONIAL_CATEGORIES,
  CATEGORY_LABELS,
  type TestimonialCategory,
} from "@/lib/testimonials";
import {
  CATEGORY_EVENT_KINDS,
  CATEGORY_EVENT_LABEL,
  type ServiceEvent,
} from "@/lib/service-events";
import { removeTemplate, saveTemplate } from "./actions";
import type { TestimonialTemplate } from "@/lib/testimonial-templates";

type Status = "idle" | "saving" | "saved" | "error";

const EMPTY: Partial<TestimonialTemplate> = {
  slug: "",
  name: "",
  category: "trainer" as TestimonialCategory,
  company_name: null,
  default_role: null,
  service_event_id: null,
  suggested_question_ids: [],
  expires_at: null,
  max_submissions: null,
  is_active: true,
  submissions_count: 0,
};

export function TemplateForm({
  initial,
  isNew,
  events,
}: {
  initial?: TestimonialTemplate;
  isNew?: boolean;
  events: ServiceEvent[];
}) {
  const router = useRouter();
  const t = initial ?? (EMPTY as TestimonialTemplate);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, start] = useTransition();

  const [slug, setSlug] = useState(t.slug);
  const [name, setName] = useState(t.name);
  const [category, setCategory] = useState<TestimonialCategory>(t.category);
  const [companyName, setCompanyName] = useState(t.company_name ?? "");
  const [defaultRole, setDefaultRole] = useState(t.default_role ?? "");
  const [suggestedIds, setSuggestedIds] = useState(
    (t.suggested_question_ids ?? []).join("\n"),
  );
  const [serviceEventId, setServiceEventId] = useState(
    t.service_event_id ?? "",
  );
  const [expiresAt, setExpiresAt] = useState(
    t.expires_at ? new Date(t.expires_at).toISOString().slice(0, 16) : "",
  );
  const [maxSubmissions, setMaxSubmissions] = useState(
    t.max_submissions !== null && t.max_submissions !== undefined
      ? String(t.max_submissions)
      : "",
  );
  const [isActive, setIsActive] = useState(t.is_active);

  function save() {
    setStatus("saving");
    start(async () => {
      try {
        await saveTemplate({
          id: isNew ? undefined : initial?.id,
          slug: slug.trim(),
          name: name.trim(),
          category,
          company_name: companyName.trim() || null,
          default_role: defaultRole.trim() || null,
          service_event_id: serviceEventId.trim() || null,
          suggested_question_ids: suggestedIds
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          max_submissions: maxSubmissions ? Number(maxSubmissions) : null,
          is_active: isActive,
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (
      !confirm(
        `Delete "${name}"? Submissions already created stay — the template just stops accepting new ones (and the link 404s).`,
      )
    )
      return;
    start(async () => {
      try {
        await removeTemplate(initial.id);
        router.push(adminUrl("/admin/testimonials/templates"));
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Identity" slug="slug + display name">
        <Field label="Name (admin-facing label)">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Astrail Training — Jul 2026"
          />
        </Field>
        <Field label="Slug (URL — kebab-case, lowercase)">
          <TextInput
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="astrail-2026-07"
          />
        </Field>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          Public URL: /feedback/t/{slug || "&lt;slug&gt;"}
        </p>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TestimonialCategory)}
            className="w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
          >
            {TESTIMONIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Prefills" slug="applied to each spawned testimonial">
        <Field label="Company name (optional — for company-wide asks)">
          <TextInput
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Astrail"
          />
        </Field>
        <Field label="Default role (optional — appears as suggestion in form)">
          <TextInput
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            placeholder="e.g. Software Engineer"
          />
        </Field>
        {(() => {
          const kinds = CATEGORY_EVENT_KINDS[category] ?? [];
          const relevant = kinds.length
            ? events.filter((e) => kinds.includes(e.kind))
            : [];
          const label =
            CATEGORY_EVENT_LABEL[category] ??
            "Linked event (only shown for training/mentorship/hackathon)";
          const disabled = kinds.length === 0;
          return (
            <Field
              label={`${label} (optional — pre-selects "${CATEGORY_EVENT_LABEL[category] ?? "event"}" on the form)`}
            >
              <select
                value={serviceEventId}
                onChange={(e) => setServiceEventId(e.target.value)}
                disabled={disabled}
                className="w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
              >
                <option value="">
                  {disabled
                    ? "— This category has no linked events —"
                    : "— None —"}
                </option>
                {relevant.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.event_date
                      ? ` — ${new Date(e.event_date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
          );
        })()}
        <Field label="Suggested question IDs (one per line — matches lib/testimonial-questions)">
          <TextArea
            value={suggestedIds}
            onChange={(e) => setSuggestedIds(e.target.value)}
            rows={4}
            placeholder="change&#10;convince"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Limits" slug="expiry + submission cap">
        <Field label="Expires at (optional — after this time the link auto-closes)">
          <TextInput
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
        <Field label="Max submissions (optional — link auto-closes at cap)">
          <TextInput
            type="number"
            min={1}
            value={maxSubmissions}
            onChange={(e) => setMaxSubmissions(e.target.value)}
            placeholder="Leave blank for no limit"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active (uncheck to pause without deleting)
        </label>
      </SectionCard>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 border border-zinc-900 bg-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <StatusPill status={status} />
          <Link
            href={adminUrl("/admin/testimonials/templates")}
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
          >
            ← All templates
          </Link>
        </div>
        {!isNew && initial?.id && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="font-mono text-xs uppercase tracking-widest text-red-500 transition-colors hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
