import { ProductWidget } from "@/app/admin/command-center/_components/ProductWidget";
import { productSignal } from "@/lib/admin-overview/model";
import type { OwnerMetrics, WidgetState } from "@/lib/cockpit";

export function ProductSummary(props: {
  product: string;
  label: string;
  state: WidgetState<OwnerMetrics>;
  adminHref: string;
}) {
  const { state, label } = props;
  const signal = productSignal(state, new Date());
  const business = state.status === "available" ? state.data.business : null;
  const metrics = [
    { label: "Active · 7 days", value: business?.wau },
    { label: "Signups · 7 days", value: business?.signups_7d },
    { label: "ARR · USD", value: business?.arr_usd },
  ];
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{label}</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs ${signal === "available" ? "bg-zinc-100 text-zinc-600" : "bg-yellow-100 text-zinc-800"}`}
          >
            {signal === "available"
              ? "Metrics snapshot"
              : signal === "stale"
                ? "Needs refresh"
                : "Unavailable"}
          </span>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dt className="text-[11px] text-zinc-500">{metric.label}</dt>
              <dd className="mt-1 break-words text-xl font-semibold tabular-nums">
                {metric.value == null
                  ? "—"
                  : metric.value.toLocaleString("en-SG")}
              </dd>
            </div>
          ))}
        </dl>
        {state.status === "available" && (
          <p className="mt-4 text-[11px] leading-5 text-zinc-500">
            Read{" "}
            {new Date(state.fetched_at).toLocaleString("en-SG", {
              timeZone: "Asia/Singapore",
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            · Cached metrics; refresh may run in the background.
          </p>
        )}
      </div>
      <details className="border-t border-zinc-100">
        <summary className="cursor-pointer px-5 py-3 text-xs font-medium text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
          All metrics and connection details
        </summary>
        <ProductWidget {...props} />
      </details>
    </article>
  );
}
