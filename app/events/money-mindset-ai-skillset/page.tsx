import type { Metadata } from "next";
import SeminarDetail from "@/components/events/SeminarDetail";
import { mapEvent } from "@/lib/public-events/map";
import "../../offers.css";
import "../event-experience.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Money Mindset × AI Skillset — 12 November 2026",
  description: "The 12 November seminar with Edmund at The Vibe.",
  alternates: {
    canonical: "https://whatelz.ai/events/money-mindset-ai-skillset",
  },
};
export default function Page() {
  return <SeminarDetail event={mapEvent} />;
}
