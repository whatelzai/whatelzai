import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  providerSchema,
  SOCIAL_COOKIE,
  SOCIAL_ORIGIN,
} from "@/lib/social/model";
import { finishConnection, sameState, socialOwner } from "@/lib/social/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  let message = "Authorization was not completed. Please start again.";
  const jar = await cookies();
  const cookie = jar.get(SOCIAL_COOKIE)?.value ?? "";
  try {
    if (request.nextUrl.origin !== SOCIAL_ORIGIN) throw Error("Wrong origin.");
    const owner = await socialOwner();
    const provider = providerSchema.parse((await params).provider);
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const code = request.nextUrl.searchParams.get("code") ?? "";
    if (
      !sameState(state, cookie) ||
      !code ||
      code.length > 4096 ||
      request.nextUrl.searchParams.has("error")
    )
      throw Error("Invalid callback.");
    await finishConnection(owner, provider, state, code);
    message = "Account connected. Refresh to load recent posts.";
  } catch {
    /* Never serialize upstream errors, OAuth codes or tokens. */
  }
  const response = NextResponse.redirect(
    `${SOCIAL_ORIGIN}/profile/connections?message=${encodeURIComponent(message)}`,
  );
  response.cookies.set(SOCIAL_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
