// whatelz.ai's own owner-metrics — computed locally, matches the same
// contract as remote products. Runs against the local Supabase, no HTTP
// hop needed.

import "server-only";
import { supabaseAdmin } from "./supabase-server";
import type { OwnerMetrics } from "./cockpit";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

async function countRows(
  table: string,
  where: Record<string, unknown> = {},
  greaterOrEqual?: { column: string; value: string },
): Promise<number> {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(where)) q = q.eq(k, v);
  if (greaterOrEqual) q = q.gte(greaterOrEqual.column, greaterOrEqual.value);
  const { count, error } = await q;
  if (error || count === null) throw new Error("Product metrics unavailable");
  return count;
}

async function getBusinessStats(): Promise<OwnerMetrics["business"]> {
  const dayAgo = isoAgo(DAY_MS);
  const weekAgo = isoAgo(WEEK_MS);
  const monthAgo = isoAgo(MONTH_MS);

  const [dau, wau, mau, signups7d] = await Promise.all([
    countRows("users", {}, { column: "last_seen_at", value: dayAgo }),
    countRows("users", {}, { column: "last_seen_at", value: weekAgo }),
    countRows("users", {}, { column: "last_seen_at", value: monthAgo }),
    countRows("users", {}, { column: "first_seen_at", value: weekAgo }),
  ]);

  return {
    dau,
    wau,
    mau,
    arr_usd: null,
    signups_7d: signups7d,
    churn_30d: null,
    active_workspaces: null,
  };
}

async function getUsageStats(): Promise<Record<string, number | null>> {
  const weekAgo = isoAgo(WEEK_MS);

  const [
    subscribersConfirmed,
    subscribersUnsub,
    newsletterIssuesSent,
    blogPostsPublished,
    testimonialsPublic,
    testimonialsTotal,
    servicesLive,
    auditWrites7d,
    visitors24h,
    visitors7d,
    visitors30d,
  ] = await Promise.all([
    countRows("newsletter_subscribers", { status: "confirmed" }),
    countRows("newsletter_subscribers", { status: "unsubscribed" }),
    countRows("newsletter_issues", { status: "sent" }),
    countRows("blog_posts", { status: "published" }),
    supabaseAdmin
      .from("testimonials")
      .select("*", { count: "exact", head: true })
      .eq("published", true)
      .eq("status", "approved")
      .then(({ count, error }) => {
        if (error || count === null)
          throw new Error("Product metrics unavailable");
        return count;
      }),
    countRows("testimonials"),
    countRows("services", { status: "live" }),
    countRows("audit_log", {}, { column: "created_at", value: weekAgo }),
    countRows("visitors", {}, { column: "last_seen", value: isoAgo(DAY_MS) }),
    countRows("visitors", {}, { column: "last_seen", value: weekAgo }),
    countRows("visitors", {}, { column: "last_seen", value: isoAgo(MONTH_MS) }),
  ]);

  return {
    newsletter_subscribers_confirmed: subscribersConfirmed,
    newsletter_subscribers_unsubscribed: subscribersUnsub,
    newsletter_issues_sent: newsletterIssuesSent,
    blog_posts_published: blogPostsPublished,
    testimonials_public: testimonialsPublic,
    testimonials_total: testimonialsTotal,
    services_live: servicesLive,
    audit_writes_7d: auditWrites7d,
    website_visitors_24h: visitors24h,
    website_visitors_7d: visitors7d,
    website_visitors_30d: visitors30d,
  };
}

async function getProductHealth(): Promise<
  OwnerMetrics["product_health"] & { active_tokens?: number }
> {
  const { count: activeTokens, error } = await supabaseAdmin
    .from("auth_tokens")
    .select("*", { count: "exact", head: true })
    .is("revoked_at", null);

  if (error || activeTokens === null)
    throw new Error("Product health unavailable");
  return {
    uptime_pct_24h: null,
    error_rate_24h: null,
    latest_deploy_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    npm_version: null,
    active_tokens: activeTokens ?? 0,
  };
}

export async function getSelfMetrics(): Promise<OwnerMetrics> {
  const [business, usage, product_health] = await Promise.all([
    getBusinessStats(),
    getUsageStats(),
    getProductHealth(),
  ]);

  return {
    product: "whatelz",
    generated_at: new Date().toISOString(),
    schema_version: 1,
    business,
    usage,
    product_health,
  };
}
