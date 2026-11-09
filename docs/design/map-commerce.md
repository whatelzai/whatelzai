# M.A.P. and Playbook website focus

Edmund's direction, 7 November 2026: a smaller public site around My why, Testimonials, M.A.P. events and The book. Existing portfolio and writing routes remain reachable directly. The home page retains real, source-backed testimonials and Edmund's portrait/story.

Millionair’s AI Playbook (M.A.P.) is the user-supplied series name. Two-hour Thursday seminars develop material that will eventually enter The Solopreneur’s Playbook. Only the first occurrence is listed: 12 November 2026, 19:30–21:30 UTC+8, Wings of the Dawn Meeting Room, Blk 712 Ang Mo Kio Avenue 6 #03-4056, Singapore 560712. No invented future dates, attendees, outcomes or remaining-seat counts.

## Commerce

- Event: live product `prod_VaLT33OrGXYmuG`, price `price_1UZAm8PA71qp9sGS4lpDVL2j`, S$97. Payment Link `plink_1UZAmbPA71qp9sGSkqgyUEvw`, fixed quantity one, twenty completed sessions maximum. Its private event-only 100% promotion expires at event start and permits twenty redemptions. No public promo codes in source.
- Book: existing product `prod_V5o68MkToi1baN`, new price `price_1UZAtSPA71qp9sGSwrrqWZEf`, S$47. Private book-only coupons give 100% off or S$42 off (S$5 due). No book redemption cap or expiration was requested. Payment Link `plink_1UZAuIPA71qp9sGSVLR7VkaC` always creates the customer needed by the entitlement flow. Existing `playbook-lifetime-v1` offer updated to S$47 using an expected old-price filter; original offer and all entitlements retained.
- User clarified S$97 means the final price and no current tax registration. Automatic tax is disabled. The professional-events tax code was rejected by Stripe for Checkout products and is recorded only as intended metadata, not a functional tax category.
- Required webhook `we_1UZAvIPA71qp9sGSULyWGD13` created for the existing `/api/stripe/webhook` handler. Signing secret stored only in the Vercel Production sensitive variable `STRIPE_WEBHOOK_SECRET`; it becomes available after deployment. Never put the value in Git or logs.
- Paid and completed zero-total purchases grant access; unpaid sessions do not. Delayed success is handled. The canonical session grant key prevents duplicate completed/async-success grants. The legacy offer slug maps to `playbook`, matching reader checks. Full refunds revoke existing access.
- `/playbook` is a sales page with chapter titles only. `/playbook/read` verifies Google identity, stitches matching orphan grants, checks active access, then imports/serializes the full draft. Existing chapter routes stay gated. The success page checks settled payment and book metadata before showing confirmation.
- First-release administration remains in Stripe. Import of Edmund's participant list, email automation, event check-in and an Admin registration ledger are not implemented in this change.

## Design and review

Subject inventory: existing yellow W; Edmund's own why; real portrait and testimonials; Thursday ritual; two hours; twenty people; S$97 talk; S$47 digital book; twelve existing chapter titles; seminar-to-book learning loop. The argument is learn with Edmund → join the room → keep the lessons in the book → understand his why → hear other people's experiences.

The type-only statement direction retains Fraunces/Geist and semantic brand/theme tokens. The subject's M.A.P. abbreviation becomes a yellow seminar poster. This is an original typographic graphic, not an invented event photo. The existing code-drawn book remains the book's illustration. Images are limited to real portrait/testimonial content to serve the user's explicit decluttering request; no stock imagery was added to meet an arbitrary image count. Existing theme preferences and reduced-motion behavior are retained.

Taste source lint: zero failures. Browser QA uses the required CUA surface rather than the inspector script, which controls Chrome directly. Manual checks cover 390, 768 and 1440px, headings, overflow, navigation, theme and testimonials; no claim of an automated inspector pass. React quality review: server-rendered offer pages, concurrent independent home data reads, minimal client navigation state, semantic headings/links, existing image optimization and verified server authorization.

Critique: strongest change is removing the twelve-destination menu; explicit product names and prices replace exploratory navigation. Yellow poster carries the event identity without fabricated seminar photography. Why and real testimonials retain personal credibility. Future iteration should refine the actual seminar agenda and confirmed venue rather than add decorative sections.

## Validation and release boundary

Production webpack build, TypeScript, focused ESLint, source lint and five commerce model tests pass. Live Stripe checkout was inspected at S$97/S$0 event and S$47/S$5 book. No checkout was completed, no real payment made, and no event seat consumed. Anonymous full-reader navigation redirects to sign-in; inspected public sales DOM contains no full chapter body. A genuine completed purchase and account entitlement round trip remains a release check after webhook configuration reaches Production.

Production merge requires Edmund's approval under CLAUDE.md's human-merge rule. Do not advertise the new book link as ready for fulfilment until the reviewed deployment includes the new webhook secret and handler. Edmund supplied the venue booking (19:00–22:00) and confirmed that the registration cap remains 20 despite the booking summary listing 15 guests. The advertised talk remains 19:30–21:30. Later Thursday occurrences require their own listing and registration allocation.

## Confirmed venue and registration — 9 November
Edmund locked in The Vibe, Paya Lebar Square #07-16, Singapore 409051 (https://thevibe.sg), replacing Wings of the Dawn. Date/time remain 12 November 2026, 19:30–21:30 Singapore; cap20. Live Stripe link now requires individual name, phone and email, and hosted confirmation carries The Vibe.

Event emails: signed webhook handles completed and async-payment-success, gated on complete+paid/no_payment_required and the exact event Payment Link. Resend sends the approved plain-text confirmation. Session-based provider idempotency plus persistent webhook log receipt prevents normal retries and duplicate event types from sending twice. A crash between provider acceptance and receipt persistence beyond Resend's 24-hour idempotency window can resend. Provider failure returns non-2xx for Stripe retry. No marketing subscription is created.

Production activation remains blocked: STRIPE_SECRET_KEY, RESEND_API_KEY and EVENT_CONFIRMATION_FROM are absent. Install a restricted Stripe read key and a Resend sending credential with a verified sender before claiming delivery active. Test a complete registration and delivery after deployment. No live attendee email was sent during development.

## Naming revision — 9 November
User chose event “Money Mindset × AI Skillset” and book “The Money & AI Playbook”, forgoing M.A.P. Public labels, covers, metadata and email wording updated. New canonical event path /events/money-mindset-ai-skillset; permanent redirect preserves the previous URL. Existing product, price, coupon, payment-link IDs and entitlement slugs retained. Stripe product names/descriptions and event hosted confirmation updated live. Book checkout remains paused pending access setup.
