import { isOwnerUser } from "@/lib/admin-policy";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { ensureUserRow, type AppUser } from "@/lib/users";
import {
  ALL_SCOPES,
  OWNER_SCOPE,
  SAFE_DEFAULT_SCOPES,
  isElevatedScope,
} from "@/lib/auth/scopes";

// SPRINT-107 flow branching:
//   client_id present  → registered OAuth client (claude.ai etc.) → checkbox
//                        consent page. Safe defaults pre-checked, elevated
//                        scopes shown unchecked with warning label. If the
//                        client passed scope=, that becomes the initial
//                        checked set (filtered to known scopes).
//   client_id absent   → legacy CLI (whatelz login). One-click owner-scope
//                        Authorize button, unchanged pre-SPRINT-107 behavior.
//
// This preserves interactive CLI ergonomics while making claude.ai connectors
// safe-by-default.

function sign(secret: string, payload: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
}

interface AuthorizeParams {
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string; // space-separated
  client_id: string; // presence toggles legacy vs registered flow
}

const VALID_SCOPE_SET = new Set<string>([OWNER_SCOPE, ...ALL_SCOPES]);
const WILDCARD_SCOPE_RE = /^[a-z]+:\*$/;

function filterKnownScopes(requested: string): string[] {
  return requested
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => VALID_SCOPE_SET.has(s) || WILDCARD_SCOPE_RE.test(s));
}

// Groups scopes by resource for the consent checkbox UI. Owner is its own
// pseudo-group at the top so it renders separately.
function groupedScopes(): Array<{ resource: string; scopes: string[] }> {
  const groups = new Map<string, string[]>();
  for (const s of ALL_SCOPES) {
    const colon = s.indexOf(":");
    const resource = colon > 0 ? s.slice(0, colon) : s;
    if (!groups.has(resource)) groups.set(resource, []);
    groups.get(resource)!.push(s);
  }
  // Sort by resource name for stability across renders.
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, scopes]) => ({ resource, scopes }));
}

