import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import sharp from "sharp";
const origin = "https://admin.whatelz.ai";
test("admin installation identity and every shortcut stay on the private admin origin", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/admin-pwa/app.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.id, origin + "/");
  assert.equal(manifest.scope, origin + "/");
  assert.equal(manifest.start_url, origin + "/today");
  assert.equal(manifest.display, "standalone");
  for (const item of manifest.shortcuts)
    assert.equal(new URL(item.url).origin, origin);
  for (const size of [192, 512])
    assert.ok(
      manifest.icons.some(
        (icon) => icon.sizes === `${size}x${size}` && icon.purpose === "any",
      ),
    );
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  for (const icon of [
    ...manifest.icons,
    { src: "/admin-pwa/icon-180.png", sizes: "180x180" },
  ]) {
    const bytes = await readFile(
      new URL("../public" + icon.src, import.meta.url),
    );
    const image = await sharp(bytes).metadata();
    assert.equal(`${image.width}x${image.height}`, icon.sizes);
    assert.equal(image.format, "png");
  }
  const member = JSON.parse(
    await readFile(
      new URL("../public/fcos/app.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(member.id, "https://app.whatelz.ai/");
  assert.equal(member.name, "weOS — Whatelz OS");
  assert.equal(member.short_name, "weOS");
  assert.equal(member.start_url, "https://app.whatelz.ai/");
  assert.equal(member.scope, "https://app.whatelz.ai/");
  assert.ok(member.icons.every((icon) => icon.src.startsWith("/weos/")));
  for (const icon of member.icons) {
    const current = await readFile(
      new URL("../public" + icon.src, import.meta.url),
    );
    const legacyPath = icon.src
      .replace("/weos/", "/fcos/")
      .replace("-v1.png", ".png");
    const legacy = await readFile(
      new URL("../public" + legacyPath, import.meta.url),
    );
    const { data, info } = await sharp(current)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [...data.subarray(0, 3)],
      [24, 24, 27],
      "weOS background is brand black",
    );
    let yellow = false;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (
        data[offset] === 250 &&
        data[offset + 1] === 204 &&
        data[offset + 2] === 21
      ) {
        yellow = true;
        break;
      }
    }
    assert.ok(yellow, "weOS mark is brand yellow");
    assert.ok(
      current.equals(legacy),
      "existing member icon URLs share the inverted weOS artwork",
    );
  }
});
async function worker(fetch) {
  const handlers = {};
  vm.runInNewContext(
    await readFile(new URL("../public/admin-sw.js", import.meta.url), "utf8"),
    {
      self: {
        addEventListener: (name, fn) => {
          handlers[name] = fn;
        },
      },
      fetch,
      Response,
    },
  );
  return (request) => {
    let response;
    handlers.fetch({
      request,
      respondWith: (r) => {
        response = r;
      },
    });
    return response;
  };
}
test("admin worker forwards original requests and preserves auth/error responses", async () => {
  const request = new Request(origin + "/api/admin/private", {
    method: "POST",
    body: "private mutation",
  });
  const denied = new Response("Owner access required", {
    status: 403,
    headers: { "Cache-Control": "private, no-store" },
  });
  const handle = await worker(async (received) => {
    assert.equal(received, request);
    return denied;
  });
  assert.equal(await handle(request), denied);
});
test("offline navigation exposes only a generic no-store screen; APIs never get an offline success", async () => {
  const handle = await worker(async () => {
    throw Error("network unavailable");
  });
  const response = await handle({ mode: "navigate" });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /You're offline/);
  assert.match(body, /href="\/today"/);
  await assert.rejects(handle({ mode: "cors" }), /network unavailable/);
});
