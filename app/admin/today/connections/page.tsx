import Link from "@/components/admin/AdminLink";
import type { Metadata } from "next";
import { dailyOwner } from "@/lib/daily/server";
import { emdeeConnection, openaiConnection } from "@/lib/daily/connections";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { apiGenerationEnabled } from "@/lib/daily/settings";
import { adminUrl } from "@/lib/admin-url";
import { EmdeeConnectForm, OpenAIConnectForm, DisconnectForm } from "../Forms";
export const metadata: Metadata = {
  title: "Daily connections — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function DailyConnections({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const owner = await dailyOwner();
  const [emdee, ai, params] = await Promise.all([
    emdeeConnection(owner),
    openaiConnection(owner),
    searchParams,
  ]);
  return (
    <div className="max-w-3xl space-y-8 text-zinc-900">
      <Link
        href={adminUrl("/admin/today")}
        className="text-sm underline underline-offset-4"
      >
        ← Back to Today
      </Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Your private connections
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Bring your tools together.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          EMDEE remembers. Whatelzai tracks the action. Your OpenAI project
          helps you think it through.
        </p>
      </header>
      {params.result === "connected" ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          EMDEE connected. Return to Today to read and save your briefs.
        </p>
      ) : null}
      {params.result === "failed" ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          EMDEE authorization was cancelled, expired or could not be completed.
          Check that you signed into the EMDEE account containing Personal →
          Daily, then start the connection again.
        </p>
      ) : null}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">EMDEE</h2>
          <span className="text-xs text-zinc-500">
            {emdee ? "Connected" : "Not connected"}
          </span>
        </div>
        <p className="text-sm leading-6 text-zinc-600">
          Morning briefs, evening reflections and tomorrow’s handoff stay in
          your vault.
        </p>
        {emdee ? (
          <p className="text-xs text-zinc-500">
            Authorization expires{" "}
            {new Date(emdee.expiresAt).toLocaleDateString("en-SG", {
              timeZone: "Asia/Singapore",
            })}
            . Reconnect when needed.
          </p>
        ) : null}
        {emdee?.parentPath !== DAILY_PARENT ? (
          <p className="rounded-xl bg-yellow-50 p-3 text-sm">
            Reconnect to use Personal → Daily. Your existing connection remains
            active until you approve the new folder.
          </p>
        ) : (
          <p className="text-sm text-zinc-600">
            Personal → Daily → Morning / Evening / Weeks
          </p>
        )}
        <EmdeeConnectForm parentPath={DAILY_PARENT} />
        {emdee ? <DisconnectForm provider="emdee" /> : null}
      </section>
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">OpenAI</h2>
          <span className="text-xs text-zinc-500">
            {ai ? `Connected · ${ai.model}` : "Not connected"}
          </span>
        </div>
        {!apiGenerationEnabled() ? (
          <p className="rounded-xl bg-yellow-50 p-3 text-sm">
            API generation is disabled for your personal workspace. Your ChatGPT
            subscription prepares the briefs; this connection is retained for
            future API-backed use.
          </p>
        ) : null}
        <OpenAIConnectForm model={ai?.model} />
        {ai ? <DisconnectForm provider="openai" /> : null}
      </section>
      <p className="text-xs leading-6 text-zinc-500">
        Only your owner account can access these connections. Removing a stored
        connection stops this workspace from using it; revoke access at the
        provider too when it is no longer needed. Your existing ChatGPT
        schedules are unchanged.
      </p>
    </div>
  );
}
