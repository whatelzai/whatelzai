import Link from "@/components/admin/AdminLink";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/users";
import { adminUrl } from "@/lib/admin-url";
import { loadTeamView } from "@/lib/team/server";
import { TeamPersonEditor } from "@/components/team/TeamPersonEditor";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team member profile",
  robots: { index: false, follow: false },
};
export default async function TeamPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const view = await loadTeamView();
  const person = view?.people.find((item) => item.id === id);
  if (!view || !person) notFound();
  const sponsor = view.people.find(
    (item) => item.id === person.sponsor_person_id,
  );
  const downlines = view.people.filter((item) => item.sponsor_person_id === id);
  return (
    <div className="max-w-3xl space-y-6">
      <Link href={adminUrl("/admin/team")} className="text-sm underline">
        ← Team relationships
      </Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          Team member · Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{person.display_name}</h1>
        {person.context && (
          <p className="mt-3 text-sm text-zinc-500">{person.context}</p>
        )}
      </header>
      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="mb-4 text-lg font-semibold">Member details</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Emails and progress notes are admin-only. Saving an email does not
          link a login account.
        </p>
        <TeamPersonEditor person={person} teamId={view.team.id} />
      </section>
      <section className="space-y-3 rounded-xl border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">Relationships</h2>
        <div>
          <h3 className="text-sm text-zinc-500">Direct upline</h3>
          {sponsor ? (
            <Link
              href={adminUrl(`/admin/team/${sponsor.id}`)}
              className="underline"
            >
              {sponsor.display_name}
            </Link>
          ) : (
            <p>No recorded upline</p>
          )}
        </div>
        <div>
          <h3 className="text-sm text-zinc-500">
            Direct downlines ({downlines.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {downlines.map((item) => (
              <li key={item.id}>
                <Link
                  href={adminUrl(`/admin/team/${item.id}`)}
                  className="underline"
                >
                  {item.display_name}
                </Link>
              </li>
            ))}
          </ul>
          {!downlines.length && <p>No recorded downlines</p>}
        </div>
      </section>
    </div>
  );
}
