import { readingSections } from "./admin-reading";

export const MANDALA_PATH =
  "edmund/01-personal/dream/FINANCIAL-FREEDOM-MANDALA.md";

/** Display structure only. Original Markdown remains available even if it changes shape. */
export function mandalaAreas(body: string) {
  const areas = readingSections(body)
    .filter((section) => /^[1-8]\. /.test(section.title))
    .map((section) => ({
      ...section,
      cells: [
        ...section.body.matchAll(/^([1-8])\. \*\*(.+?)\*\* — (.+)$/gm),
      ].map((match, index, matches) => ({
        number: Number(match[1]),
        title: match[2],
        detail: (
          match[3] +
          section.body.slice(
            match.index! + match[0].length,
            matches[index + 1]?.index ?? section.body.length,
          )
        ).trim(),
      })),
    }));
  if (
    areas.length !== 8 ||
    areas.some(
      (area, index) =>
        !area.title.startsWith(`${index + 1}. `) ||
        area.cells.length !== 8 ||
        area.cells.some((cell, i) => cell.number !== i + 1),
    )
  )
    return null;
  return areas;
}

/** Extract only explicitly written goal figures; unmatched formats keep the source fallback. */
export function mandalaGoal(body: string) {
  const centre = readingSections(body).find((section) =>
    section.title.startsWith("Centre —"),
  );
  const paragraph = centre?.body.split(/\n\s*\n/)[0] ?? "";
  const match = paragraph.match(
    /^By age (\d+): SG\$([\d,]+) monthly[\s\S]*?against SG\$([\d,]+) monthly living expenses, demonstrated for ([^.]+)\./,
  );
  return {
    centre,
    sentence: paragraph.split(/(?<=\.)\s/)[0],
    figures: match
      ? { age: match[1], income: match[2], expenses: match[3], proof: match[4] }
      : null,
  };
}
