import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, generateTitle, TITLE_MODEL } from "../lib/member-ai/title";
test("titles use bounded first-exchange text, fixed Luna, no storage/tools and a validated receipt", async () => {
  let calls = 0;
  const result = await generateTitle(
    "fixture",
    { user: "A".repeat(5000), assistant: "B".repeat(5000) },
    async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gpt-6-luna");
      assert.equal(body.model, TITLE_MODEL);
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.max_output_tokens, 96);
      const input = JSON.parse(body.input[0].content);
      assert.equal(input.first_user_message.length, 1600);
      assert.equal(input.first_assistant_reply.length, 800);
      return Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 10 },
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: "“Badminton Welcome Planning”" },
            ],
          },
        ],
      });
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    status: "completed",
    input: 100,
    output: 10,
    charge: 15,
    title: "Badminton Welcome Planning",
  });
});
test("invalid titles and known/unknown outcomes do not trigger a second provider call", async () => {
  assert.equal(cleanTitle("  团队活动准备  "), "团队活动准备");
  for (const value of ["", "x".repeat(81), "Title\nsecond line", "<script>"])
    assert.throws(() => cleanTitle(value));
  for (const mode of [
    "network",
    "400",
    "500",
    "invalid-usage",
    "invalid-title",
  ]) {
    let calls = 0;
    const result = await generateTitle(
      "fixture",
      { user: "Hello", assistant: "Hi" },
      async () => {
        calls++;
        if (mode === "network") throw Error("timeout");
        if (mode === "400" || mode === "500")
          return new Response(null, { status: Number(mode) });
        return Response.json({
          status: "completed",
          usage:
            mode === "invalid-usage"
              ? {}
              : { input_tokens: 10, output_tokens: 2 },
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Bad\nTitle" }],
            },
          ],
        });
      },
    );
    assert.equal(calls, 1);
    assert.equal(
      result.status,
      ["400", "invalid-title"].includes(mode) ? "failed" : "uncertain",
    );
    assert.equal(result.title, "");
  }
});
