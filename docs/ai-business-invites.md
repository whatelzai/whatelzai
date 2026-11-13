# AI Business Invite List

Owner-private workspace: `/admin/ai-business/invites`, linked from AI Business.

The initial authorized cohort is the actual 28 June 2026 sharing (5 attendees) and 12 November 2026 seminar (13 attendees): **16 distinct people, 18 attended visits, two returning attendees**. Canonical person IDs and the owner's explicit returning-person confirmation resolve the overlap. No invitation dates, responses, interests, priorities or collaboration assessments are invented. Historical contacts without an email remain valid contacts; no fake address or account is created.

## Working with people

Search by name, contact details, interests, collaboration or next step. Filters cover follow-ups due (Singapore date), priority, returning attendees and Do not contact. Edit a person's contact details, relationship, conversation notes, interests, potential collaboration, next step and follow-up date. All assessments are manually recorded by the owner.

Log an invitation already made, including date, channel, event/reason, response and notes. This sends no message. Corrections can be edited or removed from counts while keeping the original entry visible. Do not contact prevents new invitation logs. Attendance is computed independently from confirmed, checked-in tickets and explicit historical attendance, deduplicated per event. Registration alone is not attendance; cancelled records do not count. Later checked-in tickets match existing contacts through canonical person ID or exact normalized email. New people from future events are not automatically imported in this iteration.

## Privacy and write safety

Three additive RLS tables are browser-denied, including authenticated clients. Reads and writes go through the existing sole-owner Admin gate. The POST API additionally requires an Admin host, same-origin JSON, a bounded strict payload and revision guards. Owner IDs, source keys, attendance links and canonical event-person links cannot be edited through form payloads. Duplicate emails/source imports are rejected or idempotent. Errors preserve form text; stale edits require refresh. No public endpoint, member access, membership change, mailing list or automatic outreach is added.

Each read is capped at 1,000 rows and checks the exact count; exceeding a cap fails explicitly rather than displaying partial attendance. Pagination is needed before growing beyond that bound.

## Migration and initial import

`20261113145620_ai_business_invite_list.sql` was applied through the authenticated linked Supabase CLI and recorded in migration history on 13 November 2026. Production checks confirmed RLS enabled and no anon/authenticated SELECT grants on all three tables. Import ran twice with identical totals: 16 contacts, 18 source links, zero invitation logs. Real names and contact data are not stored in source code.

The one-time import script requires explicitly supplied historical/ticket event references and confirmed-returning name, and refuses a changed 16/18 cohort pending review. It only inserts absent contacts/links and does not overwrite owner edits or alter source attendance. Do not reuse it as an unrestricted future-event importer.

Rollback: remove the UI/API deployment to disable the feature while retaining the private tables and imported records. Any destructive schema/data rollback requires a separate reviewed backup and explicit approval.

## Validation

- Seven tests: attendance and alias deduplication, cancelled/pending exclusion, explicit identity linking, seed ambiguity/idempotent keys, input/exact deployment host boundaries and PostgreSQL role/foreign-key constraints.
- TypeScript, changed-file ESLint and production webpack build.
- Real-data aggregation verified 16 people / 18 attended visits / two returning attendees; repeated import unchanged.
- Anonymous API request returns 401 without exposing records.
- Browser QA uses temporary fictional contacts: desktop/tablet/mobile (1440/768/390), light/dark, contact notes, invitation add/correction/removal, search/returning filters, Do not contact and failed-save text retention. The preview route is removed before commit; owner-authenticated end-to-end saving should be smoke-tested after release.

## Design review

Taste app direction: **Accent ladder**, seed **2142625088**, retaining the existing Admin Geist type and yellow/ink palette. The screen answers “Who should I talk to next, and what do I know about our history?” A quiet list leads to one person's detail; the pale selected row is the signature. Facts and owner notes are clearly separated. There are no charts, generated scores or vanity metrics.

