import Link from "next/link";
import { MemberNav } from "@/components/culture/MemberNav";
import { memberWorkspace } from "@/lib/member-ai/server";
import { CompleteTask } from "../CompleteTask";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Commitments · weOS",
  robots: { index: false, follow: false },
};

export default async function Commitments() {
  let workspace;
  try {
    workspace = await memberWorkspace();
  } catch {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <MemberNav current="/resources" />
        <h1 className="text-3xl font-semibold">Commitments</h1>
        <p>
          Your commitments are unavailable. This feature is currently limited to
          Edmund’s owner account.
        </p>
        <Link href="/resources" className="underline">
          Back to Resources
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <MemberNav current="/resources" />
      <Link href="/resources" className="inline-block text-sm underline">
        ← Resources
      </Link>
      <header>
        <h1 className="text-3xl font-semibold">Your commitments</h1>
        <p className="mt-3 text-zinc-600">
          Review your next steps. Only you can accept or complete a commitment.
        </p>
      </header>
      <ul className="space-y-4">
        {workspace.tasks.map((task) => (
          <li key={task.id} className="rounded-2xl border border-zinc-200 p-5">
            <h2 className="font-medium">{task.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">
              {task.due_on ? `${task.due_on} · ` : ""}
              {task.status}
            </p>
            {task.status === "open" && (
              <CompleteTask id={task.id} revision={task.revision} />
            )}
          </li>
        ))}
      </ul>
      {!workspace.tasks.length && (
        <p className="rounded-2xl bg-zinc-50 p-6 text-zinc-600">
          No active commitments yet.
        </p>
      )}
      <Link
        href="/assistant"
        className="inline-block rounded-xl bg-yellow-300 px-5 py-3 font-medium"
      >
        Open chat →
      </Link>
    </main>
  );
}
