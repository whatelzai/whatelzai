import test from "node:test";
import assert from "node:assert/strict";
import {
  mediaDescription,
  validEventMediaPath,
} from "../lib/event-admin/media-policy";
import { containRect, socialSizes } from "../lib/event-admin/social-image";
import { boundTransform } from "../lib/event-admin/media-geometry";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const key = "event",
  path = `${key}/00000000-0000-4000-8000-000000000001-photo.jpg`;
test("media paths are confined to the current event and exact generated filename shape", () => {
  assert.ok(validEventMediaPath(path, key));
  for (const p of [
    path.replace("event/", "other/"),
    "event/../secret",
    path + "/secret",
    null,
  ])
    assert.equal(validEventMediaPath(p, key), false);
});
test("media descriptions are bounded and manual names are trimmed/deduplicated", () => {
  assert.deepEqual(
    mediaDescription({
      path,
      title: " Example ",
      description: " Context ",
      people: ["Edmund", " Edmund "],
      revision: 0,
    }),
    {
      path,
      title: "Example",
      description: "Context",
      people: ["Edmund"],
      revision: 0,
    },
  );
  for (const p of [
    { title: "x".repeat(121) },
    { description: "x".repeat(2001) },
    { people: Array(13).fill("person") },
    { revision: -1 },
  ])
    assert.throws(() =>
      mediaDescription({
        path,
        title: "",
        description: "",
        people: [],
        revision: 0,
        ...p,
      }),
    );
});
test("social exports preserve the full image within exact post/story sizes", () => {
  assert.deepEqual(socialSizes.post, { width: 1080, height: 1440 });
  assert.deepEqual(socialSizes.story, { width: 1080, height: 1920 });
  for (const size of Object.values(socialSizes)) {
    const r = containRect(1024, 1536, size.width, size.height);
    assert.ok(r.x >= 0 && r.y >= 0);
    assert.ok(r.x + r.width <= size.width + 0.0001);
    assert.ok(r.y + r.height <= size.height + 0.0001);
    assert.ok(Math.abs(r.width / r.height - 1024 / 1536) < 0.00001);
  }
  assert.throws(() => containRect(0, 10, 1080, 1440));
});
test("image pan is bounded, reset fits and zoom is limited to five times", () => {
  assert.deepEqual(
    boundTransform({ scale: 1, x: 200, y: -100 }, 400, 300, 800, 600),
    { scale: 1, x: 0, y: 0 },
  );
  assert.deepEqual(
    boundTransform({ scale: 9, x: 9999, y: -9999 }, 400, 300, 800, 600),
    { scale: 5, x: 800, y: -600 },
  );
});
test("metadata is private, tied to an event path and revision updates cannot overwrite newer values", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role; create table public.users(id uuid primary key);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261113060000_event_media_descriptions.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const owner = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into users values ($1)", [owner]);
    await db.query(
      "insert into event_media_assets(event_key,storage_path,title,updated_by) values($1,$2,'original',$3)",
      [key, path, owner],
    );
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select * from event_media_assets"),
      /permission denied/,
    );
    await db.exec("reset role");
    const first = await db.query(
      "update event_media_assets set title='new',revision=2 where event_key=$1 and storage_path=$2 and revision=1 returning title",
      [key, path],
    );
    assert.equal(first.rows.length, 1);
    const stale = await db.query(
      "update event_media_assets set title='stale' where event_key=$1 and storage_path=$2 and revision=1 returning title",
      [key, path],
    );
    assert.equal(stale.rows.length, 0);
    await assert.rejects(
      () =>
        db.query(
          "insert into event_media_assets(event_key,storage_path,updated_by)values('other',$1,$2)",
          [path, owner],
        ),
      /check constraint/,
    );
  } finally {
    await db.close();
  }
});
