# Admin Push notifications

Settings → Push notifications enables only the current browser/install. There is no permission prompt on load. iPhone/iPad users must open the home-screen app (iOS/iPadOS16.4+), turn on the switch, and allow the native prompt. Denied permission requires OS/browser settings; the site cannot override it. Test sends a real Web Push to that registered device; acceptance by the push service is not confirmation the handset displayed it. Focus mode, OS permissions and offline delivery can delay/prevent display. Disable revokes server registration before browser unsubscribe.

## Ready alerts

Production Vercel cron `/api/cron/admin-push` runs every minute (routine checks every five minutes), protected with the existing CRON_SECRET and a Production environment gate; HEAD cannot run it. It independently verifies the immutable owner and privileged stored role, then skips EMDEE entirely if no devices are enabled. It does not generate briefs or alter the existing ChatGPT schedules.

Only today's canonical Morning/Evening and previous complete Singapore week's summary paths are read. Full Notes must contain a substantial H3-formatted record and have a valid saved timestamp at/after the device's opt-in. Existing older entries do not flood a new device. This signals a saved record, including a provisional evening record; it does not assert user approval, completion of proposed work or scheduler provenance.

A unique per-device/document delivery row reserves work atomically. Successful sends are not repeated on source edits. Failed/abandoned sends have a ten-minute lease and at most three attempts. Transport acceptance followed by a process/database failure can be ambiguous; stable notification tags replace duplicate visible notifications where supported. This is bounded at-least-once retry behavior, not an exactly-once delivery promise. Notifications expire after one hour at the push service. Entries unavailable before their date rolls over may require manual reading.

## Security and configuration

- Subscription endpoints and encryption keys are encrypted with DAILY_INTEGRATION_KEY. Store tables are RLS-enabled and revoked from PUBLIC/anon/authenticated; only service_role can use them and the claim function. Access uses immutable owner ID plus stored role, never an email.
- Owner session and same-origin JSON requests are required for registration/status/test/disable/timetable sync, only on the Admin host in production. Test uses a durable one-minute throttle. Maximum ten active devices.
- Sender endpoints are HTTPS with no credentials/custom ports/fragments, restricted to the supported Apple/Google/Mozilla/Windows push-service hosts. Decrypted records are revalidated before outbound network requests. Redirects are not followed by the transport.
- ADMIN_PUSH_PUBLIC_KEY and ADMIN_PUSH_PRIVATE_KEY are independent VAPID keys. Private key is a Vercel Production Secret. Separate local keys are gitignored. Preserve signing keys; rotation requires subscriptions to be refreshed.
- CRON_SECRET already protects scheduled jobs. No OpenAI inference/provider usage. The legacy weekly API-generation cron stays gated off as before.
- Push payloads contain generic routine/focus titles and Admin route targets, never Markdown/private task content. Worker click URLs are restricted to same-origin Today, weekly reflection, Settings or the five scheduled spaces. All destination pages still require owner sign-in.
- No offline private cache, background sync or queued writes. No change to fcOS.

## Operations

Settings shows current device state and warns when the saved-routine monitor reports an EMDEE connection/check failure. An expired EMDEE credential needs reauthorization through Today → Connections. Browser-expired endpoints (404/410) are disabled; enabling again replaces the browser subscription. Per-device endpoint capability URLs must never be logged or committed.

Migration:20261024072128_admin_push_subscriptions.sql. Revoke/drop only these new tables/function for a rollback, without modifying existing daily/member data; dropping subscription records requires device re-enrollment. Disable the new cron before rollback. Verify migration history, RLS/grants, policy/model/worker/SQL tests, production build/typecheck and live unauthorized routes. Actual phone delivery requires the owner to opt in and use Send test notification on that phone.

