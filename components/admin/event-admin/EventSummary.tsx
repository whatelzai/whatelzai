import { CreditCard } from "lucide-react";
import { CalendarDays, ChevronRight, Users, Clock3, Check } from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { eventAdminData } from "@/lib/event-admin/server";
import { mapEvent } from "@/lib/public-events/map";
export default async function EventSummary() {
  let d;
  try {
    d = await eventAdminData();
  } catch {
    return (
      <Link className="event-pulse" href={adminUrl("/admin/event-checkin")}>
        <CalendarDays size={22} />
        <span>
          <strong>Event registrations</strong>
          <small>Status unavailable · open to retry</small>
        </span>
        <ChevronRight size={18} />
      </Link>
    );
  }
  const c = d.counts;
  return (
    <Link href={adminUrl("/admin/event-checkin")} className="event-pulse">
      <CalendarDays size={24} />
      <span className="event-pulse-title">
        <strong>
          {new Date(mapEvent.startsAt).toLocaleDateString("en-SG", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Singapore",
          })}{" "}
          · {mapEvent.shortName}
        </strong>
        <small>
          <Users size={13} />
          {c.confirmed}/{mapEvent.capacity} confirmed <Clock3 size={13} />
          {c.pending} pending <CreditCard size={13} />
          {c.paid} paid · {c.free} free <Check size={13} />
          {c.checkedIn} checked in
        </small>
      </span>
      <span className="event-pulse-attention">
        {c.emailPending > 0
          ? `${c.emailPending} ticket email${c.emailPending === 1 ? "" : "s"} pending`
          : c.review > 0
            ? `${c.review} to review`
            : "View people"}
      </span>
      <ChevronRight size={18} />
    </Link>
  );
}
