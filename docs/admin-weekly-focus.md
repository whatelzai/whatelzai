# Weekly focus Admin — SPR-171

Approved isolated Overview/Settings proposal replaces the SPR-170 panel-heavy layouts. Week is the planning unit; an accepted task is the execution unit. Existing user-defined Personal/Home/Settings navigation and four workspaces remain.

Overview verifies owner first and starts uncached tasks, Morning, Evening and last complete weekly record independently. A single request shares its EMDEE connection. No product metrics, draft counts or yesterday-handoff reads run on Overview. It shows Singapore Monday–Sunday dates, up to one accepted unfinished due-by-Sunday task per lane (including carried work), and the earliest accepted open task due today or earlier as the next sprint. Blocked/waiting work never becomes a sprint. Source failure is distinct from no accepted work. These are loaded commitments, not inferred aspirations or a separate persisted weekly plan; the source disclosure states the 100-row bound.

Start focused sprint opens an in-memory distraction-free reading view. It does not start a timer, accept/complete a task or save anything. End restores the week. Automatic scheduled navigation defers while the focus view is open; manual navigation remains available.

Daily rhythm entries stream separately, with saved/missing/unavailable semantics preserved. Weekly closeout status reads the previous complete Singapore week, never implies a scheduled ChatGPT run succeeded. Existing ChatGPT routines and EMDEE originals are untouched.

Settings caps at640px and uses compact rows rather than full-width tonal panels. Keep real push status/opt-in/error/test controls and per-device schedule behavior. Timetable DOM mounts only when its disclosure opens; drafts and explicit save behavior remain. Appearance/language/text controls are unchanged. Technical access is removed from the Settings directory; its existing owner-gated route remains unchanged. No business data moves into Settings.

The existing custom native-details/anchor workspace dropdown replaces the prototype's OS select: rounded opaque menu, quiet selected row, 44px links, Escape/outside close, ArrowDown opens/focuses first link, Tab navigation and focus return. Dock active state becomes a short yellow marker. Brand/type preserved; no public/member appearance changes.

Lane tool directories use grouped plain links rather than category buttons. Product health now has an AI Business subroute with independently streamed existing cached metrics; no metrics reads until visited. Day Job reads actual accepted priorities, future deadlines and blocked/waiting tasks, with explicit empty/unavailable states and the user's established work boundaries. No fictitious work or external day-job integration.

Retain AdminLink real router pending feedback, route loading boundaries, code splitting, local tap feedback and short staggered content/menu entry. Respect reduced motion; no new private cache, prefetch of vault documents, provider/inference or schema changes.

Validation: week/year-boundary and task-status selection tests plus existing focus/navigation/preferences/owner/source tests; build/typecheck/lint; CUA desktop1440/tablet768/phone390, larger text/dark, dropdown, timetable, focus flow and route navigation. Inspect real rendered layouts and fix before completion.
