import { ChatViewport } from "@/app/assistant/ChatViewport";
import { RoleTestChat } from "@/components/fcos/RoleTestChat";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { weosAccess } from "@/lib/weos-role-server";
import { canUseBusinessTools, roleLabels, roleTabs } from "@/lib/weos-roles";
import { RoleSwitch } from "@/components/fcos/RoleSwitch";
import { MemberNav } from "@/components/culture/MemberNav";
import { AppHeader } from "@/components/fcos/AppHeader";
export const dynamic = "force-dynamic";
export default async function RolePreview() {
  const a = await weosAccess();
  if (a.actual !== "beacon" || !a.preview) notFound();
  const path = (await headers()).get("x-weos-preview-path") ?? "/";
  const tab =
    roleTabs(a.role).find((t) => t.href !== "/" && path.startsWith(t.href)) ??
    roleTabs(a.role)[2];
  const business = canUseBusinessTools(a.role);
  if (tab.href === "/assistant")
    return (
      <ChatViewport>
        <AppHeader title="Chat test" chat />
        <MemberNav current="/assistant" compact persistent />
        <div className="shrink-0 py-2">
          <RoleSwitch current={a.role} compact />
        </div>
        <RoleTestChat key={a.role} role={a.role} />
      </ChatViewport>
    );
  return (
    <main className="fcos-tab-page mx-auto max-w-3xl space-y-5 px-5 py-6">
      <AppHeader title={tab.label} />
      <MemberNav current={tab.href} compact persistent />
      <RoleSwitch current={a.role} />
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-zinc-500">
          Role preview · {roleLabels[a.role]}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{tab.label}</h1>
        {tab.href === "/resources" ? (
          <div className="mt-4 divide-y divide-zinc-100">
            {(business
              ? ["HQH & HHH", "Products", "Culture", "Events"]
              : ["AI learning", "Events"]
            ).map((x) => (
              <p className="py-4 text-sm" key={x}>
                {x}
              </p>
            ))}
            {!business && (
              <p className="py-4 text-sm text-zinc-500">
                AI learning content will appear when published. No lessons are
                invented for this preview.
              </p>
            )}
          </div>
        ) : tab.href === "/profile" ? (
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between">
              <dt>weOS role</dt>
              <dd>{roleLabels[a.role]}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Business tools</dt>
              <dd>{business ? "Available" : "Hidden"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Community administration</dt>
              <dd>{a.role === "blaze" ? "Available" : "Unavailable"}</dd>
            </div>
          </dl>
        ) : tab.href === "/leads" ? (
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Baobei profiles and linked HQH/HHH appear here when the member has
            permitted records. This preview does not load your records or
            impersonate another member.
          </p>
        ) : tab.href === "/calendar" ? (
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Member-permitted events appear here. No registrations or attendance
            are created in preview.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              {business
                ? "Follow-ups, permitted events and your next steps."
                : "Learn AI, explore upcoming events and continue your own conversations."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-yellow-300 px-4 py-3 text-sm font-medium"
                href="/assistant"
              >
                Open Chat
              </Link>
              <Link
                className="rounded-full border border-zinc-200 px-4 py-3 text-sm"
                href="/resources"
              >
                Explore resources
              </Link>
            </div>
            {a.role === "blaze" && (
              <p className="mt-5 text-sm text-zinc-500">
                Community administration is scoped to members, community events
                and resources. Owner workspaces are unavailable.
              </p>
            )}
          </>
        )}
      </section>
      <p className="text-xs leading-5 text-zinc-500">
        Chat testing is interactive; other pages preview layouts only.
        Membership, record sharing and personal conversations stay unchanged.
      </p>
    </main>
  );
}
