"use client";
import { adminUrl } from "@/lib/admin-url";

import Link from "@/components/admin/AdminLink";
import { useState, useTransition } from "react";
import { toggleFeatured, togglePublished, setStatus } from "./actions";
import type { Testimonial } from "@/lib/testimonials";
import { mergeSocials } from "@/lib/social-link";

const PUBLIC_ORIGIN =
  typeof window === "undefined" ? "https://whatelz.ai" : window.location.origin;

export function ListRow({
  t,
  categoryLabel,
}: {
  t: Testimonial;
  categoryLabel: string;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const completionUrl = t.completion_token
    ? `${PUBLIC_ORIGIN}/feedback?t=${t.completion_token}`
    : null;

  const isIncomplete = t.status === "incomplete";
  const isPending = t.status === "pending";
  const isRejected = t.status === "rejected";

  function copy() {
    if (!completionUrl) return;
    navigator.clipboard.writeText(completionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const displayName = t.author_name?.trim() || t.author_email || "Unnamed";

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            {categoryLabel}
          </span>
          {isIncomplete && (
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              incomplete
            </span>
          )}
          {isPending && (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
              pending
            </span>
          )}
          {isRejected && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-700">
              rejected
            </span>
          )}
          {t.featured && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-800">
              featured
            </span>
          )}
          {t.published ? (
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
              live
            </span>
          ) : (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              draft
            </span>
          )}
        </div>
        {t.quote && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{t.quote}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-zinc-400">
          {(t.author_affiliations ?? []).map((a, i) => (
            <span key={i}>
              {[a.role, a.company].filter(Boolean).join(", ")}
            </span>
          ))}
          {t.author_email && <span>{t.author_email}</span>}
          {mergeSocials(t.author_linkedin_url, t.author_socials).map((s) => (
            <a
              key={s.url}
              href={s.url}
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-zinc-700"
            >
              {s.platform} ↗
            </a>
          ))}
        </div>
        {isIncomplete && completionUrl && (
          <p className="mt-2 break-all font-mono text-[10px] text-zinc-400">
            {completionUrl}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {isIncomplete && completionUrl && (
          <button
            onClick={copy}
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
          >
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        )}
        {isPending && (
          <>
            <button
              disabled={pending}
              onClick={() => start(async () => setStatus(t.id, "approved"))}
              className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 transition-colors hover:text-emerald-900 disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              disabled={pending}
              onClick={() => start(async () => setStatus(t.id, "rejected"))}
              className="font-mono text-[10px] uppercase tracking-widest text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
            >
              ✗ Reject
            </button>
          </>
        )}
        {isRejected && (
          <button
            disabled={pending}
            onClick={() => start(async () => setStatus(t.id, "pending"))}
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-amber-600 disabled:opacity-50"
          >
            ↺ Re-queue
          </button>
        )}
        {t.status === "approved" && (
          <>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => toggleFeatured(t.id, !t.featured))
              }
              className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-amber-600 disabled:opacity-50"
            >
              {t.featured ? "Unfeature" : "Feature"}
            </button>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => togglePublished(t.id, !t.published))
              }
              className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50"
            >
              {t.published ? "Unpublish" : "Publish"}
            </button>
          </>
        )}
        <Link
          href={adminUrl(`/admin/testimonials/${t.id}`)}
          className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900"
        >
          {isIncomplete ? "Edit prefill →" : "Edit →"}
        </Link>
      </div>
    </div>
  );
}
