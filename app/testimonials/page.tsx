import type { Metadata } from "next";
import Link from "next/link";
import { FieldHero } from "@/components/editorial/FieldElements";
import {
  listPublicTestimonials,
  getAggregateKeywords,
  CATEGORY_LABELS,
  TESTIMONIAL_CATEGORIES,
  type Testimonial,
  type TestimonialCategory,
} from "@/lib/testimonials";
import { TestimonialsMarquee } from "@/components/sections/testimonials-marquee";
import { KeywordCards } from "@/components/testimonials/keyword-cards";
import {
  keywordLabel,
  getKeywordMeta,
} from "@/components/testimonials/keyword-meta";
import { ClearFilterLink } from "@/components/testimonials/clear-filter-link";

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "What people who've worked, trained, mentored, hacked, or studied with Edmund have to say.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [items, topKeywords, { filter }] = await Promise.all([
    listPublicTestimonials(),
    getAggregateKeywords(5),
    searchParams,
  ]);

  // Filter mode: flat list of testimonials matching the keyword, no category
  // grouping. Cleared by clicking the same card again on the client side.
  const activeFilter = filter?.trim() || null;
  const filteredItems = activeFilter
    ? items.filter((t) => (t.keywords ?? []).includes(activeFilter))
    : items;

  const byCategory = new Map<TestimonialCategory, Testimonial[]>();
  for (const t of filteredItems) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, []);
    byCategory.get(t.category)!.push(t);
  }
  // Prioritize testimonials with real avatars — stronger social proof up front.
  for (const rows of byCategory.values()) {
    rows.sort(
      (a, b) => (b.author_avatar_url ? 1 : 0) - (a.author_avatar_url ? 1 : 0),
    );
  }

  return (
    <main className="editorial-index">
      <FieldHero
        label="The people along the way"
        title="A journey is better with good company."
        description="Words from people I’ve built, learned and grown alongside. Their experiences, in their own words."
        number="05"
      />
      <div className="px-6 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="border-b border-zinc-200 pb-12">
            <p className="mt-6 max-w-2xl text-lg text-zinc-600">
              Words from training clients, mentees, peers, professors, hackathon
              teammates, and friends. If you&rsquo;ve got something to add,{" "}
              <Link
                href="/feedback"
                className="underline underline-offset-4 hover:text-zinc-900"
              >
                share it here
              </Link>
              .
            </p>

            <KeywordCards keywords={topKeywords} />
          </section>

          {items.length === 0 ? (
            <section className="py-20 text-center">
              <p className="text-zinc-500">No testimonials yet.</p>
              <Link
                href="/feedback"
                className="mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
              >
                Be the first →
              </Link>
            </section>
          ) : activeFilter ? (
            // Filter mode: narrative header + one flat marquee, no category
            // grouping. Adjective is yellow-highlighted; description below.
            <section className="border-b border-zinc-100 py-14">
              <div className="mx-6 sm:mx-0">
                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1 ? "person says" : "people say"}{" "}
                  <span
                    className="public-yellow-surface px-2 py-0.5"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {keywordLabel(activeFilter)}
                  </span>
                </h2>
                <p className="mt-3 text-base text-zinc-600 sm:text-lg">
                  {getKeywordMeta(activeFilter).description}.{" "}
                  <ClearFilterLink />
                </p>
              </div>
              {filteredItems.length === 0 ? (
                <p className="mt-8 text-sm text-zinc-500">
                  No testimonials tagged with this keyword yet.
                </p>
              ) : (
                <TestimonialsMarquee items={filteredItems} />
              )}
            </section>
          ) : (
            TESTIMONIAL_CATEGORIES.map((cat) => {
              const rows = byCategory.get(cat) ?? [];
              if (rows.length === 0) return null;
              return (
                <section key={cat} className="border-b border-zinc-100 py-14">
                  <div className="mx-6 flex items-baseline justify-between sm:mx-0">
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                      {CATEGORY_LABELS[cat]}
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {rows.length} {rows.length === 1 ? "voice" : "voices"}
                    </span>
                  </div>
                  <TestimonialsMarquee items={rows} />
                </section>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
