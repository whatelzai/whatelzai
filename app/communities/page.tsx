import Link from "@/components/fcos/MemberLink";
import { AppHeader } from "@/components/fcos/AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";
import { loadCommunities } from "@/lib/communities/server";
import { updateCommunityRole } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Communities · weOS",
  robots: { index: false, follow: false },
};
export default async function Communities({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const data = await loadCommunities();
  const query = await searchParams;
  const selected =
    data.communities.find((x) => x.id === query.community) ??
    data.communities.find((x) => x.slug === "whatelz") ??
    data.communities[0];
  const roles = data.roles.filter((x) => x.community_id === selected?.id);
  const members = data.members.filter((x) => x.community_id === selected?.id);
  return (
    <main className="fcos-tab-page mx-auto min-h-dvh max-w-3xl space-y-6 px-5 py-6 text-weos-ink">
      <AppHeader title="Communities" />
      <MemberNav current="/resources" compact persistent />
      <Link
        href="/resources"
        className="inline-flex min-h-11 items-center text-sm text-zinc-500"
      >
        ← Resources
      </Link>
      <p className="text-sm leading-6 text-zinc-500">
        Your roles can differ between communities. Community membership is
        separate from Amway sponsorship.
      </p>
      <nav aria-label="Community" className="flex flex-wrap gap-2">
        {data.communities.map((c) => (
          <Link
            key={c.id}
            href={`/communities?community=${c.id}`}
            aria-current={c.id === selected?.id ? "page" : undefined}
            className={`min-h-11 rounded-full px-4 py-3 text-sm font-medium ${c.id === selected?.id ? "bg-weos-yellow" : "bg-white"}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      {selected ? (
        <>
          <section className="space-y-3 rounded-3xl bg-white p-6">
            <h2 className="text-xl font-semibold">{selected.name}</h2>
            <p className="text-sm leading-6 text-zinc-600">
              {selected.description}
            </p>
            <details className="pt-2">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Roles explained
              </summary>
              <dl className="space-y-4 pt-2">
                {roles.map((r) => (
                  <div key={r.code}>
                    <dt className="font-medium">{r.label}</dt>
                    <dd className="mt-1 text-sm leading-6 text-zinc-500">
                      {r.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
          <section className="rounded-3xl bg-white p-5 sm:p-6">
            <h2 className="mb-2 text-base font-semibold">People</h2>
            {members.map((m) => (
              <div
                key={m.id}
                className="border-b border-zinc-100 py-4 last:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {m.url ? (
                      <Link
                        href={m.url}
                        className="font-medium hover:underline"
                      >
                        {m.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{m.name}</p>
                    )}
                    {m.introducer && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Introduced by {m.introducer}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium">
                    {roles.find((r) => r.code === m.role_code)?.label}
                    {m.status === "proposed" ? " · Proposed" : ""}
                  </span>
                </div>
                {data.canManage && !m.lead_id && (
                  <details className="mt-2">
                    <summary className="min-h-9 cursor-pointer py-2 text-xs text-zinc-500">
                      Edit role
                    </summary>
                    <form
                      action={updateCommunityRole}
                      className="mt-2 flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="revision" value={m.revision} />
                      <label className="text-xs">
                        Role
                        <select
                          name="role_code"
                          defaultValue={m.role_code}
                          className="mt-1 block min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                        >
                          {roles.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Status
                        <select
                          name="status"
                          defaultValue={m.status}
                          className="mt-1 block min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="proposed">Proposed</option>
                        </select>
                      </label>
                      <button className="min-h-11 rounded-full bg-weos-yellow px-4 text-sm font-medium">
                        Save
                      </button>
                    </form>
                  </details>
                )}
              </div>
            ))}
            {!members.length && (
              <p className="py-4 text-sm text-zinc-500">
                No memberships recorded here yet.
              </p>
            )}
          </section>
        </>
      ) : (
        <p>No communities recorded yet.</p>
      )}
    </main>
  );
}
