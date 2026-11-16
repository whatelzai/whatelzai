# Public event catalogue

The evergreen IG destination is `/events/next`; `/events` is the browseable hub. The redirect uses307 plus no-store and selects the nearest published, listed, future weekly session by start time. Sharing sessions and intensives never take over that link. No upcoming weekly session returns visitors to the hub. A failed catalogue read returns503 instead of pretending there are no events.

## Source and publication

The service-only events table supplies published training/workshop/talk rows. Draft, cancelled, duplicate and superseded rows are excluded. Existing browser-denied RLS remains in place. A safe projection selects approved public fields; it never serializes notes, arbitrary metadata, contacts, private poster_files, Stripe configuration or ticket capabilities.

Metadata fields: event_id (stable display/checkout marker), event_key (ticket occurrence), event_format (weekly/sharing/intensive), topic (ai/money/combined), public_visibility (listed/unlisted), public_path, public_poster, poster_width/height, starts_at/ends_at, public_venue/address/venue_url, public_description and public_content (heading, paragraphs, agenda, reminder). Intensives remain unlisted regardless of visibility. AMI has no public promotional section or scheduled occurrence in this release.

Use local `/images/events/` assets or approved public Supabase storage images. Private originals remain private. June28's authorized original poster is copied to a public repository asset; no attendee image or contact list is published. Approved June28/November12 content and publication flags were saved to the existing canonical records with a private pre-change backup. The duplicate June record stays unpublished. No schema migration is required.

## History and links

History includes every listed occurrence after its ending time, newest first. Date-only historical records roll over at the end of their Singapore date without displaying invented times. Attendance counts deduplicate canonical person IDs across checked-in confirmed tickets and historical check-ins. Errors or truncated reads produce unknown counts; capacity never becomes attendance.

Actual recorded history: June28, The VERSION of you that uses AI at SIT (5 attended); November12, Money Mindset × AI Skillset at The Vibe (13 attended). Previous static October22/29/November5 poster records had no corresponding actual event rows: their old ID/date URLs redirect to `/events#previous-sessions`, preserving navigation without unsupported attendance claims. Existing actual canonical paths and occurrence IDs are retained; aliases resolve to canonical pages and ambiguous dates fail closed.

## Registration and future weekly sessions

November19 stays S$8/30 places at The Vibe, with its existing enabled offer and Stripe price. No payment method changes or copied promo codes. Future AI Skillset or Money Mindset weekly sessions default to S$8 presentation, but registration requires a real enabled SGD event_signup_offers row matching the published price and a valid private metadata.stripe_price_id. Public pages never receive that Stripe field. Set matching stable event_id and event_key explicitly when preparing an offer.

Reservation, status and fulfillment resolve trusted server-side occurrence configuration. Client amounts/prices are never accepted. Exact session marker, stored event key, amount and session ID checks remain; email-only Stripe prefill, three-minute waiting UX and duplicate-safe inventory remain. Current November12/19 ticket details retain their established snapshots. Admin scanner/current-event tooling is independent and still explicitly current-event scoped.

No future event dates, AMI pricing or registrations are created automatically. Publishing real completed events makes the archive grow; publishing an upcoming weekly occurrence advances `/events/next` after the previous weekly start passes.

## Validation and design

37 focused tests cover history rollover, weekly/intensive selection, public projection, aliases, future checkout configuration, amount verification, occurrence inventory, QR and existing event operations. Local HTTP checks verify all three actual detail pages, open November19 signup,307 no-store redirect and retired aliases. CUA reviewed desktop1280, tablet768 and phone390 layouts, landscape/portrait posters and dark hub readability; no payment or ticket creation was performed.

Taste direction: loud-flat-poster, seed279135007, retaining the established cream/yellow palette, serif type and real event artwork. The user's consistency requirement takes precedence over the draw's unrelated stock photograph and saturated full-page ground. Shared layout preserves poster proportions, balanced titles, rounded controls and clear booking states. Browser screenshots replace the standalone inspector because browser automation is restricted to CUA; no fabricated measurement claims. Screenshot evidence saved outside Git.

## Rollback

Revert the feature commit to restore old public routes/templates; keep existing payment offers and ticket rows. If publication must also be reversed, restore only the backed-up canonical public fields using revision/compare checks; retain newer operational metadata. Never delete attendance or reuse an occurrence ID. Private intake/backup/debug scripts are excluded from Git.

— codex, 2026-11-16
