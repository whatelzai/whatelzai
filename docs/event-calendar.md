# Event schedule and browsing

Owner requested four dates (December2026, January2027), confirmed weekly19:30–21:30SGT and AMI09:00–19:00SGT. Venue is TBD for all four and must not appear on posters. Three weekly sessions retain the establishedS$8 fee. AMI price, capacities and checkout are unconfirmed and remain unset; no registration/payment offer is created by this release.

| Event ID | Date | Focus |
| --- | --- | --- |
|ELZ-EVT-0006|2026-12-10|Money Mindset, weekly|
|ELZ-EVT-0007|2026-12-17|AI Skillset, weekly|
|ELZ-EVT-0008|2027-01-07|AI Skillset × Money Mindset, weekly|
|ELZ-EVT-0009|2027-01-09|AI Money Intensive|

Actual events rows are prepared unpublished, then published only after poster assets deploy to avoid broken-image windows. Existing event IDs/date/keys/attendance are not edited. Preparation checks existing IDs/slugs for collisions and repeat-safe intake. Operational scripts/backups remain outside Git. Source publication and poster metadata are verified at release; no schema migration is required.

`/events` supports List (default) and Calendar. `?view=calendar&month=2027-01#event-browser` is shareable; validated months are bounded2000–2100. Monday-first Gregorian UTC calculations avoid local timezone drift; user-facing dates/today use Singapore. Calendar links open permanent occurrence IDs, with a full monthly agenda below for accessibility. Compact labels and a legend avoid word fragments on phone/tablet. Past events retain actual check-in counts, unknown past times say not recorded. Only an explicit allowlisted public projection enters the client component.

Intensives can now be publicly listed only with published=true and explicit metadata.public_visibility=listed. Default/unlisted intensives remain hidden; /events/next always filters weekly regardless. The owner now explicitly authorizes theJanuary9AMI listing; feedback/thank-you recommendations use its actual date/link rather than a static planning placeholder, retaining at most2cards. Unknown venue/price stay explicit.

Retains the existing cream/yellow Taste direction and fonts. Calendar cells and list surfaces are functional browsing controls; no new decorative visual system. CUA reviewed desktop1280/tablet768/phone390, list/calendar/month navigation and light/dark; temporary local fixture used to review prepared unpublished records and removed before build. Poster generation uses real-photo edits and a source usage register so future artwork does not recycle prior poses. Final prompts are in docs/design/dec-jan-event-posters.md.

Rollback code by reverting the feature; depublish only these four new rows if needed. Preserve stable IDs and source records; never delete real attendance or reuse retired IDs. No payment/email/access changes.

— codex,2026-11-16
