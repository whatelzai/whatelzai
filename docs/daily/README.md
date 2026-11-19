# Private daily workspace (SPR-124)

Admin home `/` now shows Overview. `/command-center` redirects home; the old
website-content/traffic dashboard lives at `/site-dashboard` under AI Business.
Its obsolete test briefing card is no longer displayed. Existing stored cards
are not deleted. `Today` is a separate first-class admin destination.

## Storage ownership

Whatelzai stores owner-scoped commitments, check-in dates, acceptance/completion,
optimistic revisions, EMDEE document references, bounded AI attempts and encrypted
connection configuration. Canonical morning/evening Markdown lives only in EMDEE.
An historical brief never silently changes current operational task status.

Every page, loader, action and OAuth callback requires the configured sole owner
from SPR-125. The new tables have RLS and no public/anon/authenticated grants;
only independently authorized server code uses the service role. Future shared
productivity belongs on the member surface with explicit owner scoping, never
by opening the personal admin workspace to other accounts.

## Connections

Provision a 64-hex-character `DAILY_INTEGRATION_KEY` on each deployment. Keep it
outside the database and out of browser bundles. It encrypts credentials using
AES-256-GCM with a fresh nonce. Losing/changing the key requires reconnecting.

On `/today/connections`, connect EMDEE with OAuth PKCE. Registration and callback
origins are constrained to the admin host, the current Vercel preview deployment,
or the explicit development origin. State is owner-bound, encrypted, valid for
10 minutes and consumed on success. The callback reads the chosen parent before storing the credential; a token for a
different account or an unreadable hub fails setup without replacing the connection.
Tokens expire according to EMDEE; reconnect
rather than pretending an expired token works. No personal CLI/chat credential
is copied into deployment configuration.

The requested OAuth scopes permit document reads and writes only to the chosen
parent document and briefing folder. EMDEE's own consent/agent scope checks remain
in charge. Default parent is `edmund/01-personal/01-DAILY.md`, with separate
`01-daily/01-MORNING.md`, `02-EVENING.md` and `03-WEEKS.md` hubs.
Briefs are date-named children of the matching Morning/Evening hub. Existing
project-folder credentials remain intact until reauthorization, but cannot save
new briefs. Reconnect to consent to writes within Personal Daily; no write access
to the rest of Personal is requested. Personal branches now run Daily, Books, Role Models, Philosophy, Dream, Diary,
Discipline and Brain (01–08), following Edmund’s explicit ordering.
No saved daily entries existed in the old
project folder at migration inventory (2026-10-19). The old hub is retained as a
historical pointer; no narrative was deleted. Parent updates and document edits use strict
observed hashes. New documents are linked atomically with `create_child`.

Personal generation uses the existing ChatGPT subscription, not an API key. Stored
OpenAI credentials remain encrypted for future use; they are not invoked while
`DAILY_API_GENERATION_ENABLED` is absent or false. Explicit server-side opt-in is
required for both daily preparation and weekly generation. If enabled, configure
your own OpenAI project key and chosen model ID in the owner-only UI.
Model access is checked without inference, and the key is never redisplayed.
The chosen model must support the Responses API and structured outputs. No model
or spend has been selected on Edmund's behalf. Disconnecting removes stored
credentials; revocation at the provider is a separate action.

## Daily flow

All dates use Asia/Singapore. Yesterday's exact evening document is read before
morning preparation. Missing and unavailable are separate states. Unavailable
EMDEE reads disable document editing to prevent accidental overwrites. Briefs
use Markdown H3 headings inside the canonical Notes section; H1/H2 headings are
rejected to preserve EMDEE relationships and section boundaries.

Tasks start as proposals; acceptance is explicit. Unfinished work carries forward
unless moved to a later check-in or dropped. Deferred work remains accessible.
Actions use revision guards. Up to 100 unfinished tasks and 100 current-day
completions are loaded; nothing outside those bounds is claimed as exhaustive.

When explicitly enabled, API preparation is manual, produces an editable draft, never mutates tasks and
never saves the draft until Edmund submits it. Sources: operational records,
yesterday's EMDEE closeout, and supplied notes. Calendar/email/book search are
explicitly unavailable. Source documents are data, not execution authority.
Each workflow/day gets three atomically reserved attempts, failures included;
provider calls have a 45-second timeout, 2,000 output-token cap, 60,000-character
input cap and `store:false`. These bounds do not promise a dollar-denominated
budget or a fixed token price. Run records retain metadata, never brief bodies.

