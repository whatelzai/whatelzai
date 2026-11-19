import { memberActor } from "@/lib/member-ai/server";
import { finishMemberEmdee } from "@/lib/member-ai/emdee";
export async function GET(request: Request) {
  const url = new URL(request.url);
  let result = "review";
  try {
    const { user } = await memberActor();
    await finishMemberEmdee(user.id, url);
  } catch {
    result = "failed";
  }
  return Response.redirect(
    new URL(`/assistant/connections?result=${result}`, url.origin),
    303,
  );
}
