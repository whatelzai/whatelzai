# Public activities

`/activities` is the public destination. `/events` serves the separate live event catalogue. Entries live in `content/activities/index.ts`; each gets `/activities/[slug]` and a sitemap link. This reviewed public content is separate from the historical admin testimonial-attribution events and private team calendars. No private podcast guests or schedules are imported.

To announce a gathering, add a distinct slug and confirmed start/end timestamps with an explicit offset (for example `+08:00`), venue, cost including any required café purchase, and a verified registration URL when ready. Update group size, duration and language per activity. Both timestamps must be valid and end after start. Dates render in Asia/Singapore with SGT labelled. Do not infer recurring dates: create entries only for sessions the host commits to. Entries are ordered chronologically; past entries remain linked but cannot register interest. Archive copy is reviewed content, not automatic photos/testimonials.

Undated entries are marked “In the making”, with unknown venue/date/cost plainly labelled. Coffee & AI begins in that state. Its form is an expression of interest, not a seat reservation or newsletter subscription; it uses the existing `/api/contact` email channel and is not a registration database. The email includes the editable activity context. No admin CRUD has been added. Capacity enforcement, confirmation emails and attendance tracking are future work once dates exist.

Contact delivery now returns an error for missing email configuration or Resend rejection; it no longer logs private messages as a substitute for delivery. Browser verification must not send unsolicited test mail. HTML validation/field context can be checked without submission; verify the delivery failure branches using an isolated mock if needed.

Validation: production build, TypeScript, changed-file ESLint/Prettier, activity timing tests, responsive browser review in both themes, detail links, unknown slug, events catalogue and form required-field validation. No new dependencies or migrations.

Verified 2026-10-15: three activity-timing tests, targeted ESLint/Prettier and production build pass. Browser checked desktop and 390px phone, light/dark detail surfaces, list-to-detail navigation, prefilled interest context, required-email validation, mobile Explore link, /events redirect and unknown activity. Email provider acceptance/rejection and missing configuration were verified through isolated module mocks; no real message was sent.
