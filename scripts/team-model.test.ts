import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  parseTeamSeed,
  relationshipTo,
  validatePeople,
  visiblePeople,
  type TeamPerson,
} from "../lib/team/model";
import {
  layoutTeamNodes,
  NODE_HEIGHT,
  NODE_WIDTH,
  teamNodeNames,
} from "../lib/team/node-layout";

const teamId = randomUUID();
const ids = Array.from({ length: 11 }, () => randomUUID());
const parents = [null, 0, 1, 1, 1, 1, 0, 0, 0, 8, 6];
const people: TeamPerson[] = parents.map((parent, index) => ({
  id: ids[index],
  team_id: teamId,
  display_name: index === 7 ? "Person 0" : `Person ${index}`,
  sponsor_person_id: parent === null ? null : ids[parent],
  context: "Internal description",
}));

test("node layout keeps duplicate names distinct and sponsors above children without overlapping cards", () => {
  const layout = layoutTeamNodes(people);
  assert.equal(layout.nodes.length, 11);
  assert.equal(layout.edges.length, 10);
  for (const { parent, child } of layout.edges) {
    assert.ok(parent.y + NODE_HEIGHT < child.y);
    assert.equal(child.person.sponsor_person_id, parent.person.id);
  }
  for (const node of layout.nodes) {
    assert.ok(node.x >= 0 && node.x + NODE_WIDTH <= layout.width);
    assert.ok(node.y >= 0 && node.y + NODE_HEIGHT <= layout.height);
    for (const other of layout.nodes) {
      if (node.person.id === other.person.id) continue;
      assert.ok(
        Math.abs(node.x - other.x) >= NODE_WIDTH ||
          Math.abs(node.y - other.y) >= NODE_HEIGHT,
      );
    }
  }
});

test("node view contains only authorized people and links, and handles multiple roots and empty views", () => {
  const layout = layoutTeamNodes(visiblePeople(people, ids[2], "member"));
  assert.deepEqual(
    new Set(layout.nodes.map((node) => node.person.id)),
    new Set([ids[1], ids[2]]),
  );
  assert.equal(layout.edges.length, 1);
  const forest = layoutTeamNodes([
    people[0],
    { ...people[1], sponsor_person_id: null },
  ]);
  assert.equal(forest.edges.length, 0);
  assert.equal(forest.nodes[0].y, forest.nodes[1].y);
  assert.ok(Math.abs(forest.nodes[0].x - forest.nodes[1].x) >= NODE_WIDTH);
  assert.equal(layoutTeamNodes([]).nodes.length, 0);
});

