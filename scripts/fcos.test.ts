import assert from "node:assert/strict";
import { test } from "node:test";
import { briefingSchema, sourceQuerySchema } from "../lib/fcos/model";
import { memberTab } from "../lib/fcos/navigation";
import { eventHref } from "../lib/fcos/links";
import { domainRoute } from "../lib/domain-routing";
import { runMemberAgent, type Receipt } from "../lib/member-ai/agent";
const id = "00000000-0000-4000-8000-000000000001";
const note = {
  id,
  revision: 0,
  kind: "HQH",
  title: "Example prebrief",
  event_name: "",
  occurred_on: "2026-10-21",
  lead_ids: [],
  observations: "",
  reflections: "",
  next_steps: "",
  status: "draft",
};
test("notes allow class learning without leads and strip forged ownership", () => {
  const result = briefingSchema.parse({ ...note, kind: "HHH", owner_id: id });
  assert.equal(result.kind, "HHH");
  assert.equal("owner_id" in result, false);
  assert.deepEqual(result.lead_ids, []);
});
test("briefings reject impossible dates, excessive leads and invalid review state", () => {
  for (const patch of [
    { occurred_on: "2026-02-30" },
    { lead_ids: Array(21).fill(id) },
    { status: "shared" },
    { revision: -1 },
  ])
    assert.equal(
      briefingSchema.safeParse({ ...note, ...patch }).success,
      false,
    );
  assert.deepEqual(
    briefingSchema.parse({ ...note, lead_ids: [id, id] }).lead_ids,
    [id],
  );
});
test("resource tool cannot choose another owner or bypass a calendar persona", () => {
  assert.equal(
    sourceQuerySchema.safeParse({ source: "leads", query: "", owner_id: id })
      .success,
    false,
  );
  assert.equal(
    sourceQuerySchema.safeParse({
      source: "events",
      query: "",
      preview: "Oracle",
    }).success,
    false,
  );
});
test("fcOS routes belong to protected member app", () => {
  for (const path of [
    "/briefings",
    "/briefings/new",
    "/briefings/" + id,
    "/resources",
  ]) {
    assert.equal(domainRoute("app.whatelz.ai", path).protect, true);
    assert.equal(
      domainRoute("whatelz.ai", path).redirect,
      "https://app.whatelz.ai" + path,
    );
  }
});
test("chat reads resource context without saving notes or requiring a vault", async () => {
  let calls = 0;
  let reads = 0;
  const receipt: Receipt = { input: 0, output: 0, charge: 0, uncertain: false };
  const result = await runMemberAgent({
    role: "beacon",
    key: "test",
    model: "gpt-6-luna",
    history: [],
    day: "2026-10-21",
    receipt,
    readVault: async () => {
      throw Error("Must not require vault");
    },
    readCommitments: async () => [],
    readFcos: async (args) => {
      reads++;
      assert.deepEqual(args, { source: "leads", query: "Example" });
      return { items: [] };
    },
    request: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.match(body.instructions, /member must review and save/);
      return Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 20 },
        output:
          calls === 1
            ? [
                {
                  type: "function_call",
                  name: "read_fcos",
                  arguments: '{"source":"leads","query":"Example"}',
                  call_id: "r",
                },
              ]
            : [
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: "Who is attending? Here is a draft to review.",
                    },
                  ],
                },
              ],
      });
    },
  });
  assert.equal(reads, 1);
  assert.equal(result.proposals.length, 0);
  assert.match(result.body, /draft/);
});

test("context navigation keeps the notebook under Resources and protects event/profile routes", () => {
  assert.equal(memberTab("/briefings/example"), "/resources");
  assert.equal(memberTab("/calendar/event"), "/resources");
  assert.equal(memberTab("/leads/example"), "/leads");
  assert.equal(memberTab("/profile"), "/profile");
  for (const path of ["/profile", "/calendar/event"]) {
    assert.equal(domainRoute("app.whatelz.ai", path).protect, true);
    assert.equal(
      domainRoute("whatelz.ai", path).redirect,
      "https://app.whatelz.ai" + path,
    );
  }
  assert.equal(
    eventHref("2026-10", "example|2026-10-22"),
    "/calendar/event?month=2026-10&event=example%7C2026-10-22",
  );
});
test("a calendar link requires both an occurrence key and a valid month", () => {
  assert.equal(
    briefingSchema.safeParse({ ...note, event_key: "example" }).success,
    false,
  );
  assert.equal(
    briefingSchema.safeParse({
      ...note,
      event_key: "example",
      event_month: "2026-13",
    }).success,
    false,
  );
  assert.equal(
    briefingSchema.safeParse({
      ...note,
      event_key: "example",
      event_month: "2026-10",
    }).success,
    true,
  );
});
