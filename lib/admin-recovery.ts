import { cleanAdminPath, adminWorkstreams } from "./admin-navigation";
/** Recovery never follows browser history or an unknown parent URL. */
export function adminRecoveryLinks(pathname: string) {
  const prefixed = /^\/admin(?:\/|$)/.test(pathname);
  const local = (path: string) => (prefixed ? path : cleanAdminPath(path));
  const path = cleanAdminPath(pathname);
  const workspace = adminWorkstreams.find((w) => {
    const root = cleanAdminPath(w.path);
    return root !== "/" && (path === root || path.startsWith(root + "/"));
  });
  return { home: local("/admin"), back: local(workspace?.path ?? "/admin") };
}
