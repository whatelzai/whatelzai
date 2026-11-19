"use client";

import { useState } from "react";
import type { CultureCollection } from "@/lib/knowledge/model";

export function CultureLibrary({
  libraries,
}: {
  libraries: CultureCollection[];
}) {
  const [collection, setCollection] = useState<string>(libraries[0]?.id ?? "");
  const [chapter, setChapter] = useState("all");
  const [search, setSearch] = useState("");
  const selected = libraries.find((item) => item.id === collection);
  const library = selected;
  const query = search.trim().toLocaleLowerCase();
  const matches = (library?.quotes ?? []).filter((quote) => {
    const titles = quote.chapters
      .map((id) => library?.chapters.find((item) => item.id === id)?.title)
      .join(" ");
    return (
      (chapter === "all" || quote.chapters.includes(chapter)) &&
      (!query || `${quote.text} ${titles}`.toLocaleLowerCase().includes(query))
    );
  });

  if (!library || !selected)
    return (
      <p className="text-zinc-500">No culture collections published yet.</p>
    );
  return (
    <section className="space-y-8">
      <div
        role="tablist"
        aria-label="Culture collections"
        className="grid gap-3 sm:grid-cols-3"
      >
        {libraries.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={collection === item.id}
            aria-controls="culture-panel"
            tabIndex={collection === item.id ? 0 : -1}
            onKeyDown={(event) => {
              const index = libraries.findIndex(
                (entry) => entry.id === item.id,
              );
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % libraries.length
                  : event.key === "ArrowLeft"
                    ? (index + libraries.length - 1) % libraries.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? libraries.length - 1
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setCollection(libraries[next].id);
              setChapter("all");
              document.getElementById(`tab-${libraries[next].id}`)?.focus();
            }}
            onClick={() => {
              setCollection(item.id);
              setChapter("all");
            }}
            className={`rounded-2xl border p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 ${collection === item.id ? "border-yellow-400 bg-yellow-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
          >
            <span className="block text-lg font-semibold">
              {item.displayName}
            </span>
            <span className="mt-2 block text-sm text-zinc-600">
              {item.teacher}
            </span>
            <span className="mt-3 block text-xs text-zinc-500">
              {item.quotes.length > 0
                ? `${item.quotes.length} sayings · ${item.chapters.length} chapters`
                : "To be added"}
            </span>
          </button>
        ))}
      </div>
      <div
        id="culture-panel"
        role="tabpanel"
        aria-labelledby={`tab-${collection}`}
        tabIndex={0}
        className="space-y-6"
      >
        {library.quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-12">
            <h2 className="text-2xl font-semibold">{selected.displayName}</h2>
            <p className="mt-4 text-zinc-600">
              This collection is ready for the words and teachings you’ll share
              next.
            </p>
            <p lang="zh-Hans" className="mt-3 text-sm text-zinc-500">
              金句与文化内容，待整理。
            </p>
          </div>
        ) : (
          <>
            <header>
              <h2 lang="zh-Hans" className="text-2xl font-semibold">
                {library.title}
              </h2>
              <p
                lang="zh-Hans"
                className="mt-3 text-sm leading-relaxed text-zinc-500"
              >
                {library.source} · 原文保留，出处与个别用字待核对。
              </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Chapter
                <select
                  value={chapter}
                  onChange={(event) => setChapter(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
                  lang="zh-Hans"
                >
                  <option value="all">全部章节 · All chapters</option>
                  {library.chapters.map((item, index) => (
                    <option key={item.id} value={item.id}>
                      {index + 1}. {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Search sayings
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search words or themes · 学习、团队…"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm text-zinc-500">
                {matches.length} {matches.length === 1 ? "saying" : "sayings"}
                {chapter !== "all" || query
                  ? " matching your filters"
                  : " in this collection"}
              </p>
              {(chapter !== "all" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setChapter("all");
                    setSearch("");
                  }}
                  className="text-sm underline underline-offset-4"
                >
                  Clear filters
                </button>
              )}
            </div>
            {matches.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-8 text-zinc-600">
                No sayings found. Try another word or chapter.
              </p>
            ) : (
              <ol className="grid gap-4 md:grid-cols-2">
                {matches.map((quote) => (
                  <li
                    key={quote.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7"
                  >
                    <blockquote
                      lang="zh-Hans"
                      className="break-words text-xl font-medium leading-loose text-zinc-900"
                    >
                      {quote.text}
                    </blockquote>
                    <div lang="zh-Hans" className="mt-6 flex flex-wrap gap-2">
                      {quote.chapters.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setChapter(id)}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs leading-relaxed text-zinc-600 hover:bg-yellow-100"
                        >
                          {
                            library?.chapters.find((item) => item.id === id)
                              ?.title
                          }
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
