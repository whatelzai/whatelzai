import type { Metadata } from "next";
import { dailyOwner } from "@/lib/daily/server";
import MoneyWorkspace from "@/components/admin/money/MoneyWorkspace";
import "./money.css";
export const metadata: Metadata = {
  title: "Money — Personal — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function MoneyPage() {
  await dailyOwner();
  return <MoneyWorkspace />;
}
