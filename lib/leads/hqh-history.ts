export type FollowupNote = {
  id: string;
  title: string;
  kind: string;
  status: string;
  occurred_on: string;
  updated_at?: string;
  observations: string;
  reflections: string;
  next_steps: string;
};
export function boundedFollowupNotes(rows: FollowupNote[], budget: number) {
  let remaining = budget;
  const notes = [];
  const ordered = [...rows].sort(
    (a, b) => (a.kind === "HHH" ? 0 : 1) - (b.kind === "HHH" ? 0 : 1),
  );
  for (const row of ordered) {
    if (remaining <= 0) break;
    const full = [row.observations, row.reflections, row.next_steps]
      .filter(Boolean)
      .join("\n\n");
    const bytes = Buffer.from(full),
      body = bytes
        .subarray(0, remaining)
        .toString("utf8")
        .replace(/\uFFFD$/, "");
    notes.push({
      id: row.id,
      title: row.title,
      kind: row.kind,
      status: row.status,
      date: row.occurred_on,
      updated_at: row.updated_at,
      body,
      truncated: bytes.length > remaining,
    });
    remaining -= Buffer.byteLength(body);
  }
  return {
    notes,
    coverage: `Latest ${rows.length} permitted linked HQH/HHH records examined; HHH reflections prioritised. ${notes.length} note bodies included within ${budget} bytes. ${notes.length < rows.length || notes.some((x) => x.truncated) ? "Some history omitted or truncated; do not claim the entire history was read." : "Included bodies are complete."}`,
  };
}
