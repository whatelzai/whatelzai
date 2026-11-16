# Short event feedback

Share `/events/feedback/ELZ-EVT-0004` for November12. The ID is fixed to that occurrence; it never advances with `/events/next`. Each listed real event has its own link; source UUID/slug aliases resolve to the stable event marker. `/events/feedback` is only a convenience redirect to the latest completed weekly event. Always send the occurrence-specific URL.

One required1–5 usefulness rating and one optional comment (1500characters). No name, email, login, ticket or membership required. Public links do not verify attendance; counts are feedback responses, not verified attendees. No automatic testimonial publication, identity matching or emails. Both the form and thank-you page show one next-weekly card and one AI Money Intensive planning card. The latter has no invented date, price or registration. Owner explicitly authorized this AMI teaser here, superseding the earlier no-public-AMI rule only for feedback recommendations.

Feedback opens after the occurrence ends in Singapore. Unlisted, unpublished and future events cannot accept responses. The form keeps answers after failure and sends the same random request UUID on retry. Database conflicts protect already-stored answers; double submissions return success without duplicate rows. Refreshing creates a new response; there is no verified-person deduplication claim.

Private event_feedback table references the canonical events UUID. Browser roles have no grants or RLS policies; service role alone can read/write through server code. The submission RPC is SECURITY INVOKER, service-only and uses advisory locks for request idempotency and a persistent20/hour rate cap. A daily HMAC of the request IP supports limiting; raw IP/name/email are not stored in responses. Same-origin JSON POST, body bounds, honeypot, in-process limiting and strict field validation precede writing. No public response-reading API exists.

Admin AI Business → Events → occurrence shows the fixed share link and latest100 private responses (total count shown). dailyOwner runs before the feedback query. Plain text comments are escaped by React. Errors remain explicit rather than becoming zero responses.

Migration20261116093000_event_feedback applied using an isolated Supabase CLI workspace: dry run showed only this additive migration. Three known unrelated legacy migrations were omitted only from that temporary workspace, without editing repository history. Supabase MCP SQL was unavailable; CLI retained existing account/project identity. Verified the actual table through the service client. Browser QA submitted a clearly synthetic response, confirmed the correct November12 UUID/rating4, then removed only that row; initial/final count0. No event registration, payment or email changes.

Tests include real PGlite constraint/permission/idempotency/conflict/rate checks, strict schema and stable occurrence/next selection checks. CUA reviewed1280/768/390layouts, light/dark, submission and thank-you cards. Uses the existing Taste event direction/palette/type; no standalone browser inspector because CUA owns browser control. Taste false-positive on offscreen honeypot height documented inline.

Rollback: revert feature code; preserve collected responses and migration. Do not drop the table or delete real feedback. Disable the submission route if intake needs pausing.

— codex,2026-11-16
