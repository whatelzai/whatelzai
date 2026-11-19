# Scheduled Admin focus

Five destinations, in order: Overview, Personal, AI Business, Network Marketing, Day Job. Personal is a small landing page for the existing Today reader, weekly reflection and routine library. Their existing URLs remain stable.

## Default timetable

All times are Asia/Singapore, independent of the device timezone. Weekdays08:00–09:00 Personal;09:00–18:00 Day Job;18:00–19:00 Personal;19:00–22:00 Network Marketing. Saturdays/Sundays09:00–18:00 AI Business. Unscheduled time is Overview. Intervals include their start and exclude their end; midnight starts a new dated block. Edmund confirmed weekend hours and next-block manual override.

## Navigation contract

A fresh Home entry follows the current block. An existing installed Admin PWA launching its unanchored Today start page also follows it; notification anchors, explicit deep links and initial utility destinations are preserved. At subsequent time boundaries ordinary Home workspaces can change automatically. Timers target the next boundary and recheck at least once per minute for clock changes; focus, visibility and pageshow catch up after device sleep/browser throttling. Nothing executes while the app is closed.

Manual internal space choices and browser back navigation hold until the next block by default, including reloads within that tab. A configurable alternate policy pauses automatic switching until explicitly resumed. Home is an explicit Overview choice. Modified/new-tab/external/download behavior stays native. Only static allowlisted destination paths can be scheduled.

Users/Settings workflows, dirty forms, editable focus, open dialogs and the open area selector defer automatic navigation. A small prompt offers Switch now. Dirty state remains until navigation/reset; a submit does not falsely imply a successful save. Manual navigation is never blocked by this feature. Automatic replacements do not pollute browser history.

## Preferences

Settings → Your daily rhythm shows the active timetable and enables, pauses, resumes or edits it. Up to24 blocks, weekdays/weekends, nonoverlapping integer-minute ranges, whitelisted spaces. Midnight end00:00 means24:00; split overnight blocks. Validation rejects malformed data and invalid stored settings fall back to defaults. Timetable/enabled/override policy are owner-keyed localStorage preferences on each device, with in-memory fallback if storage fails. Per-tab override uses sessionStorage; this is not cross-device synchronization. No identity/roles/content/API credentials are persisted by the scheduler. Server access checks remain mandatory and unaffected.

Verify exact boundaries/UTC rollover, manual reload persistence/expiry, foreground catch-up, direct link/notification preservation, edit/dialog/utility deferral, validation, Settings controls and phone/desktop dropdown navigation. Never sign out, reset credits or change business data as navigation QA.
