import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import sharp from "sharp";
import { decodeQrPixels } from "../lib/event-qr";
import { parseTicket } from "../lib/event-checkin-policy";
const id = "00000000-0000-4000-8000-000000000001";
for (const inverted of [false, true]) {
  test(`email QR decodes locally (${inverted ? "inverted" : "normal"})`, async () => {
    const url = `https://whatelz.ai/tickets/${id}`;
    const png = await QRCode.toBuffer(url, {
      width: 600,
      margin: 4,
      color: inverted ? { dark: "#ffffff", light: "#000000" } : undefined,
    });
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const raw = await decodeQrPixels(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
    );
    assert.equal(raw, url);
    assert.equal(parseTicket(raw!), id);
  });
}
test("blank image is not a ticket", async () => {
  assert.equal(
    await decodeQrPixels(
      new Uint8ClampedArray(100 * 100 * 4).fill(255),
      100,
      100,
    ),
    null,
  );
});
test("unrelated or altered QR links cannot become ticket IDs", () => {
  for (const url of [
    `https://evil.test/tickets/${id}`,
    `https://whatelz.ai/tickets/${id}?x=1`,
    `https://whatelz.ai/tickets/${id}#x`,
    `javascript:alert(1)`,
    `https://whatelz.ai.evil.test/tickets/${id}`,
  ])
    assert.equal(parseTicket(url), null);
});

import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
function endpoint(
  staff: boolean,
  existing: Record<string, unknown> | null,
  updated = false,
) {
  const filters: unknown[][] = [];
  let writes = 0;
  const mod = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/event-checkin/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    URL,
    Date,
    require: (name: string) =>
      ({
        "next/server": { NextResponse: { json: Response.json } },
        "@/lib/event-staff": {
          eventStaff: async () => (staff ? { id: "owner" } : null),
        },
        "@/lib/event-checkin-policy": { parseTicket },
        "@/lib/event-tickets": { EVENT_KEY: "test-event" },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => {
              let write = false;
              const q = {
                update: () => {
                  write = true;
                  writes++;
                  return q;
                },
                eq: (...args: unknown[]) => {
                  filters.push(args);
                  return q;
                },
                is: (...args: unknown[]) => {
                  filters.push(args);
                  return q;
                },
                select: () => q,
                maybeSingle: async () => ({
                  data: write
                    ? updated
                      ? {
                          attendee_name: "Test",
                          checked_in_at: "2026-11-12T11:00:00Z",
                        }
                      : null
                    : existing,
                  error: null,
                }),
              };
              return q;
            },
          },
        },
      })[name],
  });
  return {
    post: (ticket = id, origin = "https://admin.whatelz.ai") =>
      mod.exports.POST(
        new Request("https://admin.whatelz.ai/api/event-checkin", {
          method: "POST",
          headers: { origin, "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        }),
      ),
    filters,
    writes: () => writes,
  };
}
test("check-in rejects origin/auth/invalid QR before database writes", async () => {
  const denied = endpoint(false, null);
  assert.equal((await denied.post()).status, 403);
  assert.equal(denied.writes(), 0);
  const allowed = endpoint(true, null);
  assert.equal((await allowed.post(id, "https://evil.test")).status, 403);
  assert.equal((await allowed.post("invalid")).status, 400);
  assert.equal(allowed.writes(), 0);
});
test("check-in atomically restricts current event, confirmed status and empty timestamp", async () => {
  const e = endpoint(true, null, true);
  const response = await e.post();
  assert.equal((await response.json()).status, "checked_in");
  for (const filter of [
    ["id", id],
    ["event_key", "test-event"],
    ["status", "confirmed"],
    ["checked_in_at", null],
  ])
    assert.ok(
      e.filters.some((f) => JSON.stringify(f) === JSON.stringify(filter)),
    );
});
test("duplicate check-in retains time; cancelled and unknown tickets rejected", async () => {
  const time = "2026-11-12T11:00:00Z";
  const duplicate = await endpoint(true, {
    status: "confirmed",
    attendee_name: "Test",
    checked_in_at: time,
  }).post();
  assert.deepEqual(await duplicate.json(), {
    status: "already_checked_in",
    name: "Test",
    at: time,
  });
  for (const row of [null, { status: "cancelled", checked_in_at: time }])
    assert.equal((await endpoint(true, row).post()).status, 404);
  assert.equal(
    (await endpoint(true, { status: "confirmed", checked_in_at: null }).post())
      .status,
    409,
  );
});

test("Admin scan opens camera and checks in automatically; repeated frames do not resubmit", async () => {
  const effects: (() => void | (() => void))[] = [],
    frames: (() => void)[] = [],
    ticks: (() => void)[] = [];
  let refs = 0,
    cameraStarts = 0,
    posts = 0,
    refreshed = 0,
    stops = 0;
  const video = { srcObject: null, play: async () => {} };
  const mod = { exports: {} as { default: (props: unknown) => unknown } };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/event-checkin/Scanner.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    Date,
    Error,
    AbortSignal,
    requestAnimationFrame: (fn: () => void) => {
      frames.push(fn);
      return 1;
    },
    cancelAnimationFrame: () => {},
    setTimeout: (fn: () => void) => {
      ticks.push(fn);
      return ticks.length;
    },
    clearTimeout: () => {},
    document: { addEventListener: () => {}, removeEventListener: () => {} },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => {
          cameraStarts++;
          return { getTracks: () => [{ stop: () => stops++ }] };
        },
      },
    },
    window: {
      BarcodeDetector: class {
        async detect() {
          return [{ rawValue: `https://whatelz.ai/tickets/${id}` }];
        }
      },
    },
    fetch: async (_url: string, options: { body: string }) => {
      posts++;
      assert.equal(JSON.parse(options.body).ticket, id);
      return {
        ok: true,
        json: async () => ({
          status: "checked_in",
          name: "Synthetic attendee",
          at: "2026-11-12T11:00:00Z",
        }),
      };
    },
    require: (name: string) =>
      ({
        react: {
          useState: (v: unknown) => [v, () => {}],
          useRef: (v: unknown) => ({ current: refs++ === 0 ? video : v }),
          useId: () => "ticket",
          useCallback: (fn: unknown) => fn,
          useEffect: (fn: () => void) => effects.push(fn),
          useEffectEvent: (fn: unknown) => fn,
        },
        "react/jsx-runtime": { jsx: () => ({}), jsxs: () => ({}) },
        "lucide-react": {},
        "./scanner.css": {},
        "@/lib/event-checkin-policy": { parseTicket },
        "@/lib/event-qr": {},
      })[name],
  });
  mod.exports.default({
    autoStart: true,
    autoCheckIn: true,
    onCheckedIn: () => refreshed++,
  });
  const cleanups = effects.map((effect) => effect());
  frames.forEach((fn) => fn());
  for (let n = 0; n < 20; n++) await Promise.resolve();
  assert.equal(cameraStarts, 1);
  assert.equal(posts, 1);
  assert.equal(refreshed, 1);
  assert.equal(stops, 0, "keep camera ready for next attendee");
  ticks.shift()?.();
  for (let n = 0; n < 20; n++) await Promise.resolve();
  assert.equal(posts, 1, "suppress repeated frames of the same ticket");
  cleanups.forEach((cleanup) => cleanup?.());
  assert.equal(stops, 1, "release camera when panel unmounts");
});
