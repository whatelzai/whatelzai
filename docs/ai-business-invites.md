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

## How we met (SPR-204)

`how_met` is a separate owner-private connection-origin field (maximum 2,000 characters), shown in the contact profile and Add/Edit person. Search includes it; the list uses it beneath a name when no next step exists. It does not replace conversation notes, assessment, event history or location tags. Blank means not recorded. Legacy payloads omitting the field preserve its value; an explicit empty string clears it.

Migration `20261113165712_ai_invite_how_we_met.sql` is applied and recorded. The owner supplied connection origins for 53 of 54 existing contacts; exact canonical identities were used to resolve nicknames and spelling variations. One omitted contact stays blank. The private revision-guarded intake and repeat readback preserve all 54 people, SG32/KL20/PG4 memberships and existing history. Real names/background are not committed.

Batch-junior descriptions express intake-cohort distance from the owner: two batches means two intakes after his, three means three after his. They do not assert current study year or age. The owner explicitly reports no one-batch university junior in this intake. Unspecified universities and cohort gaps remain unspecified; school-specific juniors retain their supplied school context. Month/year meeting notes keep month-level precision. No automatic relationship edges, new people, membership changes or follow-ups are generated.

Validation: existing contact-input and PostgreSQL privacy tests now cover field bounds, blank defaults and legacy omission. A removed fictional-contact browser preview verified origin search, profile display and edit/save while retaining separate conversation notes. Build/typecheck and changed-file lint/format pass. Rollback removes the UI while retaining the private additive field/data.

## People identity and testimonial sources (SPR-205)

The private Invite List is labelled **People**. A profile displays the registration name first, then the owner-confirmed testimonial name, then its invite nickname. `invite_name`, `registration_name` and `testimonial_name` preserve the original sources, with non-primary names shown as aliases and searchable. Owner edits change the invite nickname; source names are not form-writable.

`primary_email` comes only from the linked registration person, with the legacy `email` column mirrored for attendance compatibility. `email2` holds the testimonial email, including when it happens to equal primary. Both are visibly labelled and read-only in the person editor. A testimonial-only profile has no primary email until a separately verified registration link exists. These records do not grant sign-in, attach an auth account, assign membership tiers, or create a newsletter subscription. This sprint enriches the current cohort; it does not introduce automatic future signup-to-contact reconciliation.

Migration `20261113172107_ai_people_source_identity.sql` is applied and recorded. Additive source fields and the owner-scoped `ai_business_testimonial_links` table preserve provenance; one testimonial row can link to only one contact per owner. Composite foreign keys, browser-denied grants/RLS and the existing sole-owner/same-origin/revision checks remain. Strict input rejects source-field injection; old forms cannot overwrite source names or primary email. Source completion tokens and testimonial bodies are not sent to the People client.

Owner confirmed all 22 reviewed matches. The backed-up, revision-guarded private import enriched those exact existing identities and added 28 testimonial-only people, including eight incomplete profiles. Excluded the owner self-entry and two placeholder records. Two submissions from one new person link to a single profile without deleting either original. Verified **82 unique people, 13 primary emails, 38 secondary emails, 50 linked testimonial people / 51 source rows**. Repeating the import changes zero rows. Existing SG32/KL20/PG4 tags, 53 connection-origin notes, 13 phones, 17 invitations and 18 attendance links are preserved; all 28 new people have no location. No event attendance is inferred from a testimonial. Names/emails and the private intake script are not committed.

The Locations to label shortcut selects Not set and clears other filters; existing region checkboxes remain multi-select. Profile details show incomplete testimonial status. Validation covers database precedence/mirrored email constraints, source uniqueness, cross-owner links, denied browser roles, input injection, aliases and precedence. A removed fictional-data browser preview checked source labels, read-only fields, secondary-email search, the location shortcut and 390/768/1280px layouts.

Rollback: prefer rolling forward. UI-only rollback retains additive fields/links and can still read mirrored legacy names/emails. Older editors cannot change names that conflict with source precedence; remove those source constraints only as a separately reviewed compatibility migration. Restore a mistaken source match from the local private backup using exact IDs and revision checks, retaining original testimonials and attendance. Do not drop the source columns or links.
