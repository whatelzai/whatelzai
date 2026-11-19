# Member assistant pilot

The member assistant lives at `app.whatelz.ai/assistant`. The current API pilot is Edmund-only. The owner manages stored pilot
access and allowance resets at `admin.whatelz.ai/users`. Personal admin Daily
remains ChatGPT/MCP based; `DAILY_API_GENERATION_ENABLED` stays off. EMDEE only
stores/retrieves knowledge and verifies OAuth identity. It performs no inference.

## Access and identity

Every conversation, request, allowance and commitment belongs to immutable
`public.users.id`, not an email. Activation requires an existing authenticated
account chosen by the configured sole owner. Names/emails never claim accounts
or team profiles. Inactive members cannot read chats or invoke tools. In this phase, even an activated
non-owner cannot use the assistant: `memberActor` verifies the configured stable owner
ID and privileged stored role before reading pilot access, reserving allowance or
reaching the provider. Missing owner configuration fails closed. Leads, notes and
resources retain their independent member permissions.

An optional EMDEE PKCE connection uses the member's own account and read scope.
The identity endpoint verifies the resource-bound OAuth subject and vault UUID.
The member confirms the returned account before linking. Unique constraints and
an immutable identity trigger enforce one Whatelzai account to one EMDEE subject
and vault. Disconnect removes credentials, retaining the verified identity.
No automatic account merging or provider-ID replacement occurs. OAuth tokens
remain encrypted server-side. Every knowledge read revalidates identity and
restricts paths to the chosen existing own collection and child directory;
shared wrappers and traversal are denied. No vault write tool is included.

## Allowance

Each activated member gets US$1 per seven-day window. `Full reset` starts
a fresh seven-day allowance cycle; it grants additional
spending and never erases usage history. In-flight replies settle against their
original cycle. The server rechecks the configured owner for each admin action.

`MEMBER_AI_ENABLED=true` explicitly enables member inference. Default is off.
The server uses only the provider key in the owner's encrypted OpenAI connection,
never the owner's EMDEE token or personal notes. Provider calls are accepted only
on the member origin (or exact deployment preview/development origin), with a
matching Origin header and verified activated owner account.

The current owner pilot uses GPT-6.1 Sol (enabled 2026-10-22), with low reasoning through Responses. Stored model selection controls each request; US$1 weekly allowance and usage history are unchanged.

GPT-6 Luna pricing: US$0.10/M input and US$0.50/M output tokens. GPT-6.1 Sol: US$2/M input and US$10/M output. Checked 2026-10-22 against the OpenAI
model documentation. Rates must be rechecked before changing models. Cached
input is conservatively counted at the uncached rate; this is an allowance
estimate, not a provider invoice. No automatic model escalation/fallback.

An atomic database reservation covers at most four provider calls, each with
60,000 serialized UTF-8 bytes plus a conservative protocol token margin and
1,024 output tokens. Usage receipts release unused reservation. Unknown provider
outcomes retain the entire reservation, displayed separately. Requests are
idempotent, only one can run per member at a time, and each member has a 30/hour
attempt limit. Conversations are capped at 100 messages; latest 20 form context.
No browser receives the provider key or raw OAuth credential.

## Tools and approval

Tools read only the authenticated member's commitments and verified knowledge
collection, or prepare at most three commitment proposals. The model cannot
choose a different user ID. Proposals become open commitments only after the
member clicks Accept. Completion requires the member's own click and a revision
check. No email, calendar mutation, arbitrary URL fetch or code execution.

## Validation

Run `node --import tsx --test scripts/member-ai.test.ts` plus the existing daily,
owner, auth, routing and team suites; typecheck, changed-file lint and production
build. Verify SQL reservation/idempotency, reset settlement, unique identities,
RLS/privilege denial and quota rejection in an isolated Postgres fixture before
applying the additive migration. Verify mobile layout and a bounded live reply
before enabling other pilot accounts. Never commit real pilot names, account
identifiers, email addresses, credentials or private transcripts as fixtures.

On narrow screens the conversation and composer precede the supporting panels;
a compact allowance link jumps to usage and conversations. Currency balances
use cents while usage receipts keep micro-dollar precision.

Chat follows the mobile visual viewport. The bottom navigation hides while an editable field and substantial keyboard height reduction are detected, then restores after dismissal; pinch zoom and normal toolbar movement do not count as a keyboard. The rounded composer owns focus feedback; the inner textarea has no separate outline or border.

Profile → Usage is a read-only per-account allowance view: spent and held credits, percentage remaining, a live countdown and the next reset in Singapore time, actual latest admin-granted reset/count, and 20 recent cycles. Full resets remain owner-controlled in admin Users. Viewing Usage neither invokes a model nor changes access, balances or cycles. Other signed-in members may view their own records while the API Chat remains limited to activated tree members. Failed reads show unavailable; expired cycles are kept in history and are not charged against a projected new weekly allowance.

## Activated-member access (SPR-141)

Tree activation now grants Chat eligibility for every member, superseding earlier
owner-only pilot descriptions. The global API flag still applies and personal
Daily remains on ChatGPT. Enrollment is validated by a service-only database
function; the normal US$1 weekly baseline and private per-user data boundaries remain.
Owner-selected full/half resets are documented in docs/member-credit-resets.md.

