import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { loadInviteList } from "@/lib/ai-invites/server";
import InviteList from "@/components/admin/ai-invites/InviteList";
import "@/components/admin/ai-invites/invites.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Invite List — AI Business",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="ai-invites">
      <header className="invite-page-heading">
        <div>
          <Link href={adminUrl("/admin/ai-business")}>AI Business</Link>
          <h1>Invite List</h1>
          <p>People, conversations and the next useful connection.</p>
        </div>
      </header>
      <Suspense fallback={<p role="status">Reading your Invite List…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}
async function Content() {
  const data = await loadInviteList();
  return <InviteList initial={data.contacts} />;
}
