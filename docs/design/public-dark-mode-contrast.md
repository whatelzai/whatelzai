# Public dark-mode contrast repair

The payment-status panel used an unbound `--panel` variable with a fixed cream
fallback, while text inherited dark mode’s light ink. Use the existing semantic
surface and ink tokens together. Yellow promo buttons retain brand ink.

The same public-surface audit corrected fixed light backgrounds on legacy shared
page headers, note-card variants, continue-exploring panels and portrait captions.
Yellow testimonial category/filter surfaces and the about-page yellow quote retain
dark text instead of receiving generic dark-mode white/grey utility overrides.
Admin and member-only themes, theme preference behavior and QR encoding are unchanged.
Black-on-white QR images and dark-on-yellow book covers remain intentional.

Validation: local CUA checks covered home, events, event detail, registration,
playbook sales, about, testimonials, projects, blog, contact, career, mentorship,
leadership and hackathons in dark mode. A targeted DOM contrast probe found no
remaining failures on solid text/background pairs after fixes; gradient book art
was manually distinguished from the probe’s transparent-background false positives.
This is a focused contrast check, not a full accessibility certification.

Confirmed, pending and expired payment presentations were checked in light and
dark mode through a temporary local view fixture, removed before commit. No real
registration, ticket email or payment was created. Desktop and phone screenshots
verify the original success-panel issue is resolved. Focused ESLint and TypeScript
checks pass. The upcoming event redesign receives the same semantic-token repair
on its own branch.
