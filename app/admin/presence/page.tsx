import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Presence — whatelz.ai" };

const SECTIONS = [
  { name: "Hero", anchor: "#hero", desc: "Headline, tagline, CTA" },
  { name: "Arc", anchor: "#arc", desc: "Career narrative" },
  { name: "Projects", anchor: "#projects", desc: "Featured work cards" },
  { name: "Wins", anchor: "#wins", desc: "Metrics and milestones" },
  {
    name: "Channels",
    anchor: "#channels",
    desc: "Social and distribution links",
  },
  { name: "Ask", anchor: "#ask", desc: "Groq-powered AI chat widget" },
  { name: "Contact", anchor: "#contact", desc: "Interactive contact form" },
];

export default function PresencePage() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;

  const SERVICES = [
    {
      name: "Contact form",
      key: "RESEND_API_KEY",
      active: hasResend,
      desc: hasResend
        ? "Emails delivered via Resend"
        : "Console-only — set RESEND_API_KEY",
    },
    {
      name: "AI chat",
      key: "GROQ_API_KEY",
      active: hasGroq,
      desc: hasGroq ? "Streaming via Groq" : "Disabled — set GROQ_API_KEY",
    },
  ];

  return (
    <div className="max-w-4xl space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Presence
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Public site
          </h1>
        </div>
        <a
          href={adminUrl("/admin/preview")}
          rel="noopener noreferrer"
          className="font-mono text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          View live ↗
        </a>
      </div>

      {/* Service status */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Services
        </p>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {SERVICES.map(({ name, key, active, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{desc}</p>
              </div>
              <span
                className={`font-mono text-xs ${active ? "text-zinc-400" : "text-red-400"}`}
              >
                {active ? "live" : "offline"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Page sections */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Page sections
        </p>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {SECTIONS.map(({ name, anchor, desc }) => (
            <a
              key={anchor}
              href={adminUrl(`/admin/preview/${anchor}`)}
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{desc}</p>
              </div>
              <span className="font-mono text-xs text-zinc-300">↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* Content editing note */}
      <div className="border border-zinc-200 rounded px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Content
        </p>
        <p className="mt-1 text-sm text-zinc-700">
          Section copy lives in{" "}
          <code className="font-mono text-xs bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded">
            components/sections/
          </code>
          . Edit the TSX files and redeploy to update.
        </p>
      </div>
    </div>
  );
}
