import "server-only";
import { feedbackSnapshot } from "@/lib/event-feedback/questions";
import FeedbackShare from "@/components/admin/event-admin/FeedbackShare";
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
    .select("id,rating,comment,created_at,form_id,question_answers", {
      count: "exact",
    })
    .eq("event_id", recordId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <section
      className="event-feedback-review"
      aria-labelledby="event-feedback-heading"
    >
      <h2 id="event-feedback-heading">Event feedback</h2>
      {published ? (
        <FeedbackShare url={`https://whatelz.ai${feedbackPath(eventId)}`} />
      ) : (
        <p>Publish the event before sharing its feedback form.</p>
      )}
      <p className="event-feedback-note">
        Responses are private. New responses require a verified registration
        email.
      </p>
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
              <p>
                {r.form_id === "feedback-v1"
                  ? "Earlier anonymous feedback"
                  : "Verified registration email"}{" "}
                · {r.form_id}
              </p>
              {feedbackSnapshot.safeParse(r.question_answers).success ? (
                <dl className="feedback-answer-list">
                  {feedbackSnapshot.parse(r.question_answers).map((pair) => (
                    <div
                      key={pair.id}
                      className={
                        pair.type === "text"
                          ? "feedback-answer-comment"
                          : undefined
                      }
                    >
                      <dt>{pair.question}</dt>
                      <dd>
                        {typeof pair.answer === "boolean"
                          ? pair.answer
                            ? "Yes"
                            : "No"
                          : typeof pair.answer === "number"
                            ? `${pair.answer} / 5`
                            : pair.answer || "No comment added."}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {r.comment || "Earlier response"}
                </p>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
