import CatalogPage from "@/components/events/CatalogPage";
import { publicEventMetadata } from "@/lib/public-events/page";
import "../../offers.css";
import "../event-experience.css";
import "../catalog.css";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  return publicEventMetadata((await params).date);
}
export default async function Page({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  return <CatalogPage alias={date} path={`/events/${date}`} />;
}
