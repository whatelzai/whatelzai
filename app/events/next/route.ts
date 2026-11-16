import { NextRequest, NextResponse } from "next/server";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { nextWeeklyEvent } from "@/lib/public-events/catalog";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const next = nextWeeklyEvent(await loadPublicEvents());
    return NextResponse.redirect(new URL(next?.path || "/events", req.url), {
      status: 307,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return new Response(
      "Event information is temporarily unavailable. Please try again shortly.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
