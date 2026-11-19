import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { dailyOwner, loadDailyTasks } from "@/lib/daily/server";
import { emdeeConnection } from "@/lib/daily/connections";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { loadBriefWithConnection } from "@/lib/daily/emdee";
import { singaporeDay, previousDay, type BriefKind } from "@/lib/daily/model";
import type { WidgetState, OwnerMetrics } from "@/lib/cockpit";
import { aiBusinessFocus, type Source } from "./model";
import { timedRead } from "./timing";
import { localMetricSnapshot, remoteMetricSnapshot } from "./metrics-cache";

async function safely<T>(
  source: string,
  operation: () => PromiseLike<T>,
): Promise<Source<T>> {
  try {
    return { status: "ready", data: await timedRead(source, operation) };
  } catch {
    return { status: "unavailable" };
  }
}

export async function loadAdminOverviewSources(now = new Date()) {
  // Fresh owner verification always precedes query initiation and cache access.
  const owner = await dailyOwner();
  const day = singaporeDay(now);
  const connection = safely("emdee-connection", async () => {
    const connection = await emdeeConnection(owner);
    if (connection?.parentPath !== DAILY_PARENT)
      throw Error("Daily connection required");
    return connection;
  });
  const brief = (date: string, kind: BriefKind) =>
    safely(`brief-${kind}`, async () => {
      const saved = await connection;
      if (saved.status !== "ready") throw Error("Daily connection unavailable");
      return loadBriefWithConnection(saved.data, date, kind);
    });
  async function count(table: string, where: Record<string, string>) {
    let query = supabaseAdmin
      .from(table)
      .select("id", { count: "exact", head: true });
    for (const [key, value] of Object.entries(where))
      query = query.eq(key, value);
    const { count, error } = await query;
    if (error || count === null) throw Error("Count unavailable");
    return count;
  }
  const focus = safely("commitments", () => loadDailyTasks(day)).then(
    (tasks) =>
      tasks.status === "ready"
        ? {
            status: "ready" as const,
            data: aiBusinessFocus(tasks.data.active, tasks.data.completed, day),
          }
        : { status: "unavailable" as const },
  );
  const morning = brief(day, "morning");
  const evening = brief(day, "evening");
  const handoff = brief(previousDay(day), "evening");
  const growth = Promise.all([
    safely("blog-count", () => count("blog_posts", { status: "draft" })),
    safely("newsletter-count", () =>
      count("newsletter_issues", { status: "draft" }),
    ),
    safely("testimonial-count", () =>
      count("testimonials", { status: "pending" }),
    ),
  ]).then(([blog, newsletter, testimonials]) => ({
    blog,
    newsletter,
    testimonials,
  }));
  async function metrics(
    source: string,
    read: () => Promise<WidgetState<OwnerMetrics>>,
  ): Promise<WidgetState<OwnerMetrics>> {
    const snapshot = await safely(source, read);
    return snapshot.status === "ready"
      ? snapshot.data
      : {
          status: "error",
          reason: "Product metrics could not be loaded. Try refreshing.",
        };
  }
  return {
    day,
    loadedAt: now.toISOString(),
    focus,
    morning,
    evening,
    handoff,
    growth,
    whatelz: metrics("local-metrics", () => localMetricSnapshot(owner)),
    emdee: metrics("remote-metrics", () => remoteMetricSnapshot(owner)),
  };
}
export type OverviewSources = Awaited<
  ReturnType<typeof loadAdminOverviewSources>
>;
export async function collectAdminOverview(sources: OverviewSources) {
  const [focus, morning, evening, handoff, growth, whatelz, emdee] =
    await Promise.all([
      sources.focus,
      sources.morning,
      sources.evening,
      sources.handoff,
      sources.growth,
      sources.whatelz,
      sources.emdee,
    ]);
  return {
    day: sources.day,
    loadedAt: sources.loadedAt,
    focus,
    morning,
    evening,
    handoff,
    growth,
    products: { whatelz, emdee },
  };
}
// Aggregate compatibility for non-streaming callers; UI consumes each promise separately.
export async function loadAdminOverview(now = new Date()) {
  return collectAdminOverview(await loadAdminOverviewSources(now));
}
