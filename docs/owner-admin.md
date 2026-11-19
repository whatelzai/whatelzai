# Owner-only administration

Whatelzai is Edmund's permanent personal asset. `whatelz.ai` is public;
`admin.whatelz.ai` is his private command centre; `app.whatelz.ai` is the member
surface. Future productivity capabilities may be shared through the member app,
but that never grants access to the personal admin workspace.

## Identity and configuration

Set `WHATELZ_OWNER_USER_ID` to Edmund's existing stable `public.users.id` in each
Vercel environment and local `.env.local`. This is server-only configuration,
never `NEXT_PUBLIC_*`, an email address, or a Supabase Auth user ID. Verify the
account's existing `supabase_auth_user_id` binding before configuring it. Do not
reassign an account, promote another user or infer ownership during login.

Authorization requires a verified session, an existing application account with
that exact ID, and its stored `admin` or `superadmin` role. Missing, malformed or
mismatched configuration denies access. Changes to Vercel environment variables
apply to new deployments; configure the owner before deploying this change.

The proxy gates admin reads/writes (including RSC/navigation requests and direct
`/admin` preview paths) and `/api/admin` on every host. Layouts, Server Actions
and session API wrappers check independently. OAuth consent/code redemption and
MCP bearer-token lookups also check the current owner and stored role. Existing
owner-issued scoped agent tokens remain valid, subject to their original scopes,
expiry and revocation. The legacy `/api/mcp/function` endpoint now accepts only
owner-bound full-scope revocable tokens; it rejects the old unbound shared secret
and narrow tokens (which must use `/api/mcp/whatelz` for per-tool scope checks).
Tokens bound to another account cannot become admin
credentials merely because that account carries a privileged role.

Member login, team relationships and calendar personas remain separate. Global
administrative team visibility and calendar preview capabilities require owner
identity. A manager's explicitly assigned team visibility continues to work.
No roles, memberships, team data or database schema are changed by this release.

## Product connections

Remote products provide explicitly authenticated metrics through their own
interfaces (currently EMDEE's owner-metrics integration). Whatelzai does not
inherit ownership of their databases. If a product is sold or transferred,
revoke its metrics credential at the source and remove the corresponding
Whatelzai environment variables. Deploy the configuration change. The existing
widget then shows a disconnected/pending state; Whatelzai remains independent.
Credential removal alone does not revoke a leaked credential at its source.

This release does not build an integration-management UI, promise automatic
ownership-transfer detection, or enable new product-data collection.

## Validation

Run `node --import tsx --test scripts/owner-admin.test.ts` and the existing
routing/team tests, typecheck, changed-file lint and production build. The owner
suite exercises the actual proxy, action helper, session API gate and token
lookup with controlled verified-session/database fixtures. It covers missing
configuration, anonymous access, other privileged accounts, spoofed metadata,
owner demotion, unavailable lookups and owner-authorized tokens.

Before production: verify owner access on a preview, anonymous redirects and API
401s, and member access to the shared app. No production merge is performed by
these instructions.
