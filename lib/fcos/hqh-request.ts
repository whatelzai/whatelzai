export function hqhRequest(
  names: string[],
  language: "en" | "zh",
  context = "",
) {
  if (!names.length || names.length > 6)
    throw Error("Select one to six Baobeis.");
  return `Create the latest person-based HQH for these selected Baobeis, in this order: ${names.join(" | ")}.\nLanguage: ${language === "zh" ? "Simplified Chinese" : "English"}.\nRead each current profile and linked HQH/HHH follow-up history first. An event is optional; do not ask for a trip or date. Generate one numbered WhatsApp-ready message using inline > separators, indented continuation lines, explicit Poti status, objectives and how leaders can assist. Treat past plans as dated history, not current logistics.${context.trim() ? `\nAdditional context: ${context.trim()}` : ""}`;
}
