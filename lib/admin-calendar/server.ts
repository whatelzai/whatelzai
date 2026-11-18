import "server-only";
import { ownerCommunityDates } from "./community";
import { singaporeDay } from "@/lib/daily/model";
import { dailyOwner } from "@/lib/daily/server";
import { emdeeConnection } from "@/lib/daily/connections";
import { readEmdee } from "@/lib/daily/emdee-client";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import { localDay } from "@/lib/community-calendar/model";
import { planningEvents, type AdminCalendarEvent } from "./model";
export async function loadAdminCalendar() {
  const owner = await dailyOwner();
  const events: AdminCalendarEvent[] = [],
    unavailable: string[] = [];
  const year = Number(singaporeDay().slice(0, 4));
  const [portfolio, connection, community] = await Promise.allSettled([
    loadEventPortfolio(),
    emdeeConnection(owner),
    ownerCommunityDates(year),
  ]);
  if (portfolio.status === "fulfilled")
    for (const e of portfolio.value) {
      if (
        !e.date ||
        ["cancelled", "duplicate"].includes(String(e.metadata.status))
      )
        continue;
      const end =
        typeof e.metadata.ends_at === "string"
          ? localDay(new Date(Date.parse(e.metadata.ends_at) - 1).toISOString())
          : e.date;
      events.push({
        id: e.id,
        title: e.name,
        start: e.date,
        end: end >= e.date ? end : e.date,
        lane: "ai-business",
        location: e.location ?? "",
        status: e.published ? "Event" : "Draft event",
        source: "Whatelz events",
        href: `/admin/ai-business/events/${e.id}`,
      });
    }
  else unavailable.push("AI events");
  if (community.status === "fulfilled") events.push(...community.value);
  else unavailable.push("Founder’s Club import");
  const c = connection.status === "fulfilled" ? connection.value : null;
  const sources = [
    {
      path: "edmund/02-business/02-NETWORK-MARKETING.md",
      lane: "network-marketing" as const,
      label: "Network Marketing planning dates",
    },
    {
      path: "edmund/06-career/ASIAVERIFY-2026-ROLE.md",
      lane: "day-job" as const,
      label: "Company sprints",
    },
  ];
  if (c) {
    const results = await Promise.allSettled(
      sources.map((s) => readEmdee(c, s.path)),
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value?.content)
        events.push(
          ...planningEvents(r.value.content, sources[i].lane, sources[i].path),
        );
      else unavailable.push(sources[i].label);
    });
  } else unavailable.push(...sources.map((s) => s.label));
  return { events, unavailable, communityYears: `${year}–${year + 1}` };
}
