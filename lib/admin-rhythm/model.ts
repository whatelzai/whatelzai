export const rhythmKinds = ["morning", "evening", "weekly"] as const;
export type RhythmKind = (typeof rhythmKinds)[number];
export type RhythmSnapshot = {
  kind: RhythmKind;
  entry_key: string;
  document_path: string;
  body: string;
  version: string;
  source_updated_at: string;
  source_created_at: string;
  read_version: string | null;
};
const base = "edmund/01-personal/01-daily/";
export function rhythmHub(kind: RhythmKind) {
  return (
    base +
    { morning: "01-MORNING", evening: "02-EVENING", weekly: "03-WEEKS" }[kind] +
    ".md"
  );
}
export function rhythmPath(kind: RhythmKind, key: string) {
  return (
    base +
    { morning: "01-morning/", evening: "02-evening/", weekly: "03-weeks/" }[
      kind
    ] +
    (kind === "weekly" ? "WEEK-" + key : key + "-" + kind.toUpperCase()) +
    ".md"
  );
}
export function latestRhythmKeys(
  content: string,
  kind: RhythmKind,
  today: string,
) {
  const links = content.split(/^## Parent of\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  return [
    ...new Set(
      [...links.matchAll(/\[\[([^\]]+)\]\]/g)]
        .map(
          (m) =>
            m[1].match(
              kind === "weekly" ? /(\d{4}-W\d{2})$/ : /(\d{4}-\d{2}-\d{2})$/,
            )?.[1],
        )
        .filter((v): v is string => !!v && (kind === "weekly" || v <= today)),
    ),
  ]
    .sort()
    .reverse();
}
export function notesBody(content: string) {
  return (
    content
      .split(/^## Notes\s*$/m)[1]
      ?.split(/^## /m)[0]
      ?.trim() ?? ""
  );
}
export function rhythmTitle(kind: RhythmKind) {
  return {
    morning: "Morning brief",
    evening: "Night debrief",
    weekly: "Weekly closeout",
  }[kind];
}
export function rhythmNotice(snapshot: RhythmSnapshot) {
  return {
    title: rhythmTitle(snapshot.kind) + " · " + snapshot.entry_key,
    url: "/rhythm/" + snapshot.kind,
    tag: "rhythm-" + snapshot.kind + "-" + snapshot.version.slice(0, 24),
  };
}
