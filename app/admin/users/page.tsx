import { AdminSubmit } from "@/components/admin/AdminSubmit";
import { CreditControls } from "./CreditControls";
import { loadActivatedCredits } from "@/lib/admin-users/credits";
import Link from "@/components/admin/AdminLink";
import { loadUserDirectory } from "@/lib/admin-users/server";
import { statusLabels, type DirectoryStatus } from "@/lib/admin-users/model";
import { adminUrl } from "@/lib/admin-url";
import { linkTeamAccount } from "../team/actions";
import { AIAllowances } from "./AIAllowances";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "People — Network Marketing — Admin",
  robots: { index: false, follow: false },
};
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const directory = await loadUserDirectory();
  const params = await searchParams;
  const status = Object.keys(statusLabels).includes(params.status ?? "")
    ? (params.status as DirectoryStatus)
    : null;
  const q = (params.q ?? "").trim().slice(0, 160);
  const filtered = directory.entries.filter(
    (entry) =>
      (!status || entry.status === status) &&
      (!q ||
        `${entry.name} ${entry.account?.name ?? ""} ${entry.account?.email ?? ""} ${entry.person?.email ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 30));
  const page = Math.min(
    pages,
    /^[1-9]\d{0,4}$/.test(params.page ?? "") ? Number(params.page) : 1,
  );
  const href = (nextStatus: DirectoryStatus | null, nextPage = 1) =>
    adminUrl(
      `/admin/users?${new URLSearchParams({ ...(nextStatus ? { status: nextStatus } : {}), ...(q ? { q } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) })}`,
    );
  return (
    <div className="space-y-7 text-zinc-950">
      <header className="rounded-3xl bg-yellow-300 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest">Member access</p>
        <h1 className="mt-3 text-3xl font-semibold">People</h1>
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-zinc-500">
            Activation rules
          </summary>
          <p className="max-w-2xl text-sm leading-6">
            A person in the tree becomes activated when their signed-in account
            is explicitly linked. Names and email matches never assign access
            automatically.
          </p>
        </details>
      </header>
      <nav aria-label="Activation status" className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(statusLabels) as DirectoryStatus[]).map((key) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={status === key ? "page" : undefined}
            className={`rounded-2xl border p-5 ${status === key ? "border-zinc-950 bg-yellow-50" : "border-zinc-200"}`}
          >
            <p className="text-3xl font-semibold">
              {directory.entries.filter((entry) => entry.status === key).length}
            </p>
            <h2 className="mt-2 font-semibold">{statusLabels[key]}</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {key === "activated"
                ? "Signed in and assigned to a tree person."
                : key === "not-activated"
                  ? "In the tree, without a signed-in linked account."
                  : "Signed in, awaiting assignment. App access is blocked."}
            </p>
          </Link>
        ))}
      </nav>
      <details
        id="member-credits"
        className="rounded-2xl border border-zinc-200 p-5"
      >
        <summary className="cursor-pointer font-medium">
          Manage AI credits & resets
        </summary>
        <div className="mt-5">
          <CreditsPanel />
        </div>
      </details>
      <form
        method="get"
        action={adminUrl("/admin/users")}
        className="flex flex-wrap items-end gap-3"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="min-w-0 flex-1 text-sm">
          Search people or email
          <input
            name="q"
            defaultValue={q}
            maxLength={160}
            className="mt-2 block w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>
        <button className="rounded-xl bg-zinc-950 px-5 py-3 text-sm text-white">
          Search
        </button>
        <Link href={href(null)} className="px-2 py-3 text-sm underline">
          All statuses
        </Link>
      </form>
      <p className="text-sm text-zinc-500">
        {filtered.length}{" "}
        {status ? statusLabels[status].toLowerCase() : "people and accounts"} ·{" "}
        {directory.team.name} · Page {page} of {pages}
      </p>
      <div className="divide-y divide-zinc-200">
        {filtered.slice((page - 1) * 30, page * 30).map((entry) => (
          <article key={entry.key} className="min-w-0 py-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{entry.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs ${entry.status === "activated" ? "bg-yellow-100" : "bg-zinc-100"}`}
              >
                {statusLabels[entry.status]}
              </span>
            </div>
            {entry.account ? (
              <>
                <p className="mt-2 break-all text-sm text-zinc-600">
                  {entry.account.email}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {entry.person
                    ? `Tree: ${entry.person.display_name} · ${entry.link?.access_role}`
                    : "No tree identity assigned. No member app access."}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                This tree person does not have a signed-in linked account yet. A
                contact email on their profile does not activate access.
              </p>
            )}
            {entry.person ? (
              <Link
                className="mt-4 inline-block text-sm underline"
                href={adminUrl(`/admin/team/${entry.person.id}`)}
              >
                View tree profile →
              </Link>
            ) : null}
            {entry.status === "not-assigned" && entry.account ? (
              <details className="mt-4 rounded-xl border border-zinc-200 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Assign to a tree person
                </summary>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Confirm this account belongs to the person you select. This
                  grants member app access and AI Chat with US$1 per seven days.
                  It does not grant admin access.
                </p>
                <form action={linkTeamAccount} className="mt-3 space-y-3">
                  <input
                    type="hidden"
                    name="team_id"
                    value={directory.team.id}
                  />
                  <input
                    type="hidden"
                    name="user_id"
                    value={entry.account.id}
                  />
                  <input type="hidden" name="access_role" value="member" />
                  <label className="block text-sm">
                    Tree person
                    <select
                      required
                      name="person_id"
                      defaultValue=""
                      className="mt-2 block w-full rounded-lg border p-3"
                    >
                      <option value="" disabled>
                        Choose a person
                      </option>
                      {directory.availablePeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <AdminSubmit
                    pendingLabel="Assigning…"
                    disabled={!directory.availablePeople.length}
                    className="rounded-lg bg-yellow-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
                  >
                    Assign account
                  </AdminSubmit>
                </form>
              </details>
            ) : null}
            {entry.account ? (
              <details className="mt-3 text-xs text-zinc-500">
                <summary className="cursor-pointer">
                  Permanent account ID
                </summary>
                <p className="mt-2 break-all">{entry.account.id}</p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
      {!filtered.length ? (
        <p className="rounded-2xl border border-dashed p-6 text-sm text-zinc-500">
          No people or accounts match this view.
        </p>
      ) : null}
      {pages > 1 ? (
        <nav aria-label="User pages" className="flex gap-4 text-sm">
          {page > 1 ? (
            <Link href={href(status, page - 1)} className="underline">
              ← Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={href(status, page + 1)} className="underline">
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
      <details className="rounded-2xl border border-zinc-200 p-5">
        <summary className="cursor-pointer font-medium">
          AI allowances & usage
        </summary>
        <div className="mt-5">
          <AIAllowances />
        </div>
      </details>
    </div>
  );
}

async function CreditsPanel() {
  let members;
  try {
    members = await loadActivatedCredits();
  } catch {
    members = null;
  }
  return members ? (
    <CreditControls members={members} />
  ) : (
    <p role="status" className="text-sm text-zinc-500">
      Credit balances could not be loaded. Refresh before resetting anyone.
    </p>
  );
}
