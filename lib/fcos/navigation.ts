export function memberTab(path: string) {
  if (path === "/" || path === "/member-home") return "/";
  if (path === "/leads" || path.startsWith("/leads/")) return "/leads";
  if (path === "/assistant" || path.startsWith("/assistant/"))
    return "/assistant";
  if (path === "/profile" || path === "/account") return "/profile";
  return "/resources";
}
