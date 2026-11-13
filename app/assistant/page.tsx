import { AppHeader } from "@/components/fcos/AppHeader";
import { loadLead } from "@/lib/leads/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureUserRow } from "@/lib/users";
import { MemberNav } from "@/components/culture/MemberNav";
import { memberWorkspace } from "@/lib/member-ai/server";
import { ChatMenu } from "./ChatMenu";
import { Chat } from "./Chat";
import { ChatViewport } from "./ChatViewport";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Chat · weOS",
  robots: { index: false, follow: false },
};
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{
    chat?: string;
    prompt?: string;
    lead?: string;
    new?: string;
    draft?: string;
  }>;
}) {
  if (!(await ensureUserRow())) redirect("/sign-in");
  const query = await searchParams;
  const chat = query.chat ? z.uuid().safeParse(query.chat) : null;
  if (chat && !chat.success) redirect("/assistant");
  let workspace;
  try {
    workspace = await memberWorkspace(
      chat?.success ? chat.data : undefined,
      query.new === "1",
    );
  } catch {
    return (
      <main className="fcos-tab-page mx-auto max-w-5xl px-5 py-10">
        <AppHeader title="Chat" />
        <MemberNav current="/assistant" compact persistent />
        <h1 className="mt-10 text-3xl font-semibold">weOS Chat</h1>
        <p className="mt-4">
          Chat is available to activated members. Your workspace could not be
          loaded right now. Please refresh or ask Edmund to check your account.
        </p>
      </main>
    );
  }
  const leadContext =
    query.new === "1" && z.uuid().safeParse(query.lead).success
      ? await loadLead(query.lead!)
      : null;
  return (
    <ChatViewport>
      <MemberNav current="/assistant" compact persistent />
      <ChatMenu chats={workspace.chats} selected={workspace.selected} />
      <Chat
        key={
          workspace.selected ??
          (z.uuid().safeParse(query.draft).success ? query.draft : "blank")
        }
        messages={workspace.messages}
        conversationId={workspace.selected}
        enabled={workspace.enabled}
        name={workspace.name?.split(" ")[0] ?? ""}
        initialPrompt={
          leadContext
            ? `Help me review ${leadContext.lead.name}’s profile and recorded activities. Read my leads first.`
            : query.prompt === "hqh"
              ? "Help me prepare an HQH (会前会). Ask which lead and event before drafting."
              : query.prompt === "hhh"
                ? "Help me write an HHH (会后会). Ask what happened and what I learned."
                : ""
        }
      />
    </ChatViewport>
  );
}
