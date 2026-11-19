// The owner is a stable application users.id configured only on the server.
// A privileged role is necessary but never sufficient for global administration.
export function isOwnerUser(
  user: { id: string; role: string } | null | undefined,
  ownerId = process.env.WHATELZ_OWNER_USER_ID,
): boolean {
  return (
    !!ownerId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      ownerId,
    ) &&
    user?.id === ownerId &&
    (user.role === "superadmin" || user.role === "admin")
  );
}

export function isAdminRequest(surface: string, pathname: string): boolean {
  return (
    surface === "admin" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}
