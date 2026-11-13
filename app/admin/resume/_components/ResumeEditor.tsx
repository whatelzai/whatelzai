"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ResumeVersion } from "@/lib/resume-versions";

interface Props {
  initialVersions: ResumeVersion[];
}

export function ResumeEditor({ initialVersions }: Props) {
  // Versions state — keyed by variant name
  const sorted = [...initialVersions].sort((a, b) => {
    if (a.variant.toLowerCase() === "main") return -1;
    if (b.variant.toLowerCase() === "main") return 1;
    return a.variant.localeCompare(b.variant);
  });
  const [versions, setVersions] = useState<ResumeVersion[]>(sorted);
  const [activeVariant, setActiveVariant] = useState<string>(
    sorted[0]?.variant ?? "",
  );

  // Per-variant draft content
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialVersions.map((v) => [v.variant, v.content])),
  );

  // Editor UI state
  const [view, setView] = useState<"raw" | "preview">("raw");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  // New variant creation
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const current = versions.find((v) => v.variant === activeVariant);
  const draft = drafts[activeVariant] ?? "";
  const dirty = draft !== (current?.content ?? "");
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  async function handleSaveVersion() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/resume-versions/${encodeURIComponent(activeVariant)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft }),
        },
      );
      const data = (await res.json()) as { version?: ResumeVersion };
      if (data.version) {
        setVersions((prev) =>
          prev.map((v) => (v.variant === activeVariant ? data.version! : v)),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportErr(null);
    try {
      const res = await fetch(
        `/api/admin/resume-versions/${encodeURIComponent(activeVariant)}/pdf`,
        {
          method: "POST",
        },
      );
      const data = (await res.json()) as { pdf_url?: string; error?: string };
      if (!res.ok || !data.pdf_url) {
        setExportErr(data.error ?? "Export failed");
        return;
      }
      setVersions((prev) =>
        prev.map((v) =>
          v.variant === activeVariant ? { ...v, pdf_url: data.pdf_url! } : v,
        ),
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleCreateVariant() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch(
        `/api/admin/resume-versions/${encodeURIComponent(name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "" }),
        },
      );
      const data = (await res.json()) as { version?: ResumeVersion };
      if (data.version) {
        setVersions((prev) => [...prev, data.version!]);
        setDrafts((prev) => ({ ...prev, [name]: "" }));
        setActiveVariant(name);
        setShowNew(false);
        setNewName("");
        setView("raw");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* ── Resume Versions ── */}
      <section className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-4">
          Resume Versions
        </p>

        {/* Variant tabs + new button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-zinc-200 rounded overflow-hidden">
            {versions.map((v) => (
              <button
                key={v.variant}
                onClick={() => {
                  setActiveVariant(v.variant);
                  setView("raw");
                  setExportErr(null);
                }}
                className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors border-r last:border-r-0 border-zinc-200 ${
                  activeVariant === v.variant
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {v.variant}
              </button>
            ))}
          </div>

          {showNew ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateVariant();
                  if (e.key === "Escape") {
                    setShowNew(false);
                    setNewName("");
                  }
                }}
                placeholder="e.g. Product Manager"
                className="border border-zinc-200 rounded px-3 py-1.5 font-mono text-xs text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 w-48"
              />
              <button
                onClick={handleCreateVariant}
                disabled={creating || !newName.trim()}
                className="border border-zinc-900 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40"
              >
                {creating ? "…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setShowNew(false);
                  setNewName("");
                }}
                className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="font-mono text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1.5"
            >
              + New
            </button>
          )}
        </div>

        {versions.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex border border-zinc-200 rounded overflow-hidden">
                {(["raw", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
                      view === v
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-mono text-xs text-zinc-400">
                  {wordCount} words
                </span>
                {dirty && !saving && (
                  <span className="font-mono text-xs text-amber-500">
                    Unsaved
                  </span>
                )}

                {current?.pdf_url && (
                  <a
                    href={current.pdf_url}
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-900 underline underline-offset-2"
                  >
                    PDF ↗
                  </a>
                )}

                <button
                  onClick={handleExportPdf}
                  disabled={exporting || !draft.trim()}
                  className="border border-zinc-200 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {exporting ? "Exporting…" : "Export PDF"}
                </button>

                <button
                  onClick={handleSaveVersion}
                  disabled={saving || !dirty}
                  className="border border-zinc-900 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {exportErr && (
              <p className="font-mono text-xs text-red-500">{exportErr}</p>
            )}

            {view === "raw" ? (
              <textarea
                value={draft}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [activeVariant]: e.target.value,
                  }))
                }
                placeholder={`Paste or write the ${activeVariant} resume in markdown…`}
                spellCheck={false}
                className="w-full h-[calc(100vh-380px)] min-h-[400px] resize-none border border-zinc-200 rounded p-4 font-mono text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors leading-relaxed"
              />
            ) : (
              <div className="w-full h-[calc(100vh-380px)] min-h-[400px] overflow-y-auto border border-zinc-200 rounded p-6 prose prose-zinc prose-sm max-w-none">
                {draft.trim() ? (
                  <ReactMarkdown>{draft}</ReactMarkdown>
                ) : (
                  <p className="text-zinc-300 font-mono text-sm">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
