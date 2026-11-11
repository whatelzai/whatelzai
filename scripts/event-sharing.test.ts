import test from "node:test";
import assert from "node:assert/strict";
import {
  canSharePoster,
  sharePoster,
  eventCaption,
  eventUrl,
  posterFilename,
} from "../lib/event-admin/sharing";
import { mapEvent } from "../lib/public-events/map";
import { readFileSync } from "node:fs";
const file = new File(["PNG"], posterFilename, { type: "image/png" });
test("poster path is an existing PNG; caption uses only public event facts", () => {
  assert.equal(
    readFileSync("public" + mapEvent.poster)
      .subarray(0, 8)
      .toString("hex"),
    "89504e470d0a1a0a",
  );
  assert.equal(eventUrl, "https://whatelz.ai" + mapEvent.path);
  assert.ok(eventCaption.includes(mapEvent.price));
  assert.ok(!/FIRSTTIME|Guest|Catalyst|Spark|Founder/.test(eventCaption));
  assert.ok(!eventCaption.includes("admin.whatelz.ai"));
});
test("file sharing requires positive file support, including unsupported and throwing browsers", () => {
  assert.equal(
    canSharePoster({ share: async () => {}, canShare: () => true }, file),
    true,
  );
  assert.equal(
    canSharePoster({ share: async () => {}, canShare: () => false }, file),
    false,
  );
  assert.equal(
    canSharePoster(
      {
        share: async () => {},
        canShare: () => {
          throw Error("blocked");
        },
      },
      file,
    ),
    false,
  );
});
test("native handoff shares only the poster, never attendee data or an auto-post request", async () => {
  let payload: ShareData | undefined;
  const result = await sharePoster(
    {
      share: async (p) => {
        payload = p;
      },
    },
    file,
  );
  assert.equal(result, "opened");
  assert.deepEqual(Object.keys(payload!), ["files"]);
  assert.equal(payload?.files?.[0], file);
});
test("user cancellation is quiet while real share errors surface for download fallback", async () => {
  assert.equal(
    await sharePoster(
      {
        share: async () => {
          throw new DOMException("cancelled", "AbortError");
        },
      },
      file,
    ),
    "cancelled",
  );
  await assert.rejects(() =>
    sharePoster(
      {
        share: async () => {
          throw new DOMException("blocked", "NotAllowedError");
        },
      },
      file,
    ),
  );
});
