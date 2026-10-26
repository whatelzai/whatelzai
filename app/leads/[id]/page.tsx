import { ContextNotes } from "@/components/fcos/ContextNotes";
import { Suspense } from "react";
import { LoadingRows } from "@/components/fcos/RouteLoading";
import {
  DeferredLeadEditor,
  DeferredActivityStatus,
  DeferredNewActivity,
} from "@/components/leads/DeferredControls";
import { LeadAvatar } from "@/components/leads/LeadAvatar";
import Link from "@/components/fcos/MemberLink";
import { notFound, redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { loadLead } from "@/lib/leads/server";
import { dateLabel, todayUtc8 } from "@/lib/leads/model";
import { groupPlans, planDate } from "@/lib/leads/plans";
import { MemberNav } from "@/components/culture/MemberNav";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Lead profile",
  robots: { index: false, follow: false },
};
const disclosure = "rounded-2xl border border-zinc-200 bg-white p-5";
export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  if (!(await ensureUserRow()))
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/leads/${id}`)}`);
  const data = await loadLead(id);
  if (!data) notFound();
  const { lead, activities, canEdit } = data;
  const today = todayUtc8();
  const plans = groupPlans(activities.filter((a) => a.activity_on >= today));
  return (
    <main className="fcos-lead-controls mx-auto max-w-3xl space-y-5 px-5 py-8 sm:px-8">
      <MemberNav current="/leads" />
      <Link href="/leads" className="inline-block py-2 text-sm text-zinc-500">
        ← Baobeis
      </Link>
      <header className="rounded-3xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <LeadAvatar lead={lead} large />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">{lead.region}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {lead.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {lead.stage}
              {lead.membership !== "Unknown" ? ` · ${lead.membership}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs text-zinc-500">
          {canEdit
            ? `Your profile · ${lead.visibility === "private" ? "Hidden" : "Team visible"}`
            : "Team profile · read only"}
        </p>
      </header>
      <section className="space-y-4 rounded-3xl bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold">Coming up</h2>
        {plans.slice(0, 3).map((plan) => (
          <div
            key={`${plan.title}-${plan.start}-${plan.status}`}
            className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-medium">{plan.title}</p>
              <p
                className={`mt-1 text-xs ${plan.start === today ? "text-orange-600" : "text-zinc-500"}`}
              >
                {planDate(plan, today)}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
              {plan.status === "Tentative" ? "Maybe" : plan.status}
            </span>
          </div>
        ))}
        {!plans.length && (
          <p className="text-sm text-zinc-500">
            {lead.next_action || "A little space for the next step."}
          </p>
        )}
        {plans.length > 3 && (
          <p className="text-xs text-zinc-500">
            {plans.length - 3} more in activities below.
          </p>
        )}
      </section>
      {lead.story && (
        <section className="rounded-3xl bg-zinc-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Their story</h2>
          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {lead.story}
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-zinc-500">
              Read their story
            </summary>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">
              {lead.story}
            </p>
          </details>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <Link
          href={`/assistant?new=1&lead=${id}`}
          className="rounded-full bg-yellow-100 px-4 py-3 text-sm font-medium"
        >
          Talk it through in Chat ↗
        </Link>
        {lead.goal !== "Undecided" && (
          <span className="text-xs text-zinc-500">
            Working towards {lead.goal}
          </span>
        )}
      </div>
      {canEdit && <DeferredLeadEditor lead={lead} />}
      <details className={disclosure}>
        <summary className="cursor-pointer text-sm font-medium">
          Activities{" "}
          <span className="ml-2 font-normal text-zinc-400">
            {activities.length}
            {data.historyLimited ? "+" : ""}
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            Plans and invitations are not confirmed attendance. Past plans stay
            unconfirmed until you update them.
          </p>
          {activities.slice(0, 500).map((activity) => (
            <article
              key={activity.id}
              className="border-b border-zinc-100 py-3"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">{activity.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {dateLabel(activity.activity_on)}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {activity.status === "Tentative" ? "Maybe" : activity.status}
                </span>
              </div>
              {canEdit && <DeferredActivityStatus activity={activity} />}
            </article>
          ))}
          {!activities.length && (
            <p className="text-sm text-zinc-500">No activities recorded yet.</p>
          )}
          {data.historyLimited && (
            <p className="text-xs text-zinc-500">
              Showing the latest 500 records.
            </p>
          )}
          {canEdit && <DeferredNewActivity leadId={id} />}
        </div>
      </details>
      {(lead.interests || lead.concerns) && (
        <details className={disclosure}>
          <summary className="cursor-pointer text-sm font-medium">
            A little more about {lead.name.split(" ")[0]}
          </summary>
          <div className="mt-4 space-y-4 text-sm text-zinc-600">
            {lead.interests && (
              <p className="whitespace-pre-wrap">Interests: {lead.interests}</p>
            )}
            {lead.concerns && (
              <p className="whitespace-pre-wrap">
                Things to keep in mind: {lead.concerns}
              </p>
            )}
          </div>
        </details>
      )}
      <details className={disclosure}>
        <summary className="cursor-pointer text-sm font-medium">
          HQH & HHH notes
        </summary>
        <div className="mt-4">
          <Suspense fallback={<LoadingRows label="Loading linked notes…" />}>
            <ContextNotes context={{ lead: id }} createQuery={`lead=${id}`} />
          </Suspense>
        </div>
      </details>
    </main>
  );
}
