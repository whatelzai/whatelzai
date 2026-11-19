import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role;create table member_leads(id int primary key,story text);create table member_briefings(id int primary key,observations text);insert into member_leads values(1,'Existing story');insert into member_briefings values(1,'Existing note');alter table member_leads enable row level security;alter table member_briefings enable row level security;`,
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261026005036_database_knowledge.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const collection = {
  id: "sample",
  kind: "culture",
  title: "Sample",
  metadata: { chapters: [{ id: "one", title: "One" }] },
  provenance: { original_source: "Source original" },
  position: 0,
  published: true,
};
const entry = {
  id: "sample-1",
  collection_id: "sample",
  body: "Exact text！",
  metadata: {
    chapters: ["one"],
    occurrences: [{ chapterId: "one", sourceOrder: 1 }],
  },
  position: 0,
  published: true,
};
await db.query("select import_member_knowledge($1,$2)", [
  JSON.stringify([collection]),
  JSON.stringify([entry]),
]);
assert.equal(
  (await db.query("select body from member_knowledge_entries")).rows[0].body,
  entry.body,
);
await assert.rejects(
  () =>
    db.query("select import_member_knowledge($1,$2)", [
      JSON.stringify([{ ...collection, id: "rollback" }]),
      JSON.stringify([entry]),
    ]),
  /duplicate/,
);
assert.equal(
  (
    await db.query(
      "select id from member_knowledge_collections where id='rollback'",
    )
  ).rows.length,
  0,
);
await assert.rejects(
  () => db.query("update member_leads set metadata='[]'"),
  /check constraint/,
);
await assert.rejects(
  () =>
    db.query(
      "update member_briefings set metadata=jsonb_build_object('large',repeat('x',40000))",
    ),
  /check constraint/,
);
assert.deepEqual(
  (await db.query("select story,metadata from member_leads")).rows,
  [{ story: "Existing story", metadata: {} }],
);
assert.deepEqual(
  (await db.query("select observations,metadata from member_briefings")).rows,
  [{ observations: "Existing note", metadata: {} }],
);
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  for (const table of [
    "member_knowledge_collections",
    "member_knowledge_entries",
  ])
    await assert.rejects(
      () => db.query("select * from " + table),
      /permission denied/,
    );
  await assert.rejects(
    () =>
      db.query("select import_member_knowledge($1,$2)", [
        JSON.stringify([collection]),
        "[]",
      ]),
    /permission denied/,
  );
  await db.exec("reset role");
}
await db.close();
console.log(
  "Knowledge SQL passed: atomic import/rollback, original text and private records preserved, bounded JSONB and browser role denial.",
);
