# fcOS navigation and deferred controls

The five main tabs and member resource routes have data-free `loading.tsx` shells. They render the existing header and navigable bottom tabs with neutral placeholders and an accessible loading status. No names, credits, notes or invented figures appear in a fallback. Next can prefetch the loading shell for dynamic navigation; default Link prefetch semantics remain, without forcing eager private-data fetches.

`MemberLink` uses Next `useLinkStatus` inside the actual Link context. A small fixed-position signal and screen-reader status reflect real pending navigation, including interruption and completion. It preserves Link props, modified clicks and keyboard semantics. New Chat uses the router’s transition state for pending/disabled feedback. There are no timer-based progress bars or artificial delays, and animations respect reduced motion.

On app.whatelz.ai the root shell skips the public-site identity query and unused public admin-link flag. Public/Admin root behavior is unchanged. fcOS pages and APIs still verify their assigned session before private reads or mutations; middleware protections remain. The root shell/loading markup contains no private data. No credentials, account state, auth decisions or private content are persistently cached.

Baobei list own/team reads run concurrently. After profile authorization, profile and activity queries run concurrently with the same owner and allowed-field filters. Linked notes stream behind a separate Suspense boundary so they cannot delay the profile’s first content.

Profile editing/photo/privacy/priority controls, per-activity status forms and new-activity forms are dynamically imported from a Client Component only on first expansion. The disclosure itself opens immediately and shows “Opening controls…” while its chunk loads. Once opened, forms remain mounted when collapsed, preserving unsaved values; saved revision changes reset the appropriate existing editor. Core Chat input and primary reading content stay eager.

This reduces blocking reads and initially mounted optional UI; it does not make database/network work instantaneous. Browser prefetch state, initial authentication, network and deployment region still affect timing. No database/schema migration, provider inference, service-worker private caching or sponsor/ownership change is part of this release.

Validation: root-layout read counters for app/public/admin; a concurrency-barrier test proving authorized profile/history reads start together; existing access/owner/Chat/viewport/pull-refresh tests; production build/typecheck/lint/format; actual mobile tab/profile transitions and first-open/collapse/reopen editor checks without saving data.
