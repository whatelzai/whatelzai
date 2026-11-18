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

## Focus horizons

Shared WorkspaceFocus leads Home, AI Business, Network Marketing and Day Job.
The pure focusHorizons model filters both accepted tasks and calendar anchors by
lane and Singapore day/Monday–Sunday boundaries. Today includes overdue accepted
work; the week includes accepted carryovers and intersecting calendar ranges.
Blocked/waiting work stays visibly blocked and cannot start a focused sprint.
Calendar records keep source statuses and never become commitments or attendance.
If a lane has no remaining event this week, its next later anchor appears under
“Next after this week”, never as an in-week event. Missing sources remain explicit.
Four rows initially visible per horizon; every remaining row can be expanded.
The shared Home briefing source no longer issues an unused duplicate task read.
Owner gates, tool directories, Rhythm, progressive Suspense and navigation remain.
No new schema, provider call, schedule or automatic task acceptance.
