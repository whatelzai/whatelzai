import { notFound } from "next/navigation";
import { Bot, Network, BriefcaseBusiness, CalendarDays } from "lucide-react";
import { loadFocusDetail } from "@/lib/admin-focus/server";
import { focusReference } from "@/lib/admin-focus/model";
import { AdminText } from "./AdminPreferences";
import { workLanes } from "@/lib/admin-week";
import type { Task } from "@/lib/daily/model";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
  administration: CalendarDays,
};
export async function FocusDetail({
  params,
  lane,
}: {
  params: Promise<{ id: string }>;
  lane?: Task["lane"];
}) {
  const { id } = await params;
  let item;
  try {
    item = await loadFocusDetail(id);
  } catch {
    return (
      <div className="admin-ledger focus-detail">
        <p role="alert">
          <AdminText text="Focus could not be loaded. Please refresh to retry." />
        </p>
      </div>
    );
  }
  if (!item || (lane && item.lane !== lane)) notFound();
  const Icon = icons[item.lane];
  return (
    <article className="admin-ledger focus-detail">
      <p className="focus-detail-ref">
        <Icon size={22} aria-hidden="true" />
        {focusReference(item.id)}
      </p>
      <h1>{item.title}</h1>
      <p>
        <AdminText
          text={
            workLanes.find((l) => l.lane === item.lane)?.label ??
            "Administration"
          }
        />
      </p>
      <div className="focus-detail-facts">
        <CalendarDays size={20} aria-hidden="true" />
        <div>
          <p>
            {item.start}
            {item.end !== item.start && ` – ${item.end}`}
            {item.time && ` · ${item.time} SGT`}
          </p>
          {item.location && <p>{item.location}</p>}
        </div>
      </div>
      {item.kind === "routine" && (
        <p>
          <AdminText
            text={
              item.id.includes(":planning:")
                ? "Prepare next week’s outcomes, commitments and focus blocks."
                : "Review this week’s results and carry forward deliberate choices."
            }
          />
        </p>
      )}
      <dl>
        <div>
          <dt>
            <AdminText text="Status" />
          </dt>
          <dd>
            <AdminText text={item.status} />
          </dd>
        </div>
        <div>
          <dt>
            <AdminText text="Source" />
          </dt>
          <dd>{item.source}</dd>
        </div>
      </dl>
      <Link className="focus-text-link" href={adminUrl(item.href)}>
        <AdminText
          text={item.kind === "task" ? "Review commitments" : "Open source"}
        />{" "}
        →
      </Link>
    </article>
  );
}
