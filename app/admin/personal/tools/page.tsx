import type { Metadata } from "next";
import { dailyOwner } from "@/lib/daily/server";
import ToolsWorkspace from "@/components/admin/personal-tools/ToolsWorkspace";
import "./tools.css";
export const metadata: Metadata = {
  title: "Personal tools — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  await dailyOwner();
  return <ToolsWorkspace />;
}
