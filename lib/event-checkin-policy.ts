export function parseTicket(input: string): string | null {
  let id = input.trim();
  if (id.startsWith("https://")) {
    try {
      const url = new URL(id);
      if (url.origin !== "https://whatelz.ai" || url.search || url.hash)
        return null;
      id = url.pathname.match(/^\/tickets\/([^/]+)$/)?.[1] ?? "";
    } catch {
      return null;
    }
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id
    : null;
}
