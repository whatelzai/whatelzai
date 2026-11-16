import "server-only";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { feedbackPath } from "@/lib/event-feedback/model";
export default async function EventFeedbackReview({
  recordId,
  eventId,
  published,
}: {
  recordId: string;
  eventId: string;
  published: boolean;
}) {
  await dailyOwner();
  const { data, error, count } = await db
    .from("event_feedback")
    .select("id,rating,comment,created_at", { count: "exact" })
    .eq("event_id", recordId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <section className="admin-ledger" aria-labelledby="event-feedback-heading">
      <h2 id="event-feedback-heading">Event feedback</h2>
      {published && (
        <p>
          Share this fixed link:
          <br />
          <a
            href={`https://whatelz.ai${feedbackPath(eventId)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            https://whatelz.ai{feedbackPath(eventId)}
          </a>
        </p>
      )}
      <p>Private responses. Public links do not verify attendance.</p>
      {error ? (
        <p role="alert">Feedback could not be loaded. Refresh to try again.</p>
      ) : (
        <>
          <p>
            {count ?? 0} response{count === 1 ? "" : "s"}
            {(count ?? 0) > 100 ? " · Showing the latest 100" : ""}
          </p>
          {data?.map((r) => (
            <article key={r.id} className="admin-panel">
              <h3>{r.rating} / 5</h3>
              <p>
                {new Date(r.created_at).toLocaleString("en-SG", {
                  timeZone: "Asia/Singapore",
                })}
              </p>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {r.comment || "No comment added."}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