test("the supplied tree shape has eleven distinct people and ten sponsor links", () => {
  const seed = parseTeamSeed({
    team: {
      id: teamId,
      slug: "test-team",
      name: "Test team",
      focus_person_id: ids[2],
    },
    people,
  });
  assert.equal(seed.people.length, 11);
  assert.equal(
    seed.people.filter((person) => person.sponsor_person_id).length,
    10,
  );
  assert.equal(
    seed.people.filter((person) => person.display_name === "Person 0").length,
    2,
  );
});
test("relationships are relative to the selected person and include indirect branches", () => {
  assert.equal(relationshipTo(people, ids[2], ids[2]), "self");
  assert.equal(relationshipTo(people, ids[2], ids[1]), "direct upline");
  assert.equal(relationshipTo(people, ids[2], ids[0]), "upline");
  for (const index of [3, 4, 5])
    assert.equal(relationshipTo(people, ids[2], ids[index]), "direct sideline");
  for (const index of [6, 7, 8, 9, 10])
    assert.equal(relationshipTo(people, ids[2], ids[index]), "sideline");
  assert.equal(relationshipTo(people, ids[0], ids[1]), "direct downline");
  assert.equal(relationshipTo(people, ids[0], ids[2]), "downline");
});
test("an unlinked or regular member never gets other branches serialized", () => {
  assert.deepEqual(visiblePeople(people, randomUUID(), "member"), []);
  const memberView = visiblePeople(people, ids[1], "member");
  assert.deepEqual(
    new Set(memberView.map((person) => person.id)),
    new Set([0, 1, 2, 3, 4, 5].map((index) => ids[index])),
  );
  assert.ok(memberView.every((person) => person.context === null));
  const leafView = visiblePeople(people, ids[2], "member");
  assert.deepEqual(
    new Set(leafView.map((person) => person.id)),
    new Set([ids[1], ids[2]]),
  );
  assert.equal(
    leafView.find((person) => person.id === ids[1])?.sponsor_person_id,
    null,
  );
});
test("managers see their team but not a separate team's people", () => {
  const outsider = { ...people[0], id: randomUUID(), team_id: randomUUID() };
  assert.equal(
    visiblePeople([...people, outsider], ids[2], "manager").length,
    11,
  );
  assert.equal(
    relationshipTo([...people, outsider], ids[2], outsider.id),
    "unrelated",
  );
});
test("invalid identities, missing sponsors, cross-team links and cycles are rejected", () => {
  assert.throws(() => validatePeople([...people, people[0]]), /Duplicate/);
  assert.throws(
    () => validatePeople([{ ...people[0], sponsor_person_id: randomUUID() }]),
    /Unknown/,
  );
  assert.throws(
    () =>
      validatePeople([
        { ...people[0], sponsor_person_id: ids[2] },
        ...people.slice(1),
      ]),
    /cycle/,
  );
  assert.throws(
    () => validatePeople([{ ...people[0], sponsor_person_id: ids[0] }]),
    /cycle/,
  );
  assert.throws(
    () => validatePeople([people[0], { ...people[1], team_id: randomUUID() }]),
    /Cross-team/,
  );
});

test("member and manager serialization hides contact and private progress notes while preserving level, goal and ABO", () => {
  const enriched = people.map((person) => ({
    ...person,
    email: "person@example.test",
    abo_number: "00012345",
    current_level: "Example level",
    next_goal: "Example goal",
    progress_notes: "Private administrator notes",
  }));
  for (const role of ["member", "manager"] as const) {
    const result = visiblePeople(enriched, ids[2], role);
    assert.ok(result.every((person) => person.email === null));
    assert.ok(result.every((person) => person.progress_notes === null));
    assert.ok(
      result.every((person) => person.current_level === "Example level"),
    );
    assert.ok(result.every((person) => person.next_goal === "Example goal"));
    assert.ok(result.every((person) => person.abo_number === "00012345"));
  }
});

test("shared pairs stay one identity with two name circles and enough layout space", () => {
  const mixed = people.map((person, index) => ({
    ...person,
    display_name:
      index % 3 === 0
        ? `Partner ${index} & Companion ${index}`
        : person.display_name,
  }));
  const layout = layoutTeamNodes(mixed);
  assert.equal(layout.nodes.length, mixed.length);
  assert.equal(layout.edges.length, mixed.length - 1);
  for (const node of layout.nodes) {
    assert.equal(
      node.names.length,
      node.person.display_name.includes("&") ? 2 : 1,
    );
    assert.ok(node.width >= NODE_WIDTH);
    assert.ok(node.x >= 0 && node.x + node.width <= layout.width);
    for (const other of layout.nodes) {
      if (node === other || node.y !== other.y) continue;
      assert.ok(
        node.x + node.width <= other.x || other.x + other.width <= node.x,
      );
    }
  }
  for (const { parent, child } of layout.edges) {
    assert.ok(parent.y + NODE_HEIGHT < child.y);
    assert.equal(child.person.sponsor_person_id, parent.person.id);
  }
  assert.deepEqual(teamNodeNames("First Person & Second Person"), [
    "First Person",
    "Second Person",
  ]);
  assert.deepEqual(teamNodeNames("First ＆ Second"), ["First", "Second"]);
  assert.deepEqual(teamNodeNames("Single Person"), ["Single Person"]);
  for (const name of ["First &", "& Second", "A & B & C"]) {
    assert.deepEqual(teamNodeNames(name), [name]);
  }
});
