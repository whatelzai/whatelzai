import { dailyOwner } from "@/lib/daily/server";
import { PlaybookReader } from "@/app/playbook/_components/playbook-reader";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "My Playbook — Admin",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await dailyOwner();
  const { default: chapters } =
    await import("@/content/playbook/chapters.json");
  return (
    <div className="admin-author-reader">
      <PlaybookReader chapters={chapters} initiallyOpened />
    </div>
  );
}
