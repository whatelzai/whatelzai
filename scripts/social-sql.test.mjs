import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create table users(id uuid primary key);insert into users values('${owner}'),('${other}');`,
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261028132918_fcos_social_connections.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  for (const table of [
    "social_apps",
    "social_accounts",
    "social_posts",
    "social_oauth_states",
  ])
    await assert.rejects(
      () => db.query(`select * from ${table}`),
      /permission denied/,
    );
  await assert.rejects(
    () =>
      db.query("select consume_social_oauth($1,$2)", [owner, "a".repeat(64)]),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select disconnect_social_account($1,$2)", [owner, other]),
    /permission denied/,
  );
  await db.exec("reset role");
}
await db.exec("set role service_role");
await db.query(
  "insert into social_apps(owner_id,provider,encrypted_credentials) values($1,'instagram','cipher')",
  [owner],
);
const app = (await db.query("select * from social_apps")).rows[0];
const account = (
  await db.query(
    "insert into social_accounts(owner_id,provider,slot) values($1,'instagram',1) returning *",
    [owner],
  )
).rows[0];
await assert.rejects(
  () =>
    db.query(
      "insert into social_accounts(owner_id,provider,slot) values($1,'instagram',3)",
      [owner],
    ),
  /check constraint/,
);
await assert.rejects(
  () =>
    db.query(
      "insert into social_accounts(owner_id,provider,slot) values($1,'linkedin',2)",
      [owner],
    ),
  /check constraint/,
);
await assert.rejects(
  () =>
    db.query(
      "insert into social_posts(owner_id,account_id,post_id,body,permalink,published_at) values($1,$2,'x','x','',now())",
      [other, account.id],
    ),
  /foreign key/,
);
const hash = "a".repeat(64);
await db.query(
  "insert into social_oauth_states(state_hash,owner_id,account_id,account_revision,app_revision) values($1,$2,$3,$4,$5)",
  [hash, owner, account.id, account.revision, app.revision],
);
assert.equal(
  (await db.query("select * from consume_social_oauth($1,$2)", [other, hash]))
    .rows.length,
  0,
);
assert.equal(
  (await db.query("select * from consume_social_oauth($1,$2)", [owner, hash]))
    .rows.length,
  1,
);
assert.equal(
  (await db.query("select * from consume_social_oauth($1,$2)", [owner, hash]))
    .rows.length,
  0,
);
const finish = await db.query(
  "select finish_social_oauth($1,$2,$3,$4,'ig-1','Example','encrypted',now()+interval '2 days') as ok",
  [owner, account.id, account.revision, app.revision],
);
assert.equal(finish.rows[0].ok, true);
const active = (await db.query("select * from social_accounts")).rows[0];
const posts = JSON.stringify([
  {
    post_id: "post-1",
    body: "example",
    permalink: "",
    published_at: new Date().toISOString(),
  },
]);
assert.equal(
  (
    await db.query("select commit_social_sync($1,$2,$3,$4,$5,now()) as ok", [
      other,
      account.id,
      active.revision,
      posts,
      "cipher",
    ])
  ).rows[0].ok,
  false,
);
assert.equal(
  (
    await db.query("select commit_social_sync($1,$2,$3,$4,$5,now()) as ok", [
      owner,
      account.id,
      active.revision,
      posts,
      "cipher",
    ])
  ).rows[0].ok,
  true,
);
assert.equal(
  (
    await db.query("select disconnect_social_account($1,$2) as ok", [
      owner,
      account.id,
    ])
  ).rows[0].ok,
  true,
);
assert.equal(
  (await db.query("select count(*)::int as n from social_posts")).rows[0].n,
  0,
);
assert.equal(
  (
    await db.query("select commit_social_sync($1,$2,$3,$4,$5,now()) as ok", [
      owner,
      account.id,
      active.revision,
      posts,
      "cipher",
    ])
  ).rows[0].ok,
  false,
);
console.log(
  "Social SQL permissions, account limits, one-time state, cross-owner and disconnect/replay checks passed.",
);
await db.close();
