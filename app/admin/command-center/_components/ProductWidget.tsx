import Link from "@/components/admin/AdminLink";
import { productSignal } from "@/lib/admin-overview/model";
import type { OwnerMetrics, WidgetState } from "@/lib/cockpit";

const NUM_FMT = new Intl.NumberFormat("en-SG");

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return NUM_FMT.format(n);
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "$0";
  return `$${NUM_FMT.format(n)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}%`;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "Timestamp unavailable";
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

interface ProductWidgetProps {
  product: string;
  label: string;
  state: WidgetState<OwnerMetrics>;
  adminHref: string;
}

export function ProductWidget({
  product,
  label,
  state,
  adminHref,
}: ProductWidgetProps) {
  return (
    <div className="flex flex-col border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            {product}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
            {label}
          </h2>
        </div>
        <StatusChip state={state} />
      </div>

      <div className="flex-1 px-5 py-4">
        {state.status === "available" && (
          <AvailableBody data={state.data} product={product} />
        )}
        {state.status === "pending" && <PendingBody reason={state.reason} />}
        {state.status === "error" && <ErrorBody reason={state.reason} />}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          {state.status === "available"
            ? relTime(state.data.generated_at)
            : "—"}
        </span>
        {adminHref.startsWith("http") ? (
          <a
            href={adminHref}
            rel="noopener"
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
          >
            Service address
          </a>
        ) : (
          <Link
            href={adminHref}
            className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
          >
            Open admin →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusChip({ state }: { state: WidgetState<OwnerMetrics> }) {
  const map: Record<
    WidgetState<OwnerMetrics>["status"],
    { label: string; classes: string }
  > = {
    available: {
      label: "live",
      classes: "border-emerald-300 bg-emerald-50 text-emerald-700",
    },
    pending: {
      label: "pending",
      classes: "border-zinc-200 bg-zinc-50 text-zinc-500",
    },
    error: {
      label: "error",
      classes: "border-red-300 bg-red-50 text-red-700",
    },
  };
  const { label, classes } = map[state.status];
  const signal = productSignal(state, new Date());
  return (
    <span
      className={`border ${classes} px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest`}
    >
      {state.status === "available" && signal !== "available"
        ? signal === "stale"
          ? "Older snapshot"
          : "Check timestamp"
        : label}
    </span>
  );
}

function AvailableBody({
  data,
  product,
}: {
  data: OwnerMetrics;
  product: string;
}) {
  const business = data.business;
  const usage = Object.entries(data.usage);
  const health = data.product_health;

  return (
    <div className="space-y-5">
      <section>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          Business
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Kpi
            label={
              product === "whatelz" ? "Active accounts 24h" : "Active users 24h"
            }
            value={fmt(business.dau)}
          />
          <Kpi
            label={
              product === "whatelz" ? "Active accounts 7d" : "Active users 7d"
            }
            value={fmt(business.wau)}
          />
          <Kpi
            label={
              product === "whatelz" ? "Active accounts 30d" : "Active users 30d"
            }
            value={fmt(business.mau)}
          />
          <Kpi label="ARR · USD" value={fmtMoney(business.arr_usd)} />
          <Kpi label="New accounts 7d" value={fmt(business.signups_7d)} />
          <Kpi label="Workspaces" value={fmt(business.active_workspaces)} />
        </div>
      </section>

      {usage.length > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            Usage
          </p>
          <div className="mt-2 space-y-1.5">
            {usage.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between border-b border-zinc-50 pb-1"
              >
                <span className="text-xs text-zinc-500">
                  {k.replaceAll("_", " ")}
                </span>
                <span className="font-mono text-sm text-zinc-900">
                  {fmt(v)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          Health
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Kpi label="Uptime 24h" value={fmtPct(health.uptime_pct_24h)} />
          <Kpi
            label="Err rate"
            value={
              health.error_rate_24h === null
                ? "—"
                : `${(health.error_rate_24h * 100).toFixed(3)}%`
            }
          />
        </div>
        <div className="mt-3 space-y-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
          {health.latest_deploy_sha && (
            <p>deploy · {health.latest_deploy_sha}</p>
          )}
          {health.npm_version && <p>npm · v{health.npm_version}</p>}
        </div>
      </section>
    </div>
  );
}

function PendingBody({ reason }: { reason: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2 py-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
        connection not configured
      </p>
      <p className="mx-auto max-w-xs text-xs text-zinc-500">{reason}</p>
    </div>
  );
}

function ErrorBody({ reason }: { reason: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2 py-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-red-600">
        unavailable
      </p>
      <p className="mx-auto max-w-xs text-xs text-zinc-500 break-words">
        {reason}
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg text-zinc-900">{value}</p>
    </div>
  );
}
