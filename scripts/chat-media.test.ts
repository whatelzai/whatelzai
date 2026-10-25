import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeVoice, wavSamples, limitedForm } from "../lib/member-ai/media";
import { reserveCost } from "../lib/member-ai/model";
test("WAV encoding clamps duration and validates real PCM size rather than caller duration", () => {
  const wave = encodeVoice([new Float32Array(48000 * 61)], 48000);
  assert.equal(wavSamples(wave), 960000);
  const one = encodeVoice([new Float32Array(44100)], 44100);
  assert.equal(wavSamples(one), 16000);
  const invalid = new Uint8Array(one);
  invalid[24] = 0;
  assert.throws(() => wavSamples(invalid));
  assert.throws(() => wavSamples(new Uint8Array(100)));
  assert.throws(() => wavSamples(new Uint8Array([...one, 0])));
});
test("image reservation includes bounded vision tokens for both configured models", () => {
  for (const model of ["gpt-6-luna", "gpt-6.1-sol"] as const) {
    assert.ok(reserveCost(model, 2) > reserveCost(model));
    assert.ok(reserveCost(model, 2) <= 1000000);
    assert.equal(reserveCost(model, 100), reserveCost(model, 2));
  }
});
test("upload streaming cap holds even without content-length", async () => {
  const req = new Request("https://example.invalid", {
    method: "POST",
    body: "123456789",
  });
  await assert.rejects(() => limitedForm(req, 8), /large/);
  const form = new FormData();
  form.set("test", "yes");
  const valid = new Request("https://example.invalid", {
    method: "POST",
    body: form,
  });
  assert.equal((await limitedForm(valid, 1000)).get("test"), "yes");
});

test("image codec rejects disguised files and strips metadata without cropping the content", async () => {
  const sharp = (await import("sharp")).default;
  const { prepareChatImage } = await import("../lib/member-ai/image-codec");
  const original = await sharp({
    create: { width: 1800, height: 900, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const result = await prepareChatImage(original);
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1024);
  assert.equal(meta.height, 512);
  assert.equal(meta.exif, undefined);
  assert.ok(result.length <= 262144);
  await assert.rejects(() =>
    prepareChatImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
  );
  await assert.rejects(() =>
    prepareChatImage(Buffer.alloc(3 * 1024 * 1024 + 1)),
  );
});
test("Responses input includes images only on their matching private user message and keeps the byte budget", async () => {
  const { runMemberAgent } = await import("../lib/member-ai/agent");
  const url = "data:image/webp;base64," + "A".repeat(90000);
  let calls = 0;
  const output = await runMemberAgent({
    key: "fake",
    model: "gpt-6-luna",
    day: "2026-10-26",
    history: [
      {
        id: "one",
        request_id: "request-one",
        role: "user",
        body: "Read my photo",
        proposals: [],
      },
    ],
    images: [{ requestId: "request-one", url }],
    receipt: { input: 0, output: 0, charge: 0, uncertain: false },
    readVault: async () => ({}),
    readCommitments: async () => ({}),
    request: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.input[0].content[1].type, "input_image");
      assert.equal(body.input[0].content[1].image_url, url);
      assert.equal(body.store, false);
      return Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 5 },
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Photo read." }],
          },
        ],
      });
    },
  });
  assert.equal(output.body, "Photo read.");
  assert.equal(calls, 1);
});
