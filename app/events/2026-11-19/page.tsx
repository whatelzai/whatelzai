import type { Metadata } from "next";
import SeminarDetail from "@/components/events/SeminarDetail";
import { currentEvent } from "@/lib/public-events/map";
import "../../offers.css";
import "../event-experience.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Money Mindset × AI Skillset — 19 November 2026",
  description:
    "Join Edmund at The Vibe on Thursday, 19 November, 7:30–9:30 PM. S$8 per person, 30 places.",
  alternates: { canonical: "https://whatelz.ai/events/2026-11-19" },
};
export default function Page() {
  return <SeminarDetail event={currentEvent} />;
}
