"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const EDITABLE_PLATFORMS = [
  "linkedin",
  "medium",
  "substack",
  "beehiiv",
] as const;
type EditablePlatform = (typeof EDITABLE_PLATFORMS)[number];

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  beehiiv: "Beehiiv",
  whatelz: "whatelz.ai (canonical)",
  resend: "Email broadcast",
};

interface DistributionRow {
  id: string;
  platform: string;
  external_url: string | null;
  published_at: string | null;
  notes: string | null;
}

export function DistributionsPanel({
  issueId,
  initial,
}: {
  issueId: string;
  initial: DistributionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [platform, setPlatform] = useState<EditablePlatform>("linkedin");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/newsletter/${issueId}/distributions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform, external_url: url.trim() }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }
      setUrl("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Distributions
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Log cross-post URLs after publishing on each platform. They appear on
          the public issue page under &ldquo;Also on&rdquo;.
        </p>
      </div>

      {initial.length > 0 ? (
        <ul className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {initial.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">
                  {PLATFORM_LABEL[d.platform] ?? d.platform}
                </p>
                {d.external_url && (
                  <a
                    href={d.external_url}
                    rel="noopener"
                    className="mt-0.5 block text-xs text-zinc-500 hover:text-zinc-900 truncate"
                  >
                    {d.external_url}
                  </a>
                )}
                {d.notes && (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {d.notes}
                  </p>
                )}
              </div>
              <span className="text-xs text-zinc-300 shrink-0">
                {d.published_at
                  ? new Date(d.published_at).toLocaleDateString("en-SG", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400">No distributions logged yet.</p>
      )}

      <form
        onSubmit={handleAdd}
        className="border border-zinc-200 rounded p-4 space-y-3"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Add distribution
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as EditablePlatform)}
            className="border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
          >
            {EDITABLE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/pulse/..."
            className="flex-1 border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 hover:bg-zinc-900 hover:text-white disabled:opacity-40"
          >
            {pending ? "…" : "Log"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}
