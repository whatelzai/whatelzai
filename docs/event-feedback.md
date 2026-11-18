# Versioned event feedback

Share `/events/feedback/ELZ-EVT-0004` for November 12. This fixed link stays attached to its occurrence. The approved form has ten questions: three Yes/No, six 1–5 ratings and optional comments. Source configuration: `content/event-feedback/feedback-v3-20261118.json`. The public page renders validated database configuration, not a question list in JSX. No character cap, maxLength or counter is imposed on comments; the transport uses the hosting platform’s normal request limits rather than the former 8KB application cap. Small verification requests remain bounded.

## Registered-email verification

Visitors enter their own email; no attendee list or dropdown is provided. Only a confirmed registration for this exact event can receive a six-digit code and verify. Addresses are trimmed/lowercased without alias/dot rewriting. The response is generic for registered and unregistered addresses. The existing Resend sender receives only the destination email, code and public event title/date, with an idempotency key; no attendee name, phone, answers or contact list is sent. Delivery runs after the response; provider failures log a generic error without credentials/code/identity. Existing RESEND_API_KEY and EVENT_CONFIRMATION_FROM are reused.

Codes expire after ten minutes, allow five guesses and are stored only as HMAC hashes. Persistent limits are three code requests/hour/address, a sixty-second resend gap and twenty/hour/client, plus existing in-process rate checks. Unknown addresses get a non-verifiable challenge so response structure never reveals registration. Successful verification creates a random event-bound proof valid for thirty minutes; the raw proof stays in browser memory and never in URLs/localStorage. Expired verification preserves typed answers and requests re-verification. It creates no sign-in account, membership or newsletter consent.

Submission requires current confirmed registration, an ended/non-cancelled published event, proof, pinned form ID and the complete typed answer set. DB locks serialize proof/email/request writes; one response per event/email and registration, repeat-safe request UUID retries and conflict detection prevent duplicates/overwrites. False is a valid No. No public reading endpoint exists.

## Versions and history

Private `event_feedback_forms` contains immutable version IDs and question definitions. Private `event_feedback_form_bindings` pins each occurrence. Never edit an old version/binding to change future questions. Create a new JSON configuration/version, review it, insert it and bind only new events. Existing event links keep their pinned version. `summary_question_id` identifies the overall rating for legacy summary compatibility rather than hardcoding a particular question in the renderer.

Each response stores `form_id`, the verified registration reference and a `question_answers` snapshot of each question ID, text, type, scale anchors and answer. Owner review renders these snapshots, not today’s question configuration. Earlier anonymous rating/comments retain the original two questions and no guessed attendee identity. A compatibility trigger snapshots any original-form submissions arriving during the review/deployment window. The new public API rejects old anonymous payloads. Release-phase migration 20261118100100 revokes the legacy writer after the replacement API is deployed, so older immutable deployments cannot bypass verification. Browser roles cannot execute either writer directly.

Migrations: 20261118090000 adds forms/bindings/proofs/versioned writer; 20261118090100 kept the live original form working during owner review; 20261118100000 adds text answers, preserves legacy snapshots and inserts the approved v3. The last migration only repoints the never-deployed v2 draft bindings after asserting no v2 responses exist, preserving both version records. Immutable binding checks remain enabled. Schema migrations applied via isolated CLI dry-run/apply; the final writer revocation is applied only after the replacement production API is live. unrelated remote migration history is matched in that temporary workspace, never repaired or overwritten.

## Review and verification

Admin event Feedback tools show the fixed share link, count and latest 100 responses with all original question/answer pairs. Earlier anonymous entries are labelled separately; new responses are linked to verified registrations. Owner guard runs before database reads. User text is escaped by React; long comments have a scrollable review region. Feedback does not prove check-in or grant app access.

Form and thank-you page retain the next weekly and AMI recommendations, maximum two cards. No invitations are sent automatically by this release.

Tests cover exact approved config, ten-question cap, optional/unbounded comments (20,000 characters round-trip), HTTP/body/schema privacy, no email enumeration, unknown/wrong/expired codes, guess/rate limits, cancellation, pinned versions/snapshots, immutable history, duplicate/conflicting submissions and browser-denied reads/writes. Browser review covers radio controls/progress, phone width without overflow, comments without maxlength and unregistered-email rejection without sending email.

Rollback feature code if necessary; preserve forms, bindings, proofs and real feedback. Never delete real responses or weaken public identity checks to repair delivery. — codex,2026-11-18
