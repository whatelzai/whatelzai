# weOS roles and context authorization

The Whatelz community’s explicit active role is the app-access approval. It is separate from FC personas, sponsor placement, event ticket classification and Poti. Display names are Beacon, Blaze, Torch, Ember and Guest. Only the configured owner is Beacon in application code; SQL additionally requires the approved Beacon membership and protected superadmin identity. Torch requires the linked person’s recorded ABO status; an unverified ABO record falls back to Ember. Names, user-editable JWT metadata, event payment and a preview cookie never grant membership.

Existing verified account-to-person links are still required. Role rows on Baobei profiles prepare the approved membership but do not create or claim a login account. Public onboarding and account claiming are separate work. Stored Guest contacts and public registrations do not activate app access.

## Boundaries

Beacon retains full owner administration. Blaze may enter the dedicated community area only; old owner-only pages, APIs, AI Business, Personal, Day Job and credentials remain owner-only. The first community entry links the directory/events/resources; full delegated management tools are not implemented by this role foundation.

Torch has permitted business tools. Ember is the AI-learning experience: Home, Chat, published AI learning, permitted events and Profile. It has no Baobeis, internal HQH/HHH, sponsor tree, business catalogue/culture or internal context skills. Guests can use the public site only. Permission checks run in routes, server readers and model tool dispatch, not only in menus or prompts.

## Database enforcement

`20261118120326_weos_role_context_policy` adds a non-exposed `weos_private` schema. Its security-definer functions deliberately implement scoped projections over private tables: identity comes from `auth.uid()`, role from protected stored membership, and no actor/role parameter is accepted. All functions have empty search paths and explicit grants. The public wrapper is security-invoker and executable by authenticated users only. Anonymous and service-role execution is revoked. No privileged provider credential is returned.

`databaseContext` uses the Supabase SSR **member JWT**, not `supabaseAdmin`. SQL rejects Guests and rejects internal sources for Ember before selecting them. Profiles/notes retain existing ownership/team/hidden rules for ordinary business roles; Beacon has the explicitly approved full oversight. Only allowlisted metadata leaves SQL. Retrieval limits and dated history coverage remain explicit. Discovery uses a permitted name index and own dated cohorts, not priority guesses. The second migration preserves duplicate-full-name ambiguity instead of selecting an arbitrary person.

RLS and column grants allow authenticated reads of only published permitted knowledge. AI learning is a separate collection kind; it is not a reclassification of business culture or private notes. There is currently no invented AI curriculum or automatic publication. Internal business base tables remain denied to browser roles and are accessed by the restricted context function, not by broad authenticated table grants.

RLS on member conversations/messages permits own rows to business roles, own learning conversations to Ember, and all rows to Beacon. The third migration assigns conversation scopes from protected membership on insertion. A business-role reply permanently promotes a learning conversation to business scope; after downgrade, Ember cannot load or reuse it. Existing histories default to business. Normal history reads use the member JWT; user-message writes recheck the stored role in SQL, including the service reservation path. Blaze, Torch and Ember cannot read other users’ chats. The owner explicitly approved Beacon review for future app-improvement analysis. Chat discloses this oversight; “private” must not imply hidden from Beacon. The Beacon-only read-only review pages use the authenticated client so RLS applies. Normal Chat still loads only its user’s conversation; cross-member chats are not automatically AI context. No analysis job, external export, provider call or message send is introduced by review.

## View as

Beacon’s app Profile has View weOS as: Beacon/Blaze/Torch/Ember. Admin Profile links to it. An owner-only same-origin app endpoint sets a one-hour HttpOnly, SameSite-strict cookie. Non-owner cookies are ignored; Guest/admin strings are invalid choices. Proxy rewrites preview navigation to an explicit read-only role surface with the same role-aware navigation; it never loads another account or the owner’s private business records. API/data reads, writes and Chat generation are unavailable in preview. Selecting Beacon exits preview via full reload. This previews role layouts/capabilities and empty states, not another person’s actual data or a fully activated test account.

## Verification and rollback

Tests exercise real PostgreSQL roles/RLS and SQL context branches in PGlite, including anonymous denial, private chat ownership, Beacon oversight, Ember business denial, hidden/private profile/note boundaries, metadata allowlisting and duplicate names. Model tests inject forbidden tools/sources and verify callbacks never execute. Stored-role tests verify stable account links and the ABO gate. Existing HQH/sharing/domain regressions remain.

Migrations were dry-run/applied from an isolated CLI workspace matching remote history. Three unrelated legacy migrations were omitted only from the temporary workspace; production migration history and repository originals were not repaired/deleted. `supabase db lint --linked --schema weos_private` checks actual schema references.

Revert code to disable the interface if necessary. Preserve all contacts, conversations, assignments and migration history. Revoke authenticated execution of the new RPC and/or authenticated chat SELECT grants if the feature must be disabled; this fails closed without deleting data. Old Whatelz role rows are retained as history but hidden from current role choices; FC definitions are unchanged. Role reassignment requires explicit owner direction, not inferred Poti or personal relationships.
