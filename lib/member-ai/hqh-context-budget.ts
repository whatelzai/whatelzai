/** Keep the current person facts while shortening duplicate narrative excerpts. */
export function fitHqhContext(value: unknown, limit = 36000): unknown {
  if (Buffer.byteLength(JSON.stringify(value)) <= limit) return value;
  const copy = JSON.parse(JSON.stringify(value));
  const scale = limit < 32000 ? 0.5 : 1;
  const caps: Record<string, number> = {
    body: 500,
    story: 500,
    raw_input: 900,
    invitation_context: 1300,
    familiarity_context: 1200,
    coverage: 180,
  };
  for (const key of Object.keys(caps))
    caps[key] = Math.floor(caps[key] * scale);
  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    for (const [key, data] of Object.entries(row)) {
      if (
        typeof data === "string" &&
        caps[key] &&
        Buffer.byteLength(data) > caps[key]
      ) {
        row[key] = Buffer.from(data)
          .subarray(0, caps[key])
          .toString("utf8")
          .replace(/\uFFFD$/, "");
        if (key === "body") row.truncated = true;
      } else visit(data);
    }
  };
  visit(copy);
  if (copy && typeof copy === "object")
    copy.contextCoverage =
      "Group context contains shortened narrative excerpts. Current structured facts, disclosure status, objectives and dated logistics are retained. Do not claim complete history review; use a single-person lookup for more detail.";
  if (Buffer.byteLength(JSON.stringify(copy)) > limit)
    throw Error("HQH group context is too large. Select fewer Baobeis.");
  return copy;
}
