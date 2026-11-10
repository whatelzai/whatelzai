# On-site registration and verified account history

Status: implementation for PR221; not activated in production. Existing S$7 Payment Link remains the live entry point. EVENT_PLATFORM_REGISTRATION_ENABLED defaults false.

## Product behavior

November12 only: first-party form collects name, phone, email and optional promotion code. Contact records and pending registrations live in the existing Supabase database. Free codes are validated in Whatelz, never sent to Stripe; the free ticket and QR email are issued directly. Paid registrations reserve a seat, then create a S$7 hosted Checkout Session containing only the opaque registration reference, event marker and payment configuration. No attendee name, phone or promo is supplied to Stripe. The registration email is provided to prefill payment, as subsequently requested by the organizer. Stripe independently collects payment/billing information required by the payment method, including its hosted Checkout email. This minimizes disclosure; it does not claim Stripe receives no personal information.

Resend receives the recipient email and event/QR content only, without attendee name or phone. No mailing-list subscription or marketing consent is inferred. Supabase, Stripe and Resend remain third-party processors; putting a form on our domain does not remove them.

## Identity and FC stages

Use existing community_calendar_memberships, not a second tier system. Guest means not yet an FC member; Spark means paid FC membership (user cited RM99), with no ABO account yet; Catalyst means already has an ABO account. Existing Oracle handling remains unchanged. No purchases, event attendance, name matching or anonymous email submission upgrade membership, grant a role, assign a tree, merge accounts or create a login identity. Owner manages FC categories through /admin/calendar-access. Named examples from chat are not bulk-imported or published in source.

A confirmed registration prepares a prospective event_people record. /account/events requires a server-verified, confirmed Supabase Auth email and only links event history for that email to stable users.id. It shows existing FC category or Guest by default and the person's own tickets. Initial account creation/sign-in remains the established verified auth flow. App assignment/administration/ABO privileges remain separate. Legacy event email storage is normalized to lowercase for this match.

## Integrity

Server-only tables have RLS and all browser grants revoked. Invoker RPCs are service-role only with fixed search_path. Reservation and ticket confirmation serialize on an event advisory lock; confirmed legacy tickets plus held reservations share20seats. Unique request hashes deduplicate submissions; paid session IDs and signup-attempt IDs deduplicate tickets. Unpaid, incomplete, wrong-amount, wrong-currency and mismatched-reference payments never confirm a ticket. Required inputs are validated, requests require same-origin, a honeypot and in-memory/durable request limits. Rate-limit records retain a daily IP hash rather than raw IP and remove old buckets after7days. Codes are stored as hashes with event-only expiry and max-use limits. Confirmation returns no QR/ticket ID to an unverified form submitter; the ticket goes to the submitted inbox.

Checkout expiry is deterministic from the saved reservation timestamp (one hour), preserving Stripe idempotency on retries. Paid holds release on signed expiry or asynchronous-failure events, never merely on local time: this prevents delayed successful payments from losing their seat. Transient checkout creation errors retain the reservation so the same token can retry without duplicating a session. An abandoned request that never successfully created/linked a session can require organizer recovery; do not silently release an unknown Stripe session. Free-email failures retry against the same ticket and provider idempotency key. The pre-existing provider24h crash-gap limitation remains.

## Applied database work and verification

Targeted migration20261110054914_platform_event_registration was applied to linked project tnjujbkpepchhgyqwmtb and its migration history recorded. No unrelated drift migrations applied. Rolled-back SQL verification covers public grants, code exhaustion, duplicate email/request, session binding, one ticket on retries, no unverified auth link, shared20seat cap and rate limit. No QA attendee/contact records remain. Supabase security advisors reported no findings for the new objects; unrelated existing findings were not changed. Twelve commerce/parser/privacy/theme tests, TypeScript, focused lint and production build passed before final UI review.

## Activation checklist

1. Review and merge the exact PR after final checks. Initially deploy with feature flag off.
2. Replace the existing read-only production Stripe restricted key with Checkout Sessions read/write and preserve Payment Intents read. Keep secrets in sensitive Vercel storage. Do not expand other Stripe access. Current key cannot create or expire sessions.
3. Subscribe existing signed webhook endpoint to checkout.session.expired as well as the existing completion/async/refund events. Seed the private first-time code's hash (done; no plaintext in Git).
4. Disable both legacy November12 Payment Links and cap each to its completed count. Use owner-only Registration cutover action at /admin/event-checkin to expire their remaining open sessions with the new server key. Verify all completed legacy orders have a registration/ticket before opening first-party inventory. Keep legacy fulfilment exact-ID allowlist for retries.
5. Enable EVENT_PLATFORM_REGISTRATION_ENABLED in production, redeploy, and test with the owner's test account: free confirmation/inbox/QR, paid checkout total, verified account history, owner scanner and duplicate check-in. Do not complete a real paid order without explicit spending authorization. Do not claim this flow was fully tested before this release QA.

Book prices/checkouts and historical sessions are unchanged.

## Apply-code interaction and payment freeze

Promo entry has an explicit Apply button. Validation reveals Free/S$0 and Confirm registration; invalid or unapplied codes leave S$7 and Proceed to payment. Submission revalidates the code under the inventory lock, so stale validation never silently becomes a charge. Successful free registration sends the QR email directly, with no Stripe session.

Paid checkouts save payment_started_at and a three-minute lock. The return page polls only Whatelz's registration status; signed Stripe webhooks can confirm earlier. At three minutes, a manual Check payment status action verifies the existing Stripe session. If still open it offers Resume the same payment. The three-minute timer does not expire or replace the original checkout. Duplicate tokens and different-token requests for the same pending email cannot create a second checkout. A first-party HttpOnly, SameSite=Lax cookie restores the waiting screen after redirect or reload, including when sessionStorage is unavailable. No contact fields or ticket bearer token are placed in return URLs.

Anonymous /account/events redirects to sign-in. Existing FC persona, auth redirect and domain routing regression tests pass (18). The new signup/payment/privacy tests and existing commerce/theme tests pass (12). Final live paid/free purchase and email delivery still require the reviewed production rollout and new key permission.

Browser verified Apply with the real private code (Free/S$0 + Confirm registration) and an invalid code (S$7 + Proceed to payment), without creating an attendee, consuming a code use, sending email or opening Stripe. Data-use disclosure is expandable to keep the action close to the price. Paid waiting/callback and verified account history need release QA after the restricted key is installed.

The event detail page now includes the existing November12 S$7 poster, preserving The Vibe and full address. CTA text is Register. Owner authorized PR221 merge/deployment; first-party registration remains off until the credential/cutover checklist is complete.

Organizer subsequently requested payment prefill. Paid Checkout Sessions now receive customer_email from the first-party registration to avoid re-entry. Name and phone are still omitted; free registrations still bypass Stripe. This explicitly supersedes the earlier no-email-forwarding decision. UI data-use disclosure and privacy tests updated.
