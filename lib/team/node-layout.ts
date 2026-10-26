import { type TeamPerson } from "./model";

export const NODE_WIDTH = 88;
export const NODE_HEIGHT = NODE_WIDTH;
export const PAIR_OVERLAP = 8;
const GAP = 24;
const LEVEL = NODE_HEIGHT + 64;
const PADDING = 24;

// Shared account names stay one record and one sponsor relationship. Only an
// explicit two-name separator changes their visual presentation.
export function teamNodeNames(displayName: string): string[] {
  const names = displayName.split(/\s*[&＆]\s*/).map((name) => name.trim());
  return names.length === 2 && names.every(Boolean) ? names : [displayName];
}

export type PositionedPerson = {
  person: TeamPerson;
  names: string[];
  x: number;
  y: number;
  width: number;
};

// Measure subtrees in pixels so a shared pair has room without reserving two
// circles for every single person. Only server-authorized people are supplied.
export function layoutTeamNodes(people: TeamPerson[]) {
  const ids = new Set(people.map((person) => person.id));
  const children = new Map<string, TeamPerson[]>();
  const roots: TeamPerson[] = [];
  const sizes = new Map(
    people.map((person) => {
      const names = teamNodeNames(person.display_name);
      return [
        person.id,
        {
          names,
          width: NODE_WIDTH + (names.length - 1) * (NODE_WIDTH - PAIR_OVERLAP),
        },
      ];
    }),
  );
  for (const person of people) {
    const sponsor = person.sponsor_person_id;
    if (!sponsor || !ids.has(sponsor)) roots.push(person);
    else {
      const siblings = children.get(sponsor) ?? [];
      siblings.push(person);
      children.set(sponsor, siblings);
    }
  }
  const traversal: TeamPerson[] = [];
  const pending = [...roots];
  while (pending.length) {
    const person = pending.pop()!;
    traversal.push(person);
    pending.push(...(children.get(person.id) ?? []));
  }
  const spans = new Map<string, number>();
  for (const person of traversal.reverse()) {
    const descendants = children.get(person.id) ?? [];
    const span =
      descendants.reduce((sum, child) => sum + spans.get(child.id)!, 0) +
      Math.max(0, descendants.length - 1) * GAP;
    spans.set(person.id, Math.max(sizes.get(person.id)!.width, span));
  }
  const nodes: PositionedPerson[] = [];
  const positions: { person: TeamPerson; left: number; depth: number }[] = [];
  let left = PADDING;
  for (const person of roots) {
    positions.push({ person, left, depth: 0 });
    left += spans.get(person.id)! + GAP;
  }
  let maxDepth = 0;
  while (positions.length) {
    const { person, left, depth } = positions.pop()!;
    maxDepth = Math.max(maxDepth, depth);
    const size = sizes.get(person.id)!;
    const span = spans.get(person.id)!;
    nodes.push({
      person,
      ...size,
      x: left + (span - size.width) / 2,
      y: PADDING + depth * LEVEL,
    });
    const descendants = children.get(person.id) ?? [];
    const childWidth =
      descendants.reduce((sum, child) => sum + spans.get(child.id)!, 0) +
      Math.max(0, descendants.length - 1) * GAP;
    let childLeft = left + (span - childWidth) / 2;
    for (const child of descendants) {
      positions.push({ person: child, left: childLeft, depth: depth + 1 });
      childLeft += spans.get(child.id)! + GAP;
    }
  }
  nodes.sort((a, b) => a.y - b.y || a.x - b.x);
  const byId = new Map(nodes.map((node) => [node.person.id, node]));
  const edges = nodes.flatMap((node) => {
    const parent = byId.get(node.person.sponsor_person_id ?? "");
    return parent ? [{ parent, child: node }] : [];
  });
  return {
    nodes,
    edges,
    width: PADDING * 2 + (roots.length ? left - PADDING - GAP : NODE_WIDTH),
    height: PADDING * 2 + (people.length ? maxDepth * LEVEL + NODE_HEIGHT : 0),
  };
}
