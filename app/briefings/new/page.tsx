import { randomUUID } from "node:crypto";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ensureUserRow } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { leadAccess } from "@/lib/leads/server";
import { briefingLeads } from "@/lib/fcos/server";
import { briefingEvents, calendarEvent } from "@/lib/fcos/events";
import { validMonth, localDay } from "@/lib/community-calendar/model";
import { todayUtc8 } from "@/lib/leads/model";
import { BriefingEditor } from "@/components/fcos/BriefingEditor";
import { MemberNav } from "@/components/culture/MemberNav";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "New note · fcOS",
  robots: { index: false, follow: false },
};
export default async function NewBriefing({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    message?: string;
    lead?: string;
    month?: string;
    event?: string;
  }>;
}) {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in");
  const q = await searchParams;
  const month = validMonth(q.month) ? q.month! : todayUtc8().slice(0, 7);
  const [leads, events, event] = await Promise.all([
    briefingLeads(),
    briefingEvents(month).catch(() => []),
    q.event ? calendarEvent(month, q.event) : Promise.resolve(null),
  ]);
  if (q.event && !event) notFound();
  const leadIds: string[] = [];
  if (q.lead) {
    if (!z.uuid().safeParse(q.lead).success) notFound();
    if (!(await leadAccess(q.lead))) notFound();
    const { data, error } = await supabaseAdmin
      .from("member_leads")
      .select("id,name")
      .eq("id", q.lead)
      .maybeSingle();
    if (error) throw Error("Lead unavailable.");
    if (!data) notFound();
    leadIds.push(data.id);
    if (!leads.some((lead) => lead.id === data.id)) leads.push(data);
  }
  let reflections = "";
  if (q.message && z.uuid().safeParse(q.message).success) {
    const { data, error } = await supabaseAdmin
      .from("member_ai_messages")
      .select("body")
      .eq("user_id", user.id)
      .eq("id", q.message)
      .eq("role", "assistant")
      .maybeSingle();
    if (error) throw Error("Chat draft unavailable.");
    reflections = data?.body.slice(0, 12000) ?? "";
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <MemberNav current="/briefings" />
      <Link href="/briefings" className="block text-sm underline">
        ← HQH & HHH
      </Link>
      <h1 className="text-3xl font-semibold">
        Prepare. Reflect. Follow through.
      </h1>
      <p className="text-zinc-600">
        HQH · 会前会 prepares for a meeting. HHH · 会后会 records what happened
        and what you learned. Review any chat draft before saving.
      </p>
      <BriefingEditor
        note={{
          id: randomUUID(),
          revision: 0,
          visibility: "team",
          kind: q.kind === "HHH" ? "HHH" : "HQH",
          title: "",
          event_name: event?.title ?? "",
          event_key: event?.id ?? null,
          event_month: event ? localDay(event.start).slice(0, 7) : null,
          occurred_on: event ? localDay(event.start) : todayUtc8(),
          lead_ids: leadIds,
          observations: "",
          reflections,
          next_steps: "",
          status: "draft",
        }}
        leads={leads}
        events={events}
        calendarMonth={month}
      />
    </main>
  );
}
