import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { dailyOwner } from "@/lib/daily/server";
import { routines } from "@/lib/daily/routines-model";
import { loadRoutine } from "@/lib/daily/routines";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Routine library — Admin",
  robots: { index: false, follow: false },
};
export default async function RoutineLibrary() {
  await dailyOwner();
  const states = await Promise.all(
    routines.map((routine) => loadRoutine(routine.slug)),
  );
  return (
    <div className="max-w-4xl space-y-6 text-zinc-950">
      <Link href={adminUrl("/admin/today")} className="text-sm underline">
        ← Back to Today
      </Link>
      <header className="rounded-3xl bg-yellow-300 p-7">
        <p className="text-xs uppercase tracking-widest">
          Your reusable routines
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Routine library</h1>
        <p className="mt-3 text-sm leading-6">
          Read the instructions behind your daily reviews and weekly sprint
          practice. Download each skill to reuse it.
        </p>
      </header>
      <p className="text-sm leading-6 text-zinc-500">
        Singapore time. These are reusable instructions stored in your private
        EMDEE vault. Your existing schedules remain separate; downloading or
        installing a skill does not change them.
      </p>
      <div className="divide-y divide-zinc-200 border-y border-zinc-200">
        {routines.map((routine, index) => (
          <Link
            key={routine.slug}
            href={adminUrl(`/admin/today/routines/${routine.slug}`)}
            className="block py-5"
          >
            <p className="text-xs text-zinc-500">{routine.schedule}</p>
            <h2 className="mt-3 text-xl font-semibold">{routine.title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {routine.summary}
            </p>
            <p className="mt-5 text-xs text-zinc-500">
              {states[index].status === "ready"
                ? `v${states[index].version} · Skill`
                : states[index].status === "disconnected"
                  ? "Connect EMDEE to read"
                  : states[index].status === "missing"
                    ? "No saved skill found"
                    : "Source unavailable"}
            </p>
            <p className="mt-3 text-sm underline underline-offset-4">
              Read skill →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
