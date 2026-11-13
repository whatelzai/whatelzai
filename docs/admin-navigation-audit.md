# Admin navigation and Back audit

Scope: all links/buttons declared under app/admin and components/admin, plus navigation in the reused playbook and first-party member views. Source audit, focused tests and synthetic browser verification; not a destructive click-through of real payments, people or ledger writes.

| Destination | Result |
| --- | --- |
| Playbook | Owner-only /admin/playbook; content imported after dailyOwner; opens the actual flipbook directly, with ebook mode and existing gestures. Public sales and entitlement routes unchanged. |
| Leads, culture, calendar/event, catalogue, notes, communities, resources | Owner-gated Admin routes reuse the existing first-party views and their server access checks. Internal links retain Admin origin and query/hash. Member navigation chrome is hidden. |
| Public website/portfolio/testimonial previews | Explicit allowlist renders the actual page component within Admin. Forms are disabled and submit events blocked; author previews cannot accidentally purchase or submit feedback. |
| Event poster, original media, stored PDF/image | Sandboxed, in-app file dialog; signed URLs remain private. Native exports/downloads and deliberate OS share actions retain their existing semantics. |
| LinkedIn/social URLs, newsletter distribution URLs, EMDEE admin | In-app service-address notice with Copy. No embedded login, cross-origin session assumption, browser launch or claim of API integration. |
| Native Admin pages | Existing Next navigation/pending feedback remains; nested pages receive a deterministic Back link. Hackathon cancel no longer trusts arbitrary browser history. |

The source scan found new-window affordances in ProductWidget, Presence, resume history, testimonials/socials and templates, website preview rows, newsletter distributions, event drafts, historical posters, PosterTools and MediaViewer. Their target=_blank attributes are removed. A shared Admin-only link boundary resolves supported first-party paths and contains remaining external destinations. Relative links inside public/member previews are scoped to the corresponding Admin reader rather than being mistaken for Admin management routes.

## Back contract

- Opening a native dialog, workspace menu or mobile reader contents creates a same-URL history layer while preserving Next's opaque state.
- Browser/phone Back dispatches cancel to the top layer first. Existing dirty/busy guards may refuse closure, in which case its history layer is restored.
- Explicit Close consumes that layer. Nested overlays unwind one at a time.
- Navigation selected inside an overlay closes layers before pushing the destination; a refused close cancels that navigation.
- A fresh launch/deep link has an Admin boundary entry so Back falls back to an Admin parent rather than the pre-login page. No auth/session/logout implementation is changed.
- The visible Back control uses a known Admin parent, never an untrusted referrer.

## Evidence and limits

Unit tests exercise URL routing, hostile lookalike domains/protocols, parent fallback, nested overlays, explicit close, refused cancel and preservation of Next history fields. CUA verified dialog Back, external-link containment, protected cancel, mobile reader contents Back, page turning and ebook mode using a temporary fixture containing only synthetic text; removed before build. New owner reader, public-preview and member-view paths returned 307 to sign-in when unauthenticated. Actual author data and native Vivo installed-PWA Back were not manually exercised. Existing server-side owner/member permissions remain the authority, and no live data was changed for testing.

Explicit authentication/connection actions are an exception to browsing containment: the existing Connect EMDEE server action intentionally redirects to EMDEE OAuth authorization and returns to Admin. It is already labelled as authorization; this audit does not embed, bypass or disable provider consent. Likewise, deliberate OS share/download actions remain user-initiated.