function page(body: string, extraScript?: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect to Claude — whatelz.ai</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafafa; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; }
    .card { background: white; border: 1px solid #e4e4e7; border-radius: 12px; padding: 2rem; width: 100%; max-width: 560px; }
    .logo { font-family: monospace; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #71717a; margin-bottom: 1.5rem; }
    h1 { font-size: 1.4rem; font-weight: 600; color: #09090b; margin-bottom: 0.5rem; }
    p  { font-size: 0.875rem; color: #52525b; margin-bottom: 1rem; line-height: 1.55; }
    .signed { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border: 1px solid #e4e4e7; border-radius: 6px; padding: 0.625rem 0.75rem; margin-bottom: 1rem; }
    .signed-label { font-family: monospace; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #a1a1aa; }
    .signed-email { font-size: 0.875rem; color: #09090b; font-weight: 500; word-break: break-all; text-align: right; }
    button, .btn { display: block; width: 100%; background: #09090b; color: white; border: none; border-radius: 6px; padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; text-align: center; text-decoration: none; transition: opacity 0.15s; }
    button:hover, .btn:hover { opacity: 0.85; }
    .warn { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; border-radius: 6px; padding: 0.75rem 0.875rem; font-size: 0.8125rem; margin-bottom: 1rem; display: none; }
    .warn.on { display: block; }
    .error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 0.625rem 0.75rem; font-size: 0.8125rem; margin-bottom: 1rem; }
    .client-badge { display: inline-block; background: #f4f4f5; border: 1px solid #e4e4e7; font-family: monospace; font-size: 0.7rem; color: #71717a; padding: 0.125rem 0.5rem; border-radius: 4px; margin-left: 0.375rem; }
    fieldset { border: 1px solid #e4e4e7; border-radius: 6px; padding: 0.625rem 0.875rem 0.875rem; margin-bottom: 0.75rem; }
    legend { font-family: monospace; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #71717a; padding: 0 0.375rem; }
    .scope-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }
    .scope-row label { font-family: monospace; font-size: 0.8125rem; color: #27272a; cursor: pointer; user-select: none; }
    .scope-row.elevated label { color: #b45309; }
    .scope-row input[type="checkbox"] { accent-color: #09090b; cursor: pointer; }
    .elev-badge { font-size: 0.65rem; color: #b45309; font-family: monospace; padding: 0.125rem 0.375rem; border: 1px solid #fde68a; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
    .owner-block { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 0.625rem 0.875rem; margin-bottom: 0.75rem; }
    .owner-block label { color: #78350f; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">whatelz.ai</p>
    ${body}
  </div>
  ${extraScript ? `<script>${extraScript}</script>` : ""}
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

function signInPage(currentUrl: string): NextResponse {
  const signIn = `/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`;
  return page(`
    <h1>Connect to Claude</h1>
    <p>Sign in to whatelz.ai first — the connector is authorized against your admin account.</p>
    <a class="btn" href="${signIn}">Sign in to continue</a>
  `);
}

function unauthorizedPage(): NextResponse {
  return page(`
    <h1>Not authorized</h1>
    <p>Your account isn't allowed to connect an MCP client to whatelz.ai. Only the site admin can authorize connectors.</p>
  `);
}

function missingConfigPage(): NextResponse {
  return page(`
    <h1>OAuth not configured</h1>
    <p>No <code>oauth_code_secret</code> row is present in <code>system_config</code>. This should have been created by the SPRINT-100 migration — check that it ran.</p>
  `);
}

// Legacy one-click page — used when no client_id (whatelz CLI). Unchanged
// pre-SPRINT-107 behavior: instant owner-scope Authorize.
function legacyConsentPage(
  p: AuthorizeParams,
  email: string,
  error: boolean,
): NextResponse {
  return page(`
    <h1>Connect Claude to whatelz.ai</h1>
    <p>Grant this Claude workspace full owner access to your whatelz tools — testimonials, offers, hackathons, dashboard cards, website docs, newsletter, and services.</p>
    ${error ? `<div class="error">Something went wrong signing the connection. Try again.</div>` : ""}
    <div class="signed">
      <span class="signed-label">Signed in as</span>
      <span class="signed-email">${email || "admin"}</span>
    </div>
    <form method="POST" action="/api/oauth/authorize">
      <input type="hidden" name="redirect_uri"          value="${p.redirect_uri}" />
      <input type="hidden" name="state"                 value="${p.state}" />
      <input type="hidden" name="code_challenge"        value="${p.code_challenge}" />
      <input type="hidden" name="code_challenge_method" value="${p.code_challenge_method}" />
      <input type="hidden" name="scope"                 value="${OWNER_SCOPE}" />
      <input type="hidden" name="client_id"             value="" />
      <button type="submit">Authorize Claude</button>
    </form>
  `);
}

function checkboxConsentPage(
  p: AuthorizeParams,
  email: string,
  preChecked: Set<string>,
  error: boolean,
): NextResponse {
  const groups = groupedScopes();

  const ownerChecked = preChecked.has(OWNER_SCOPE);
  const ownerBlock = `
    <div class="owner-block scope-row elevated">
      <input type="checkbox" id="scope_owner" name="scope_owner" value="${OWNER_SCOPE}" ${ownerChecked ? "checked" : ""} data-elevated="1" />
      <label for="scope_owner"><strong>${OWNER_SCOPE}</strong> — full owner access (every tool, current and future) <span class="elev-badge">Elevated</span></label>
    </div>`;

  const groupsHtml = groups
    .map(({ resource, scopes }) => {
      const rows = scopes
        .map((s) => {
          const elevated = isElevatedScope(s);
          const checked = preChecked.has(s);
          const safeId = `scope_${s.replace(/[^a-z0-9]/gi, "_")}`;
          return `
            <div class="scope-row ${elevated ? "elevated" : ""}">
              <input type="checkbox" id="${safeId}" name="scope" value="${s}" ${checked ? "checked" : ""} ${elevated ? 'data-elevated="1"' : ""} />
              <label for="${safeId}">${s}${elevated ? ' <span class="elev-badge">Elevated</span>' : ""}</label>
            </div>`;
        })
        .join("");
      return `<fieldset><legend>${resource}</legend>${rows}</fieldset>`;
    })
    .join("");

  const script = `
    (function() {
      var warn = document.getElementById('elev-warn');
      var boxes = document.querySelectorAll('input[data-elevated]');
      function refresh() {
        var any = false;
        for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) { any = true; break; }
        if (any) warn.classList.add('on'); else warn.classList.remove('on');
      }
      for (var i = 0; i < boxes.length; i++) boxes[i].addEventListener('change', refresh);
      refresh();
    })();
  `;

  return page(
    `
    <h1>Connect Claude to whatelz.ai</h1>
    <p>
      This client wants access to your whatelz tools.
      ${p.client_id ? `<span class="client-badge">${p.client_id}</span>` : ""}
    </p>
    <p style="color:#71717a;font-size:0.8125rem;">Safe defaults are pre-ticked. Elevated scopes (owner, send, delete, subscriber management) require your explicit approval — untick anything you don't want granted.</p>
    ${error ? `<div class="error">Something went wrong signing the connection. Try again.</div>` : ""}
    <div class="signed">
      <span class="signed-label">Signed in as</span>
      <span class="signed-email">${email || "admin"}</span>
    </div>
    <div id="elev-warn" class="warn">⚠️ You are granting elevated scopes. This client will be able to perform destructive or high-impact actions.</div>
    <form method="POST" action="/api/oauth/authorize" id="authform">
      <input type="hidden" name="redirect_uri"          value="${p.redirect_uri}" />
      <input type="hidden" name="state"                 value="${p.state}" />
      <input type="hidden" name="code_challenge"        value="${p.code_challenge}" />
      <input type="hidden" name="code_challenge_method" value="${p.code_challenge_method}" />
      <input type="hidden" name="client_id"             value="${p.client_id}" />
      ${ownerBlock}
      ${groupsHtml}
      <button type="submit">Authorize with checked scopes</button>
    </form>
  `,
    script,
  );
}

async function getOauthCodeSecret(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("system_config")
    .select("value")
    .eq("key", "oauth_code_secret")
    .single();
  return data?.value ?? null;
}

async function requireAdmin(): Promise<
  | { ok: true; user: AppUser }
  | { ok: false; reason: "unauthenticated" | "not-admin" }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, reason: "unauthenticated" };
  const user = await ensureUserRow();
  if (!user || !isOwnerUser(user)) return { ok: false, reason: "not-admin" };
  return { ok: true, user };
}

// Determines the set of pre-checked scopes for the checkbox consent page.
// Precedence: explicit scope= (filtered) > safe defaults.
function initialCheckedScopes(scopeRaw: string): Set<string> {
  const filtered = filterKnownScopes(scopeRaw);
  if (filtered.length > 0) return new Set(filtered);
  return new Set(SAFE_DEFAULT_SCOPES);
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const params: AuthorizeParams = {
    redirect_uri: u.searchParams.get("redirect_uri") ?? "",
    state: u.searchParams.get("state") ?? "",
    code_challenge: u.searchParams.get("code_challenge") ?? "",
    code_challenge_method: u.searchParams.get("code_challenge_method") ?? "",
    scope: u.searchParams.get("scope") ?? "",
    client_id: u.searchParams.get("client_id") ?? "",
  };

  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") return signInPage(req.url);
    return unauthorizedPage();
  }

  const secret = await getOauthCodeSecret();
  if (!secret) return missingConfigPage();

  // No client_id → legacy CLI (whatelz login). One-click owner-scope.
  if (!params.client_id) {
    return legacyConsentPage(
      params,
      gate.user.email,
      u.searchParams.has("error"),
    );
  }

  const preChecked = initialCheckedScopes(params.scope);
  return checkboxConsentPage(
    params,
    gate.user.email,
    preChecked,
    u.searchParams.has("error"),
  );
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") return signInPage(req.url);
    return unauthorizedPage();
  }

  const form = await req.formData();
  const redirect_uri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const code_challenge = String(form.get("code_challenge") ?? "");
  const code_challenge_method = String(form.get("code_challenge_method") ?? "");
  const client_id = String(form.get("client_id") ?? "");

  if (!redirect_uri)
    return new NextResponse("Missing redirect_uri", { status: 400 });

  const secret = await getOauthCodeSecret();
  if (!secret) return missingConfigPage();

  // Scope selection precedence:
  //   1. Registered client (client_id present) → union of checkbox 'scope'
  //      + owner checkbox — the user's final consent.
  //   2. Legacy client (no client_id) → single hidden 'scope' value (owner).
  let grantedScopes: string[] = [];
  if (client_id) {
    const checked = form.getAll("scope").map(String);
    const ownerChecked = form.get("scope_owner") ? [OWNER_SCOPE] : [];
    // Filter unknown + de-dup. If owner ticked, that's the effective grant.
    const set = new Set(
      filterKnownScopes([...checked, ...ownerChecked].join(" ")),
    );
    grantedScopes = Array.from(set);
    // If user unchecked everything, refuse — don't silently mint an owner token.
    if (grantedScopes.length === 0) {
      const redirect = new URL(req.url);
      redirect.searchParams.set("error", "no_scopes_selected");
      return NextResponse.redirect(redirect.toString(), { status: 303 });
    }
  } else {
    // Legacy flow — hidden field carries owner scope.
    const scopeRaw = String(form.get("scope") ?? OWNER_SCOPE);
    const filtered = filterKnownScopes(scopeRaw);
    grantedScopes = filtered.length > 0 ? filtered : [OWNER_SCOPE];
  }

  const scopesForCode = grantedScopes.join(" ");

  const now = Math.floor(Date.now() / 1000);
  // Payload segments: challenge . method . iat . user_id . scope_b64
  const scopeSegment = "." + Buffer.from(scopesForCode).toString("base64url");
  const payload = `${code_challenge}.${code_challenge_method}.${now}.${gate.user.id}${scopeSegment}`;
  const code = `${Buffer.from(payload).toString("base64url")}.${sign(secret, payload)}`;

  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect.toString(), { status: 303 });
}
