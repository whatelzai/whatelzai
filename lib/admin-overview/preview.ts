/** Stop at a section boundary outside fenced code; never slice a Markdown block. */
export function briefPreview(body: string): string {
  const result: string[] = [];
  let fence: { marker: string; length: number } | null = null;
  let hasContent = false;
  for (const line of body.split("\n")) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length };
      else if (
        marker[1][0] === fence.marker &&
        marker[1].length >= fence.length &&
        line.trim() === marker[1]
      )
        fence = null;
    } else if (!fence && /^###\s/.test(line) && hasContent) break;
    result.push(line);
    if (line.trim()) hasContent = true;
  }
  return result.join("\n").trim();
}
