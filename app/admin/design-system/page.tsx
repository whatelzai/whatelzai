import { WhatelzMark } from "@/components/brand/WhatelzMark";
import identity from "@/public/brand/identity.json";

export const metadata = { title: "Brand & design system — Admin" };

const downloads = [
  ["Logo lockup · ink SVG", "/brand/logo-ink.svg"],
  ["Logo lockup · warm white SVG", "/brand/logo-paper.svg"],
  ["Logo lockup · yellow SVG", "/brand/logo-yellow.svg"],
  ["Logo lockup · transparent PNG", "/brand/logo-ink.png"],
  ["Yellow symbol · SVG", "/brand/mark-yellow.svg"],
  ["Ink symbol · SVG", "/brand/mark-ink.svg"],
  ["Warm white symbol · SVG", "/brand/mark-paper.svg"],
  ["Transparent symbol · PNG", "/brand/mark-yellow.png"],
  ["App icon · SVG", "/brand/icon.svg"],
  ["App icon · 512px PNG", "/brand/icon-512.png"],
  ["Favicon · ICO", "/favicon.ico"],
];

export default function DesignSystemPage() {
  return (
    <div className="space-y-8 text-zinc-950">
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Identity v1
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Brand & design system
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
          A little curiosity. A lot of possibility. Your rounded W, with a smile
          hidden in plain sight.
        </p>
      </div>
      <section
        aria-label="Logo on light and dark backgrounds"
        className="grid overflow-hidden rounded-3xl border border-zinc-200 sm:grid-cols-2"
      >
        {[false, true].map((dark) => (
          <div
            key={String(dark)}
            className="flex min-h-60 flex-col items-center justify-center gap-8 p-6"
            style={{
              background: dark ? identity.colors.ink : identity.colors.paper,
              color: dark ? identity.colors.paper : identity.colors.ink,
            }}
          >
            <WhatelzMark
              title="Whatelz W symbol"
              className="w-28 text-[#FACC15]"
            />
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tighter">
              <WhatelzMark className="w-12 text-[#FACC15]" />
              whatelz.ai
            </div>
          </div>
        ))}
      </section>
      <section aria-labelledby="palette">
        <h2 id="palette" className="mb-4 text-lg font-semibold">
          The colours
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(identity.colors).map(([name, hex]) => (
            <div
              key={name}
              className="overflow-hidden rounded-2xl border border-zinc-200"
            >
              <div className="h-20" style={{ background: hex }} />
              <div className="p-3 text-xs">
                <p className="mb-1 capitalize font-semibold">{name}</p>
                <code>{hex}</code>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="assets">
        <h2 id="assets" className="mb-4 text-lg font-semibold">
          Ready to use
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {downloads.map(([label, href]) => (
            <a
              key={href}
              href={href}
              download
              className="flex min-h-12 items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm transition hover:bg-yellow-50 focus-visible:outline-2"
            >
              <span>{label}</span>
              <span aria-hidden="true">↓</span>
            </a>
          ))}
        </div>
      </section>
      <p className="max-w-xl text-sm leading-6 text-zinc-600">
        Keep the mark flat, leave breathing room, and use it at 24px or larger.
        Pair the wordmark with Geist Sans semibold. Installed phone icons may
        take time to refresh; iPhone shortcuts may need to be added again.
      </p>
    </div>
  );
}
