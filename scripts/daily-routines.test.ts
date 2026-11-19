import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../lib/daily/routines-model";

const slug = "whatelz-morning-brief";
const source = `---\nname: ${slug}\ndescription: Fixture routine\nmetadata:\n  version: "1.0.0"\n---\n\n### Read and decide\n\nPreserve unknown outcomes.\n`;
const document = `# Fixture\n\n## Notes\n\n${source}\n## Context synthesis\n\nDo not include this in the skill.\n`;
function api(mocks: Record<string, unknown>) {
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/daily/routines.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  const actualRequire = createRequire(import.meta.url);
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    require: (name: string) =>
      name === "server-only"
        ? {}
        : name === "./routines-model"
          ? model
          : name === "./paths"
            ? { DAILY_PARENT: "fixture/01-DAILY.md" }
            : name in mocks
              ? mocks[name]
              : actualRequire(name),
  });
  return loaded.exports as {
    loadRoutine: (slug: string) => Promise<{
      status: string;
      source?: string;
      path?: string;
      checksum?: string;
    }>;
  };
}
test("skill extraction preserves source while excluding other EMDEE sections", () => {
  const parsed = model.parseRoutine(document, slug);
  assert.equal(parsed.source, source);
  assert.equal(parsed.version, "1.0.0");
  assert.ok(!parsed.content.includes("Context synthesis"));
  assert.throws(() => model.parseRoutine(document, "whatelz-evening-debrief"));
  assert.throws(() =>
    model.parseRoutine(
      document.replace('version: "1.0.0"', "version: 1"),
      slug,
    ),
  );
  assert.throws(() => model.parseRoutine("# Missing Notes", slug));
});
test("routine reader authenticates before source access and rejects arbitrary paths", async () => {
  let reads = 0;
  const mocks = {
    "./server": {
      dailyOwner: async () => {
        throw Error("Owner required");
      },
    },
    "./connections": {
      emdeeConnection: async () => {
        reads++;
        return {};
      },
    },
    "./emdee-client": {
      readEmdee: async () => {
        reads++;
        return null;
      },
    },
  };
  await assert.rejects(api(mocks).loadRoutine(slug), /Owner required/);
  assert.equal(reads, 0);
  const owner = api({
    ...mocks,
    "./server": { dailyOwner: async () => "fixture-owner" },
  });
  assert.equal(
    (await owner.loadRoutine("../../other-vault/private")).status,
    "not-found",
  );
  assert.equal(reads, 0);
});
test("routine reader distinguishes disconnected, missing, invalid and ready sources", async () => {
  let parent = "wrong/DAILY.md",
    body: string | null = document,
    fail = false;
  const paths: string[] = [];
  const reader = api({
    "./server": { dailyOwner: async () => "fixture-owner" },
    "./connections": { emdeeConnection: async () => ({ parentPath: parent }) },
    "./emdee-client": {
      readEmdee: async (_connection: unknown, path: string) => {
        paths.push(path);
        if (fail) throw Error("Transport unavailable");
        return body === null ? null : { content: body };
      },
    },
  });
  assert.equal((await reader.loadRoutine(slug)).status, "disconnected");
  assert.equal(paths.length, 0);
  parent = "fixture/01-DAILY.md";
  const result = await reader.loadRoutine(slug);
  assert.equal(result.status, "ready");
  assert.equal(result.source, source);
  assert.match(result.checksum!, /^[a-f0-9]{64}$/);
  assert.equal(result.path, "fixture/01-daily/04-routines/01-MORNING-BRIEF.md");
  body = null;
  assert.equal((await reader.loadRoutine(slug)).status, "missing");
  body = document.replace(slug, "wrong-skill");
  assert.equal((await reader.loadRoutine(slug)).status, "unavailable");
  fail = true;
  assert.equal((await reader.loadRoutine(slug)).status, "unavailable");
});
