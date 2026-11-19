# Shared Admin navigation

Every protected admin page uses the same `AdminNavigation` from the owner-guarded admin layout. The former left sidebar/mobile hamburger is removed on phone and desktop.

The sticky header has a single top-right active-area dropdown, replacing the Today shortcut and horizontal strip. Tap or use Enter/Space to open a native disclosure containing Overview, AI Business, Network Marketing and Day Job. Normal links support keyboard Tab navigation; the current area has a checkmark. Selection, outside pointer press, Escape and route changes close the dropdown; Escape returns focus to the trigger. Personal and Settings show a plain destination label without a dropdown. On narrow phones the logo stays visible while the brand subtitle/text reduces to leave room for the longest area name. Today stays reachable from Overview and its existing deep links.

Below 1024px, the bottom bar is **Personal | Home | Settings**. At desktop widths these same tabs move into the header and the floating dock is hidden. Home always opens the main Overview. Workstream pages and Today belong to Home; Personal and Settings have their own active states without selecting a workstream. Existing member /users links belong to Home → Network Marketing → People. Deep links use their owning section, including people/team/calendar access under Network Marketing, profile under AI Business, and tokens/developer under Settings. Production clean-host paths and local/preview `/admin` paths resolve consistently. Existing tool URLs and page actions are preserved.

The header and bottom bar accommodate phone safe areas; body padding keeps final controls clear of the fixed bottom bar. Desktop uses a bounded 1440px working area, a compact title area, and an Overview grid pairing priorities and briefs with alerts and compact product snapshots. Full product metrics remain in disclosures. Today pairs the morning and evening readings at desktop widths. The install control and sign-out remain in Settings; PWA identity, Today launch destination, owner access and member fcOS navigation are unchanged.

Verify all four workstream links, bottom tabs, Today/skill deep links, browser back/forward, dropdown keyboard/outside/Escape dismissal, and narrow overflow and the Settings install/sign-out controls. Do not submit forms, reset credits or sign out as a navigation test.

## Interaction and loading

All Admin Next links use the shared AdminLink wrapper. Real router pending state outlines the clicked link and shows a nonblocking Opening page status; completed, prefetched and interrupted transitions use Next’s lifecycle rather than timeout guesses. Same-page/hash links, downloads and new-tab/external behavior retain native semantics. Root and Today/Users/Settings loading boundaries keep the authorized navigation available while neutral skeletons replace unavailable content. A short section/disclosure fade softens arriving content, with no scroll gate, artificial fetch delay or hidden essential controls. Reduced-motion preference disables fades and placeholder pulses. A private error fallback offers explicit retry; it never prints error payloads. User assignment prevents duplicate submission while pending.

Settings sign-out uses the control’s own client-rendered button with className styling. Passing a server button as cloneElement children broke client transitions; verify entering Settings via navigation as well as direct load. Do not click sign-out as part of navigation QA.

## Personal and business boundaries (SPR-167)

Home’s dropdown contains four workstreams only. Personal remains a separate permanent tab, opened manually. Legacy Personal schedule blocks now resolve to Overview. User-management pages retain their automatic-navigation protection even though their visual ownership is now Home/Network Marketing. Personal remains eligible for the next scheduled boundary. Existing Today and weekly deep links remain under Overview and reachable from Personal. AI Business customer access is not implemented by reusing the member directory.

SPR-167 steering: Personal is manual-only. Former Personal timetable blocks resolve to Overview, including legacy device/server schedules. Settings offers only the four Home workstreams for scheduling. Preserve manual Personal navigation and suppress unchanged Overview-to-Overview alerts.
