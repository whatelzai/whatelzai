export type DirectoryAccount = {
  id: string;
  name: string | null;
  email: string | null;
  supabase_auth_user_id: string | null;
};
export type DirectoryPerson = {
  id: string;
  team_id: string;
  display_name: string;
  email: string | null;
};
export type DirectoryLink = {
  team_id: string;
  person_id: string;
  user_id: string;
  access_role: string;
};
export type DirectoryStatus = "activated" | "not-activated" | "not-assigned";
export type DirectoryEntry = {
  key: string;
  status: DirectoryStatus;
  name: string;
  account: DirectoryAccount | null;
  person: DirectoryPerson | null;
  link: DirectoryLink | null;
};
export const statusLabels: Record<DirectoryStatus, string> = {
  activated: "Activated",
  "not-activated": "Not activated",
  "not-assigned": "Not assigned",
};
export function directoryEntries(
  accounts: DirectoryAccount[],
  people: DirectoryPerson[],
  links: DirectoryLink[],
): DirectoryEntry[] {
  const registered = accounts.filter(
    (account) => account.supabase_auth_user_id && account.email,
  );
  const byId = new Map(registered.map((account) => [account.id, account]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const validLinks = links.filter(
    (link) => personById.get(link.person_id)?.team_id === link.team_id,
  );
  const linkedUsers = new Set(validLinks.map((link) => link.user_id));
  const entries: DirectoryEntry[] = people.map((person) => {
    const link =
      validLinks.find((candidate) => candidate.person_id === person.id) ?? null;
    const account = link ? (byId.get(link.user_id) ?? null) : null;
    return {
      key: `person:${person.id}`,
      status: account ? "activated" : "not-activated",
      name: person.display_name,
      account,
      person,
      link,
    };
  });
  for (const account of registered)
    if (!linkedUsers.has(account.id))
      entries.push({
        key: `account:${account.id}`,
        status: "not-assigned",
        name: account.name || "Registered account",
        account,
        person: null,
        link: null,
      });
  return entries.sort(
    (a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key),
  );
}
