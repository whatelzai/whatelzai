import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listServices, type Service } from "@/lib/services";

export const metadata: Metadata = { title: "Services — Admin" };
export const dynamic = "force-dynamic";

function priceSummary(s: Service): string {
  if (!s.pricing) return "—";
  const founding = s.pricing.founding?.tiers?.[0];
  const first = s.pricing.tiers?.[0];
  if (founding && founding.amount != null) {
    return `${s.pricing.currency} ${founding.amount.toLocaleString("en-SG")} founding`;
  }
  if (first && first.amount != null) {
    return `${s.pricing.currency} ${first.amount.toLocaleString("en-SG")}${first.unit ? `/${first.unit}` : ""}`;
  }
  return "By enquiry";
}

const STATUS_TONE: Record<Service["status"], string> = {
  live: "bg-emerald-100 text-emerald-800",
  coming_soon: "bg-amber-100 text-amber-800",
  private: "bg-zinc-100 text-zinc-700",
  retired: "bg-zinc-100 text-zinc-500 line-through",
};

export default async function ServicesAdminPage() {
  const services = await listServices(false);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Services
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            The catalogue on{" "}
            <Link
              href="/services"
              className="underline underline-offset-4 hover:text-zinc-900"
            >
              /services
            </Link>
            . For complex pricing edits, ask Claude via MCP —{" "}
            <code className="text-xs">services.upsert</code>.
          </p>
        </div>
      </header>

      {services.length === 0 ? (
        <div className="border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
          No services yet. Ask Claude:{" "}
          <code className="text-xs">services.upsert</code>.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-left">Sort</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 last:border-none hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-900">{s.name}</p>
                    <p className="font-mono text-[10px] tracking-wide text-zinc-400">
                      /services/{s.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {s.category}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_TONE[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    {priceSummary(s)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {s.published ? "yes" : "no"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {s.sort_order ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={adminUrl(`/admin/services/${s.slug}`)}
                      className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
