import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create table users(id uuid primary key);insert into users values('${a}'),('${b}');`,
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261027144639_member_release_notes.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261027145522_member_release_publication_precision.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  `insert into member_release_notes(slug,title,body,published_at,published) values('draft','Draft','Draft',now(),false),('future','Future','Future',now()+interval '1 day',true),('older','Older','A',now()-interval '2 days',true),('newer','Newer','B',now()-interval '1 day',true);`,
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  await assert.rejects(
    () => db.query("select * from member_release_notes"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select * from member_release_receipts"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select acknowledge_member_release($1,3)", [a]),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into member_release_notes(slug,title,body,published_at) values('bad','Bad','Bad',now())",
      ),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into member_release_receipts(user_id,release_id,seen_published_at) values($1,3,now())",
        [a],
      ),
    /permission denied/,
  );
  await db.exec("reset role");
}
await db.exec("set role service_role");
for (const id of [1, 2, 999])
  await assert.rejects(
    () => db.query("select acknowledge_member_release($1,$2)", [a, id]),
    /unavailable/,
  );
await db.query("select acknowledge_member_release($1,4)", [a]);
await db.query("select acknowledge_member_release($1,3)", [a]);
await db.query("select acknowledge_member_release($1,4)", [a]);
assert.equal(
  Number(
    (
      await db.query(
        "select release_id from member_release_receipts where user_id=$1",
        [a],
      )
    ).rows[0].release_id,
  ),
  4,
);
assert.equal(
  (
    await db.query("select * from member_release_receipts where user_id=$1", [
      b,
    ])
  ).rows.length,
  0,
);
await db.query("select acknowledge_member_release($1,3)", [b]);
assert.equal(
  Number(
    (
      await db.query(
        "select release_id from member_release_receipts where user_id=$1",
        [b],
      )
    ).rows[0].release_id,
  ),
  3,
);
// Publication time wins even if a scheduled release was created earlier.
await db.exec("update member_release_notes set published_at=now() where id=2");
await db.query("select acknowledge_member_release($1,2)", [a]);
assert.equal(
  Number(
    (
      await db.query(
        "select release_id from member_release_receipts where user_id=$1",
        [a],
      )
    ).rows[0].release_id,
  ),
  2,
);
await db.query("select acknowledge_member_release($1,4)", [a]);
assert.equal(
  Number(
    (
      await db.query(
        "select release_id from member_release_receipts where user_id=$1",
        [a],
      )
    ).rows[0].release_id,
  ),
  2,
);
await db.exec("reset role");
const rls = await db.query(
  "select relrowsecurity from pg_class where relname in ('member_release_notes','member_release_receipts')",
);
assert.ok(rls.rows.every((r) => r.relrowsecurity));
await db.close();
console.log(
  "Release notes SQL: role denial, drafts/future denial, account isolation, idempotent and monotonic publication receipts passed.",
);