The existing ChatGPT cloud tasks run at **04:30** (Morning Brief) and **21:00**
(Night Debrief), Asia/Singapore. Their instructions now read/write the canonical
EMDEE records directly through the connected document tools, then read back before
claiming success. Missing tools or failed writes produce an explicit save failure
and retain the draft in chat. No API inference fallback is permitted. Morning
reads yesterday’s evening handoff; evening reads today’s morning and saves a
provisional reflection before waiting for answers. Unknown progress remains unknown.
Repeated runs preserve existing records; explicit updates and the real night run
can refine a provisional test using fresh section hashes.

Whatelzai reads these records when Today opens or refreshes. It does not trigger
ChatGPT runs, mirror chat history, or automatically change commitments. Manual
EMDEE editing remains available. Both cloud tasks were tested with Run now on
2026-10-19; the resulting records were independently read from EMDEE and displayed
in production Today. Future unattended executions are not claimed verified by
those tests. The separate 03:00 EMDEE Distill task was not changed.

## Verification

Run the daily/owner/routing/team suites, TypeScript, changed-file lint,
formatting and the production build. Daily tests cover Singapore midnight,
credential encryption/tampering, EMDEE optimistic writes/readback, unavailable
sources, owner denial, OAuth PKCE/scopes/state, provider request bounds and failed
attempt limits. Remote table checks confirm service access and anonymous denial.
No private notes, credentials or actual customer data belong in test fixtures.

## Weekly condensation (SPR-126)

**Paused in personal subscription-first mode.** The route returns `disabled` after
owner verification, before reserving attempts or reading provider credentials.
The behavior below applies only when API generation is explicitly enabled.

The independent ChatGPT task **Weekly - EMDEE Reflection** runs every Monday at
**03:00 Asia/Singapore**, starting 2026-10-26. It reads the previous complete
Monday–Sunday Morning/Evening records, saves one combined summary under Weeks and
verifies readback. Missing coverage is explicit; originals stay intact. The
weekly page reads the canonical EMDEE path directly, including summaries created
outside Whatelzai, without requiring an API-run SQL record. An unavailable source
is a failure rather than an empty week; repeated runs preserve existing summaries.
The existing daily 03:00 EMDEE Distill is unchanged.

Every Monday at **08:00 Asia/Singapore**, Vercel invokes
`/api/cron/daily-weekly` on the public deployment origin (`0 0 * * 1`, UTC).
The endpoint independently checks `CRON_SECRET`, production environment and the
configured owner's current stored role. It does not bypass admin session guards.
Provision CRON_SECRET in production; never expose it to clients. HEAD does not run
work. Vercel only activates configured cron jobs on production deployments.

One combined `WEEK-YYYY-Www.md` is created beneath `03-weeks/`, using the previous
complete Singapore Monday–Sunday (at most 14 entries). Morning and Evening
originals remain intact, with source links/hashes and exact missing coverage
appended to the synthesis. There are no deletes, reparenting or task mutations.
No-source weeks skip inference and record `empty`; unavailable sources fail closed.
Sources are read again before publication to detect concurrent changes. Summaries
are snapshots; later edits/backfills do not silently rewrite completed summaries.

`daily_weekly_runs` stores only owner/week/status, up to three attempts including
failures, source count and document reference. Its owner/week primary key and
conditional revision updates prevent concurrent generation. A fresh running job
cannot be reclaimed; an interrupted job needs a manual retry after ten minutes.
Automatic cron invocations do not retry failed jobs or spend again. The owner can
inspect/retry at `/today/weekly`. A successful EMDEE write is recovered after a
crash without another model call. A run killed before persisting its output may
require another bounded generation attempt. The provider receives at most 60,000
input characters, a 2,000-output-token cap and `store:false`; oversized weeks fail
rather than silently dropping records. Model/key stay on the existing connection.

Renew expired EMDEE authorization in Connections. Without it the scheduled run
fails visibly; the 30-day authorization is not an indefinite unattended grant.
The personal daily ChatGPT tasks remain independent of this optional API job.

## Reusable routine library

`/today/routines` is an owner-only reader for three private EMDEE skill artifacts.
The allowlisted Morning, Evening and Weekly documents live beneath Personal Daily's
`04-ROUTINES` hub. Notes contain a complete SKILL.md with name, description and
version frontmatter; no personal instruction body is bundled into this public repo.
The existing Daily EMDEE connection reads them at request time. Detail pages render
Markdown; owner-gated downloads return the same normalized source as SKILL.md with
private/no-store headers. Missing, disconnected and invalid/unavailable sources
are distinct; there is no public fallback or inference. The skill name is validated
against the requested routine and arbitrary document paths cannot be supplied.

Local installed/exported skills are snapshots of the canonical EMDEE Notes.
Downloading/installing a skill does not create a job or modify existing ChatGPT
task prompts. The library provides a reusable MCP read-and-follow invocation.
No schedule, API setting, credentials, member permissions or daily record changes.
