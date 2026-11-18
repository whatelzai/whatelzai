import { Suspense } from "react";
import { dailyOwner } from "@/lib/daily/server";
import { AdminChat } from "@/components/admin/chat/AdminChat";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Chat — Admin",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await dailyOwner();
  return (
    <Suspense fallback={<p role="status">Loading chat…</p>}>
      <AdminChat />
    </Suspense>
  );
}
