import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite(),
  a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create table users(id uuid primary key);insert into users values('${a}'),('${b}');create table admin_notifications(owner_id uuid,source_key text,title text,body text,url text,created_at timestamptz,read_at timestamptz,unique(owner_id,source_key));`,
);
await db.exec(
  readFileSync(
    "supabase/migrations/20261119004500_admin_rhythm_snapshots.sql",
    "utf8",
  ),
);
const save = (owner, key, version, updated = "2026-01-01T00:00:00Z") =>
  db.query("select save_admin_rhythm($1,$2,$3,$4,$5,$6,$7,$8) as saved", [
    owner,
    "morning",
    key,
    "edmund/01-personal/01-daily/01-morning/" + key + "-MORNING.md",
    "### Brief\n\nActual saved content",
    version,
    updated,
    updated,
  ]);
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  await assert.rejects(db.query("select * from admin_rhythm_snapshots"));
  await assert.rejects(save(a, "2026-01-01", "a".repeat(64)));
  await db.exec("reset role");
}
assert.equal((await save(a, "2026-01-02", "a".repeat(64))).rows[0].saved, true);
assert.equal(
  (await save(a, "2026-01-02", "a".repeat(64))).rows[0].saved,
  false,
);
assert.equal(
  (await db.query("select count(*)::int as n from admin_notifications")).rows[0]
    .n,
  1,
);
assert.equal(
  (await save(a, "2026-01-01", "b".repeat(64))).rows[0].saved,
  false,
);
await db.query(
  "update admin_rhythm_snapshots set read_version=version where owner_id=$1",
  [a],
);
assert.equal(
  (await save(a, "2026-01-02", "c".repeat(64), "2026-01-02T00:00:00Z")).rows[0]
    .saved,
  true,
);
assert.equal(
  (await save(a, "2026-01-02", "d".repeat(64), "2026-01-01T00:00:00Z")).rows[0]
    .saved,
  false,
);
let row = (
  await db.query("select * from admin_rhythm_snapshots where owner_id=$1", [a])
).rows[0];
assert.equal(row.version, "c".repeat(64));
assert.equal(row.read_version, "a".repeat(64));
await db.query(
  "update admin_rhythm_snapshots set read_version=$1 where owner_id=$2 and kind=$3 and version=$1",
  ["a".repeat(64), a, "morning"],
);
row = (
  await db.query("select * from admin_rhythm_snapshots where owner_id=$1", [a])
).rows[0];
assert.notEqual(row.version, row.read_version);
await save(b, "2026-01-03", "e".repeat(64));
assert.equal(
  (await db.query("select count(*)::int as n from admin_rhythm_snapshots"))
    .rows[0].n,
  2,
);
await assert.rejects(
  db.query("select save_admin_rhythm($1,$2,$3,$4,$5,$6,$7,$8)", [
    a,
    "morning",
    "2026-01-02",
    "vault/PRIVATE.md",
    "body",
    "f".repeat(64),
    "2026-01-02",
    "2026-01-02",
  ]),
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from admin_notifications where owner_id=$1",
      [a],
    )
  ).rows[0].n,
  2,
);
console.log(
  "Rhythm SQL checks passed: private grants, owner isolation, atomic dedupe, older source rejection, unread versions, stale reader protection and path constraints.",
);
await db.close();
