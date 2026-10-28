# Personal daily tools

Owner-only `/personal/tools` sits under Personal, not the business Home. Five lazy panels: payday, meditation, training, one-minute teaching practice, and Singapore-week evidence. No inference, bank integration, medical programme, recordings, new schedules or EMDEE write-back.

## Persistence and boundaries

`personal_tool_records` stores typed bounded JSON records with owner/kind/date indexes, RLS and no browser grants. Service-only invoker `personal_tool_save` supports idempotent retries and optimistic revisions. Source salary IDs uniquely identify allocations per owner; save derives amount and configured account/percentage mapping on the server. API accepts only canonical Admin (plus non-production localhost), stored sole-owner role, same-origin JSON and bounded bodies. All responses are no-store. No private localStorage or offline cache.

Read 90 days of sessions plus all routines in 500-row pages; weekly evidence uses only current Singapore Monday–Sunday records and separate-currency ledger expenses less refunds. Salary picker caps at latest 24 active SGD Working income entries. No assumption of activity before tracking began, and no model-generated weekly narrative competing with existing EMDEE closeouts.

## Payday

Expected arrival 27–28 is guidance, not confirmed receipt or a new reminder. Choose an actual recorded salary, manually review tax (including partial salaries), use integer largest-remainder allocation against the saved six-jar plan. Checkbox confirmations record actions the owner already performed. No bank operations or duplicate ledger transfers. Existing allocation loaded for the receipt; edits use revision guards. Zero tax is permitted explicitly; tax cannot consume the entire receipt. Account planned flags remain visible.

## Sessions

Meditation presets 3/5/10/20 minutes. Teaching is 60 seconds with optional topic/reflection. Wall-clock timestamps catch up after background suspension; pausing banks elapsed time. Finish & save persists the actual bounded duration even if ending early. No claim of guaranteed screen-lock alarm/audio. In-progress timers/forms are memory-only, with leave warning; save before closing. Gym supports user-named workouts, per-set exercise/reps/kg, date, note, prior matching session, user-authored routines and rest timer. No fabricated routine or personal achievement seeded.

## Release

Migration: `20261028121901_personal_tools.sql`. Production execution was blocked by automatic approval review pending explicit approval of the migration/release. Do not claim applied or deployed until verified. No existing user records changed by tests.

## Greyscale viewing

Edmund frequently uses greyscale on his phone. Colour is supplementary: each destination has a different icon and short label; selected tools/presets have an inset outline and stronger weight; checklists use native checked shapes; timers show digits and explicit state text. Preserve these distinctions without depending on hue. Mobile first, desktop friendly.
