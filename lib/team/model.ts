import { z } from "zod";

const personSchema = z.object({
  id: z.uuid(),
  team_id: z.uuid(),
  display_name: z.string().trim().min(1).max(120),
  sponsor_person_id: z.uuid().nullable(),
  abo_status: z.enum(["Unknown", "ABO", "Not ABO"]).optional(),
  context: z.string().trim().max(240).nullable(),
  current_level: z.string().trim().max(120).nullable().optional(),
  next_goal: z.string().trim().max(240).nullable().optional(),
  progress_notes: z.string().trim().max(1000).nullable().optional(),
  email: z.email().max(254).nullable().optional(),
  abo_number: z
    .string()
    .regex(/^[0-9]{1,20}$/)
    .nullable()
    .optional(),
});

export const teamSeedSchema = z.object({
  team: z.object({
    id: z.uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(120),
    focus_person_id: z.uuid(),
  }),
  people: z.array(personSchema).min(1).max(1000),
});

export type TeamPerson = z.infer<typeof personSchema>;
export type TeamSeed = z.infer<typeof teamSeedSchema>;
export type Relationship =
  | "self"
  | "direct upline"
  | "upline"
  | "direct downline"
  | "downline"
  | "direct sideline"
  | "sideline"
  | "unrelated";

export function validatePeople(people: TeamPerson[]): void {
  const byId = new Map(people.map((person) => [person.id, person]));
  if (byId.size !== people.length) throw new Error("Duplicate person ID");
  for (const person of people) {
    const seen = new Set([person.id]);
    let sponsorId = person.sponsor_person_id;
    while (sponsorId) {
      if (seen.has(sponsorId)) throw new Error("Sponsor cycle");
      seen.add(sponsorId);
      const sponsor = byId.get(sponsorId);
      if (!sponsor) throw new Error("Unknown sponsor");
      if (sponsor.team_id !== person.team_id)
        throw new Error("Cross-team sponsor");
      sponsorId = sponsor.sponsor_person_id;
    }
  }
}

export function parseTeamSeed(input: unknown): TeamSeed {
  const seed = teamSeedSchema.parse(input);
  validatePeople(seed.people);
  if (seed.people.some((person) => person.team_id !== seed.team.id))
    throw new Error("Person belongs to another team");
  if (!seed.people.some((person) => person.id === seed.team.focus_person_id))
    throw new Error("Unknown focus person");
  return seed;
}

export function ancestors(people: TeamPerson[], personId: string): string[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const result: string[] = [];
  const seen = new Set([personId]);
  let sponsor = byId.get(personId)?.sponsor_person_id;
  while (sponsor && !seen.has(sponsor)) {
    seen.add(sponsor);
    result.push(sponsor);
    sponsor = byId.get(sponsor)?.sponsor_person_id;
  }
  return result;
}

export function relationshipTo(
  people: TeamPerson[],
  focusId: string,
  personId: string,
): Relationship {
  const focus = people.find((person) => person.id === focusId);
  const person = people.find((person) => person.id === personId);
  if (!focus || !person || focus.team_id !== person.team_id) return "unrelated";
  if (focusId === personId) return "self";
  const up = ancestors(people, focusId);
  if (up[0] === personId) return "direct upline";
  if (up.includes(personId)) return "upline";
  const otherUp = ancestors(people, personId);
  if (otherUp[0] === focusId) return "direct downline";
  if (otherUp.includes(focusId)) return "downline";
  if (
    focus.sponsor_person_id &&
    focus.sponsor_person_id === person.sponsor_person_id
  )
    return "direct sideline";
  return up.some((id) => otherUp.includes(id)) ? "sideline" : "unrelated";
}

// Filter on the server before rendering or serializing names to a member.
export function visiblePeople(
  people: TeamPerson[],
  personId: string,
  role: "member" | "manager",
): TeamPerson[] {
  if (!people.some((person) => person.id === personId)) return [];
  const teamId = people.find((person) => person.id === personId)!.team_id;
  const allowed = new Set<string>();
  for (const person of people) {
    if (person.team_id !== teamId) continue;
    const relation = relationshipTo(people, personId, person.id);
    if (
      role === "manager" ||
      ["self", "direct upline", "direct downline", "downline"].includes(
        relation,
      )
    )
      allowed.add(person.id);
  }
  return people
    .filter((person) => allowed.has(person.id))
    .map((person) => ({
      ...person,
      context: role === "manager" ? person.context : null,
      email: null,
      progress_notes: null,
      sponsor_person_id:
        person.sponsor_person_id && allowed.has(person.sponsor_person_id)
          ? person.sponsor_person_id
          : null,
    }));
}
