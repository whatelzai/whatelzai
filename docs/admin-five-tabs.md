# Admin five-tab shell

Personal | Chat | Home | Calendar | Profile. Mobile Home is a yellow circular
anchor raised 23px, as requested in the follow-up reference; other destinations
retain aligned labels and quiet yellow selection. Desktop keeps the five links
in its header. Home is the existing Overview route. Profile reuses preferences
and release history. Old /settings links still work; public website profile tools
were preserved under /admin/ai-business/profile, with their links updated.

## Owner Chat

/admin/chat and /api/admin/chat are sole-owner surfaces. The endpoint verifies
same origin/allowed Admin host and owner before credential reads. The encrypted
existing OpenAI connection stays server-side; model is fixed to gpt-6.1-sol.
No member AI endpoint, allowance, credential or conversation table is altered.
Requests permit only user/assistant roles, at most20messages/24,000characters,
6,000 per message and40KB body; replies cap at2,000tokens with60s provider timeout.
Existing process-local rate limiter is used (best-effort, not a global budget).
Provider store:false. One tiny live provider smoke test returned successfully.

This first chat is ephemeral: navigation/reload clears it. The UI says Not saved.
No calendar/EMDEE/email context or tools are supplied to the model; it cannot
claim to read or mutate those sources. The composer states that API credits are
used. No inference happens on page load.

## Calendar

Owner-only read view merges dated Whatelz event records, explicit Network Marketing
planning tables and company sprint tables from the two allowlisted EMDEE docs,
plus existing private community-calendar imports. No dates are hardcoded in UI.
Network and career reads were live-verified to project7and11ranges respectively.
Only explicit table ranges and the dated guest-planning heading are projected;
no background narrative or guest names are exposed in the calendar payload.
All-day ends are inclusive; imported ICS exclusive ends subtract1ms. Timed imports
show Singapore start time. Company quarters retain source labels, including Q1
provisional on Sprint72.

Calendar is one continuous Monday–Sunday seven-column grid, starting at the current
Singapore week and ending strictly on 31 December 2029. Eight-week batches load
progressively with a keyboard-accessible fallback. Date jump and Today shortcuts
retain quick navigation. Month shades use spring green, summer gold, autumn earth
and winter blue; explicit dates, month names, year markers and workspace icons
preserve meaning in greyscale. Tap a day for complete event details; Back closes
the dialog before navigating. No Day/Week/Month/Quarter/Year mode selector.
Community recurrence is bounded from the current Singapore year through 2029
and that coverage is displayed. Imported records paginate500at a time and require
snapshot count agreement. Other source failures remain explicit, never false zeros.
This is not a new event editor, a Google sync, an RSVP, or an attendance assertion.
Shared events are not duplicated across lanes; source identity is preserved.

## Verification

23 targeted tests cover navigation, focus/Back, owner gating, origin/model/input
bounds, provider request, date windows and year/quarter boundaries. TypeScript,
ESLint and production build must pass before release. Synthetic real-component
browser fixture used for390/768/1440px review, including dark mode. No authenticated
production browser session or physical Vivo test is claimed. Fixtures are removed.
Taste app-screen guidance used with existing type and user-requested yellow chrome
preserved over the dealt achromatic styling. No dependency/schema changes.

## Compact shell and Profile update

Repeated main-tab headings remain screen-reader accessible but are visually hidden.
The shared Back boundary sits outside the animated page content, in a compact
sticky row below the measured header, only for deeper routes. The document keeps
scrolling normally; header and mobile dock retain their positions. In installed
phone mode Admin uses the existing guarded pull-refresh controller with an Admin
root: it does not intercept controls, editing, active requests, open dialogs, pinch
or nested scrolling. Regular browser pages retain native refresh. This refreshes
server content rather than reloading or signing out. Physical Vivo gesture QA
remains a device check.

Profile follows weOS's language pills, owner avatar/identity and grouped surfaces,
within a760px maximum width. Only existing Admin preference controls are used;
member passes, tiers and reset credits are not copied into the owner account.
Appearance, text size, push options, scheduling, install and sign-out remain.
Synthetic profile/browser previews contain no private account data and are removed
before release.

## Focus horizons checkpoint

Shared WorkspaceFocus leads Home, AI Business, Network Marketing and Day Job.
Today includes accepted open/blocked/waiting tasks due today or overdue and events
covering the Singapore date. One full-width snap carousel advances every6.5seconds
only with multiple items, an active tab and no reduced-motion preference. Hover
pauses; pointer/keyboard interaction stops automatic rotation until Play. Manual
arrows and touch scrolling remain. A single item has no rotation controls.

This Week contains only items starting/due tomorrow through Sunday, with three
visible and remaining entries under View more. Ongoing company sprints remain in
Today rather than repeating as future starts. Source failures stay explicit;
calendar records never become accepted tasks or attendance assertions.

Overview additionally projects read-only Thursday21:00 next-week planning and
Sunday21:00 closeout checkpoints. Sprint-001 starts2026-11-16; planning references
the next sprint and closeout the current sprint. Individual epics exclude these
administrative reminders. This creates no automation or database task.

Focus detail routes under /admin/focus/[id] and each epic's /focus/[id] retain
source identity in encoded routes, with short deterministic display references
(not new sequential database IDs). Owner verification precedes reads; task reads
filter verified owner plus UUID and retain completed records. Events are projected
through existing owner-only sources; routine dates must match their weekday.
Epic detail wrappers reject a mismatched lane. Source tools remain available.
Breadcrumbs use the originating epic and Today/Week anchor. Deep-link Back falls
back to a real root, never a nonexistent focus index. Main tabs retain no Back row.

The unused duplicate task read in briefing sources was removed. Directories,
workspace shortcuts, Rhythm, lazy Suspense and existing permissions remain.
No schema, dependency, provider call or automatic task acceptance changes.

## Three-tab Admin, Personal epic and saved Chat — 2026-11-18

The main dock is Chat | Home | Profile. Personal is the fourth epic beside AI Business,
Network Marketing and Day Job, with scoped Today/Week and detail pages. Overview
combines all four. Thursday planning and Sunday closeout now belong to Personal.
Calendar remains accessible in the workspace selector. Personal schedules retain
explicit saved choices.

Admin Chat saves owner-scoped threads/turns in private Supabase tables and uses the
existing server connection with gpt-6.1-sol, provider store:false. The verified task
snapshot is available; calendar, email and EMDEE are not connected to this chat.
Task changes are stored proposals until the user presses Apply task. A service-only
RPC validates owner, stored proposal, revision and completion invariants, with
idempotent receipts. Pending turns serialize per conversation; retries retain the
saved message and request identity. History lists the latest50 conversations;
each conversation supports100 turns and direct thread links remain valid.

A daily21:00 Personal focus reminder opens saved Chat for idea review. This is a
visible reminder only: no new scheduled AI reconciliation job or EMDEE write.
The header bell has a private inbox with unread marks, mark-all-read and soft
archive. It imports release notes and confirmed registrations from the last28days;
future attempted push deliveries also persist notices before sending. It does not claim a complete archive of historical push notifications.

Migration20261118053000 is additive and applied. New tables deny browser roles;
reads/writes use verified owner endpoints, same-origin mutation guards and service
credentials. Preserve saved conversations and notification history on rollback.
