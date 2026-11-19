// Command Center — cross-product metrics aggregator.
// Reads each product's /api/internal/owner-metrics endpoint with a short
// timeout + graceful degradation. If a product is down/misconfigured, its
// widget renders 'unavailable' — the page always loads.
//
// Contract for owner-metrics response is defined in SPRINT-103 spec. Any
// field can be null; whatelz.ai side never crashes on missing data.

import "server-only";
import { z } from "zod";

const metric = z.number().finite().nonnegative().nullable();
const metricsSchema = z.object({
  product: z.string(),
  generated_at: z.iso.datetime({ offset: true }),
  schema_version: z.literal(1),
  business: z.object({
    dau: metric,
    wau: metric,
    mau: metric,
    arr_usd: metric,
    signups_7d: metric,
    churn_30d: metric,
    active_workspaces: metric,
  }),
  usage: z
    .record(z.string(), metric)
    .refine((values) => Object.keys(values).length <= 100),
  product_health: z.object({
    uptime_pct_24h: metric,
    error_rate_24h: metric,
    latest_deploy_sha: z.string().nullable(),
    npm_version: z.string().nullable(),
  }),
});

const DEFAULT_TIMEOUT_MS = 2500;

export type ProductKey = "whatelz" | "emdee";

export interface OwnerMetrics {
  product: ProductKey | string;
  generated_at: string;
  schema_version: number;
  business: {
    dau: number | null;
    wau: number | null;
    mau: number | null;
    arr_usd: number | null;
    signups_7d: number | null;
    churn_30d: number | null;
    active_workspaces: number | null;
  };
  usage: Record<string, number | null>;
  product_health: {
    uptime_pct_24h: number | null;
    error_rate_24h: number | null;
    latest_deploy_sha: string | null;
    npm_version: string | null;
  };
}

// State a widget renders. 'available' = we got the payload. 'pending' = the
// remote endpoint isn't configured yet (we haven't shipped that side).
// 'error' = we tried and it failed.
export type WidgetState<T> =
  | { status: "available"; data: T; fetched_at: string }
  | { status: "pending"; reason: string }
  | { status: "error"; reason: string };

interface RemoteConfig {
  key: ProductKey;
  origin: string | undefined;
  token: string | undefined;
  label: string;
}

const REMOTES: RemoteConfig[] = [
  {
    key: "emdee",
    origin: process.env.EMDEE_ORIGIN,
    token: process.env.EMDEE_OWNER_METRICS_TOKEN,
    label: "EMDEE",
  },
];

async function fetchRemote(
  config: RemoteConfig,
): Promise<WidgetState<OwnerMetrics>> {
  if (!config.origin || !config.token) {
    return {
      status: "pending",
      reason: `${config.label} product metrics are not connected. Review the connection in Settings.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const origin = new URL(config.origin);
    if (origin.protocol !== "https:")
      throw new Error("A secure product connection is required.");
    const res = await fetch(new URL("/api/internal/owner-metrics", origin), {
      redirect: "error",
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        status: "error",
        reason:
          "Product metrics could not be read. Review the connection or retry later.",
      };
    }
    const data = metricsSchema.parse(await res.json());
    if (data.product !== config.key)
      throw new Error("Product identity mismatch");
    return {
      status: "available",
      data,
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    const msg =
      (err as Error).name === "AbortError"
        ? `timeout after ${DEFAULT_TIMEOUT_MS}ms`
        : "Product metrics could not be verified. Review the connection or retry later.";
    return { status: "error", reason: msg };
  } finally {
    clearTimeout(timer);
  }
}

// Fetches all remote products in parallel. Each renders independently —
// slow/failed one doesn't hold up others.
export async function fetchRemoteWidgets(): Promise<
  Record<Exclude<ProductKey, "whatelz">, WidgetState<OwnerMetrics>>
> {
  const results = await Promise.all(
    REMOTES.map(async (r) => [r.key, await fetchRemote(r)] as const),
  );
  const map = Object.fromEntries(results) as Record<
    Exclude<ProductKey, "whatelz">,
    WidgetState<OwnerMetrics>
  >;
  // whatelz key is set by the caller (local aggregator). Return only remotes.
  return map;
}
