<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# CLAUDE.md — whatelz.ai

Instructions for any AI coding agent (Claude Code, Cursor, Aider, ...) working on this repo.

## Source of truth — two layers, kept in sync

| Layer                                                                            | What it holds                            | Where it lives |
| -------------------------------------------------------------------------------- | ---------------------------------------- | -------------- |
| **Process** — agent protocols, sprint workflow, doc registry, writing discipline | EMDEE vault under `projects/WHATELZ-AI/` |
| **Code behaviour** — stack, commands, structure, what runs where                 | This repo                                |
| **Bridge** — repo specifics + pointers into EMDEE for process                    | This file                                |

**Rule:** this file never duplicates EMDEE protocol — it references it. Code-side mirror of `projects/WHATELZ-AI/INSTRUCTIONS.md`. When repo behaviour changes, update both in the same commit.

## What this is

`whatelz.ai` — Edmund Lin Zhenming's personal AI-engineer site. Data-driven content (projects, channels, hackathons, blog, career, leadership, mentorship, testimonials) backed by Supabase, with a gated admin shell and an MCP surface for Claude clients. Full product truth: `projects/WHATELZ-AI/CONTEXT.md`.

## Stack

- **Framework:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5 (strict)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) — _light mode only, see Hard Rule 5_
- **Auth:** Supabase Auth (Google OAuth, `@supabase/ssr`)
- **Data:** Supabase (Postgres) — `@supabase/supabase-js`
- **Jobs:** production Vercel cron checks saved EMDEE routines for owner-opted-in Web Push. Personal AI generation remains subscription/MCP-based and API generation stays off. See docs/admin-push.md.
- **AI runtime:** Personal admin uses ChatGPT/Codex and pure-data MCP. Explicitly authorized member API inference runs only on app.whatelz.ai behind MEMBER_AI_ENABLED; see docs/member-assistant.md. Personal API Daily stays off.
- **PDF:** Puppeteer (`puppeteer-core` + `@sparticuz/chromium-min`) — resume renderer
- **Email:** Resend
- **Package manager:** npm (lockfile: `package-lock.json`)

Dev port is **3100**, not 3000 (`npm run dev` → `next dev -p 3100`). Single Vercel project, single production branch (`main` → `whatelz.ai`).

## Commands

