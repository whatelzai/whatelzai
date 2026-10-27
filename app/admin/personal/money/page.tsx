import type { Metadata } from "next";
import { dailyOwner } from "@/lib/daily/server";
import MoneyWorkspace from "@/components/admin/money/MoneyWorkspace";
import "./money.css";
export const metadata: Metadata = {
  title: "Money — Personal — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string; view?: string }>;
}) {
  await dailyOwner();
  const query = await searchParams;
  return (
    <MoneyWorkspace
      initialEntry={query.entry === "expense"}
      initialView={
        ["jars", "activity", "recurring"].includes(query.view ?? "")
          ? query.view
          : "jars"
      }
    />
  );
}