References: [WebKit home-screen push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Next PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [web-push transport](https://github.com/web-push-libs/web-push).

## Focus transition alerts (SPR-163)

The one-minute Vercel cron runs focus checks independently of EMDEE. Routine readiness is still checked on five-minute boundaries. Focus uses the same Asia/Singapore resolver as on-screen switching; it sends one `Time for <space>` notification at actual destination changes, including returns to Overview, but skips unchanged midnight gaps. Manual navigation does not itself notify. Auto switching paused means no focus push, without disabling routine push.

Each opted-in device stores a server mirror of its validated timetable in the existing private subscription row. A fresh installed app syncs its current per-device preferences; Settings changes sync serially and retry on focus/online. Sync errors surface beside the timetable. Existing devices use the agreed default timetable until reopened; no subscription or permission is recreated. The additive migration preserves encrypted endpoints, grants and RLS. Same-owner same-origin API validates allowlisted spaces/nonoverlapping minute ranges, and does not enable a disabled device. An unchanged config hash is a no-op, preserving eligibility at boundaries.

Only transitions within the previous five minutes and after opt-in/config activation are eligible. Existing durable claims deduplicate concurrent cron invocations; focus deliveries use `focus:<dated-block-key>` instead of a document path. Delivery rechecks device enabled/config hash and uses a 60-second TTL bounded by block end. This is best-effort push, not an exact alarm or a guarantee of handset display. No old reminders are replayed after an outage. Existing ten-minute retry lease means failed focus deliveries expire out of the five-minute window; routine retry behavior remains unchanged. A failed send or claim reports cron failure; other independent checks still execute.

The worker only displays approved titles, generic text and allowlisted Admin destinations. No routine body is included. Custom notification audio is not exposed by the web Notifications API; Android/Vivo sound/category settings control it. Long-press a received notification → Settings to find the actual app/browser channel; labels and custom-sound availability vary by firmware. No audio file picker or autoplay workaround is added.

Validation includes Singapore boundary, pause, activation time, no stale catch-up, no-op config sync, owner-first dispatch, concurrent dedupe, worker routing and private SQL permissions. Actual Vivo delivery of the new scheduled alert still requires observing a future boundary on the handset; prior routine delivery was user-confirmed.

## Confirmed event signup alerts

The existing production-only, bearer-protected one-minute cron independently runs checkEventPush alongside focus/routine checks. It reads confirmed event_registrations only; abandoned/pending checkouts and cancelled tickets do not alert. Both paid/free confirmations qualify. The registration path need not wait for a push service or email: saved confirmation is the source.

Initial cutoff is the owner's request time,2026-11-11T12:48:30Z. Device enabled_at and a rolling seven-day lookback additionally bound eligibility; do not replay earlier tickets or alerts from before opt-in/re-enable. Server verifies configured stable owner/privileged role and selects only enabled owner devices (maximum10). Ticket reads exclude contacts and are capped at1000per seven-day window; overflow is an explicit failure, not silent partial success. Each device can claim20pending notices per run, continuing at the next minute.

Existing private admin_push_deliveries/claim_admin_push provide per-device/ticket idempotency, concurrent leases and at most3attempts with10minute retry spacing. Sent receipts are skipped; transport acceptance with a failed receipt can be retried with the same hashed notification tag. Delivery remains best effort, not guaranteed exactly once; normal notifications use the existing1hour push TTL. Failures in one device do not stop others. Existing push opt-out, encrypted subscriptions and expired-device handling remain. No new credentials, tables, RLS changes, provider API inference or third-party account access.

Lock-screen text is a fixed New event registration confirmed / Open registrations in Whatelz Admin. No name, email, phone, payment amount or raw ticket ID in notification data; tags use a one-way hash. Click opens the allowlisted /event-checkin. Old installed workers may show the generic title/fallback URL until updated: reopen Admin once after deployment to pick up the new worker. Device/browser permission and phone OS policy still govern actual display.

Tests cover cutoff/opt-in/status/future dates, generic payload, lease declines/concurrency, sent receipts, exhausted retries, failed-send receipts, batch bounds, actual existing SQL privacy/lease rules and service-worker event title/click handling. Do not create fake real event bookings or send unsolicited signup notifications for QA. Native receipt of a future genuine signup is the final phone check.
