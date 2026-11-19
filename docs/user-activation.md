# User activation and assignment

The owner Users page combines the fcOS tree (`whatelz-network`) and registered
application accounts using stable `users.id` links in `business_team_accounts`.
An email on a tree profile is contact information, not an authenticated account.
Changing an account email does not change its tree assignment.

| State         | Evidence                                                      | Member app access                        |
| ------------- | ------------------------------------------------------------- | ---------------------------------------- |
| Activated     | Registered email/auth identity plus explicit tree-person link | Existing role/resource permissions apply |
| Not activated | Tree person without a registered linked account               | No account access                        |
| Not assigned  | Registered account with no tree-person link                   | Pending-assignment page only             |

Counts use a complete roster, fetched in stable pages of 1,000 with exact counts.
The directory fails visibly on query errors, incomplete pages, changed counts or
more than 10,000 records per source. The screen filters/searches and paginates
30 records; no partial source is treated as an unassigned account.

The owner can explicitly link an unassigned registered account to an unlinked
person. The existing insert-only action verifies the stored auth mapping before
insertion. Composite foreign keys and uniqueness reject stale/duplicate links;
there is no replacement, fuzzy matching, invitation or automatic role elevation.
Tree placement and stable identities remain unchanged.

The app proxy gates member pages and page actions; GET/HEAD on the pending page
can finish onboarding without exposing member resources. Pending-page POSTs do
not bypass the gate. Lookup failures deny access. The page verifies the session
again and records a new registered account through the existing sign-in sync.
Leads, notes, catalogue, calendar and Profile/Usage data loaders and mutations independently
require assignment. AI Chat checks assignment after its existing owner rule and
before access lookup/reservation/provider use. Existing owner administration and
public website/customer account flows remain independent of tree assignment.

Tree activation also grants AI Chat eligibility and the normal US$5 monthly
allowance (SPR-141), superseding the former owner-only Chat pilot. Private data
and calendar permissions still apply per member. Global service availability
remains controlled by MEMBER_AI_ENABLED. See docs/member-credit-resets.md.
