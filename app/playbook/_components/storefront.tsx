import type { Metadata } from "next";
import Link from "next/link";
import { getOfferBySlug } from "@/lib/offers";
import { formatMinorUnits } from "@/lib/format-price";
import { CheckoutButton } from "../checkout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Money & AI Playbook — Lifetime Access",
  description:
    "One playbook. Two pillars — Mindset and Skillset. Lifetime access, every future update, one flat payment.",
};

const PILLARS = [
  {
    title: "Mindset",
    body: "How solopreneurs actually think about AI — the shifts that separate people who compound leverage from people who accumulate tabs.",
  },
  {
    title: "Skillset",
    body: "The concrete workflows, prompts, and systems. What to build, in what order, with which tool, and what to ignore.",
  },
] as const;

const STACK_DEFAULTS: { slot: string; body: string; anchor: number }[] = [
  {
    slot: "The Playbook",
    body: "Mindset + Skillset — every current chapter, front to back.",
    anchor: 4900,
  },
  {
    slot: "Personalised reading order",
    body: "Archetype-based path from the /quiz — start where it lands for you.",
    anchor: 1900,
  },
  {
    slot: "AI Employee prompt pack",
    body: "Starter templates drawn from the whatelzai artifacts. Copy, adapt, ship.",
    anchor: 2900,
  },
  {
    slot: "Every future update, free",
    body: "Lifetime access. New chapters, revised playbooks, no version paywall.",
    anchor: 1900,
  },
];

export default async function PlaybookPage() {
  const offer = await getOfferBySlug("playbook-lifetime-v1");
  if (!offer || !offer.active) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-3xl font-semibold">
          The Playbook is being prepared.
        </h1>
        <p className="mt-4 text-zinc-600">
          Check back shortly — or{" "}
          <Link href="/quiz/what-kind-of-solopreneur" className="underline">
            take the quiz
          </Link>{" "}
          in the meantime.
        </p>
      </main>
    );
  }

  const currency = offer.currency;
  const priceStr = offer.unit_amount
    ? formatMinorUnits(offer.unit_amount, currency)
    : offer.price_display;
  const anchorStr = offer.anchor_amount
    ? formatMinorUnits(offer.anchor_amount, currency)
    : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: offer.name,
    description: offer.description ?? undefined,
    brand: { "@type": "Brand", name: "whatelz.ai" },
    offers: {
      "@type": "Offer",
      price: offer.unit_amount
        ? (offer.unit_amount / 100).toFixed(2)
        : undefined,
      priceCurrency: currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      url: "https://whatelz.ai/playbook",
    },
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <header className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          The Money &amp; AI Playbook
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
          Two pillars. One playbook. Lifetime access.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
          Everything I know about running a solopreneur business with AI as the
          employee layer — the way I actually run mine.
        </p>
      </header>

      <section className="mt-16 grid gap-8 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Pillar
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
              {p.title}
            </h2>
            <p className="mt-3 text-sm text-zinc-600">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-center text-xs font-mono uppercase tracking-widest text-zinc-500">
          What&apos;s inside
        </h2>
        <ul className="mx-auto mt-6 max-w-2xl divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          {STACK_DEFAULTS.map((s) => (
            <li
              key={s.slot}
              className="flex items-baseline justify-between gap-6 p-5"
            >
              <div>
                <p className="font-medium text-zinc-900">{s.slot}</p>
                <p className="mt-1 text-sm text-zinc-600">{s.body}</p>
              </div>
              <p className="font-mono text-xs tabular-nums text-zinc-400">
                {formatMinorUnits(s.anchor, currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 text-center">
        {anchorStr && (
          <p className="font-mono text-lg text-zinc-400 line-through decoration-zinc-300">
            {anchorStr}
          </p>
        )}
        <p className="mt-1 text-5xl font-semibold tabular-nums text-zinc-900">
          {priceStr}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          one payment · lifetime access
        </p>
        <div className="mt-8 flex justify-center">
          <CheckoutButton offerSlug={offer.slug} priceLabel={priceStr} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-xs text-zinc-500">
          Anonymous checkout. You&apos;ll create your free account on the next
          page — email is pre-filled from your receipt.
        </p>
      </section>
    </main>
  );
}
