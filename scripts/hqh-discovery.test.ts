import test from "node:test";
import assert from "node:assert/strict";
import {
  hqhDiscoveryQuery,
  discoverHqhEvent,
} from "../lib/member-ai/hqh-discovery";
import { hqhRequest, mentionedLeadIds } from "../lib/fcos/hqh-request";
import { isShareableHqh } from "../lib/fcos/whatsapp";
import { boundedFollowupNotes } from "../lib/leads/hqh-history";
const message = (body: string) => ({
  id: "request",
  role: "user" as const,
  body,
  proposals: [],
});
test("the exact natural request starts saved-context discovery without asking for names", () => {
  const r = hqhDiscoveryQuery([
    message("Can you help me write the HQH for my 6 baobeis for this JB trip?"),
  ]);
  assert.equal(r?.source, "hqh_discover");
  assert.match(r?.query ?? "", /JB trip/);
  const follow = hqhDiscoveryQuery([
    message("Write HQH for this JB trip"),
    message("English, this Saturday would be 14th 15th nov"),
  ]);
  assert.match(follow?.query ?? "", /JB/);
});
test("checkbox selections resolve directly in selected order, without requiring an event", () => {
  const prompt = hqhRequest(["Second Person", "First Person"], "zh");
  const r = hqhDiscoveryQuery([message(prompt)]);
  assert.equal(r?.source, "hqh");
  assert.equal(r?.query, "Second Person | First Person");
  assert.doesNotMatch(prompt, /event.*required/i);
  assert.match(prompt, /Simplified Chinese/);
});
test("saved cohorts exclude hidden IDs and preserve real ambiguity", () => {
  const rows = [
    {
      event_name: "JB IntroGather",
      occurred_on: "2026-11-14",
      lead_ids: ["one", "hidden"],
    },
    {
      event_name: "JB IntroGather",
      occurred_on: "2026-11-14",
      lead_ids: ["two"],
    },
  ];
  const allowed = new Set(["one", "two"]);
  assert.deepEqual(
    discoverHqhEvent(rows, allowed, "this JB trip", "2026-11-14").selected
      ?.leadIds,
    ["one", "two"],
  );
  assert.equal(
    discoverHqhEvent(
      [
        ...rows,
        {
          event_name: "JB Other gathering",
          occurred_on: "2026-11-15",
          lead_ids: ["one"],
        },
      ],
      allowed,
      "JB",
      "2026-11-14",
    ).selected,
    null,
  );
});
test("HHH follow-up bodies take priority over old HQH plans and have honest bounded coverage", () => {
  const base = {
    id: "x",
    title: "Note",
    status: "draft",
    occurred_on: "2026-11-14",
    reflections: "",
    next_steps: "",
  };
  const result = boundedFollowupNotes(
    [
      { ...base, kind: "HQH", observations: "Old trip plan" },
      { ...base, id: "y", kind: "HHH", observations: "New observation 中文" },
    ],
    12,
  );
  assert.equal(result.notes[0].kind, "HHH");
  assert.ok(!result.notes[0].body.includes("\uFFFD"));
  assert.match(result.coverage, /omitted or truncated/);
});
test("share action belongs to a prepared HQH, not a clarification question", () => {
  assert.equal(
    isShareableHqh(
      "Sure—send me your six Baobeis names, English or Chinese for HQH?",
    ),
    false,
  );
  assert.equal(
    isShareableHqh("HQH\n1. Example > ❌ Not Poti\n  Objective > Meet people"),
    true,
  );
});

test("an HHH follow-up is not turned into another HQH request", () => {
  assert.equal(
    hqhDiscoveryQuery([
      message("Write HQH for a person"),
      message("Now help me write their HHH"),
    ]),
    null,
  );
});

test("saving a chat note can preselect only permitted named people for ongoing follow-up", () => {
  assert.deepEqual(
    mentionedLeadIds("Create latest HQH for Example Person | Another Person", [
      { id: "a", name: "Example Person" },
      { id: "b", name: "Another Person" },
      { id: "c", name: "Other Person" },
    ]),
    ["a", "b"],
  );
  assert.deepEqual(
    mentionedLeadIds("Example PersonExtra", [
      { id: "a", name: "Example Person" },
    ]),
    [],
  );
});

test("large group context retains six people and current facts inside the request budget", async () => {
  const { fitHqhContext } = await import("../lib/member-ai/hqh-context-budget");
  const people = Array.from({ length: 6 }, (_, i) => ({
    person: { name: `Person ${i}`, story: "x".repeat(1400) },
    currentHqh: {
      poti_status: "not_yet",
      intake: {
        objective: "Meet people",
        age_as_reported: 23,
        raw_input: "x".repeat(1000),
      },
      invitation_context: "x".repeat(2000),
      familiarity_context: "x".repeat(1700),
    },
    history: { notes: [{ body: "x".repeat(8000), kind: "HHH" }] },
  }));
  const result = fitHqhContext({ people }) as {
    people: typeof people;
    contextCoverage: string;
  };
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 32000);
  assert.equal(result.people.length, 6);
  assert.equal(result.people[0].currentHqh.poti_status, "not_yet");
  assert.equal(result.people[5].currentHqh.intake.objective, "Meet people");
  assert.match(result.contextCoverage, /shortened/);
});
