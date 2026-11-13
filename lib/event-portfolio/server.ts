import "server-only";
import { cache } from "react";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { mapEvent } from "@/lib/public-events/map";
import { portfolioEvents, type PortfolioEvent } from "@/lib/event-portfolio";
export const loadEventPortfolio = cache(async () => {
  await dailyOwner();
  const r = await db
    .from("events")
    .select("id,name,date,location,published,metadata", { count: "exact" })
    .neq("type", "hackathon")
    .order("date", { ascending: false })
    .range(0, 999);
  if (r.error || (r.count ?? 0) > 1000)
    throw Error("Events could not be loaded completely.");
  return portfolioEvents(r.data as PortfolioEvent[], {
    id: mapEvent.key,
    key: mapEvent.key,
    name: mapEvent.title,
    date: mapEvent.startsAt.slice(0, 10),
    location: mapEvent.venue + " · " + mapEvent.address,
    published: true,
    metadata: {
      starts_at: mapEvent.startsAt,
      ends_at: mapEvent.endsAt,
      capacity: mapEvent.capacity,
      currency: "SGD",
      registration_status: "closed",
    },
  });
});
