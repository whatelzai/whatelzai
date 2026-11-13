export function hqhRequest(
  names: string[],
  language: "en" | "zh",
  context = "",
) {
  if (!names.length || names.length > 6)
    throw Error("Select one to six Baobeis.");
  return `Create HQH for: ${names.join(" | ")}
Language: ${language === "zh" ? "Simplified Chinese" : "English"}.
Use the latest saved profiles and HQH/HHH follow-ups.${context.trim() ? `\nAdditional context: ${context.trim()}` : ""}`;
}

/** Preselection only; the editor and save action still recheck permitted IDs. */
export function mentionedLeadIds(
  text: string,
  people: { id: string; name: string }[],
) {
  return people
    .filter((person) => {
      if (person.name.trim().length < 4) return false;
      const escaped = person.name
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .trim()
        .replace(/\s+/g, "\\s+");
      return new RegExp(
        `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
        "iu",
      ).test(text);
    })
    .map((person) => person.id)
    .slice(0, 20);
}
