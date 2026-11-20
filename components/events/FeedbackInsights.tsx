import { feedbackSnapshot } from "@/lib/event-feedback/questions";

type Response = {
  question_answers: unknown;
  rating: number;
  comment: string | null;
  registration: { is_test: boolean } | null;
};

export default function FeedbackInsights({
  responses,
}: {
  responses: Response[];
}) {
  const attendees = responses.filter((r) => !r.registration?.is_test);
  const ratings = new Map<string, number[]>();
  const intentions = new Map<string, boolean[]>();
  const topics = new Map<string, number>();
  const comments: string[] = [];
  for (const row of attendees) {
    const answers = feedbackSnapshot.safeParse(row.question_answers);
    const notes = new Set<string>();
    if (row.comment?.trim()) notes.add(row.comment.trim());
    for (const item of answers.success ? answers.data : []) {
      const { question, answer } = item;
      if (typeof answer === "number")
        ratings.set(question, [...(ratings.get(question) ?? []), answer]);
      if (typeof answer === "boolean")
        intentions.set(question, [...(intentions.get(question) ?? []), answer]);
      if (item.id === "future_topic" && typeof answer === "string" && answer)
        topics.set(answer, (topics.get(answer) ?? 0) + 1);
      if (item.type === "text" && typeof answer === "string" && answer.trim())
        notes.add(answer.trim());
    }
    if (!answers.success)
      ratings.set("Earlier overall rating", [
        ...(ratings.get("Earlier overall rating") ?? []),
        row.rating,
      ]);
    comments.push(...notes);
  }
  const average = (values: number[]) =>
    values.reduce((a, b) => a + b, 0) / values.length;
  return (
    <section className="admin-panel">
      <h3>Feedback insights</h3>
      <p>
        {attendees.length} attendee responses ·{" "}
        {responses.length - attendees.length} test responses excluded
      </p>
      {!!ratings.size && (
        <>
          <h4>Ratings</h4>
          <dl>
            {[...ratings]
              .sort((a, b) => average(b[1]) - average(a[1]))
              .map(([label, values]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <strong>{average(values).toFixed(1)} / 5</strong> ·{" "}
                    {values.filter((n) => n >= 4).length} of {values.length}{" "}
                    rated 4 or 5
                  </dd>
                </div>
              ))}
          </dl>
        </>
      )}
      {!!intentions.size && (
        <>
          <h4>Format and future attendance</h4>
          {[...intentions].map(([label, values]) => (
            <p key={label}>
              {label}{" "}
              <strong>
                {values.filter(Boolean).length} of {values.length} said yes
              </strong>
            </p>
          ))}
        </>
      )}
      {!!topics.size && (
        <>
          <h4>Requested topics</h4>
          <ol>
            {[...topics]
              .sort((a, b) => b[1] - a[1])
              .map(([topic, count]) => (
                <li key={topic}>
                  {topic} · {count} {count === 1 ? "vote" : "votes"}
                </li>
              ))}
          </ol>
        </>
      )}
      <details>
        <summary>Additional comments ({comments.length})</summary>
        {comments.map((comment, i) => (
          <p key={i}>{comment}</p>
        ))}
      </details>
    </section>
  );
}
