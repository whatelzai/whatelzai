import "server-only";
import { unstable_cache } from "next/cache";
import { getSelfMetrics } from "@/lib/cockpit-self";
import { fetchRemoteWidgets } from "@/lib/cockpit";

// Auth remains OUTSIDE these cache scopes. Owner ID partitions successful
// read-only snapshots; credentials and mutation/permission state are never cached.
// This app does not enable Cache Components; use the supported Data Cache API.
export const localMetricSnapshot = unstable_cache(
  async (owner: string) => {
    if (!owner) throw Error("Owner required");
    const data = await getSelfMetrics();
    return {
      status: "available" as const,
      data,
      fetched_at: new Date().toISOString(),
    };
  },
  ["admin-local-metrics-v1", process.env.VERCEL_ENV ?? "development"],
  { revalidate: 60 },
);

export const remoteMetricSnapshot = unstable_cache(
  async (owner: string) => {
    if (!owner) throw Error("Owner required");
    const { emdee } = await fetchRemoteWidgets();
    if (emdee.status === "error") throw Error("Remote metrics unavailable");
    return emdee;
  },
  ["admin-remote-metrics-v1", process.env.VERCEL_ENV ?? "development"],
  { revalidate: 60 },
);
