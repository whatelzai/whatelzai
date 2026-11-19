# Owner AI-business overview

The root of `admin.whatelz.ai` answers what needs attention and which accepted
commitments move the AI business forward. This chat owns admin; the separate
network-marketing chat owns the member app. No member pages, leads, team
relationships or assistant permissions are changed by this overview.

## Sources and decisions

`loadAdminOverview` independently calls the existing sole-owner policy before
accessing data. It reads the owner's Daily tasks, saved EMDEE Daily entries,
marketing workflow counts, local product metrics and the existing authenticated
EMDEE owner-metrics integration. The page is private, dynamic and not indexed.
Each source degrades independently; unavailable is never presented as an empty
queue, a zero metric or a completed task.

Focus shows up to three accepted, open AI-business commitments due today or
earlier. Blocked/waiting commitments require review and appear as attention
items; proposals remain proposals and deferred work does not silently reactivate.
Coming up shows at most three future accepted open AI-business commitments.
The underlying Daily loader is bounded to100 unfinished and100 current-day
completions across all lanes, so focus/attention figures explicitly describe the
loaded set. Completion is counted only from explicit done records.

Morning/evening previews render the existing canonical EMDEE Notes as Markdown
in a bounded scrolling area, preserving complete headings, lists and GFM tables.
Today and weekly reflection render Markdown too. Today is a reading surface:
no briefing editor or Save to EMDEE control; missing entries show a short message.
Yesterday’s handoff and optional commitment forms are collapsed. Raw HTML and
remote image loading are disabled. Source content is unchanged. Before 04:30 and
21:00 Singapore,
a missing current entry is not due yet. Afterward it is not found, not proof that
a schedule failed. Saved entries similarly do not prove an unattended run.
Yesterday's closeout remains a read-only preview. No inference, schedule change,
commitment mutation, outbound message or publishing happens on page load.

Growth counts are exact server counts of blog drafts, newsletter drafts and
submitted pending testimonials. Incomplete testimonial requests are excluded.
Customers and sales opportunities are not sourced from member leads or email;
that integration remains explicitly unconnected.

## Metrics integrity

Local daily/weekly/monthly active-account metrics use users.last_seen_at. New
accounts use users.first_seen_at. Website visitor activity is separately named
in usage, based on visitors.last_seen. No measured recurring revenue or workspace
count exists for Whatelzai, so those contract values are null. Database failures
propagate to an unavailable product state instead of returning zero.

Remote metrics require the expected product identity, supported schema version,
valid timestamp and finite nonnegative numeric/null fields. Redirects are denied;
the existing short timeout covers reading and validating the response. Snapshots
older than24h or with invalid/future timestamps are called out before decisions.
The existing pure-data MCP metric response retains its shape; previously
misleading local metric values are corrected to their named meanings.

## Validation

Run the overview, owner, Daily and routing tests with the existing Node/tsx test
runner, then typecheck, lint changed files and build. Verify the owner view,
empty/partial states, clean Today deep links, anonymous protection and narrow
screen width. No database migration or new credential is required.

## Performance and freshness

SPR-160 starts independent owner-authorized source promises, with per-section Suspense (including each brief/product), rather than blocking the page behind one aggregate. Attention remains loading until all sources resolve. Each request reuses the existing verified connection for its three EMDEE reads. Exact get_doc now takes one round trip; only explicit not_found/no_such_doc means absence, and auth/transport/other tool errors remain unavailable. Save version/readback checks are unchanged. Daily active/completed queries run concurrently.

Only read-only product metrics use the owner-keyed Next Data Cache (60s revalidation). Fresh owner authorization precedes every access; credentials and authorization state are outside cache scope. Failed snapshots are not written as successful cache values. Last-good data may be returned during background revalidation/failure, with its original read time shown. Tasks and personal briefs remain uncached; no private offline/browser persistence is added. Overview previews stop at complete Markdown section boundaries; full documents remain in Today. Static source labels, elapsed milliseconds and ok/error outcomes are logged as admin-read without payloads, identifiers or exception details. This pass adds no precompute cron, region move or new infrastructure; measurements can justify those later.

Live EMDEE missing-document compatibility: exact get_doc reads may return JSON-RPC -32603 with message `no such doc: <requested path>`. Only that exact message/path pair or explicit not_found/no_such_doc codes becomes absence. Other -32603 failures, auth and transport errors remain unavailable; no discovery fallback or extra round trip is added.
