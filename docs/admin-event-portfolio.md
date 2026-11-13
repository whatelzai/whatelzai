# Admin event portfolio

Owner-only routes: `/admin/ai-business/events`, `/admin/ai-business/events/[id]`
and `/admin/ai-business/people`. The next upcoming Singapore-dated event leads
AI Business; cancelled, archived and ended events do not take that position.
Draft events remain explicitly unactivated. This does not activate checkout.

Past records remain accessible. Ticket reads accept an exact event key for both
ticket and signup-attempt sources. Operational scanner links remain limited to
the currently configured event, avoiding accidental check-in to another event.
Unavailable sources display unavailable rather than zero.

People statistics reuse permission-checked, explicitly linked attendance:
distinct contact IDs, one visit per event reference, returning attendees with
multiple events. Registrations alone do not prove attendance. No fuzzy name
merge, referral inference, teaching outcome or profit estimate is introduced.
Revenue is recorded paid value before fees and costs, labelled by event.

Catalogue reads fail explicitly beyond 1,000 records; invite-source completeness
guards also remain in place. Pagination is needed before those limits are reached.

## Authorized historical reconciliation — 14 November 2026

Owner confirmed the actual June event was 28 June. Canonical event
`18a30144-78de-4d56-9aff-9113d7744bc3` retains its five free attendees.
Legacy event `a371c842-1281-48e5-afee-54bb5e1f4016` was corrected to 28 June,
unpublished and marked duplicate/superseded, preserving original metadata.
Related service record `8f43dc5e-564a-491b-8ada-ac20e2858043` was corrected;
IDs and testimonial references remain intact. Preserve superseded metadata when
editing that legacy record. No records were deleted.

Private catalogue event `d61b02e0-76c3-422c-b65d-e9ec570d7ff2` preserves the
12 November event under its existing ticket key, without duplicating payments or
attendance. The 19 November event remains a private draft: S$8, 30 seats,
registration 19:00, session 19:30–21:30, provisional The Vibe venue.

Validation: selection/dedup/statistics tests and owner-before-I/O archive-read
tests; TypeScript, lint and production build. Responsive screenshots used sample
data, not an authenticated production session.
