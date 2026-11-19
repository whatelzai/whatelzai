"use client";
import { adminUrl } from "@/lib/admin-url";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "@/components/admin/AdminLink";
import {
  Button,
  Field,
  SectionCard,
  StatusPill,
  TextArea,
  TextInput,
} from "@/app/admin/landing/forms/primitives";
import { removeService, saveService } from "./actions";
import type { Service } from "@/lib/services";

type Status = "idle" | "saving" | "saved" | "error";

// Minimum-viable service editor. Simple text/enum fields have proper inputs.
// The nested pricing + terms JSON blobs are exposed as raw JSON textareas
// with a note pointing at the MCP verbs for complex edits — Edmund can
// either edit inline or ask Claude via `services.upsert` in chat.
export function ServiceForm({ initial }: { initial: Service }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [pending, start] = useTransition();

  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug);
  const [category, setCategory] = useState(initial.category ?? "");
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [audience, setAudience] = useState(initial.audience ?? "");
  const [pricingModel, setPricingModel] = useState(initial.pricing_model ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial.cta_url ?? "");
  const [proof, setProof] = useState(initial.proof ?? "");
  const [serviceStatus, setServiceStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [published, setPublished] = useState(initial.published);
  const [sortOrder, setSortOrder] = useState(
    initial.sort_order?.toString() ?? "",
  );
  const [deliverables, setDeliverables] = useState(
    (initial.deliverables ?? []).join("\n"),
  );
  const [pricingJson, setPricingJson] = useState(
    initial.pricing ? JSON.stringify(initial.pricing, null, 2) : "",
  );
  const [termsJson, setTermsJson] = useState(
    initial.terms ? JSON.stringify(initial.terms, null, 2) : "",
  );
  const [content, setContent] = useState(initial.content ?? "");

  function save() {
    setStatus("saving");
    start(async () => {
      try {
        let pricing: Service["pricing"] = null;
        if (pricingJson.trim()) {
          try {
            pricing = JSON.parse(pricingJson) as Service["pricing"];
          } catch {
            alert("Pricing JSON is invalid. Fix or clear the field.");
            setStatus("error");
            return;
          }
        }
        let terms: Service["terms"] = null;
        if (termsJson.trim()) {
          try {
            terms = JSON.parse(termsJson) as Service["terms"];
          } catch {
            alert("Terms JSON is invalid. Fix or clear the field.");
            setStatus("error");
            return;
          }
        }

        await saveService({
          id: initial.id,
          slug,
          name,
          category,
          tagline: tagline || null,
          description: description || null,
          audience: audience || null,
          pricing_model: pricingModel || null,
          pricing,
          deliverables:
            deliverables
              .split("\n")
              .map((d) => d.trim())
              .filter((d) => d.length > 0) || null,
          terms,
          cta_label: ctaLabel || null,
          cta_url: ctaUrl || null,
          proof: proof || null,
          status: serviceStatus,
          featured,
          published,
          sort_order: sortOrder ? Number(sortOrder) : null,
          content: content || null,
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    });
  }

  function remove() {
    if (
      !confirm(
        `Delete "${name}"? This removes the service from /services and any deep link.`,
      )
    )
      return;
    start(async () => {
      try {
        await removeService(initial.id);
        router.push(adminUrl("/admin/services"));
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
            Service
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {name || slug}
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            /services/{slug}
          </p>
        </div>
        <Link
          href={adminUrl("/admin/services")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back
        </Link>
      </div>

      <SectionCard title="Basics" slug="core details">
        <Field label="Name (customer-facing)">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="1-on-1 AI Coaching"
          />
        </Field>
        <Field label="Slug (URL — kebab-case, lowercase)">
          <TextInput
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ai-mentor-1-1"
          />
        </Field>
        <Field label="Category">
          <TextInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="mentor / training / course / speak / build"
          />
        </Field>
        <Field label="Tagline (one line — shown under the name)">
          <TextInput
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </Field>
        <Field label="Audience">
          <TextInput
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Founders serious about becoming AI-literate"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Description" slug="the pitch">
        <Field label="Description (2-4 sentences)">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </Field>
        <Field label="Deliverables (one per line)">
          <TextArea
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            rows={6}
            placeholder="4-session intensive onboarding month&#10;1 bookable session per month thereafter&#10;Lifetime access to future ASR products"
          />
        </Field>
        <Field label="Proof (optional — social/authority line)">
          <TextInput value={proof} onChange={(e) => setProof(e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="CTA" slug="how they book">
        <Field label="CTA label">
          <TextInput
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Reserve my founding spot"
          />
        </Field>
        <Field label="CTA URL (mailto: / calendar link / route)">
          <TextInput
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="mailto:elz.work22@gmail.com?subject=Reserve"
          />
        </Field>
        <Field label="Pricing model (free-form: package / per_hour / etc)">
          <TextInput
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Pricing (JSON)" slug="tiers + founding block">
        <div className="mb-3 rounded border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>
            <strong>Complex edits?</strong> Ask Claude via MCP:{" "}
            <code className="text-[11px]">services.upsert</code> handles nested
            pricing cleanly. This textarea is for quick tweaks.
          </p>
        </div>
        <Field label="Pricing JSON (currency + tiers + optional founding block)">
          <TextArea
            value={pricingJson}
            onChange={(e) => setPricingJson(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Terms (JSON)" slug="fine print">
        <Field label="Terms JSON (deposit_pct, cap_pax, notes)">
          <TextArea
            value={termsJson}
            onChange={(e) => setTermsJson(e.target.value)}
            rows={5}
            className="font-mono text-xs"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Long-form content" slug="optional prose body">
        <Field label="Markdown / rich body (optional)">
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Visibility" slug="status + published + sort">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published (visible on /services)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured
          </label>
        </div>
        <Field label="Status">
          <select
            value={serviceStatus}
            onChange={(e) =>
              setServiceStatus(e.target.value as Service["status"])
            }
            className="w-full border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
          >
            <option value="live">live</option>
            <option value="coming_soon">coming_soon</option>
            <option value="private">private</option>
            <option value="retired">retired</option>
          </select>
        </Field>
        <Field label="Sort order (lower = appears first)">
          <TextInput
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </Field>
      </SectionCard>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 border border-zinc-900 bg-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <StatusPill status={status} />
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="font-mono text-xs uppercase tracking-widest text-red-500 transition-colors hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
