import CatalogPage from "@/components/events/CatalogPage";
import { publicEventMetadata } from "@/lib/public-events/page";
import "../../offers.css";
import "../event-experience.css";
import "../catalog.css";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return publicEventMetadata("ELZ-EVT-0004");
}
export default function Page() {
  return (
    <CatalogPage
      alias="ELZ-EVT-0004"
      path="/events/money-mindset-ai-skillset"
    />
  );
}