| Purpose                 | Command                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server              | `npm run dev` (http://localhost:3100)                                                                                                                                                         |
| Production build        | `npm run build`                                                                                                                                                                               |
| Start built app         | `npm run start`                                                                                                                                                                               |
| Lint                    | `npm run lint` (eslint)                                                                                                                                                                       |
| Format (write)          | `npm run format`                                                                                                                                                                              |
| Format check            | `npm run format:check`                                                                                                                                                                        |
| Typecheck               | `npx tsc --noEmit` <!-- TODO: no `typecheck` script in package.json — convention is bare `npx tsc --noEmit`. Consider adding `"typecheck": "tsc --noEmit"` for autonomous-run uniformity. --> |
| Seed website docs       | `npm run seed`                                                                                                                                                                                |
| Migrate sqlite→Supabase | `npm run migrate:sqlite` (one-shot historical)                                                                                                                                                |

<!-- TODO (critical for autonomous runs): no test runner is configured. No vitest, jest, or Playwright. No `__tests__/` or `e2e/` directories. Acceptance criteria in sprint specs cannot rely on `npm run test` until a test stack lands. -->

## 🚨 HARD RULES

Guardrails an autonomous agent must never break. Each is grounded in repo state or EMDEE/memory — not invented.

### 1. Deploy ceiling — `feat/*` model, infra-enforced

The standardized model (identical across all four EMDEE-tracked repos):

- **`main`** is production (`whatelz.ai`). PR-protected, human-merge only. Direct pushes are rejected by GitHub at the wire (`GH006 protected branch hook declined`, `enforce_admins: true`).
- **`feat/<sprint-id>-<slug>`** — one branch per sprint, branched from `main`, merged back via PR. Multiple may exist concurrently — that is the parallelism.
- **No long-lived `agents` branch.** Each sprint gets its own feat branch.
- **Previews:** `feat/*` branches auto-deploy as Vercel **Preview** (not Production). The preview URL is `https://whatelz-git-<branch-slug>-elzmings-projects.vercel.app`. Use it for visual QA before merging.

Verified 2026-05-28 by pushing `feat/zzz-ceiling-test`: Vercel created a Preview deploy with `target: null`; the prior direct push to `main` was rejected with `GH006`.

### 2. Never commit secrets

`.env*` (except `.env.example`) is git-ignored. Real values live in Vercel project env vars. Secrets to never appear in commits, even in tests or fixtures:

- `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (the anon key is public-safe but treat the file as a unit)
- `MCP_TOKEN` (PAT wrapped by the project's OAuth flow at `/api/mcp`)
- `RESEND_API_KEY`

Full list: `.env.example`. Generate with `openssl rand -hex 32` where the comment says so.

### 3. Migration discipline — apply, don't hand off

When proposing a new `supabase/migrations/*.sql`, **apply it immediately** in the same session via Supabase Studio or CLI. Do not hand off "user, please apply this." The Supabase MCP in `.mcp.json` is currently **read-only** (no write tool exposed), so application happens via Studio/CLI for now. Re-enable write access by removing `--read-only` from the Supabase MCP config when ready.

### 4. Personal admin uses subscription/MCP; member API is explicitly scoped

- Personal admin reasoning stays in ChatGPT/Codex with pure-data MCP. Edmund explicitly authorized server-side OpenAI member inference on app.whatelz.ai (SPR-129), with US$5/person/month, atomic reservations, owner-managed access and resets. This supersedes the former blanket no-inference rule only for member chat.
- **MCP verbs are pure data.** Read verbs return raw or lightly-shaped structured context. Write verbs persist a body that arrives fully-formed from the client. If a tool feels like it needs server inference to be useful, split it into a read verb + a write verb and let Claude bridge them client-side.
- **Do not suggest** `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, or any similar env var as a pending action, prerequisite, or blocker.

### 5. Light mode only

Public `whatelz.ai` and member surfaces remain light mode. Edmund explicitly authorized an Admin-only appearance preference (SPR-165); scope it under `.admin-shell` without changing other surfaces. For public/member surfaces, **never:**

- Add `dark:` Tailwind variants to new components.
- Wire `ThemeProvider` from `next-themes` (the dep is vestigial, see Stack).
- Read `prefers-color-scheme` in app code.

If you find existing `dark:` classes during a refactor, leave them — removal is its own sprint, not a drive-by.

### 6. Stay in your assigned module + lane

EMDEE INSTRUCTIONS (`projects/WHATELZ-AI/INSTRUCTIONS.md`) defines two agent lanes:

- **Claude Chat** writes CONTEXT / INSTRUCTIONS / IDEAS / BUILD specs. Never writes BUILD close-outs.
- **Claude Code** flips sprint `queued → in-progress` _before_ writing code; appends close-out to the same sprint section on ship; flips to `blocked` if stuck.

Do not write to docs you don't own (BRAND, LOGS, LEARNINGS — see Doc Registry). Do not promote IDEAS or INBOX entries on your own; humans commit.

### 7. No destructive DB ops without sign-off

Never run `DROP TABLE`, `TRUNCATE`, `DELETE` without `WHERE`, or migrations that drop columns with data, unless Edmund has approved (chat or sprint spec) and a backup/down-migration exists. Supabase Studio actions are irreversible against the remote project.

### 8. Always commit and push together

After completing work, push to `origin` immediately — Vercel deploys on push to `main`, and a half-committed local state hides shippable code from review. Memory rule, post-multiple-times-burned.

### 9. Never bypass hooks or signing

No `--no-verify`, no `--no-gpg-sign` unless explicitly instructed. If a pre-commit hook fails, fix the underlying issue and create a new commit — do not amend the failed one.

### 10. Worktree-per-agent

Two `worktree-agent-*` branches exist locally — the pattern is active. Concurrent agents (or agent + human) use separate worktrees. Coordinate via the `In-Flight Thinking` block in EMDEE BUILD before deep work (see EMDEE INSTRUCTIONS → Agent Protocols).

## Branch & commit conventions

- **Production:** `main` → `whatelz.ai` via Vercel auto-deploy on push. Protected: PR required, force-push disabled, deletion disabled, admin enforcement on.
- **Feature branches:** `feat/<sprint-id>-<slug>` (e.g. `feat/062-resume-bugfixes`). Branched from `main`, merged back to `main` via PR. Each gets its own Vercel Preview URL.
- **No long-lived non-main branches.** No `dev`, no `uat`, no `agents`, no `worktree-agent-*`. If you see one, it's stale — flag it.
- **Commit messages:** conventional + scope. Recent examples: `feat(admin/resume): ...`, `fix(admin/resume): ...`, `chore: ...`. Two-line minimum: short subject, blank, prose paragraph explaining _why_. Co-author trailer for Claude-Code-driven commits.
- **Push discipline:** Hard Rule 8 — commit + push in the same step. For agent work that's a `git push -u origin feat/...` then `gh pr create`.

## Sprint workflow — POINT, don't duplicate

Full process lives in EMDEE under `projects/WHATELZ-AI/`. Cite, don't restate:

- **Active sprint index:** `projects/WHATELZ-AI/SPRINTS.md` — Active / Queued / Blocked / Recently shipped / Ops Checklist. Shipped sprint bodies live under `logs/` and are indexed by `projects/WHATELZ-AI/LOGS.md`.
- **Per-sprint specs + close-outs:** `projects/WHATELZ-AI/sprints/SPRINT-NNN.md`. One file per sprint, monotonic numbering. Status: `queued | in-progress | blocked | shipped`. Type: `dev | ops`. Category: `feature | infra | fix | content | chore`. Owner: `chat | code`.
- **Standing rules:** `projects/WHATELZ-AI/INSTRUCTIONS.md` — session start protocol, agent lanes, doc registry, BUILD structure, writing discipline.
- **Product truth:** `projects/WHATELZ-AI/CONTEXT.md`.
- **Durable lessons:** `projects/WHATELZ-AI/learnings/*.md` (18 LEARNINGS extracted to date).

**Session-start reading order** (Claude Code, every session):

1. `projects/WHATELZ-AI/INSTRUCTIONS.md`
2. `projects/WHATELZ-AI/SPRINTS.md` (Active + Queued)
3. Target sprint file under `projects/WHATELZ-AI/sprints/` (active) or `logs/` (shipped, for context)

Most recent shipped (2026-07-13): SPRINT-073 (landing polish + SEO/GEO push — dynamic sitemap, `/llms.txt`, per-page JSON-LD, `/about`, `/api/og`). Current work: landing search-bar hero + brand-search-results signature moment (this branch: `feat/073-landing-polish`).

## Autonomous agent / Ralph protocol

Rules for unattended runs (overnight, batch, long-running). Tighter than interactive sessions, not looser.

### Preconditions — refuse to start without

1. **A written spec** at `projects/WHATELZ-AI/sprints/SPRINT-NNN.md` with `Status: queued`.
2. **Explicit, testable acceptance criteria** in the spec. Since there is no test runner (see Commands TODO), "testable" here means _manually verifiable_ — the spec must list the commands or visual checks that prove acceptance.
3. **A single named module** in scope. Cross-module sprints need human chunking first.
4. **Target branch declared** in the spec: always `feat/<sprint-id>-<slug>`, branched from `main`. Never `main` directly (Hard Rule 1 blocks this at the wire).
5. **Migration plan** if `supabase/migrations/` is touched: which migration is added, applied how (Studio/CLI), rollback noted.

If any precondition fails → write `Status: blocked` to the sprint with what's missing, and stop. Do not improvise the spec.

### Definition of done

All must be green before declaring the sprint shipped:

1. `npm run build` — clean.
2. `npx tsc --noEmit` — zero errors in touched files. (Pre-existing errors elsewhere don't count but shouldn't get worse.)
3. `npm run lint` — clean.
4. `npm run format:check` — clean (or `npm run format` run + diff reviewed).
5. **Manual verification step** from the spec executed and noted in the close-out (since there is no automated test suite).
6. Migration applied (if touched) — confirm via Supabase Studio query or schema diff.
7. **No out-of-scope files modified.** `git diff --name-only main` should match the sprint's deliverables.
8. **Close-out written** under the sprint's Close-out heading: what landed, verification commands run + results, follow-ups carried out.
9. **Committed and pushed** to the agent-allowed branch (Hard Rule 8 + Hard Rule 1).
10. **BUILD index updated:** sprint moved out of Active/Queued into Recently shipped.

### Safety rails

- **Max iterations:** every autonomous run sets `--max-iterations` (or equivalent) up-front. No infinite loops.
- **Thrash bail:** if the same error or build failure repeats twice without progress, stop and flag. Don't iterate to mask.
- **Hard-rule collision:** if any Hard Rule above would be violated to finish the work, stop. Surface the conflict — don't bypass.
- **No silent dependency changes.** Adding a new top-level dep needs an Edmund-visible note in the close-out. Removing one (e.g. `next-themes`, `@react-pdf/renderer`) is its own sprint.
- **No production env-var changes.** Surface as a follow-up for Edmund to set in Vercel.

### Flagging — where unattended blockers go

When stopping mid-run, write a single status patch:

- **Primary:** the sprint file's `Status:` → `blocked`, plus a new subsection:

  ```
  ### Blocker (YYYY-MM-DD)
  **Attempted:** <what>
  **Blocking:** <why>
  **Would unblock:** <specifically what unblocks>
  **Branch + commit:** <branch>@<sha>
  ```

- **Secondary** (cross-cutting): append to `projects/WHATELZ-AI/SPRINTS.md` → Ops Checklist with the same shape.
- **Silent failure is worse than loud.** Always write something before exiting.

## Directory map (top levels)

### Playbook draft preview (SPR-114, 2026-09-19)

`/playbook` is an ungated 3D reader of a reviewed, versioned EMDEE chapter snapshot in `content/playbook/chapters.json`. This follows Edmund's request to build the reading experience before adding payment gating. No live vault credentials or requests are used. Editorial placeholders are excluded and the UI labels the content as a work in progress. Import instructions and provenance are in `content/playbook/README.md` and `source-manifest.json`.

The earlier sales page is retained in `app/playbook/_components/storefront.tsx`; checkout, account, and protected chapter routes are unchanged. Future paid access must gate chapter data on the server before it reaches the client. `node --import tsx --test scripts/playbook-pagination.test.ts` verifies the snapshot boundary and lossless pagination.

### Files

```
.
├── app/                       # Next.js App Router
│   ├── admin/                 # Gated admin shell (Supabase-protected)
│   ├── api/                   # API routes (REST + MCP at /api/mcp[/...])
│   ├── blog/, projects/, channels/, hackathons/, leadership/, mentorship/, services/, career/, contact/
│   ├── layout.tsx, page.tsx, globals.css, not-found.tsx, sitemap.ts
├── components/
│   ├── admin/                 # Admin-only UI
│   ├── sections/              # Page sections (data-section scroll-spy targets)
│   ├── shell/                 # Push drawers, NavRegistry, AdminNavInjector
│   └── ui/                    # Primitives
├── lib/                       # Data access + helpers
│   ├── mcp-discovery.ts                       # MCP tool surface
│   ├── supabase-client.ts, supabase-server.ts
│   ├── projects.ts, channels.ts, blog.ts, career.ts, hackathons.ts, leadership.ts, mentorship.ts
│   ├── resume-versions.ts
│   ├── media.ts, website-docs.ts, rate-limit.ts, pill-access.ts, module-nav.ts, navigation-map.ts, utils.ts
│   └── shell/                 # Shell-architecture pieces
├── supabase/
│   ├── config.toml
│   └── migrations/            # Apply immediately on propose — Hard Rule 3
├── scripts/                   # seed-website-docs, migrate-sqlite-to-supabase, ...
├── proxy.ts                   # Root-level proxy entry
├── .mcp.json                  # Local MCP servers (Supabase only — read-only)
└── (no .github/workflows/ — no CI in-repo; Vercel build is the only gate)
```

## Definition of done — every change, human or agent

Before declaring any work shipped (sprint-sized or one-off fix):

- [ ] `npm run build` and `npx tsc --noEmit` pass (touched files).
- [ ] `npm run lint` passes.
- [ ] `npm run format:check` passes (or format run + reviewed).
- [ ] Manual verification step (from sprint spec or task) executed and noted.
- [ ] If `supabase/migrations/` touched: migration applied and confirmed (Studio query / schema diff).
- [ ] No secrets in commit; no `.env*` (except `.env.example`) staged; no new `ANTHROPIC_API_KEY` dependency.
- [ ] Commit message follows conventional prefix + scope + why-paragraph + Co-Authored-By trailer.
- [ ] Commit **and push** together (Hard Rule 8). Vercel will deploy on `main` push.
- [ ] EMDEE SPRINTS updated: sprint Close-out written; index moved Active/Queued → Recently shipped (and body relocated from `sprints/` → `logs/`); Ops Checklist updated if cross-cutting follow-ups remain.
- [ ] If the change touches code behaviour referenced in this file or EMDEE INSTRUCTIONS — both updated in the same commit.

## Editorial public site (SPR-115)

The public brand is the solopreneur’s playbook: **Money Mindset × AI Skillset**. The primary journey is `/playbook`, then following Edmund’s ongoing journey through `/this-week`, `/blog`, and `/projects`. Write in a personal, practising-in-public voice; do not imply already-achieved financial outcomes.

`app/editorial.css` defines the editorial layout; `app/themes.css` defines the signature #FACC15 yellow, light paper and dark charcoal palettes. Edmund explicitly requested light/dark modes on 2026-09-19, superseding the earlier light-only constraint. `components/editorial/FieldElements.tsx` owns reusable chapter heroes, the CSS book object and onward links; `Pillars.tsx` owns the interactive two-pillar spread. Public collection pages use `PageShell`; public detail pages opt into `editorial-reading`. The header Explore menu exposes the full public route catalogue on desktop and mobile. Keep the existing product reader’s pagination, touch/trackpad gestures and accessibility intact. Native cursor, visible keyboard focus and reduced-motion support are intentional. Admin navigation remains separate.

## Taste refinement (SPR-116)

The Taste audit and contextual brand exceptions are recorded in `docs/design/taste-audit.md`. Shared collection headers omit decorative numbering. The homepage uses `MotionDetails` for restrained book tilt and section movement, `ArticleSelection` for a featured article and supporting list, and `ReaderVoices` for manual testimonial excerpts. Preserve full source quotes and real publication dates. Motion respects reduced-motion preferences; touch readers retain a static book cover. The shared shell no longer repeats an onward-link block before the footer. Generated conceptual artwork is documented in the audit and must not be presented as Edmund’s actual desk or a physical product.

Theme preference follows the OS until explicitly toggled, then persists under `whatelz-theme-v1`. The root prepaint script and `ThemeToggle` must use the same key and accepted values. Preserve keyboard labels, reduced-motion support, and readable reader pages in both modes. Public legacy utility overrides are scoped to `.public-site`; the admin surface remains isolated.

## Subdomain surfaces

One Vercel project serves whatelz.ai (public), admin.whatelz.ai (admin), and app.whatelz.ai (members). `proxy.ts` refreshes and verifies Supabase cookie sessions before protected rewrites, forwards refreshed cookies and private cache headers, and checks stored roles on admin mutations. Legacy production `/admin/*` links redirect to the admin host. Local/preview `/admin` routes remain available. `/auth/*`, `/sign-in`, `/sign-up`, APIs and Next assets retain their paths. Clean admin links use `adminUrl`.

Google OAuth uses server-side PKCE through `/auth/google` and `/auth/callback`; redirect destinations are constrained to the current origin or the four production origins. Auth cookies share `.whatelz.ai` on the four known production hosts and stay host-only for local/preview hosts. Sign-out revokes the Supabase session. Google must be enabled in Supabase with its OAuth client credentials and callback allowlist; see `docs/supabase-google-setup.md`. Signed-in responses are never publicly cached. Admin layouts, API wrappers and Server Actions independently check `users.role`; user-editable auth metadata never determines permissions.

Stable `users.id` is the application identity; `supabase_auth_user_id` maps verified sessions to it. Sign-in never matches by email, grants admin roles or claims team nodes. New accounts retain the unauthorized default role. Historical Clerk IDs/columns remain solely for migration and old Stripe events; the Clerk SDK and login components are removed. Existing verified accounts require explicit provisioning/linking before cutover. Purchases, subscriptions and quiz history use separate internal owner columns, preserving the legacy columns during migration. No production cutover until Google setup, identity preservation and migration approval are complete.

Validation: `node --import tsx --test scripts/domain-routing.test.ts scripts/team-model.test.ts scripts/auth-routing.test.ts`, typecheck, changed-file lint, build, isolated migration tests and anonymous protected-route checks.

## Team relationships

Teams group sponsor trees. People have independent IDs and one optional direct sponsor in their team; PostgreSQL rejects self links, cycles and identity/team changes. Repeated names are allowed. Verified login accounts are linked explicitly to people. Admins see the full tree; members see their direct upline and downline branch; managers see their team. Filtering occurs on the server before serialization. Context notes are manager/admin-only; contact emails are admin-only. Team visibility never changes global roles.

Team screens offer Tree view and Node view with sponsor connectors, scroll, zoom, fit and reset. Admins/managers can select a reference person. Admins can edit optional contact emails and ABO numbers; ABO numbers are text to preserve leading zeros and appear in permitted views. Saving an email never claims an account or sends an invitation. Real names, email addresses, ABO numbers and sponsor placements must stay in Supabase or ignored `supabase/private/` data, never the public repository.

The team contact-details migration is applied. The Supabase identity migration was applied through the linked CLI on October 7, 2026 after explicit owner approval. The verified legacy account retains its internal ID, role and quiz ownership; Google sign-in and logout are verified on the PR preview. EMDEE behavior documentation requires a writable connection; do not claim it is updated until a write succeeds.

## Member product references (SPR-117)

The signed-in `app.whatelz.ai/catalogue` provides MY/SG product references, market switching, SKU/name search, category/brand filters, AP/RP and published PV/BV. It has no checkout. Member home and admin Network Marketing link to it. Source snapshots retain dates, checksums, page numbers and raw numeric cells; ambiguous rows remain excluded in review queues. Never derive PV/BV from prices, tax or exchange rates. The product_catalogue tables have RLS and no anon/authenticated grants; server reads require a verified application user. Evidence and refresh procedure: `docs/network-marketing/product-reference.md`. Mirrored in EMDEE INSTRUCTIONS under “Member product references (SPR-117)”.

## Community calendar (SPR-118)

The signed-in `app.whatelz.ai/calendar` is an imported Founder’s Club schedule with month/agenda views and activity/search filters. Preserve recurring schedules, exception dates, UTC+8, update sequence and cancellations using pinned ical.js 2.2.1. Import only allowlisted schedule fields; never share attendees, RSVP tokens or meeting credentials. Private tables have RLS/no anon/authenticated grants; page and loader require verified users independently. No RSVP or live sync. Source exports stay under ignored `supabase/private/`. Procedure: `docs/network-marketing/community-calendar.md`. Mirrored in EMDEE INSTRUCTIONS under “Community calendar (SPR-118)”.

## Calendar personas and date states (SPR-119)

Today uses Malaysia/Singapore UTC+8 and refreshes while open; past days are grey and ended events are reference-only. Oracle is Dick Lim alone; Catalyst has ABO + club membership; Spark has club membership without ABO; Guests attend by Catalyst invitation. Calendar persona assignments are explicit and admin-only at `/admin/calendar-access`, separate from application admin roles and team links. Unassigned accounts are Guests. The server filters occurrences before serialization; query-string persona previews only work for admins. Badminton/Captain Ball allow Spark and invited Guests; Monday/Wednesday classes, HQ tour/HQH and Intro/Gather/Collab allow Catalyst. Other audiences await confirmation and remain founder/admin review only. No automatic membership inference or invitation/RSVP creation. One Oracle account, explicit founder confirmation on assignment. Mirrored to EMDEE INSTRUCTIONS under this heading.

## Member Culture library (SPR-120)

The signed-in `/culture` reader exposes 超凡 / Ultra’s 15-chapter collection, Chinese search and chapter filtering. A versioned editorial snapshot preserves all 233 user-provided source occurrences as 231 distinct exact-text sayings. Source attribution is Edmund-provided; original wording and possible transcription errors remain unchanged. 顺育 / Soon Ye and Founder’s Club are empty collections. Shared member navigation links Culture from home, team, catalogue and calendar. No database migration, membership changes, runtime inference or generated interpretations. Source and refresh notes: `content/culture/README.md`. Mirrored to EMDEE INSTRUCTIONS under this heading.

## Member Leads system (SPR-121)

The signed-in `/leads` workspace is owner-private. Each lead has an independent ID, FC Central/Northern/Southern region, optional Guest/Spark status, ABO/APC goal, pipeline stage, personal story, relationship background, interests, concerns, sales notes and dated follow-up. Optional contact/birthday/zodiac fields are never inferred. Activities distinguish attended, planned and to-invite; manual history never creates RSVP or calendar bookings. Membership/status fields never grant access or create accounts/team links. Every loader and action independently verifies the application user and scopes all queries to stable users.id. Tables have RLS with no anon/authenticated grants; service-side access only. Composite ownership foreign keys and revision checks protect activities and concurrent updates. List queries are bounded and paginated. Real names, contacts and private stories stay in Supabase/ignored private files, never committed seeds or test fixtures. Initial profiles remain private; future team sharing needs explicit permissions.

EMDEE INSTRUCTIONS mirrors this section. The CLI token was rejected during release; the connected EMDEE MCP completed the version-guarded mirror successfully.

## Admin team profiles (SPR-122)

The admin `/team` surface defaults to a fitted fixed node canvas. Member edit forms and verified-account linking are collapsed initially. First activation opens one compact selected-person editor; a second activation of that same person (including double click/tap or repeated keyboard activation) navigates to `/team/[id]`. A visible Open profile link provides an explicit alternative, and Close clears the selection. Tree view uses the same interaction. Dedicated profiles show editable details plus direct upline/downline links. Existing verified-admin checks remain in pages, loaders and mutations; contact email/progress notes remain admin-only and no account grants are inferred. Member app interactions remain unchanged. Pan/pinch/drag click suppression remains intact; admin quick editing does not change graph dimensions. Mirrored to EMDEE INSTRUCTIONS under this heading.

## Sole owner administration (SPR-125)

Edmund owns Whatelzai permanently. The whole admin.whatelz.ai surface is private to his stable application users.id, configured server-side as WHATELZ_OWNER_USER_ID. lib/admin-policy.ts requires both this exact ID and a stored privileged role; role labels alone never grant administration. Missing/invalid owner configuration fails closed. Proxy gates admin page reads/writes and /api/admin on every host; layouts, actions, session API wrappers, OAuth issuance/redemption and active MCP token checks independently enforce the same policy. Owner-authorized scoped agent tokens remain supported; tokens bound to other accounts are rejected. Shared app.whatelz.ai membership and team permissions remain separate; privileged global team/calendar overrides are owner-only. Do not derive ownership from email, JWT/user metadata, login order, number of admins or automatic promotion.

Product metrics are independent authenticated connections into this personal command centre. Access to a sold/transferred product must be revoked at the source and its integration credentials removed here; ownership of Whatelzai grants no ongoing rights to another product. No cross-product database ownership assumptions. See docs/owner-admin.md for configuration and verification. — codex, 2026-10-19

## Daily workspace and admin navigation (SPR-124)

Admin `/` is Overview. `/command-center` redirects home; the former root website dashboard is `/site-dashboard` under AI Business. `Today` is `/today` with owner-only morning/evening editors, explicit operational commitments and connections. Canonical Markdown stays in EMDEE; SQL holds operational records and encrypted connection credentials only. Use the shared sole-owner policy, never a second productivity-only owner setting. Read docs/daily/README.md for OAuth, encryption, task lifecycle, source boundaries and run limits. Manual workflow only; no 8am/9pm schedules are enabled and existing ChatGPT schedules are unchanged. — codex, 2026-10-19

## Personal Daily and weekly reflection (SPR-126)

Canonical briefs live in EMDEE Personal `01-DAILY` (the first Personal branch), with `01-MORNING`, `02-EVENING`
and `03-WEEKS` children. Reauthorize the folder in Connections; old project-scoped
tokens cannot save new briefs. Vercel runs one combined prior Monday–Sunday
reflection every Monday at 08:00 Singapore. Originals remain intact; summaries
include source links/hashes and missing coverage. `/today/weekly` shows status and
bounded manual retry. The cron endpoint requires CRON_SECRET, production and the
configured owner's stored role; admin session policy remains intact. SQL stores
only execution metadata, never Markdown. See docs/daily/README.md. This explicitly
requested schedule supersedes the old blanket prohibition on in-repo jobs; daily
08:00/21:00 generation is still disabled. — codex, 2026-10-19

## Subscription-first personal Daily (SPR-127)

Personal Daily uses the existing ChatGPT cloud tasks at 04:30 and 21:00
Asia/Singapore. They read/write canonical EMDEE Morning/Evening records and verify
readback; Whatelzai loads the saved Notes when Today opens or refreshes. Progress
is never inferred as completed, and saving a brief never accepts commitments.
Both Run now tests saved records that production Today successfully displayed.
This verifies the tested execution path, not future unattended runs.

API generation defaults off unless DAILY_API_GENERATION_ENABLED is exactly true.
Daily actions, the shared generation module and weekly cron fail closed before
inference; the weekly job returns disabled before reserving attempts. Credentials
remain encrypted for eventual opt-in use. Monday API synthesis is paused; no
ChatGPT weekly replacement is configured. This supersedes earlier descriptions
of enabled weekly API generation and unchanged daily ChatGPT instructions.

OAuth setup must verify the selected EMDEE parent with the new credential before
storing it; a valid token for the wrong account must not count as a successful
connection. Never copy a personal CLI/chat token into application configuration.
See docs/daily/README.md. — codex, 2026-10-19

## ChatGPT weekly reflection (SPR-128)

The personal cloud task Weekly - EMDEE Reflection runs Mondays at 03:00
Asia/Singapore (first natural run 2026-10-26), superseding the previous paused
weekly plan. It reads the prior complete Monday–Sunday, saves one combined
WEEK-YYYY-Www child under EMDEE Daily/Weeks, verifies readback and retains
originals. Coverage and missing entries remain explicit; unavailable sources fail
closed and unknown outcomes stay unknown. API generation remains off.
The weekly page discovers the canonical EMDEE document independently of SQL
API-run status so externally written summaries display correctly. Existing API
metadata remains separate; the old daily 03:00 Distill is unchanged.
See docs/daily/README.md. — codex, 2026-10-19

## Member assistant (SPR-129)

See docs/member-assistant.md for stable ownership, verified 1:1 EMDEE OAuth
linking, mobile chat, private commitment tools and bounded API execution.
MEMBER_AI_ENABLED is independent of the personal Daily generation flag.
Admin /users is sole-owner gated; reset grants a fresh allowance without
erasing history. EMDEE remains a knowledge service with no AI inference.

## fcOS workspace (SPR-130)

app.whatelz.ai is fcOS, Founder’s Club Operating System. Mobile navigation: Today, Chat, Leads, HQH/HHH and Resources. Today reads only the signed-in member’s due follow-ups and accepted unfinished commitments. Resources retains products/calendar/culture/team. Chat adds bounded owner-private lead/note and permitted shared resource reads within the existing pilot, allowance and execution limits. Actual calendar membership is resolved server-side; tool input never supplies owner IDs or preview personas. EMDEE is optional; personal admin Daily remains separate.

Private HQH/HHH notes live in member_briefings, with RLS/no browser grants, independently verified server ownership, immutable identity, owner-validated lead references and optimistic revisions. Chat drafts enter a review form as reflections; explicit Save persists the record, and Reviewed is a human selection. No automatic sharing, RSVP, sponsor placement, account grants or commitment acceptance. Note list paginates 30 records, up to 20 leads per note; lead picker explicitly limits to first 200 own leads. Mirrored in EMDEE INSTRUCTIONS under “fcOS workspace (SPR-130)”.

## fcOS attention homepage (SPR-131)

The member root is an attention dashboard inspired by EMDEE: personal welcome, overdue/due follow-ups, accepted due/blocked/waiting commitments, private HQH/HHH drafts and permitted events from this month and next. Counts are exact with bounded lists and partial-source errors shown. No provider calls on page load; no inferred completions or RSVPs. API Chat is now Edmund-only: `memberActor` requires the configured stable owner ID plus privileged stored role before access lookup, reservation or provider use, even if another pilot account is active. Shared member leads, notes and resources keep their existing permissions.

## AI-business owner overview (SPR-133)

Admin root prioritizes accepted AI-business commitments, overdue/blocked/waiting
attention, saved personal Daily previews, marketing review queues and product
signals. `lib/admin-overview/server.ts` independently checks the configured owner
before every source. Missing sources stay unknown; proposals, deferred work and
other lanes never become accepted focus automatically. All reads are bounded or
exact aggregate counts; no inference or publishing runs on load. Existing Daily
schedules, owner/member access and app.whatelz.ai behavior remain unchanged.
Local active accounts and website visitors are distinct metrics; unmeasured ARR
and workspace counts are null. Remote product contracts are validated and stale
snapshots flagged. See docs/admin-overview.md; mirrored in EMDEE INSTRUCTIONS.

## fcOS navigation and linked notes (SPR-132)

The mobile member navigation is fixed at the bottom: Leads, Chat, raised central Home, Resources, Profile. Notebook, calendar, team, catalogue and culture select Resources; desktop retains a top row. fcOS-only bottom padding and viewport safe areas prevent content overlap. `/profile` is a focused fcOS identity page; public commerce account pages stay separate.

One `member_briefings` record links to own lead IDs and optionally a verified calendar occurrence (`event_key`, `event_month`). Resources, lead profiles and `/calendar/event` all open that same note; calendar links are checked with the real membership, never admin preview. Unlinked class/event names remain supported. Notes stay private until explicit sharing to a named existing account linked to the permitted team. Recipients get read-only access to saved note text and future saved edits, with no lead IDs, profile/contact data, chat context or recipient list. Owners can revoke access; shared notes are browsable under Resources → HQH & HHH → Shared with me. No email/invitation/automatic account linking. New grants table has RLS with browser grants revoked; server authorization, composite ownership FK and existing immutable-note/lead constraints enforce boundaries.

## Focused fcOS Chat (SPR-134)

Chat opens the newest created conversation and scrolls to its latest message, or shows an immediately editable blank slate. `?new=1` is ephemeral: a conversation is created through an independently owner-gated action only on first send; retries retain its ID and request idempotency key. A small header opens a native modal menu for history, allowance, commitments and optional connections. Main canvas contains only transcript/blank greeting and a compact composer clear of the raised Home navigation. Note-review links are collapsed per reply; commitment acceptance remains explicit. No schema, model, quota, API-origin or owner-access changes.

## Admin Daily Markdown reading (SPR-133 follow-up)

Overview, Today and weekly reflection render canonical Notes with React Markdown/GFM.
Today keeps source editing behind Edit Markdown; empty entries open the writer.
Tables scroll within their container on phones; overview previews scroll without
cutting Markdown syntax. No raw HTML or remote image fetching; no source mutation.
See docs/admin-overview.md; mirrored in EMDEE INSTRUCTIONS.

## Read-first Today (SPR-133 follow-up)

Today reads rendered briefs without briefing editors or Save to EMDEE controls.
Missing entries show a short message; yesterday’s handoff and optional commitment
forms are collapsed. The page no longer reads OpenAI credentials. Canonical EMDEE
writes, schedules, permissions and existing actions remain unchanged. This supersedes
the preceding Today source-editor UI description. Mirrored in EMDEE INSTRUCTIONS.

## fcOS installation (SPR-135)

Only the app surface links `/fcos/app.webmanifest`, with canonical app origin identity/scope/start URL, standalone display, PNG/maskable icons and Apple home-screen metadata. The app shell captures `beforeinstallprompt` across navigation; Profile exposes native installation or platform instructions and standalone state. The app-only shell registers `/fcos-sw.js` for older Chromium install promotion. Its fetch handler is strictly network-only and stores no offline private-data cache. Auth and member API gates remain unchanged; the app requires a network connection.

## Simple install control (SPR-136)

Profile shows one Install fcOS button, hidden when installed. A captured native prompt opens directly; otherwise platform guidance appears only after tapping, in a native accessible dialog with Escape/close and focus restoration. iOS continues to require Safari Share/Add to Home Screen; there is no fabricated install URL.

## Private daily routine library (SPR-133 follow-up)

Owner `/today/routines` reads three allowlisted, versioned SKILL.md sources from
EMDEE Personal Daily/04-Routines. Personal instruction bodies stay out of the public
repo. Detail pages render Markdown and owner-gated downloads return identical
normalized sources with private/no-store headers. Skills and schedules remain
separate; existing cloud task prompts/jobs are unchanged. Unknown sources do not
fall back to fabricated instructions. See docs/daily/README.md; mirrored in EMDEE.

## Mobile fcOS Chat (SPR-137)

ChatViewport follows the mobile visual viewport height/offset, removing bottom navigation and its reserved padding while the software keyboard occupies the viewport. It restores navigation on keyboard dismissal and excludes pinch zoom/toolbars from detection. The chat shell uses overflow:clip to prevent browser focus scrolling of the entire page; only the transcript scrolls. Composer-specific focus CSS removes the nested textarea rectangle while retaining a rounded group focus border and other control outlines. The owner pilot now selects existing GPT-6.1 Sol Responses support with low reasoning; the US$5 allowance, reservations, ownership and conversation history are preserved.

## User activation and assignment (SPR-139)

Admin Users classifies a registered account explicitly linked to the fcOS tree as
Activated; a tree person without a signed-in linked account as Not activated;
and a registered account without a tree link as Not assigned. Stable users.id
and explicit business_team_accounts links determine access, never names/emails
or AI allowance flags. The complete bounded directory paginates and fails if
source reads are incomplete; no partial join is labelled unassigned.

Unassigned users see /pending-assignment. Proxy gates app pages/actions, and
private leads/notes/calendar/catalogue/Chat loaders independently check assignment.
Owner admin remains independent; Chat retains its stricter owner/pilot gates.
Assignment is owner-only, verified-account, insert-only; no automatic invitations,
placement changes, AI allowance grants or identity matching. AI controls remain
a secondary admin section. See docs/user-activation.md; mirrored in EMDEE.

## Member Profile and Usage (SPR-138)

`/profile` uses a mobile orange welcome/avatar, verified calendar persona and fcOS Member Pass, with Profile/Usage links (`?tab=usage`). Profile alone opts into orange navigation/install accents; existing app tabs retain yellow. No invented points, streak, next tier or automatic team linking. `loadProfileData` independently verifies identity and scopes every membership/access/cycle/reset read to that immutable users.id, never accepting a target account. Usage shows current allowance spent/reserved/remaining, Singapore renewal, actual latest admin reset/count and 20-cycle history. Expired cycles stay historical; read-only monthly projection never resets credit. No provider/key access, quota write, access grant, self-reset or inference from this view. Unavailable data is explicit; owner-only Chat remains independently enforced.

## Activated Chat and credit resets (SPR-141)

Every registered account linked to the fcOS tree can use AI Chat. This supersedes
owner-only Chat and separate enrollment descriptions. The service-only enrollment
RPC verifies activation and provides the normal US$5 baseline without changing
existing cycles/history/models. Reservations recheck activation. Admin remains
sole-owner; private member records and provider credentials retain their boundaries.

Owner Users supports selected-member/all-activated full (US$5) or half (US$2.50)
resets after reviewing targets and total. One transaction validates live assignment,
compares current-cycle IDs, locks in stable order and creates audited fresh cycles;
a stale or failed batch rolls back all. Reset replaces remaining credit rather
than adding it; old spend/reservations remain and monthly baseline stays US$5.
No reset is issued on page load or during deployment. See docs/member-credit-resets.md;
mirrored in EMDEE INSTRUCTIONS.

## Conversation-first Chat sidebar (SPR-140)

Chat’s native modal drawer contains New chat, title/date search across the latest 30 owned conversations, selected history and a small Profile/Usage link. Usage stays in Profile. Commitments are at `/assistant/commitments`, linked from Home and owner Resources alongside the optional knowledge connection. No inference or conversation creation on navigation; first-send creation and all owner/assignment/access checks remain intact. Projects and further harness automation are deferred until their context and sharing boundaries are defined.

## Weekly percentage usage (SPR-142)

The baseline is now internal US$1 per seven-day window (full reset US$1 / 100%, half US$0.50 / 50%), superseding SPR-141's monthly amounts. Profile Usage exposes percentages and a live countdown, never dollar amounts. Exact reset timestamps use Singapore time. Current-cycle spend/reservations and historical records are preserved on conversion. New members start a seven-day window on first send; expired windows roll forward on the existing anchor without credit accumulation. Read-only projection and reservation SQL agree. Owner resets restart the seven-day clock; a partial grant is measured against the normal weekly baseline. No member self-reset entitlement is invented. Apply migration 20261022053300 after 20261022053000 before publishing code.

## Admin phone app (SPR-144)

The admin host links its own `/admin-pwa/app.webmanifest`, yellow W icons and Apple home-screen metadata. Canonical identity/scope remain admin.whatelz.ai; standalone launch opens `/today`. Shared install UI retains fcOS defaults; only the admin shell supplies Admin identity and `/admin-sw.js`. Installation is available in the owner sidebar and Settings, with native Chromium prompting or iPhone/iPad Share-menu instructions. Closed mobile navigation is inert; touch targets and safe-area padding accommodate phones. Owner proxy/layout/action checks remain unchanged. The admin worker is network-only: no private offline cache, persisted snapshots, background sync or queued mutations. Failed navigation receives only a generic no-store reconnect page; API failures propagate. Requires network and owner sign-in. See docs/admin-pwa.md; mirrored in EMDEE INSTRUCTIONS.

## Streamed Markdown Chat (SPR-143)

Assistant replies render safe GFM (tables/lists/links/code/bold); tables/code scroll within the message and remote images/raw HTML do not execute or auto-load. The member client requests NDJSON and displays real Responses output_text deltas, not delayed typing animation. Tool arguments/results remain server-side. Terminal provider usage is validated before receipt settlement; done is sent only after persistence. Next after() tracks generation/settlement if a browser disconnects, within the existing route duration; an interrupted provider stream retains the uncertain reservation. Existing request IDs deduplicate retries; incomplete drafts cannot be saved/accepted until persisted server messages refresh. JSON compatibility, tree activation, rate/budget/call bounds and privacy are unchanged. Scroll follows new content only while near the bottom.

## Priority leads and plans (SPR-145)

Leads presents owner-private priority cards first, upcoming plans grouped over consecutive same-event/status dates, and other leads in a collapsible list. Search/filter and add forms stay collapsed until used. Priority can be changed from the profile using verified owner + revision guards; it never changes membership/access. Tentative is a distinct activity status, displayed as Maybe, never attendance. Upcoming plans are bounded, owner-scoped and restricted to the displayed lead IDs; failures are explicit. Historic and overdue activities remain in profiles without inferred completion. Apply 20261022061236_priority_leads before publication. Personal lead/event data belongs in the database, not migration source.

## Calm lead profiles and explicit visibility (SPR-146)

Leads use profile cards with initials/private uploaded photos and concise overviews; editing, history and HQH/HHH are collapsed. Explicit per-recipient visibility is private by default, selected leads or all current/future leads, read-only and revision guarded. Activated team position alone grants nothing. Contacts/private remarks/activity notes/linked briefings/chats stay private. Profile/photo/Chat reads independently verify the assigned session and current grants; owner mutation boundaries are unchanged. Private storage has no browser policies or public URLs; authenticated photo responses are no-store and uploads are decoded/resized/metadata-stripped via pinned sharp 0.34.5. Chat prioritizes own leads and includes bounded actual activity statuses; tentative/planned never means attended. No sharing is seeded. See docs/lead-profiles.md; apply 20261022064708 before publication.

## Mobile lead controls (SPR-147)

Lead forms/search/sharing use MobilePicker: a native modal dialog with rounded option buttons, current selection, keyboard arrow/Home/End navigation, Escape dismissal and focus restoration. The hidden form field preserves existing names/values and server validation; opening/cancelling never saves. Lead-scoped styles replace the public gold outline with a soft local focus ring, 48px fields, rounded disclosure chevrons and muted borders. Public/admin styling and all data/access rules remain unchanged.

## Baobeis list (SPR-148)

Member /leads and navigation are labelled Baobeis. The default list shows title, plus-button add dialog, rounded search bar and cards without introductory text, counts or priority section headings. Search submits on Enter. The sharing toolbar is removed; existing grants/permissions remain unchanged. Add uses the same owner-verified action in a native modal, with nested community picker and cancel/focus restoration. No record is created until submission.

## Shared Admin navigation (SPR-149)

All admin pages share `AdminNavigation` in the owner-guarded admin layout. It supersedes the left sidebar/hamburger with a sticky, horizontally swipeable workstream strip (Overview, AI Business, Network Marketing, Day Job) and a fixed Users | Home | Settings bottom bar. Home opens Overview; Today remains a header shortcut. `lib/admin-navigation.ts` maps clean host and preview `/admin` paths plus deep tools to their owning workstream/tab. Users and Settings do not highlight a workstream. Native header scrolling only reveals links; it never changes pages by itself. Active sections scroll into view on change, content clears the bottom bar and both bars account for safe areas. Install/sign-out live in Settings. PWA launch/identity, owner checks and member navigation remain unchanged. See docs/admin-navigation.md and mirrored EMDEE INSTRUCTIONS.

## Shared fcOS tab shell (SPR-150)

Five roots use AppHeader with consistent title/spacing and page action slots: Baobeis add, Chat history/new-chat, Profile sign out. Their headers and persistent bottom tabs stay visible; ordinary pages retain document scrolling. Chat keeps its independently scrolling transcript, visual-viewport composer and keyboard nav hiding. Shared safe-area offsets keep content clear. Native browser pull refresh is left alone on normal pages. Standalone app and contained Chat use an explicit single-finger downward-pull fallback only at scroll top: threshold/release, horizontal/pinch/modal/editing/streaming/cancel guards, and router.refresh without inference, writes, hard reload or draft loss. See docs/fcos-tab-shell.md. Real handset gesture QA remains separate from desktop automation.

## Intentional Resources (SPR-151)

Resources uses two compact HQH/HHH creation actions, grouped Notes & events and Learn & grow rows, and a collapsed owner-only Personal tools disclosure. Existing notebook/calendar/catalogue/culture/team destinations, permission gates and shared pinned tab shell are preserved. No data/model/schema changes. Mirrored in EMDEE INSTRUCTIONS.

## Quiet Profile Usage (SPR-152)

Profile removes the Grow with intention card. Usage omits the welcome block and model/explanatory copy, keeping weekly remaining percentage, progress bar and live renewal countdown. Resets/history are collapsed by default; in-flight usage appears only when nonzero. Quotas, private identity-scoped loaders, renewal and admin-reset authorization are unchanged. Mirrored in EMDEE INSTRUCTIONS.

## Member reset credits (SPR-153)

Profile Usage shows whole-number percentages and minute countdowns, plus Available/History reset links. Every existing/future user gets one lifetime full-reset credit (seven-day expiry; SPR-154); signup insert trigger and unique user constraint prevent repeat grants. Redemption is explicit, verified assigned-session only, account-scoped and atomic with a new USD1 seven-day cycle. Access-row/credit locks, expected-cycle guard, reservation guard and replay returning the recorded result prevent duplicated reset spend. Service-only invoker functions and RLS deny browser database access. Existing admin reset/access/provider/history behavior remains. Apply 20261022095557 before publication; see docs/member-credit-resets.md. Mirrored in EMDEE INSTRUCTIONS.

## Reset credit expiry (SPR-154)

Reset credits have stored non-null expires_at, defaulting to seven days from grant. Existing credits are backfilled from original granted_at, without grants, balance changes or extension on sign-in. Available filters expired unused credits; History retains expired/used records and expiry is shown in Singapore time. The locked redemption function rejects unused credits at/after database clock expiry, while used replay still returns its recorded cycle. Apply 20261022100901 before publication. Mirrored in EMDEE INSTRUCTIONS.

## Whatelz brand identity (SPR-155)

The approved rounded W/smile mark is canonical in public/brand/identity.json, with #FACC15 yellow, #18181B ink and #FFFCF5 paper. WhatelzMark reads the shared vector; generate-brand-assets.mjs exports SVG/outlined lockup/PNG/ICO and Admin PWA artwork. Public header/footer, browser favicon and Admin header use this identity. Admin Settings links the owner-only design-system library. Versioned Admin icon URLs refresh caches without changing manifest identity/scope/launch. Existing iOS installs may require re-adding for new home-screen art. fcOS retains its own identity. See docs/brand-identity.md.

## Admin area dropdown (SPR-156)

The shared Admin header now uses one top-right active-area disclosure for Overview, AI Business, Network Marketing and Day Job. It replaces Today and the horizontal workstream strip. Native disclosure/links retain keyboard navigation; selection, outside press, Escape and route changes dismiss it. Utility pages identify Users/Settings without false workstream selection. Today remains linked from Overview. The Users | Home | Settings bar, owner policy, URLs, brand and PWA identity remain unchanged. See docs/admin-navigation.md.

## Admin Push notifications (SPR-157)

Owner Settings supports per-device opt-in, status, test and disable. Permission is requested only on an explicit tap; iOS/iPadOS requires the installed home-screen app. Subscriptions are encrypted with the existing Daily integration key, browser-denied/RLS, and registered only through sole-owner same-origin Admin APIs. VAPID signing uses independent Production keys; no inference or OpenAI key is involved. A production-only CRON_SECRET-protected five-minute check reads the three canonical EMDEE routine paths and alerts only on nonempty, timestamp-verified entries saved after device opt-in. Per-device/document SQL claims deduplicate completed sends and bound retries; generic tags mitigate ambiguous transport retries. Expired endpoints are disabled. Notifications contain no private briefing text, and click destinations are restricted to Today/weekly/Settings. Existing ChatGPT schedules, source documents, personal API-off policy and member app remain unchanged. See docs/admin-push.md; migration20261024072128.

## Responsive Admin workspace (SPR-158)

Admin uses a bounded 1440px workspace. At 1024px and above Users/Home/Settings move into the header; smaller screens retain the safe-area bottom dock. The active-area dropdown remains shared. Overview uses a desktop priorities/signals grid, bounded rendered briefing previews and compact product snapshots with full metrics in disclosures. Today uses paired briefing columns at desktop width. Mobile remains one-column where appropriate. No data, authorization, PWA or push behavior changes.

## Admin interaction feedback (SPR-159)

AdminLink preserves Next Link props and uses useLinkStatus for actual pending navigation, with a pressed-link outline and nonblocking status. Root and Today/Users/Settings loading boundaries show neutral skeletons inside the owner-gated shell. Overview also uses the shared placeholder during source reads. Brief CSS section/disclosure fades are bounded and disabled for reduced motion; no artificial data delays or fake progress. Route errors provide retry without exposing private diagnostics. User assignment uses form pending feedback; existing write guards remain unchanged. See docs/admin-navigation.md.

SPR-159 navigation verification exposed Settings cloning a server-provided button inside SignOutButton, which fails on client route transitions. Settings now uses SignOutButton’s own client-rendered button with optional className styling; sign-out behavior and auth gates remain unchanged. Do not pass server-rendered button children for cloning in this route.

## Faster Admin reads (SPR-160)

Overview verifies owner before starting independent read promises and streams priorities, briefs, growth and each product under separate Suspense boundaries. Attention waits for all relevant sources before claiming no issues. Today streams its static title before its workspace. Each Daily request reuses its verified EMDEE connection; exact get_doc replaces list-plus-get, with only explicit missing codes treated as absence. Auth/transport/errors remain failures; write hash/readback guards unchanged. Active/completed Daily queries run in parallel. Owner-partitioned server Data Cache revalidates successful product metrics after 60s, with background revalidation and visible read timestamp; no auth, credentials, tasks, briefs or mutations cached. Source timing logs contain static labels/duration/outcome only. Overview sends the first complete Markdown section as a preview; Today retains full content. See docs/admin-overview.md.

Live EMDEE missing-document compatibility: exact get_doc reads may return JSON-RPC -32603 with message `no such doc: <requested path>`. Only that exact message/path pair or explicit not_found/no_such_doc codes becomes absence. Other -32603 failures, auth and transport errors remain unavailable; no discovery fallback or extra round trip is added.

## Scheduled Admin focus (SPR-161)

The selector has Overview, Personal, AI Business, Network Marketing and Day Job. Personal links to Daily, weekly reflection and routines. An owner-scoped client focus provider uses Asia/Singapore blocks: weekdays08–09 Personal,09–18 Day Job,18–19 Personal,19–22 Network Marketing; weekends09–18 AI Business; all gaps Overview. Fresh Home entry and unanchored standalone Today launch follow schedule; explicit deep links stay intact. Timers and foreground/pageshow checks catch up at boundaries. Manual space selection/back navigation overrides until the next block by default, with an optional pause-until-resume policy. Settings edits/validates a per-device timetable, enabled state and override policy; only these nonsensitive preferences use localStorage, override is per-tab sessionStorage. No private documents are cached. Users/Settings, dialogs, editable focus and dirty forms defer automatic navigation with a Switch now prompt. Manual navigation remains available; all server authorization stays unchanged. See docs/admin-focus.md.

## Calm Admin Settings (SPR-162)

Brand & design system belongs to AI Business, including active navigation state; its existing URL stays stable. Settings focuses on preferences, notifications, daily rhythm, installation and account controls. Technical access links are tucked into closed-by-default Advanced; inline MCP connection instructions are removed. Keep owner-facing copy short and avoid onboarding explanations in this personal workspace.

## Scheduled focus notifications (SPR-163)

Settings uses a compact per-device push switch, with test and sound help under Notification options. The existing enabled device remains enabled. One-minute server cron dispatches actual Singapore timetable transitions while the PWA is closed; EMDEE routine checks stay every five minutes and independent failures do not block focus alerts. Timetables mirror to private push subscription rows through owner-only same-origin validation; browser table grants remain denied. No-op sync preserves activation time. Durable per-device/block claims, five-minute eligibility window and 60-second TTL avoid duplicates and stale catch-up; unchanged spaces at midnight do not alert. Auto switching pause suppresses focus alerts; manual block overrides do not suppress reminders. Phone/browser manages sound; the web app cannot choose a custom ringtone. Reopen PWA after release for worker and timetable sync. No paid inference or private offline caching. See docs/admin-push.md.

## Retired Developer tooling (SPR-164)

Developer tooling is retired: no Inngest/quick links, endpoint inventory or singleton PAT controls. `/admin/developer` redirects to Settings for old bookmarks; remove links from Settings and legacy nav. Never recreate/display `system_config.mcp_token`; current MCP authentication uses hashed, scoped, revocable `auth_tokens`. Cleanup deletes only the unused singleton row, preserving OAuth signing secret and current tokens/endpoints.

## Admin preferences and flat Settings (SPR-165)

Settings uses a flat divided list, with appearance (light/dark), text size, English/Simplified Chinese, push, collapsed timetable, installation and advanced access. My Profile belongs to AI Business, including active navigation, with stable URL. Preferences are versioned owner-keyed per-device localStorage with session fallback; they do not change auth or schedule source semantics. Admin-only CSS scopes dark colours and rem sizing; public/member surfaces remain unchanged. Translate Settings/shared navigation and area-link labels; private Markdown, editable content, product names and canonical schedule identifiers remain original. Do not claim the entire legacy admin CMS is translated.

## Reading-first Admin (SPR-166)

Keep Admin calm: accepted focus first, supporting context and tools behind native disclosures, flat divided lists instead of per-item cards. Today puts commitments before Morning/Evening reading tabs. BriefDocument reveals original H3 sections with the full original entry available; highlighted source actions remain proposals unless accepted in the task system. SprintFocus selects only accepted, open, due commitments for the current lane, showing one first and others on demand. No invented priorities, source writes, auth changes or private caching. Admin-only typography/layout and preview-first ContentEditor apply across management pages; preserve form boundaries and sensitive controls. See docs/admin-reading.md.

## Personal and business-owned People (SPR-167)

Permanent Admin tabs are Personal | Home | Settings. Home’s selector has Overview, AI Business, Network Marketing and Day Job; Personal/Settings show a plain label. Existing member /users routes belong to Network Marketing → People, preserving URLs, account/credit actions and owner gates. Keep adminFocusSpaces separate from adminWorkstreams: Personal stays valid for manual navigation/overrides; legacy saved timetable blocks resolve to Overview on both client and server. User-management routes remain protected from automatic boundary navigation. AI Business customer users remain a separately defined future feature.

SPR-167 steering: Personal is manual-only. Former Personal timetable blocks resolve to Overview, including legacy device/server schedules. Settings offers only the four Home workstreams for scheduling. Preserve manual Personal navigation and suppress unchanged Overview-to-Overview alerts.

## Personal Mandala (SPR-168)

Personal links to an owner-only /personal/mandala reader. It calls dailyOwner before loading the existing EMDEE connection and reads one fixed canonical Dream/Mandala path with no-store. No new credentials, client-side vault calls, private source snapshots in the repository or task generation. Source H3 sections and complete original document remain available; optional 9×9 grid is shown only if all eight ordered areas have eight ordered cells. Display draft provenance and open decisions; approved plan is not execution evidence. No quarters/seasons assigned. See docs/personal-mandala.md.

## Mandala reading layout (SPR-169)

Mandala is a dedicated reader, not an EMDEE heading accordion. Keep the shared Admin shell; present source-derived goal figures, one selected life area with eight visible actions, separate Money & time, full grid and full original-record views. Desktop index/reading columns become a labelled area selector and single-column reading on mobile. Retain approval provenance, all supporting detail, original source, parser fallback and owner-first fixed-path no-store reads. Goals remain targets, not achieved income. No source or task mutations. Taste app-screen direction editorial-greeting seed 105231933, keeping existing brand/type and shell. See docs/personal-mandala.md.

## Admin workspace reading layouts (SPR-170)

Overview exposes its independently streamed reading, attention, AI focus, growth and product sections directly. Shared AdminArea leads with current focus and presents grouped tools through a labelled category index with immediate local selection; all destinations remain. Settings uses reading, notifications/rhythm and app/account sections in desktop label/control columns, stacked on phones. Preserve source semantics, owner authorization, navigation, timetable and notification controls. Taste editorial-greeting seed 667337762 keeps existing identity/type and user-defined shell. See docs/admin-workspace-design.md.

## Weekly focus ledger (SPR-171)

Supersedes SPR-170 panel layouts: compact Overview shows Singapore week, accepted due/carried work per lane, next accepted actionable sprint and independently streamed routine status. In-memory focus view neither mutates nor completes work and protects against automatic space switches. No metric/draft reads on Overview; product metrics live under AI Business/operations. Settings narrow compact rows; timetable DOM mounts on open. Shared dropdown remains custom rounded details/anchors with keyboard/outside/Escape behavior. Plain grouped lane tools; Day Job source-backed work/deadlines/blockers and confirmed boundaries. Preserve loading/pending feedback, reduced-motion progression, owner gates and all existing device controls. See docs/admin-weekly-focus.md.

## Chat images and dictation (SPR-173)

Chat supports two previewed images per message and up to 60-second microphone dictation. Server-normalized metadata-free WebP images stay in private Storage, owner-scoped history routes and the latest-two-image model context. GPT-Transcribe returns editable text without auto-send; raw audio is not persisted. Service-only image binding and dictation ledger RPCs preserve weekly reservations, replay protection, uncertain holds and original-cycle settlement across resets. Existing Resources access and explicit note/proposal actions remain; attachments never auto-save Baobei facts or share data. See docs/member-assistant.md. Physical handset microphone QA remains required.

## Admin passkeys rollback (SPR-172)

Passkeys were removed at Edmund’s request. Admin uses the existing Google sign-in and stable sole-owner authorization. Supabase passkey authentication is disabled; there is no passkey enrollment or sign-in UI, route or experimental client opt-in. Preserve the existing PWA, sessions and Google flow.

## Database-owned fcOS knowledge (SPR-174)

Supersedes bundled Culture content in SPR-120. Editable business knowledge belongs in Supabase, not application imports or seed SQL. Shared references use member_knowledge_collections/entries (text + bounded JSONB metadata; original source provenance excluded from reader/Chat). Culture reader and Chat share an assigned-user, published-only paginated loader with no content fallback. Collection labels/teachers/chapters/sayings are data. Existing Baobei and HQH/HHH prose remains in private text columns; additive metadata JSONB supports variable attributes without changing ownership/sharing. Product prices/PV/BV remain authoritative relational facts. Import tooling is service-only, insert-only and atomic with exact verification. No semantic embeddings or new lesson editor implied. See docs/fcos-knowledge.md.

## First-exchange Chat titles (SPR-175)

New successful member exchanges schedule one nonblocking GPT-6 Luna title job via existing OpenAI credentials. Send bounded first-exchange text only, no tools/images/Resources; keep main Chat transport/model unchanged. Service-only title claims/outcome ledger ensures at-most-once inference, private owner binding, quota caps and compare-and-set preservation of custom titles. Empty chats stay placeholders; failure never breaks the saved reply or retries automatically. Sidebar opening refreshes titles. Title costs are capped platform overhead, not member weekly allowance. Backfill uses the same model/job path and an explicit single-owner scope; no automatic all-user backfill or Haiku/Gateway billing setup. See docs/member-assistant.md.

## Team-visible Baobeis and HQH/HHH (SPR-176)

Explicit 2026-10-27 user policy supersedes private-by-default Baobei/briefing reads. Same assigned fcOS team reads existing/future team-visible records by default; owners alone edit. Per-record Only me overrides grants; existing recipient exclusions remain. Hidden linked Baobeis suppress the whole note for other readers. Service-only permission RPCs govern lists, detail/photo routes, linked context and Chat; browser grants stay denied, chats/vaults/contact fields/private remarks stay private. Notes may link visible sideline Baobeis without ownership/sponsor changes. Chat includes two bounded permitted linked notes per profile. Import real names operationally only, with introducer metadata. See docs/team-baobeis.md.

## Responsive fcOS navigation (SPR-177)

Member route loading shells are data-free and retain the header/nav. MemberLink reflects real Next pending navigation; New Chat uses a router transition. Do not force full private-data prefetch or simulate progress. App root skips unused public identity/admin-link reads; page/API/session gates remain. Own/team Baobei reads and authorized profile/history reads run concurrently. Linked notes stream separately. Optional profile/activity editor modules mount on first disclosure expansion and remain mounted across collapse to preserve drafts. Core Chat stays eager; no persistent private caching, schema or inference changes. See docs/fcos-performance.md.

## Member team default (SPR-178)

The member team page opens in Node view by default. Tree view remains selectable; admin retains its explicit Node view default. Sponsor relationships and member levels remain database-owned. — codex, 2026-10-27

## Compact team nodes (SPR-179)

Node view uses 88px name-only circles and straight sponsor connectors on member/admin surfaces. Explicit two-name ampersand labels render as two slightly overlapping circles, retaining one stored identity and sponsor link; no relationship inference or data split. Subtree layout measures actual single/pair widths. Member view starts centered on the selected person at readable scale; admin retains its initial overview fit. Selection reveals details; pan/pinch/zoom and admin quick-edit/repeat-profile behavior remain. — codex, 2026-10-27
