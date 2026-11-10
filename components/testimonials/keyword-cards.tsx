"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getKeywordMeta, keywordLabel } from "./keyword-meta";

// Five prestigious keyword cards. Click to filter /testimonials to only rows
// tagged with that keyword. Click active card again to clear. State in URL.
//
// Design intent: adjective is the star. Description is intentionally hidden
// by default (short attention span) and only fades in on desktop hover — like
// a subtle tooltip. When a filter is active, the description also appears in
// the narrative section header ("N people say I am FOCUSED · <description>").
export function KeywordCards({
  keywords,
}: {
  keywords: { word: string; count: number }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("filter");

  function toggle(word: string) {
    const next = new URLSearchParams(params);
    if (active === word) next.delete("filter");
    else next.set("filter", word);
    const qs = next.toString();
    router.push(`/testimonials${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  if (keywords.length === 0) return null;

  return (
    <section className="mt-14">
      <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        What people say most · click to filter
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {keywords.map((k) => {
          const meta = getKeywordMeta(k.word);
          const Icon = meta.Icon;
          const isActive = active === k.word;
          return (
            <li key={k.word}>
              <button
                type="button"
                onClick={() => toggle(k.word)}
                aria-pressed={isActive}
                aria-label={`Filter by ${keywordLabel(k.word)} — ${meta.description}`}
                title={meta.description}
                className={`public-keyword-filter group relative flex h-full min-h-[220px] w-full flex-col items-center justify-between gap-6 overflow-hidden border p-6 text-center transition-all sm:min-h-[260px] sm:p-8 ${
                  isActive
                    ? "border-zinc-900 shadow-lg"
                    : "border-zinc-200 bg-white hover:border-zinc-900"
                }`}
                style={
                  isActive ? { backgroundColor: "var(--accent)" } : undefined
                }
              >
                {/* Icon */}
                <span
                  className={`flex h-11 w-11 items-center justify-center transition-transform group-hover:scale-110 sm:h-12 sm:w-12 ${
                    isActive ? "text-zinc-900" : "text-zinc-400"
                  }`}
                  aria-hidden
                >
                  <Icon size={44} strokeWidth={1.5} />
                </span>

                {/* Adjective (the star) */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <p
                    className="text-2xl font-bold uppercase leading-tight tracking-tight text-zinc-900 sm:text-3xl"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {keywordLabel(k.word)}
                  </p>
                  <p
                    className={`font-mono text-[10px] tracking-widest uppercase ${
                      isActive ? "text-zinc-800" : "text-zinc-400"
                    }`}
                  >
                    ×{k.count}
                  </p>
                </div>

                {/* Description — hidden by default, fades in on desktop hover.
                    When the card is active (filtered), the description locks
                    open regardless of hover, so the user knows why this card
                    is currently affecting the view below. Mobile: hidden
                    unless active. */}
                <p
                  className={`text-xs leading-relaxed transition-opacity duration-200 ${
                    isActive
                      ? "text-zinc-800 opacity-100"
                      : "hidden opacity-0 group-hover:opacity-100 sm:block"
                  }`}
                  aria-hidden
                >
                  {meta.description}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
