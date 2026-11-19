# fcOS social connections — SPR-192

Profile → Social connections is an owner-only pilot on `app.whatelz.ai`.
The stable configured owner must also have an administrator role and a team
assignment. It does not connect accounts to Codex, add sign-in methods, publish,
send messages, read DMs, scrape followers, or create Baobei records.

## Activate

1. Register a developer app with each provider. No paid connector is installed.
2. Instagram: use **Instagram API with Instagram Login**, and its Instagram app
   ID/secret (not a Facebook Page token or a personal password). The accounts must
   be professional accounts and have the appropriate app role/test access before
   a development-mode app can authorize them. Wider use can require App Review.
3. LinkedIn: enable **Sign In with LinkedIn using OpenID Connect**. This grants
   identity access. Only enable the post-read checkbox if LinkedIn has actually
   approved `r_member_social`. Publishing permission does not grant post reads.
4. Register these exact callback URLs:
   - `https://app.whatelz.ai/api/member/social/instagram/callback`
   - `https://app.whatelz.ai/api/member/social/linkedin/callback`
5. Save the client credentials through the owner's developer-settings form,
   then authorize each slot using the provider's own consent screen. Instagram
   checks the returned username against the expected handle entered for the slot.
6. Refresh posts. Authorization and real upstream reads require live provider
   setup and cannot be verified with simulated tokens. Do not mark a disconnected
   slot as connected or claim that identity access grants post access.

Developer credentials and access/refresh tokens are AES-256-GCM encrypted in
Supabase using the existing `DAILY_INTEGRATION_KEY`. Envelopes bind owner and
purpose/account ID to prevent ciphertext substitution. No social password is
collected, and no social tokens or app secrets go in `.env`. Production requires
its existing encryption key, owner ID and `CRON_SECRET`; preview cannot authorize
or run the cron. Secret values must never enter logs or tracked files.

## Privacy and state

The four `social_*` tables have RLS enabled and no public/anon/authenticated
permissions. Independently authorized server code uses service-role queries
scoped to the owner. The browser receives only connection summaries and post
fields, never ciphertext, tokens or saved client secrets. Other members and
administrators cannot open the pilot or retrieve the owner's posts through Chat.

OAuth uses random one-time state, a 10-minute database expiry, an HttpOnly
`__Host-` cookie and fixed callback URLs. The callback verifies the current
assigned owner, cookie/state equality and account/app revisions before consuming
state. Database compare-and-set finalization rejects stale configuration and
reconnect/disconnect attempts. Wrong-account authorizations are not stored.

Disconnect atomically clears saved tokens, invalidates pending authorization and
removes the account's cached posts. It does not revoke the provider-side app grant;
the owner can remove that in Instagram/LinkedIn settings. A late refresh cannot
restore data after disconnect because the database commit checks the revision.

## Retrieval and costs

Manual refresh and a production-only daily cron at **11:00 Singapore time** read
at most 25 recent own posts per account (two Instagram slots, one LinkedIn slot).
A one-minute atomic cooldown prevents overlapping refreshes. Refresh reads only
fixed provider endpoints; upstream paging URLs and image/video downloads are not
followed. Successful refresh replaces the bounded cache rather than accumulating
an unlimited archive. Failed requests retain the previous snapshot and display a
status. Near-expiry Instagram tokens are refreshed; LinkedIn refresh is used only
when the provider issued a refresh token. Otherwise reconnect after expiry.

Chat's `read_fcos` tool accepts `source: social`, performs an owner-only SQL
substring search and returns up to six cached excerpts with dates/source links.
It is not live web search or a complete history. Posts are untrusted context,
never instructions. No background AI calls occur. Existing hosting/database costs
and normal AI allowance still apply when the owner asks Chat for analysis.

## Versions and references

- Instagram Graph endpoints are pinned to `v25.0`; login/token endpoints are the
  official Instagram Login endpoints. Meta documentation fetching was rate-limited
  during implementation, so live provider acceptance remains an activation check.
- LinkedIn REST reads use `Linkedin-Version: 202608` and Rest.li 2.0. OIDC userinfo
  supplies the connected member identifier. The restricted author finder is only
  attempted with `r_member_social`; a provider refusal is shown as restricted.
- [Instagram Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Meta Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [LinkedIn OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-08)

## Verification

`node --import tsx --test scripts/social.test.ts` exercises provider request
shapes, scoped read permissions, bounded parsing, safe links, refresh and redacted
failures. `node scripts/social-sql.test.mjs` executes the migration in PostgreSQL
(PGlite), checking grants, account limits, owner FKs, atomic state consumption and
stale refresh rejection after disconnect. Run focused ESLint/TypeScript and the
production build. Inspect the mobile page; provider consent is a separate live
activation step and must never be represented by a mock success.
