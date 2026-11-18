import { notFound } from "next/navigation";
import Link from "next/link";
import { weosAccess } from "@/lib/weos-role-server";
import { canAdministerCommunity, roleLabels } from "@/lib/weos-roles";
export const dynamic = "force-dynamic";
export default async function CommunityAdmin() {
  const a = await weosAccess();
  if (!canAdministerCommunity(a.actual)) notFound();
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <p className="text-sm text-zinc-500">weOS · {roleLabels[a.actual]}</p>
      <h1 className="text-2xl font-semibold">Community administration</h1>
      <p className="text-sm leading-6 text-zinc-600">
        Your role covers community members, community events and member
        resources. The dedicated management tools will be added here as
        onboarding opens.
      </p>
      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white px-5">
        <Link
          href="https://app.whatelz.ai/communities"
          className="flex min-h-16 items-center text-sm"
        >
          Community directory
        </Link>
        <Link
          href="https://app.whatelz.ai/calendar"
          className="flex min-h-16 items-center text-sm"
        >
          Community events
        </Link>
        <Link
          href="https://app.whatelz.ai/resources"
          className="flex min-h-16 items-center text-sm"
        >
          Member resources
        </Link>
      </div>
      {a.actual === "beacon" && (
        <Link
          href="/community/chats"
          className="flex min-h-12 items-center rounded-2xl border border-zinc-200 px-5 text-sm font-medium"
        >
          Chat review · Beacon only →
        </Link>
      )}
      <p className="text-xs leading-5 text-zinc-500">
        Personal workspaces, AI Business, Day Job, other members’ private chats
        and credentials are outside community administration.
      </p>
    </section>
  );
}
