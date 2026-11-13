import { Check, Gift, RotateCcw } from "lucide-react";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
export default async function HistoricalEvents() {
  await dailyOwner();
  const events = await db
    .from("events")
    .select("id,name,date,location,metadata")
    .contains("metadata", { historical: true })
    .order("date", { ascending: false })
    .limit(25);
  if (events.error)
    return <p role="alert">Past events unavailable. Refresh to retry.</p>;
  if (!events.data?.length) return null;
  const attendees = await db
    .from("event_attendance")
    .select(
      "id,event_id,display_name,status,amount_minor,currency,returned_later,attendance_on",
    )
    .in(
      "event_id",
      events.data.map((e) => e.id),
    )
    .eq("status", "checked_in")
    .order("recorded_at")
    .limit(1000);
  if (attendees.error)
    return (
      <p role="alert">Historical attendance unavailable. Refresh to retry.</p>
    );
  return (
    <section
      id="past-events"
      className="event-history"
      aria-label="Past events"
    >
      <h2>Past events</h2>
      {events.data.map((event) => {
        const people = attendees.data.filter((a) => a.event_id === event.id);
        return (
          <article key={event.id}>
            <header>
              <div>
                <small>
                  {new Date(event.date + "T12:00:00+08:00").toLocaleDateString(
                    "en-SG",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Asia/Singapore",
                    },
                  )}
                </small>
                <h3>{event.name}</h3>
                <p>{event.location}</p>
              </div>
              <span>
                <Check size={16} />
                {people.length} attended
              </span>
            </header>
            {event.metadata?.poster_files?.original && (
              <a
                className="history-poster-link"
                href={`/api/admin/event-poster?event=${event.id}&format=original`}
                target="_blank"
                rel="noreferrer"
              >
                Original poster →
              </a>
            )}
            <ul>
              {people.map((p) => (
                <li key={p.id}>
                  <span className="event-checked-icon" aria-label="Checked in">
                    <Check size={12} />
                  </span>
                  <span>{p.display_name}</span>
                  <small>
                    <Gift size={14} />
                    {p.amount_minor === 0
                      ? "Free"
                      : `${p.currency} ${(p.amount_minor / 100).toFixed(2)}`}
                  </small>
                  {p.returned_later && (
                    <small>
                      <RotateCcw size={13} />
                      Returned later
                    </small>
                  )}
                </li>
              ))}
            </ul>
            <p className="event-media-note">
              Attendance confirmed retrospectively. Exact check-in times were
              not recorded.
            </p>
          </article>
        );
      })}
    </section>
  );
}
