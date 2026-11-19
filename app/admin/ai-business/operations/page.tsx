import type { WidgetState, OwnerMetrics } from "@/lib/cockpit";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { ProductSummary } from "@/components/admin/ProductSummary";
import { AdminSectionLoading } from "@/components/admin/AdminSectionLoading";
import { dailyOwner } from "@/lib/daily/server";
import {
  localMetricSnapshot,
  remoteMetricSnapshot,
} from "@/lib/admin-overview/metrics-cache";
import { adminUrl } from "@/lib/admin-url";
export const metadata = { title: "Product health — Admin" };
export const dynamic = "force-dynamic";
export default async function Operations() {
  const owner = await dailyOwner();
  const local = localMetricSnapshot(owner);
  const remote = remoteMetricSnapshot(owner);
  return (
    <div className="admin-ledger">
      <header className="ledger-title">
        <h1>Product health</h1>
        <Link className="focus-text-link" href={adminUrl("/admin/ai-business")}>
          AI Business
        </Link>
      </header>
      <div className="operations-products">
        <Suspense fallback={<AdminSectionLoading label="Reading Whatelzai…" />}>
          <Product
            source={local}
            product="whatelz"
            label="whatelz.ai"
            adminHref={adminUrl("/admin/site-dashboard")}
          />
        </Suspense>
        <Suspense fallback={<AdminSectionLoading label="Reading EMDEE…" />}>
          <Product
            source={remote}
            product="emdee"
            label="EMDEE"
            adminHref="https://emdee.tech/admin"
          />
        </Suspense>
      </div>
    </div>
  );
}
async function Product({
  source,
  ...props
}: {
  source: Promise<WidgetState<OwnerMetrics>>;
  product: string;
  label: string;
  adminHref: string;
}) {
  let state;
  try {
    state = await source;
  } catch {
    state = {
      status: "error" as const,
      reason: "Metrics unavailable. Try refreshing.",
    };
  }
  return <ProductSummary {...props} state={state} />;
}
