# Activated-member Chat and credit resets

A registered, tree-assigned fcOS user is eligible for AI Chat. Enrollment is lazy
on Chat access and backfilled for existing activated users by migration; neither
step creates an allowance cycle, erases history or invokes a provider. Existing
models remain; new members use the existing economical model default. The global
MEMBER_AI_ENABLED switch remains in charge of provider availability. Platform
credentials remain server-only and owned by the configured administrator; member
context uses only that member's permitted records and optional vault connection.

Owner Users → Manage AI credits & resets shows all activated members and current
remaining, spent and reserved allowance. Choose selected members or All activated,
then a full US$1 or half US$0.50 reset. Review names, amount per person and total
before confirming. A reset starts a new period with that amount available. It is
not a top-up: old unused balance is not added. The ordinary US$1 seven-day baseline
returns seven days after the reset, on the new window anchor. Old cycles, costs, pending/uncertain
reservations, conversations and administrator audit records stay intact. Late
settlement always charges its original cycle.

The owner-gated action validates a bounded unique target set (1–1000). The SQL
function rechecks assignment and signed-in account mappings, compares the reviewed
all-member roster when applicable, locks accounts in ID order and compares every
current-cycle pointer. One stale/invalid target rolls back the whole transaction.
A duplicate submit with old cycle IDs cannot grant twice. Unknown transport outcomes
must be read back before a new reviewed reset; no automatic retry is performed.
No recipient, grant amount or actor identity comes from model output.

The old full-reset SQL signature delegates to the new function for compatibility.
Only service_role can execute enrollment or reset functions. The application
independently enforces the configured sole-owner policy; stored role alone is not
sufficient to invoke admin actions. Browser database grants/RLS remain unchanged.

## Migration and validation

Apply 20261022053000_activated_chat_resets.sql followed by 20261022053300_fcos_weekly_allowance.sql before publishing application code.
The migration adds service-only functions, updates the legacy reset wrapper and
rechecks activation in the existing reservation function. Backfill activates normal
Chat enrollment but does not issue resets or change current cycles. Record the
migration atomically in supabase_migrations.schema_migrations. Verify existing
cycle pointers/spend and function execute permissions after applying it.

Local SQL tests cover enrollment, denied unassigned accounts, full/half amounts,
unchanged seven-day baseline, stale/replayed and partial bulk failure, late request
settlement, retained audit/history and browser execute denial. Application tests
cover activated non-owner access, owner-only reset actions and strict target input.
Live verification opens the owner controls and cancels reviewed examples; do not
issue real resets as tests or spend API credits without a user request.

Rollback deploys the prior app and restores prior function definitions from the
previous migration; keep all cycles/audit rows. If revoking expanded Chat access,
restore the old owner-only server gate as well. Never delete new credit history
or change credentials to roll back this feature.

## Member-owned reset credits (SPR-153)

Each existing and future application user receives one lifetime full-reset credit,
with a seven-day expiry from its grant time (SPR-154). This is an available credit, not an automatic allowance reset or
new Chat access. The users insert trigger and unique user constraint prevent
repeat grants on sign-in/upsert. Profile → Usage shows Available and History links.
Percentages are rounded to whole numbers and the countdown rounds up to minutes.

The assigned-session server action accepts only credit ID and reviewed current
cycle pointer; the account ID always comes from the verified session. Service-only
`use_member_reset_credit` rechecks activation, locks the access row and then the
owned credit, rejects stale cycle pointers or outstanding current reservations,
and creates one USD1 seven-day member-reset cycle atomically with marking the
credit used. Replay returns the original recorded cycle without another grant.
Old usage, cycles and late settlement accounting remain intact. New baseline,
provider enrollment and admin-reset behavior are unchanged. No API invocation.

Apply `20261022095557_member_reset_credits.sql` before shipping. The table has RLS
and no browser grants; both functions are security invoker and service-only.
Rollback may deploy the old UI while retaining the credit ledger and used cycles;
never reissue used credits or delete their audit trail. Tests live in
`scripts/member-reset-credits-sql.test.mjs` and `scripts/profile-usage.test.ts`.

## Stored reset expiry (SPR-154)

`expires_at` is non-null and defaults to seven days after the grant. The migration
backfills existing credits from their original `granted_at` without new credits,
renewal extensions or changes to consumption. Available excludes expired unused
credits; History retains expired and used records. Expiry is shown in Singapore
time. Redemption checks the stored expiry against database wall-clock time after
locking the credit, so a stale page or delayed lock cannot redeem an expired one.
Already-used credits still return their recorded result on replay, preserving
idempotency. Apply `20261022100901_member_reset_credit_expiry.sql` before publishing.
