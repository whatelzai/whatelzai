import { test } from "node:test";
import assert from "node:assert/strict";
import { runMemberAgent, type Receipt } from "../lib/member-ai/agent";
import { readReply, readSse } from "../lib/member-ai/stream";
import { createReplyStream } from "../lib/member-ai/reply-stream";
const encoder = new TextEncoder();
const receipt = (): Receipt => ({
  input: 0,
  output: 0,
  charge: 0,
  uncertain: false,
});
const config = () => ({
  key: "fixture",
  model: "gpt-6.1-sol" as const,
  day: "2026-10-22",
  history: [],
  receipt: receipt(),
  readVault: async () => ({}),
  readCommitments: async () => ({ items: [] }),
});
const complete = (text: string) => ({
  type: "response.completed",
  response: {
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 10 },
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  },
});
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;
function bytes(text: string, size = 7) {
  const data = encoder.encode(text);
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < data.length; i += size)
        c.enqueue(data.slice(i, i + size));
      c.close();
    },
  });
}
test("SSE handles split JSON, CRLF, UTF8, comments and multiline data", async () => {
  const body = bytes(
    ': heartbeat\r\nevent: delta\r\ndata: {"type":"test",\r\ndata: "text":"你好 🌱"}\r\n\r\n',
  );
  const events = [];
  for await (const e of readSse(body)) events.push(e);
  assert.deepEqual(events, [{ type: "test", text: "你好 🌱" }]);
});
test("provider text reaches caller before completion; only terminal usage settles receipt", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let first!: () => void;
  const seen = new Promise<void>((r) => (first = r));
  const deltas: string[] = [];
  const opts = config();
  const running = runMemberAgent({
    role: "beacon",
    ...opts,
    onText: (t) => {
      deltas.push(t);
      first();
    },
    request: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).stream, true);
      return new Response(
        new ReadableStream({
          start(c) {
            controller = c;
            c.enqueue(
              encoder.encode(
                frame({
                  type: "response.output_text.delta",
                  delta: "**你好**",
                }),
              ),
            );
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
    },
  });
  await seen;
  assert.deepEqual(deltas, ["**你好**"]);
  assert.equal(opts.receipt.uncertain, true);
  assert.equal(opts.receipt.charge, 0);
  controller.enqueue(encoder.encode(frame(complete("**你好**"))));
  controller.close();
  const result = await running;
  assert.equal(result.body, "**你好**");
  assert.equal(opts.receipt.uncertain, false);
  assert.equal(opts.receipt.input, 100);
  assert.ok(opts.receipt.charge > 0);
});
test("interrupted provider stream keeps uncertain reservation; tool arguments never stream", async () => {
  const opts = config();
  const shown: string[] = [];
  await assert.rejects(
    () =>
      runMemberAgent({
        role: "beacon",
        ...opts,
        onText: (t) => shown.push(t),
        request: async () =>
          new Response(
            bytes(
              frame({
                type: "response.function_call_arguments.delta",
                delta: "PRIVATE ARGUMENT",
              }) +
                frame({ type: "response.output_text.delta", delta: "Partial" }),
            ),
          ),
      }),
    /before completion/,
  );
  assert.deepEqual(shown, ["Partial"]);
  assert.equal(opts.receipt.uncertain, true);
});
test("streaming loop executes scoped tools and counts every completed step", async () => {
  const opts = config();
  let calls = 0,
    reads = 0;
  const shown: string[] = [];
  opts.readCommitments = async () => {
    reads++;
    return { items: [] };
  };
  const result = await runMemberAgent({
    role: "beacon",
    ...opts,
    onText: (t) => shown.push(t),
    request: async () => {
      calls++;
      const response =
        calls === 1
          ? {
              type: "response.completed",
              response: {
                status: "completed",
                usage: { input_tokens: 40, output_tokens: 10 },
                output: [
                  {
                    type: "function_call",
                    name: "read_commitments",
                    arguments: "{}",
                    call_id: "r",
                  },
                ],
              },
            }
          : complete("No commitments.");
      return new Response(
        bytes(
          (calls === 2
            ? frame({
                type: "response.output_text.delta",
                delta: "No commitments.",
              })
            : "") + frame(response),
        ),
      );
    },
  });
  assert.equal(reads, 1);
  assert.equal(calls, 2);
  assert.deepEqual(shown, ["No commitments."]);
  assert.equal(result.body, "No commitments.");
  assert.equal(opts.receipt.input, 140);
  assert.equal(opts.receipt.uncertain, false);
});
test("browser transport emits chunks immediately and completion only after persistence", async () => {
  let finish!: () => void;
  const gate = new Promise<void>((r) => (finish = r));
  let persisted = false;
  const stream = createReplyStream(async (emit) => {
    emit("First");
    await gate;
    persisted = true;
    return Response.json({ message: { body: "First" } });
  });
  const reader = stream.response.body!.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /start/);
  assert.match(new TextDecoder().decode((await reader.read()).value), /First/);
  assert.equal(persisted, false);
  finish();
  await stream.finished;
  assert.equal(persisted, true);
  assert.match(new TextDecoder().decode((await reader.read()).value), /done/);
});
test("leaving browser does not cancel settlement; errors and truncated transports are explicit", async () => {
  let finish!: () => void;
  const gate = new Promise<void>((r) => (finish = r));
  let settled = false;
  const stream = createReplyStream(async (emit) => {
    await gate;
    emit("Later");
    settled = true;
    return Response.json({ message: { body: "Later" } });
  });
  await stream.response.body!.cancel();
  finish();
  await stream.finished;
  assert.equal(settled, true);
  const seen: string[] = [];
  await assert.rejects(
    () =>
      readReply(
        new Response(bytes('{"type":"delta","text":"Partial"}\n'), {
          headers: { "content-type": "application/x-ndjson" },
        }),
        (t) => seen.push(t),
      ),
    /interrupted/,
  );
  assert.deepEqual(seen, ["Partial"]);
  const failure = createReplyStream(async (emit) => {
    emit("Partial");
    return Response.json({ error: "Usage uncertain" }, { status: 502 });
  });
  await assert.rejects(
    () => readReply(failure.response, () => {}),
    /Usage uncertain/,
  );
  await failure.finished;
});
