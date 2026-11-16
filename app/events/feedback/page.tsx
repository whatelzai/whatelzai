import { redirect } from "next/navigation";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { pastEvents } from "@/lib/public-events/catalog";
import { feedbackPath } from "@/lib/event-feedback/model";
export const dynamic = "force-dynamic";
export default async function Page() {
  const event = pastEvents(await loadPublicEvents()).find(
    (e) => e.format === "weekly",
  );
  redirect(event ? feedbackPath(event.id) : "/events");
}
