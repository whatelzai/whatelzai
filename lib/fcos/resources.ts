import "server-only";
import { weosAccess } from "@/lib/weos-role-server";
import { roleSourceAllowed } from "@/lib/weos-roles";
import { requireAssignedUser } from "@/lib/app-access";
import { sourceQuerySchema } from "./model";
import {
  databaseContext,
  databaseHqh,
  databaseHqhDiscovery,
  databaseEvents,
} from "./database-context";
export async function readFcosResource(input: unknown) {
  const { source, query } = sourceQuerySchema.parse(input);
  await requireAssignedUser();
  const access = await weosAccess();
  if (!roleSourceAllowed(access.role, source))
    return {
      unavailable: true,
      reason:
        "This context and its business skills are unavailable for your role.",
    };
  // SQL authorizes and projects source data using auth.uid(), before AI sees it.
  return readScopedResource({ source, query }, databaseContext);
}
export async function readScopedResource(
  input: unknown,
  read: typeof databaseContext,
) {
  const { source, query } = sourceQuerySchema.parse(input);
  if (source === "hqh") return databaseHqh(query, 8000, read);
  if (source === "hqh_discover") return databaseHqhDiscovery(query, read);
  if (source === "events") return databaseEvents(query, read);
  return read(source, query);
}
