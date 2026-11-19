import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { findActiveToken, touchTokenUsage, type AuthToken } from "./tokens";
import { matchesScope } from "./scopes";
import { recordAudit } from "./audit";
import { checkTokenRateLimit, getClientIp } from "@/lib/rate-limit";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface AuthContext {
  token: AuthToken;
  ip: string;
  userAgent: string | null;
}

export interface WithAuthOptions {
  requiredScope: string;
  // Named action for the audit log (defaults to the required scope).
  auditAction?: string;
}

type ApiHandler = (
  req: Request,
  ctx: AuthContext,
) => Promise<Response> | Response;

function unauthorized(message: string): Response {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message: string): Response {
  return NextResponse.json({ error: message }, { status: 403 });
}

function tooManyRequests(resetMs: number): Response {
  return NextResponse.json(
    { error: "rate_limited", reset_at: new Date(resetMs).toISOString() },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((resetMs - Date.now()) / 1000).toString(),
      },
    },
  );
}

// Wraps a route handler with bearer-token auth, scope check, rate limit,
// and audit logging. Fire on every write path exposed to CLI/agent callers.
export function withAuth(
  handler: ApiHandler,
  options: WithAuthOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const header = req.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/.exec(header);
    if (!match) return unauthorized("missing_bearer_token");

    const token = await findActiveToken(match[1]);
    if (!token) return unauthorized("invalid_token");

    if (!matchesScope(options.requiredScope, token.scopes)) {
      return forbidden(`missing_scope:${options.requiredScope}`);
    }

    const ip = getClientIp(req);
    const limit = checkTokenRateLimit(token.id, ip, token.rate_limit_tier);
    if (!limit.allowed) return tooManyRequests(limit.resetMs);

    const userAgent = req.headers.get("user-agent");

    // Touch usage in parallel; don't await failure.
    void touchTokenUsage(token.id);

    const response = await handler(req, { token, ip, userAgent });

    // Audit only successful writes (2xx). Failures leave no trail here —
    // clients will retry, and we don't want to double-log every 4xx probe.
    if (response.status >= 200 && response.status < 300) {
      void recordAudit({
        tokenId: token.id,
        actorType: "token",
        actorId: token.id,
        action: options.auditAction ?? options.requiredScope,
        ip,
        userAgent,
      });
    }

    return response;
  };
}

// Gate for admin-UI-only endpoints. Uses Supabase session, requires the configured owner.
// Accepts an optional second arg so dynamic routes ({ params }) work unchanged.
export function withSessionAdmin<TArg = unknown>(
  handler: (req: Request, arg: TArg) => Promise<Response> | Response,
): (req: Request, arg: TArg) => Promise<Response> {
  return async (req: Request, arg: TArg) => {
    const { userId } = await auth();
    if (!userId) return unauthorized("not_signed_in");

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !isOwnerUser(data)) {
      return forbidden("owner_required");
    }

    return handler(req, arg);
  };
}
