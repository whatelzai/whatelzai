"use client";
import { adminUrl } from "@/lib/admin-url";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Hackathon, HackathonAward } from "@/lib/hackathons";

interface Props {
  hackathon: Hackathon | null;
  onSave: (fd: FormData) => Promise<void>;
  onDelete: ((fd: FormData) => Promise<void>) | null;
}

export function HackathonForm({ hackathon, onSave, onDelete }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const [awards, setAwards] = useState<HackathonAward[]>(
    hackathon?.awards ?? [],
  );
  const [newTitle, setNewTitle] = useState("");
  const [newTrack, setNewTrack] = useState("");
  const [team, setTeam] = useState<string[]>(hackathon?.team ?? []);
  const [newMember, setNewMember] = useState("");
  const [writeup, setWriteup] = useState(hackathon?.writeup ?? "");
  const [preview, setPreview] = useState(false);

  function addAward() {
    if (!newTitle.trim()) return;
    setAwards((prev) => [
      ...prev,
      { title: newTitle.trim(), track: newTrack.trim() || undefined },
    ]);
    setNewTitle("");
    setNewTrack("");
  }

  function removeAward(i: number) {
    setAwards((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addMember() {
    if (!newMember.trim()) return;
    setTeam((prev) => [...prev, newMember.trim()]);
    setNewMember("");
  }

  function removeMember(i: number) {
    setTeam((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("awards", JSON.stringify(awards));
    fd.set("team", JSON.stringify(team));
    fd.set("writeup", writeup);
    startTransition(async () => {
      await onSave(fd);
      router.push(adminUrl("/admin/hackathons"));
      router.refresh();
    });
  }

  function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Delete this hackathon? This cannot be undone.")) return;
    const fd = new FormData();
    startDelete(async () => {
      await onDelete(fd);
      router.push(adminUrl("/admin/hackathons"));
      router.refresh();
    });
  }

  const inputCls =
    "w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors";
  const labelCls =
    "font-mono text-[10px] uppercase tracking-widest text-zinc-400";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <label className={labelCls}>Name *</label>
          <input
            name="name"
            required
            defaultValue={hackathon?.name}
            className={inputCls}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className={labelCls}>Slug</label>
          <input
            name="slug"
            defaultValue={hackathon?.slug ?? ""}
            placeholder="e.g. hackomania-2026"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Date *</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={hackathon?.date}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Organizer</label>
          <input
            name="organizer"
            defaultValue={hackathon?.organizer ?? ""}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Location</label>
          <input
            name="location"
            defaultValue={hackathon?.location ?? ""}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Demo URL</label>
          <input
            name="demo_url"
            type="url"
            defaultValue={hackathon?.demo_url ?? ""}
            className={inputCls}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className={labelCls}>Tags (comma-separated)</label>
          <input
            name="tags"
            defaultValue={hackathon?.tags.join(", ")}
            placeholder="ai, fintech, web3"
            className={inputCls}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className={labelCls}>Thumbnail URL</label>
          <input
            name="thumbnail_url"
            defaultValue={hackathon?.thumbnail_url ?? ""}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Tier</label>
          <select
            name="tier"
            defaultValue={hackathon?.tier ?? "coding"}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
          >
            <option value="coding">Coding</option>
            <option value="non-coding">Non-coding</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Project Name</label>
          <input
            name="project_name"
            defaultValue={hackathon?.project_name ?? ""}
            placeholder="e.g. EZBIZ"
            className={inputCls}
          />
        </div>
      </div>

      {/* Awards */}
      <div className="space-y-2">
        <p className={labelCls}>Awards</p>
        <div className="space-y-1">
          {awards.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-zinc-900 border border-zinc-100 rounded px-3 py-1.5">
                {a.title}
                {a.track ? ` · ${a.track}` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeAward(i)}
                className="font-mono text-xs text-zinc-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAward();
              }
            }}
            placeholder="Champion"
            className="flex-1 border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
          />
          <input
            value={newTrack}
            onChange={(e) => setNewTrack(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAward();
              }
            }}
            placeholder="Track (optional)"
            className="flex-1 border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={addAward}
            className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Team */}
      <div className="space-y-2">
        <p className={labelCls}>Team</p>
        <div className="space-y-1">
          {team.map((member, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-zinc-900 border border-zinc-100 rounded px-3 py-1.5">
                {member}
              </span>
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="font-mono text-xs text-zinc-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMember();
              }
            }}
            placeholder="Team member name"
            className="flex-1 border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={addMember}
            className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Writeup */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={labelCls}>Writeup (Markdown)</p>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {preview ? "Raw" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[240px] border border-zinc-200 rounded p-4 prose prose-zinc prose-sm max-w-none overflow-y-auto">
            {writeup.trim() ? (
              <ReactMarkdown>{writeup}</ReactMarkdown>
            ) : (
              <p className="text-zinc-300 font-mono text-sm">
                Nothing to preview.
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={writeup}
            onChange={(e) => setWriteup(e.target.value)}
            placeholder="Write about the hackathon…"
            spellCheck={false}
            className="w-full min-h-[240px] resize-y border border-zinc-200 rounded p-4 font-mono text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors leading-relaxed"
          />
        )}
      </div>

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <label className={labelCls}>Published</label>
        <select
          name="published"
          defaultValue={hackathon?.published ? "true" : "false"}
          className="border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
        >
          <option value="false">Draft</option>
          <option value="true">Published</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
        {onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="font-mono text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(adminUrl("/admin/hackathons"))}
            className="border border-zinc-200 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
