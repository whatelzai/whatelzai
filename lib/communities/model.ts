import { z } from "zod";
export type Community = {
  id: string;
  team_id: string;
  slug: string;
  name: string;
  description: string;
};
export type CommunityRole = {
  community_id: string;
  code: string;
  label: string;
  description: string;
  sort_order: number;
};
export type CommunityMembership = {
  id: string;
  community_id: string;
  team_id: string;
  person_id: string | null;
  lead_id: string | null;
  introducer_person_id: string | null;
  role_code: string;
  status: "active" | "proposed";
  revision: number;
  name: string;
  introducer: string | null;
  url: string | null;
};
export type CommunityData = {
  communities: Community[];
  roles: CommunityRole[];
  members: CommunityMembership[];
  canManage: boolean;
  people: { id: string; name: string }[];
};
export const roleUpdateSchema = z
  .object({
    id: z.uuid(),
    revision: z.coerce.number().int().positive(),
    role_code: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/),
    status: z.enum(["active", "proposed"]),
  })
  .strict();
// Only a membership in this specific community can supply FC calendar access.
export function founderPersona(rows: { slug: string; code: string }[]) {
  const role = rows.find((x) => x.slug === "founders-club")?.code;
  const map = {
    oracle: "Oracle",
    architect: "Architect",
    catalyst: "Catalyst",
    spark: "Spark",
    guest: "Guest",
  } as const;
  return role && role in map ? map[role as keyof typeof map] : null;
}

export function membershipVisible(
  row: { status: string; lead_id: string | null; person_id: string | null },
  canManage: boolean,
  allowedLeads: ReadonlySet<string>,
  allowedPeople: ReadonlySet<string>,
) {
  return (
    (canManage || row.status === "active") &&
    (row.lead_id
      ? allowedLeads.has(row.lead_id)
      : !!row.person_id && allowedPeople.has(row.person_id))
  );
}
