import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { hasActiveEntitlement, stitchOrphansToUser } from "@/lib/entitlements";
import { PlaybookReader } from "../_components/playbook-reader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Read your Playbook",
  robots: { index: false, follow: false },
};
export default async function ReadPlaybookPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/playbook/read");
  await stitchOrphansToUser(user.id, user.email);
  if (!(await hasActiveEntitlement(user.id, "playbook")))
    redirect("/playbook?from=locked");
  // Import and serialize full chapter bodies only after verified access.
  const { default: chapters } =
    await import("@/content/playbook/chapters.json");
  return <PlaybookReader chapters={chapters} />;
}
