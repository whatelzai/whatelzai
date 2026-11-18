import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export const feedbackJson = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function feedbackBody(
  req: Request,
  allowLongComment = false,
): Promise<{ body: unknown } | { response: Response }> {
  if (
    req.headers.get("origin") !== new URL(req.url).origin ||
    !req.headers.get("content-type")?.startsWith("application/json")
  )
    return {
      response: feedbackJson(
        { error: "Please use the feedback form on this website." },
        403,
      ),
    };
  if (!checkRateLimit(`event-feedback:${getClientIp(req)}`).allowed)
    return {
      response: feedbackJson(
        { error: "Please wait a moment before trying again." },
        429,
      ),
    };
  const raw = await req.text();
  if (!allowLongComment && new TextEncoder().encode(raw).length > 8000)
    return { response: feedbackJson({ error: "Feedback is too long." }, 413) };
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return {
      response: feedbackJson({ error: "Please check your answers." }, 400),
    };
  }
}
