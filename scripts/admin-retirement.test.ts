import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("legacy PAT cleanup is idempotent and preserves current OAuth credentials", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table system_config(key text primary key,value text); create table auth_tokens(id text primary key,token_hash text); insert into system_config values('mcp_token','unused-fixture'),('oauth_code_secret','signing-fixture'),('other','unrelated-fixture'); insert into auth_tokens values('current','hash-fixture');",
    );
    const sql = await readFile(
      new URL(
        "../supabase/migrations/20261024090322_retire_developer_pat.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const keys = await db.query<{ key: string }>(
      "select key from system_config order by key",
    );
    assert.deepEqual(
      keys.rows.map((r) => r.key),
      ["oauth_code_secret", "other"],
    );
    const tokens = await db.query<{ count: number }>(
      "select count(*)::int as count from auth_tokens",
    );
    assert.equal(tokens.rows[0].count, 1);
  } finally {
    await db.close();
  }
});
