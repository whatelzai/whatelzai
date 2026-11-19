"use client";

import { useState, useTransition } from "react";
import { ContentRenderer } from "@/components/shell/ContentRenderer";

type Props = {
  initial: string;
  onSave: (content: string) => Promise<void>;
  label?: string;
};

export function ContentEditor({
  initial,
  onSave,
  label = "Case Study",
}: Props) {
  const [content, setContent] = useState(initial);
  const [preview, setPreview] = useState(true);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded border border-zinc-200 p-0.5">
          <button
            onClick={() => setPreview(false)}
            className={`rounded px-3 py-1 font-mono text-xs transition-colors ${!preview ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            Edit
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`rounded px-3 py-1 font-mono text-xs transition-colors ${preview ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            Preview
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className="border border-zinc-900 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {preview ? (
        <div className="min-h-64 rounded border border-zinc-200 p-6">
          {content.trim() ? (
            <ContentRenderer content={content} />
          ) : (
            <p className="text-sm text-zinc-400">Nothing to preview.</p>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          placeholder={`Write the ${label.toLowerCase()} in Markdown…`}
          className="w-full resize-y rounded border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none"
        />
      )}
      <p className="font-mono text-[10px] text-zinc-400">
        Markdown + GFM supported ·{" "}
        <code className="text-[10px]">{'<YouTube id="..." />'}</code> for video
        embeds
      </p>
    </div>
  );
}
