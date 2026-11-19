import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import {
  listTemplates,
  canAcceptSubmission,
  type TestimonialTemplate,
} from "@/lib/testimonial-templates";
import { CATEGORY_LABELS } from "@/lib/testimonials";

export const metadata: Metadata = {
  title: "Testimonial templates — whatelz.ai Admin",
};
export const dynamic = "force-dynamic";

function statusPill(t: TestimonialTemplate): { label: string; tone: string } {
  const { ok, reason } = canAcceptSubmission(t);
  if (ok) return { label: "open", tone: "bg-emerald-100 text-emerald-800" };
  if (reason === "expired")
    return { label: "expired", tone: "bg-zinc-100 text-zinc-500" };
  if (reason === "full")
    return { label: "full", tone: "bg-amber-100 text-amber-800" };
  return { label: "paused", tone: "bg-zinc-100 text-zinc-500" };
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function TemplatesListPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-8">
      <nav className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        <Link
          href={adminUrl("/admin/testimonials")}
          className="hover:text-zinc-900"
        >
          ← Testimonials
        </Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Testimonials · Group Prefill
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Templates
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Group prefill templates. Each generates a shareable link + QR code —
            every scan spawns a fresh testimonial row with your prefills
            applied. Use after trainings, workshops, or for company-wide asks.
          </p>
        </div>
        <Link
          href={adminUrl("/admin/testimonials/templates/new")}
          className="inline-flex items-center gap-1.5 border border-zinc-900 bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-[var(--accent)] hover:text-zinc-900 hover:border-[var(--accent)]"
        >
          + New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
          No templates yet.{" "}
          <Link
            href={adminUrl("/admin/testimonials/templates/new")}
            className="underline underline-offset-4 hover:text-zinc-900"
          >
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Prefills</th>
                <th className="px-4 py-3 text-left">Submissions</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const pill = statusPill(t);
                const prefills = [
                  t.company_name && `co: ${t.company_name}`,
                  t.default_role && `role: ${t.default_role}`,
                  t.service_event_id && "event",
                  t.suggested_question_ids.length > 0 &&
                    `${t.suggested_question_ids.length} q`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-100 last:border-none hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{t.name}</p>
                      <p className="font-mono text-[10px] tracking-wide text-zinc-400">
                        /feedback/t/{t.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                      {prefills || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {t.submissions_count}
                      {t.max_submissions !== null
                        ? ` / ${t.max_submissions}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {fmtDate(t.expires_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${pill.tone}`}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={adminUrl(`/admin/testimonials/templates/${t.id}`)}
                        className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
