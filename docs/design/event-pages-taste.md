# Event invitation and registration redesign

Scope: the 12 November event detail page and email-based registration only.
Keep the existing routes, public offer, poster, IDs, prior event listings, payment
logic, private promo validation, three-minute lock and QR delivery. No account,
membership or free-admission marketing prompts.

## Brief and direction

The audience is deciding whether to spend a Thursday evening with Edmund. The
first screen must answer what, when, where, price and next action. Specific
material: Money Mindset × AI Skillset, Edmund’s real speaker portrait, weekly
Thursdays, 12 November, The Vibe, Paya Lebar Square #07-16, 20 places, S$97 → S$7,
7 PM registration, 7:30–9:30 PM activity, networking until 10 PM, QR ticket by email.

Taste direction: **The pinned poster**, seed **313828882**, existing palette/type
kept. On this page, Edmund’s Thursday speaker poster becomes the anchor beside
the event invitation and booking details. The live action is registration and
applying an owner-issued code. The poster, rather than a title over a sequence
of full-screen portraits, stays beside readable details: only four event posters
exist and attendees need an immediately usable booking flow. No external images,
stock people, invented footage or sample content were introduced.

The user explicitly requested softer fields: 12px form corners, 24px panels and
pill actions take precedence over the skill’s preference for square corners.
Registration follows the same visual identity with an event summary and a form,
without adding decorative photos to a task-oriented form.

## Argument and copy

- What is this evening? → title, real poster, date/time, venue and capacity.
- How do I attend? → S$7 with S$97 struck through and Register.
- What will happen? → existing write-up beside the confirmed evening schedule.
- What came before? → the three existing dated event posters and clickable IDs.
- Where do the ideas go? → existing book connection and links to why/testimonials.
- Registration → name, phone with country-code help, email for the QR ticket,
  optional blank promo field with Apply, accurate total and payment action.

## Review

ROUND 1
Seen in one second: the event poster beside an invitation rather than a distant poster below a title.
Idea: Edmund’s Thursday poster anchors the page while the details become readable alongside it.
Live thing: Register and private-code validation.
Layout words: hero=poster/invitation / write-up=reading column and agenda / history=poster gallery / book=editorial close.
Top problems and fixes:

1. Mobile Register was below the entire poster → add a phone-only action with date, time, venue and price before the poster.
2. The registration summary occupied too much phone space → compact its price and omit duplicated price footnote on phones.
3. Inherited gallery borders framed rounded posters with square outlines → remove only the event detail gallery borders.

ROUND 2
Seen in one second: a real seminar invitation; on registration, event summary and a clear form.
Layout: equal margins, two-line event heading, a usable first-screen mobile action, readable schedule, soft form controls.
Manual scores: design 8 · usability 8 · creativity 7 · content 8 → 7.8.
Limitations: the concept adapts the dealt poster direction rather than reproducing its full-screen portrait sequence. No invented video or imagery was added. The registration form intentionally uses only its event thumbnail.

## Verification

Taste source lint: 0 FAIL, 0 WARN. Focused ESLint and TypeScript pass; 11 existing
registration/commerce checks pass. CUA screenshots and DOM measurements at 1440,
768 and 390px confirm no horizontal overflow and headings at two lines or fewer.
Inputs measure 54px high with 12px corners. Invalid code keeps S$7 and payment;
valid code changes to confirmation; clearing returns to S$7 and disables Apply.
No live signup, ticket email or payment was submitted during this validation.

The skill’s separate CDP inspector was not run: this session requires browser
interaction through CUA. Equivalent responsive screenshots and targeted read-only
DOM measurements were made through that browser. The source-lint result must not
be represented as an automated rendered-page inspector pass.

### Dark-mode follow-up

The shared contrast repair is included in this branch. The new event panels,
registration surface, input borders/focus background and placeholder text now use
semantic theme tokens, while the yellow Register action keeps dark brand ink.
Both redesigned routes pass the targeted solid-color contrast check in dark mode;
registration is checked in light mode too. Selected testimonial filters also
retain readable dark text on yellow. Shared repair: PR #228.
