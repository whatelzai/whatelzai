import { LeadAvatar } from "./LeadAvatar";
import Link from "@/components/fcos/MemberLink";
import type { LeadSummary } from "@/lib/leads/model";
import { dateLabel } from "@/lib/leads/model";
import { planDate, type Plan } from "@/lib/leads/plans";
export function LeadCard({
  lead,
  plans,
  today,
}: {
  lead: LeadSummary;
  plans: Plan[];
  today: string;
}) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block min-w-0 rounded-3xl border border-zinc-100 bg-white p-5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <LeadAvatar lead={lead} />
          <div>
            <h3 className="text-lg font-semibold">{lead.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{lead.region}</p>
          </div>
        </div>
        {lead.is_priority && (
          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-medium text-yellow-900">
            Priority
          </span>
        )}
      </div>
      {plans.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {plans.slice(0, 3).map((plan) => (
            <li
              key={`${plan.title}-${plan.start}-${plan.status}`}
              className="flex items-start gap-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{plan.title}</p>
                <p
                  className={`mt-0.5 text-xs ${plan.start === today ? "font-semibold text-orange-600" : "text-zinc-500"}`}
                >
                  {planDate(plan, today)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-[11px] ${plan.status === "Tentative" ? "bg-amber-50 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}
              >
                {plan.status === "Tentative" ? "Maybe" : plan.status}
              </span>
            </li>
          ))}
          {plans.length > 3 && (
            <li className="text-xs text-zinc-500">
              +{plans.length - 3} more plans
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {lead.next_action || "Add their story or a next step."}
        </p>
      )}
      {!plans.length && lead.follow_up_on && (
        <p className="mt-2 text-xs text-zinc-500">
          {lead.follow_up_on < today ? "Review follow-up" : "Follow up"} ·{" "}
          {dateLabel(lead.follow_up_on)}
        </p>
      )}
    </Link>
  );
}
