import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareLeadPhoto } from "../lib/leads/photo";
test("private photos are bounded, decoded, resized and metadata-stripped", async () => {
  const input = await sharp({
    create: { width: 1000, height: 800, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const output = await prepareLeadPhoto(input);
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
  assert.equal(meta.exif, undefined);
  await assert.rejects(() =>
    prepareLeadPhoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      ),
    ),
  );
  await assert.rejects(() =>
    prepareLeadPhoto(Buffer.alloc(3 * 1024 * 1024 + 1)),
  );
  await assert.rejects(() => prepareLeadPhoto(Buffer.from("not an image")));
});
