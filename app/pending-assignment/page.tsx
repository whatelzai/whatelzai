import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { hasTeamAssignment } from "@/lib/team-assignment";
import { SignOutButton } from "@/components/auth/AuthControls";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Awaiting assignment · weOS",
  robots: { index: false, follow: false },
};
export default async function PendingAssignment() {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in?redirect_url=/pending-assignment");
  if (await hasTeamAssignment(user.id)) redirect("/");
  return (
    <main className="mx-auto flex min-h-[75vh] max-w-lg items-center px-5 py-10">
      <section className="w-full space-y-5 rounded-3xl border border-zinc-200 bg-white p-7 text-zinc-950">
        <p className="text-xs tracking-wide text-zinc-500">
          weOS · Account setup
        </p>
        <h1 className="text-3xl font-semibold">You’re signed in.</h1>
        <p className="break-words text-sm text-zinc-600">{user.email}</p>
        <p className="text-sm leading-7 text-zinc-600">
          Your account is waiting to be assigned to your person in the team
          tree. Edmund needs to confirm that link before you can use the app or
          view its information.
        </p>
        <form method="get" action="/">
          <button className="block w-full rounded-xl bg-yellow-300 px-5 py-3 text-center text-sm font-semibold">
            Check access again
          </button>
        </form>
        <SignOutButton />
      </section>
    </main>
  );
}
