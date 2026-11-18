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
provisional on Sprint72, distinct from Gregorian quarter filters.

Week is default; Day/Month/Quarter/Year and lane filters work locally and immediately.
Community recurrence is bounded to current and following Singapore calendar years
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
