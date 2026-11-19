import { loadRoutine } from "@/lib/daily/routines";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const state = await loadRoutine(slug);
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (state.status !== "ready")
    return new Response(
      "The skill is unavailable. Open its page to check the source.",
      {
        status:
          state.status === "not-found" || state.status === "missing"
            ? 404
            : 503,
        headers,
      },
    );
  return new Response(state.source, {
    headers: {
      ...headers,
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="SKILL.md"',
    },
  });
}
