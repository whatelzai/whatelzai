# Team Baobeis and HQH/HHH

Edmund explicitly changed the default on 2026-10-27: assigned members of the same fcOS team can read one another’s Baobeis and saved HQH/HHH. This supersedes the private-by-default rules in SPR-130/132/146. Anonymous visitors, signed-in unassigned accounts and members of other teams cannot read them. Chats and vaults remain private.

`member_leads.visibility` and `member_briefings.visibility` are `team` by default for existing and future records. Owners choose **Only me · Hidden** in a Baobei’s Edit profile controls or a note’s editor. This is a global record-level hide, including Chat and photos; recipient grants cannot override it. Existing explicit lead `none`/`selected` exclusions and revoked note recipients remain respected. A saved draft is visible if set to team; unsaved form/Chat drafts are not notes.

Service-only `can_read_member_lead`, `can_read_member_briefing`, `shared_member_lead_ids` and `shared_member_briefing_ids` enforce same-team membership and current exclusions. Existing RLS and browser grants remain denied. All mutations still derive their owner from the verified session and use revision guards. Read access does not grant edit rights, change sponsor placement or transfer ownership.

A team note is readable only if **every linked Baobei is readable** to its viewer. Hiding a profile therefore also removes its linked notes from team lists, context panels and Chat. The note author can always read their own note. Creating/editing notes may link any currently readable team Baobei; the database trigger rechecks this at save. Ownership remains the writer’s, while a Baobei may have a different caretaker/introducer.

Team profile projection includes story, interests, concerns, photos, next steps and activity dates/statuses. Contacts, private remarks (`notes`), raw activity notes and arbitrary profile metadata are not added to other members’ projection. HQH/HHH content is the explicitly team-readable briefing projection. No private conversation messages or credentials enter these queries.

Chat profile lookup includes up to two recent permitted linked notes per matching Baobei, with bounded excerpts and coverage text. Briefing title search also includes permitted team notes. It still drafts text only; saving notes/profile changes remains an explicit editor action.

Team lists show up to 50 profiles from the first 500 permitted IDs; notebook and linked queries likewise cap the permitted ID set at 500. These are current pilot bounds, not unlimited/semantic search. Future scale should move filtering/pagination into a scoped RPC before raising them. No shared data is cached offline.

The six sideline cases requested by Edmund are imported operationally into his immutable account, with the original introducer’s team-person ID/name stored as database metadata and visible story context. No names, real account IDs or personal notes belong in migrations or test fixtures. No fictional user accounts, FC memberships, event dates or sponsor links are created.

Validation: `node --import tsx --test scripts/team-visibility-sql.test.mjs scripts/lead-access.test.ts scripts/member-ai-boundaries.test.ts scripts/fcos.test.ts`, typecheck, build, lint and mobile checks. SQL coverage includes new/existing defaults, hidden profiles/notes, recipient exclusions, linked-note suppression, same-team versus unassigned/cross-team users, revoked team assignment and anonymous/authenticated RPC denial.
