import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getTemplateById,
  templatePublicUrl,
  canAcceptSubmission,
} from "@/lib/testimonial-templates";
import { qrPngDataUri } from "@/lib/qr";
import { getSiteIdentity } from "@/lib/site-identity";
import { listServiceEvents } from "@/lib/service-events";
import { supabaseAdmin } from "@/lib/supabase-server";
import { TemplateForm } from "../TemplateForm";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTemplateById(id);
  return { title: `${t?.name ?? "Template"} — Admin` };
}

async function submissionsFromTemplate(templateId: string) {
  const { data } = await supabaseAdmin
    .from("testimonials")
    .select("id, author_name, author_email, status, submitted_at, created_at")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const [t, site, events] = await Promise.all([
    getTemplateById(id),
    getSiteIdentity(),
    listServiceEvents(),
  ]);
  if (!t) notFound();

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whatelz.ai";
  const publicUrl = templatePublicUrl(t.slug, origin);
  const [qrDataUri, submissions] = await Promise.all([
    qrPngDataUri(publicUrl, { size: 640 }),
    submissionsFromTemplate(t.id),
  ]);
  const gate = canAcceptSubmission(t);

  return (
    <div className="space-y-8">
      <div>
        <nav className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          <Link
            href={adminUrl("/admin/testimonials/templates")}
            className="hover:text-zinc-900"
          >
            ← Templates
          </Link>
        </nav>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          {t.name}
        </h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">
          Created {new Date(t.created_at).toLocaleDateString("en-SG")}
          {" · "}
          {t.submissions_count} submission{t.submissions_count === 1 ? "" : "s"}
          {t.max_submissions !== null ? ` of ${t.max_submissions}` : ""}
        </p>
      </div>

      {/* Public link + QR block */}
      <section className="grid gap-6 border border-zinc-200 bg-white p-6 md:grid-cols-[auto_1fr] md:gap-8 md:p-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUri}
            alt={`QR code linking to ${publicUrl}`}
            width={240}
            height={240}
            className="h-60 w-60 border border-zinc-100"
          />
          <a
            href={qrDataUri}
            download={`whatelz-qr-${t.slug}.png`}
            className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
          >
            Download PNG ↓
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Public link
            </p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-900">
              {publicUrl}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={publicUrl} label="Copy link" />
            <Link
              href={publicUrl}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-zinc-300 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
            >
              Preview ↗
            </Link>
          </div>
          <div className="mt-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Status
            </p>
            {gate.ok ? (
              <p className="mt-2 text-sm text-emerald-700">
                Open · accepting submissions
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Closed · {gate.reason}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Edit form */}
      <div>
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          Edit template
        </h2>
        <TemplateForm initial={t} events={events} />
      </div>

      {/* Submissions */}
      {submissions.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            Submissions from this template ({submissions.length})
          </h2>
          <div className="overflow-x-auto border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-100 last:border-none"
                  >
                    <td className="px-4 py-3">{s.author_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {s.author_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.status}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString("en-SG")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={adminUrl(`/admin/testimonials/${s.id}`)}
                        className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