## Markdown and streaming

The Chat client opts into `application/x-ndjson`. After the existing authorization and atomic reservation, the route streams visible text deltas from the Responses API, followed by a terminal saved message or explicit error. Private tool payloads never cross this transport. Provider usage is taken only from a validated terminal response; truncated/unknown outcomes retain the maximum reservation. Next `after()` keeps settlement tracked even if the client leaves. Legacy JSON requests remain supported. Existing request IDs are reused on transport retries; no automatic provider retry is introduced.

Assistant Markdown uses the installed GFM renderer, with local table/code scrolling, safe URL handling, skipped raw HTML and text-only embedded images. Note review and proposal acceptance appear only on the canonical saved message after refresh. New text scrolls into view while the reader stays near the bottom; scrolling up pauses following.

## Chat images and dictation (SPR-173)

The composer’s plus button previews up to two images per message; remove before sending, or send an image without accompanying text. Supported browser-decodable photos are rasterized locally (up to 15 MB / 40 MP), then the server accepts only bounded JPG/PNG/WebP bytes and normalizes them to at most 1024 px and 256 KiB WebP. EXIF metadata is stripped. Private `chat-images` Storage has no browser read policies; authenticated owner-filtered API routes serve saved history with no-store headers. Uploads are capped at 40/day and 10 unbound/day per account. The last two images are included in subsequent model context; ask to reattach older images. Vision token reserves cover every bounded tool round.

The microphone records only after a user action and permission, for at most 60 seconds, then stops the tracks and returns editable text. Recording can be discarded. Browser Web Audio encodes canonical 16 kHz mono PCM WAV; server validates actual bytes/sample count, not a submitted duration. GPT-Transcribe costs USD0.0045/minute, charged against the same weekly allowance. Raw audio is not stored in Supabase; the private dictation ledger retains request/hash, status and resulting draft text for idempotent retry. Provider processing still applies. Dictation never sends the Chat message automatically.

Service-only RPCs serialize reservations against the account lock. Image binding and Chat reservation commit together; changed attachments on replay fail. Dictation has its own request ID/hash, one running recording at a time and a 30/hour cap. Completed retries return the cached transcript; known provider rejections release the hold, unknown outcomes retain it. Late completion settles the original cycle even after an admin reset. No automatic inference retry, Baobei mutation, note save or sharing is added. Existing Resources tools remain available for attachment-related questions within the member’s permissions.

Run `node --import tsx --test scripts/chat-media.test.ts scripts/chat-media-sql.test.mjs scripts/member-ai-boundaries.test.ts scripts/member-ai.test.ts scripts/member-ai-stream.test.ts`. Use synthetic image/speech for provider QA; actual Android/iPhone microphone permission, capture and keyboard interaction need physical-device validation.

## First-exchange conversation titles (SPR-175)

After a successful reply is persisted, Next `after()` runs one best-effort title job using `gpt-6-luna` through the existing OpenAI connection. Main Chat models and streaming stay unchanged. The title request has no tools, `store:false`, a 15-second timeout and 96-output-token cap; only the first 1,600 user characters and first 800 assistant characters are sent. Images, later messages, Resources and other members' content are not included. Titles follow the user's language and remain private in `member_ai_conversations`. Opening the sidebar refreshes its owner-scoped list so finished titles appear.

Service-only `claim_member_ai_title` locks and creates one durable `member_ai_title_jobs` row per conversation. Empty conversations and non-placeholder titles are skipped; duplicate claims cannot invoke a model again. Only the original dated placeholder can be replaced at settlement, so a concurrent custom rename is preserved. Known failures and uncertain outcomes stay recorded and are not automatically retried. Original titles, model, timestamps and validated token/cost receipts are retained; transcript excerpts are not duplicated in the job table. RLS/browser grants remain denied.

Title generation is small operational overhead paid by the platform, separate from the member's weekly allowance. Calls are bounded to 100/account/day and 200/platform/day, with a 2,000-micro-dollar receipt ceiling per job. These limits include failed/uncertain claims. No paid Gateway provisioning or Haiku dependency was added: Edmund explicitly chose GPT-6 Luna.

`scripts/backfill-conversation-titles.ts` runs the same claim/generate/settle path for a single explicitly authorized immutable owner ID, supplied through `TITLE_BACKFILL_OWNER_ID` in an ignored environment file. It caps a run at 100 candidate conversations, preserves all existing custom titles and prints only outcome counts/costs. Never default this script to all users. Claimed jobs remain idempotent on reruns; inspect failures instead of deleting claims and silently repeating inference. The authorized initial backfill is limited to Edmund's own account.

## Team context (SPR-176)

The 2026-10-27 team-visible policy supersedes earlier private-by-default Baobei and HQH/HHH descriptions. Chat can read same-team visible profiles and saved notes, with current record hides and individual exclusions. Profile results include two recent permitted linked notes; source coverage remains bounded. Contacts, private remarks, raw activity notes, chats and vaults remain private. Context never grants edit permission; note/profile mutations still use explicit owner-scoped editors. See docs/team-baobeis.md.