Browser review at 1440, 768 and 390 found aligned column edges, legible tabular counts and no horizontal overflow. Mobile switches between list and detail with a clear Back action. Light/dark controls and dialog text retain contrast; status remains text-labelled in greyscale. The worst issues found—dark token inheritance, undersized mobile labels and mobile input text—were corrected. Totals were recomputed against real sources. Fictional QA names/contacts existed only in the removed local preview, never in the production seed or committed UI. Browser checks used the approved CUA interface rather than the skill's separate browser-launching inspector. Existing shared Admin shell entrance feedback is retained; this feature introduces no entrance animation.

## Locations (SPR-200)

Contacts have an owner-assigned `location`: **SG** (Singapore), **KL** (Kuala Lumpur) or **PG** (Penang). Null means Not set. This is the invitation market/location, not nationality. Locations appear as a separate list column, in the profile and in Add/Edit person. Location filters combine with existing search/history filters; overview totals reflect the selected location. A contact keeps one identity and attendance history across locations.

Migration `20261113152311_ai_invite_locations.sql` adds a nullable checked column without a default. The user's exact current 16-contact cohort was marked SG through an owner-scoped revision-guarded update on 13 November 2026; readback confirmed 16 SG and repeat run updated zero. No future person is automatically classified SG. Legacy form payloads that omit location preserve its stored value; new forms send an explicit code or null. Existing RLS/grants remain private. Rollback removes the location UI/API update while retaining the column/data; no destructive rollback is needed.

## Historical invitation outcomes (SPR-201)

Invitation dates and channels can be null when the owner has not supplied them. The timeline explicitly says Invitation date not recorded / Channel not recorded, and editing preserves blank values. Couldn’t attend (`unavailable`) is distinct from Declined and from attendance; neither changes a contact to a lost-lead state. The event's date/ID belongs in its event label, never as a fabricated invitation date. Server-only owner/source keys make authorized batch imports repeat-safe and cannot be injected through forms.

Migration `20261113154122_ai_invitation_unknown_details.sql` is applied and recorded. The authorized 12 November intake adds 16 factual outcomes (15 unavailable, one declined), preserving reasons privately and linking the explicitly identified returning June attendee to the existing contact. Fifteen new contacts bring the list to 31; 18 attended visits are preserved. Referral information remains in the relevant invitation notes. No email/phone, invitation channel/date, automatic follow-up or membership status was invented. The owner subsequently confirmed SG for all 15 new contacts; all 31 contacts are SG. The event-specific absence reasons remain unchanged. Private attendee names/reasons and import scripts are not committed.

Validation extends the SQL privacy suite to nullable dates/channels, supported outcomes and owner/source uniqueness. Input tests reject source-key injection. A removed fictional-contact preview verified blank date/channel edit/save and the Couldn’t attend label. Rollback should retain the truthful private records and nullable metadata; do not restore NOT NULL or remove the new response constraint without separately reviewing affected records.

## Overlapping location tags (SPR-201)

This supersedes the single-location selector: `locations` is the canonical array of zero or more SG/KL/PG tags. A person can belong to several invite regions without duplicate profiles or split attendance histories. Add/Edit person uses labelled checkboxes; list/profile show all tags, and a location filter matches any assigned tag. Empty tags mean Not set.

Migration `20261113154752_ai_invite_location_tags.sql` is applied and recorded. Existing scalar locations were copied into arrays. All 31 current contacts retain SG, and the two explicitly identified SG/KL contacts also have KL: SG31, KL2, PG0, **31 unique contacts**, not 33. The owner-authorized additions use exact existing identities and revision guards; no reasons or attendance changed. Repeat update changes zero rows.

The old scalar `location` column remains for rollback/read compatibility. New forms submit the tag array and mirror its first code into that scalar. Pre-tag forms carrying only the old scalar receive an explicit refresh-required conflict, so they cannot silently overwrite multi-tags. Original clients omitting all location fields preserve existing tags. Database/input checks reject duplicate/unknown/null tags, with an empty-array default for new contacts. RLS/grants remain private. UI checkbox/filter/mobile QA uses removed fictional-contact fixtures; final build, lint, format and 11 tests cover the updated flow.
