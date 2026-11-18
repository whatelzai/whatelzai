import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create table public.users(id uuid primary key);insert into users values('${a}'),('${b}');`,
);
const base = readFileSync(
  new URL(
    "../supabase/migrations/20261019061559_daily_command_center.sql",
    import.meta.url,
  ),
  "utf8",
).split("create table public.daily_documents")[0];
await db.exec(base);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261118053000_admin_chat_inbox_personal.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  for (const table of [
    "admin_chat_threads",
    "admin_chat_turns",
    "admin_notifications",
  ])
    await assert.rejects(
      () => db.query(`select * from ${table}`),
      /permission denied/,
    );
  await assert.rejects(
    () => db.query("select apply_admin_chat_proposal($1,$2)", [a, b]),
    /permission denied/,
  );
  await db.exec("reset role");
}
const thread = (
  await db.query(
    "insert into admin_chat_threads(owner_id,title) values($1,$2) returning id",
    [a, "Test"],
  )
).rows[0].id;
const turn = "33333333-3333-4333-8333-333333333333";
const proposal = {
  operation: "create",
  id: null,
  revision: null,
  title: "Capture a personal idea",
  lane: "personal",
  due_on: "2026-11-18",
  status: "open",
  reason: "User confirmed",
};
await db.query(
  "insert into admin_chat_turns(id,owner_id,thread_id,user_text,reply,proposal,status) values($1,$2,$3,'idea','review',$4,'complete')",
  [turn, a, thread, JSON.stringify(proposal)],
);
await assert.rejects(
  () => db.query("select apply_admin_chat_proposal($1,$2)", [b, turn]),
  /Proposal unavailable/,
);
const id = (
  await db.query("select apply_admin_chat_proposal($1,$2) as id", [a, turn])
).rows[0].id;
assert.equal(
  (await db.query("select apply_admin_chat_proposal($1,$2) as id", [a, turn]))
    .rows[0].id,
  id,
);
assert.equal(
  (await db.query("select count(*)::int as n from daily_tasks")).rows[0].n,
  1,
);
const update = "44444444-4444-4444-8444-444444444444";
await db.query(
  "insert into admin_chat_turns(id,owner_id,thread_id,user_text,reply,proposal,status) values($1,$2,$3,'done','review',$4,'complete')",
  [
    update,
    a,
    thread,
    JSON.stringify({
      ...proposal,
      operation: "update",
      id,
      revision: 0,
      status: "done",
    }),
  ],
);
await db.query("select apply_admin_chat_proposal($1,$2)", [a, update]);
const task = (await db.query("select * from daily_tasks where id=$1", [id]))
  .rows[0];
assert.equal(task.status, "done");
assert.equal(task.revision, 1);
assert.ok(task.completed_on);
assert.ok(task.completed_at);
const stale = "55555555-5555-4555-8555-555555555555";
await db.query(
  "insert into admin_chat_turns(id,owner_id,thread_id,user_text,reply,proposal,status) values($1,$2,$3,'stale','review',$4,'complete')",
  [
    stale,
    a,
    thread,
    JSON.stringify({ ...proposal, operation: "update", id, revision: 0 }),
  ],
);
await assert.rejects(
  () => db.query("select apply_admin_chat_proposal($1,$2)", [a, stale]),
  /Task changed/,
);
await assert.rejects(
  () =>
    db.query(
      "insert into admin_chat_turns(id,owner_id,thread_id,user_text,status) values(gen_random_uuid(),$1,$2,'cross owner','pending')",
      [b, thread],
    ),
  /foreign key/,
);
await db.query(
  "insert into admin_chat_turns(id,owner_id,thread_id,user_text,status) values(gen_random_uuid(),$1,$2,'pending','pending')",
  [a, thread],
);
await assert.rejects(
  () =>
    db.query(
      "insert into admin_chat_turns(id,owner_id,thread_id,user_text,status) values(gen_random_uuid(),$1,$2,'duplicate pending','pending')",
      [a, thread],
    ),
  /unique/,
);
await db.query(
  "insert into admin_notifications(owner_id,source_key,title,url) values($1,'same','New signup','/event-checkin')",
  [a],
);
await assert.rejects(
  () =>
    db.query(
      "insert into admin_notifications(owner_id,source_key,title,url) values($1,'same','duplicate','/event-checkin')",
      [a],
    ),
  /unique/,
);
await db.query(
  "update admin_notifications set read_at=now(),archived_at=now() where owner_id=$1",
  [b],
);
assert.equal(
  (
    await db.query(
      "select read_at from admin_notifications where owner_id=$1",
      [a],
    )
  ).rows[0].read_at,
  null,
);
await db.close();
console.log(
  "Admin SQL checks passed: private tables/RPC, owner isolation, Personal task confirmation, idempotence, stale revision, completed invariants, pending-turn lock, notification dedupe.",
);
