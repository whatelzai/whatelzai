# Admin release notes

Admin’s owner-only layout supplies the newest three versioned entries from `lib/admin-releases/data.ts`. This is a separate product history from fcOS member releases; no operational records, personal figures or member data belong in it. Add a new immutable ID, date, English/Chinese title and concise verified changes at the front when shipping. Keep older entries for Settings history.

The optional dialog chunk loads only for an unseen release on Overview, AI Business, Network Marketing or Day Job. Native dialog provides focus trapping/Escape/inert background. Header Close and footer View all stay outside the scrollable content. Existing focus scheduling respects open dialogs. Settings has URL-backed Preferences and Release notes sections; direct links work after refresh and navigation gives normal Admin pending feedback.

Dismissal stores only the newest release ID in owner-scoped localStorage. This is per device/browser, not a server acknowledgement or a security permission. Other tabs receive the storage event; storage-disabled sessions fall back to memory. Clearing site data or changing devices can show the popup again. Closing never waits on a network write. No new database, credentials or API requests are introduced.

QA: latest three, scroll and fixed controls, close/Escape, retained dismissal after refresh, Settings/View all/back, mobile/desktop, dark mode and translations. The full history remains available without re-opening the popup.
