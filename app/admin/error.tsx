"use client";

import { useTransition } from "react";

export default function AdminError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <section role="alert" className="rounded-2xl border border-zinc-200 p-6">
      <h1 className="text-xl font-semibold">This page couldn’t be loaded.</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Your navigation is still available. Try this page again, or choose
        another area.
      </p>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(unstable_retry)}
        className="mt-5 min-h-11 rounded-xl bg-yellow-300 px-5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Trying again…" : "Try again"}
      </button>
    </section>
  );
}
