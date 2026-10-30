import "server-only";
import { readSocialPosts } from "@/lib/social/server";
import { readLeadContext } from "@/lib/leads/context";
import { sourceQuerySchema } from "./model";
import { sharedBriefingIds } from "./sharing";
import { fcosOwner } from "./server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { loadCatalogue } from "@/lib/catalogue/server";
import { loadCommunityCalendar } from "@/lib/community-calendar/server";
import { todayUtc8 } from "@/lib/leads/model";
import { loadCulture } from "@/lib/knowledge/server";
export async function readFcosResource(input: unknown) {
  const { source, query } = sourceQuerySchema.parse(input);
  const owner = await fcosOwner();
  if (source === "social") return readSocialPosts(owner, query);
  const match = (value: string) =>
    value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const filter = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  if (source === "leads") {
    return readLeadContext(query);
  }
  if (source === "briefings") {
    const permitted = await sharedBriefingIds(owner);
    const { data, error } = await supabaseAdmin
      .from("member_briefings")
      .select(
        "id,title,kind,status,event_name,observations,reflections,next_steps",
      )
      .or(
        `owner_id.eq.${owner},id.in.(${
          permitted
            .slice(0, 500)
            .map((x) => x.id)
            .join(",") || "00000000-0000-0000-0000-000000000000"
        })`,
      )
      .ilike("title", filter)
      .order("updated_at", { ascending: false })
      .limit(3);
    if (error) throw Error("Your notes are unavailable.");
    return {
      items: data?.map((note) => ({
        ...note,
        observations: note.observations.slice(0, 900),
        reflections: note.reflections.slice(0, 900),
        next_steps: note.next_steps.slice(0, 600),
        url: `/briefings/${note.id}`,
      })),
      coverage:
        "Your notes and permitted team notes, title search, latest 3. Drafts and reviewed records are distinguished. For a Baobei, read their profile to retrieve linked notes.",
    };
  }
  if (source === "products") {
    const data = await loadCatalogue();
    return {
      items: data.listings
        .filter((x) => match(x.name) || match(x.sku))
        .slice(0, 6),
      sources: data.sources.map(
        ({ id, market, currency, edition_date, source_url }) => ({
          id,
          market,
          currency,
          edition_date,
          source_url,
        }),
      ),
      url: "/catalogue",
      coverage:
        "Published catalogue snapshot. No checkout, live stock, medical diagnosis or inferred PV/BV.",
    };
  }
  if (source === "culture") {
    return {
      items: (await loadCulture())
        .flatMap((collection) =>
          collection.quotes
            .filter(
              (x) =>
                match(x.text) ||
                x.chapters.some((id) =>
                  match(
                    collection.chapters.find((chapter) => chapter.id === id)
                      ?.title ?? "",
                  ),
                ),
            )
            .map(({ id, text, chapters }) => ({
              id,
              text,
              chapters,
              collection: collection.displayName,
              attribution: collection.source,
              attributionStatus: collection.attributionStatus,
            })),
        )
        .slice(0, 6),
      url: "/culture",
      attribution:
        "See each record’s stored source and attribution status; attribution is not independently verified.",
    };
  }
  const calendar = await loadCommunityCalendar(todayUtc8().slice(0, 7));
  return {
    items: calendar.events
      .filter(
        (x) => new Date(x.start).getTime() >= Date.now() && match(x.title),
      )
      .slice(0, 6)
      .map(({ title, start, end, location }) => ({
        title,
        start,
        end,
        location,
      })),
    url: "/calendar",
    coverage:
      "Permitted upcoming events in the current month from an imported snapshot. No RSVP or guaranteed availability.",
  };
}
