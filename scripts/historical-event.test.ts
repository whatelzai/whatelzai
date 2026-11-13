import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
import vm from "node:vm";
import * as mediaPolicy from "../lib/event-admin/media-policy";
test("historical attendance permits unknown scan time, preserves free admission and idempotent backfill", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role;create table public.events(id uuid primary key);create table public.users(id uuid primary key);create table public.event_people(id uuid primary key);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261113100000_historical_event_attendance.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const event = "00000000-0000-4000-8000-000000000001",
      owner = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into events values($1)", [event]);
    await db.query("insert into users values($1)", [owner]);
    for (let pass = 0; pass < 2; pass++)
      for (let n = 0; n < 5; n++)
        await db.query(
          "insert into event_attendance(event_id,display_name,attendance_on,source_key,recorded_by,returned_later)values($1,$2,'2026-06-28',$3,$4,$5)on conflict(source_key)do nothing",
          [event, `Attendee ${n}`, `backfill/${event}/${n}`, owner, n < 2],
        );
    const rows = await db.query<{
      status: string;
      checked_in_at: null;
      amount_minor: number;
      returned_later: boolean;
    }>(
      "select status,checked_in_at,amount_minor,returned_later from event_attendance",
    );
    assert.equal(rows.rows.length, 5);
    assert.ok(
      rows.rows.every(
        (r) =>
          r.status === "checked_in" &&
          r.checked_in_at === null &&
          r.amount_minor === 0,
      ),
    );
    assert.equal(rows.rows.filter((r) => r.returned_later).length, 2);
    await db.exec("set role anon");
    await assert.rejects(
      () => db.query("select * from event_attendance"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("private historical/draft poster endpoint rejects other hosts and non-owner before looking up assets", async () => {
  let reads = 0;
  const mod = { exports: {} as { GET: (r: Request) => Promise<Response> } };
  const code = ts.transpileModule(
    await readFile(
      new URL("../app/api/admin/event-poster/route.ts", import.meta.url),
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
    Response,
    URL,
    require: (name: string) =>
      ({
        "@/lib/daily/server": {
          dailyOwner: async () => {
            throw Error("Forbidden");
          },
        },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => {
              reads++;
              throw Error("Unexpected read");
            },
          },
        },
        "@/lib/event-admin/media-policy": mediaPolicy,
      })[name],
  });
  for (const host of ["whatelz.ai", "app.whatelz.ai", "admin.whatelz.ai"]) {
    const response = await mod.exports.GET(
      new Request(
        `https://${host}/api/admin/event-poster?event=00000000-0000-4000-8000-000000000001&format=original`,
      ),
    );
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(reads, 0);
});
