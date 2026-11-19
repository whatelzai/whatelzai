import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { MANDALA_PATH, mandalaAreas, mandalaGoal } from "../lib/mandala";

const body = Array.from(
  { length: 8 },
  (_, i) =>
    `### ${i + 1}. Area ${i + 1}\n\nApproval provenance: editable.\n\n${Array.from({ length: 8 }, (_, j) => `${j + 1}. **Action ${j + 1}** — Detail retained.`).join("\n")}`,
).join("\n\n");
test("grid requires all eight ordered areas and eight ordered actions, preserving source detail", () => {
  const areas = mandalaAreas(body)!;
  assert.equal(areas.length, 8);
  assert.equal(areas.flatMap((area) => area.cells).length, 64);
  assert(areas[0].body.includes("Approval provenance: editable."));
  assert(areas[0].body.includes("Detail retained."));
  assert.equal(areas[0].cells[0].detail, "Detail retained.");
  const multiline = mandalaAreas(
    body.replace(
      "Detail retained.\n2.",
      "Detail retained.\n\nAdditional source context.\n2.",
    ),
  )!;
  assert(multiline[0].cells[0].detail.includes("Additional source context."));
  assert.equal(mandalaAreas(body.replace("### 8. Area 8", "### Other")), null);
  assert.equal(
    mandalaAreas(body.replace("8. **Action 8**", "9. **Action 8**")),
    null,
  );
  assert.equal(
    mandalaAreas(body.replace("### 2. Area 2", "### 1. Duplicate")),
    null,
  );
});

test("headline figures are extracted from explicit source wording without inventing changed goals", () => {
  const source =
    "### Centre — My direction\n\nBy age 31: SG$7,250 monthly sustainable passive income, against SG$3,625 monthly living expenses, demonstrated for eight consecutive months. More context remains here.";
  assert.deepEqual(mandalaGoal(source).figures, {
    age: "31",
    income: "7,250",
    expenses: "3,625",
    proof: "eight consecutive months",
  });
  assert.equal(
    mandalaGoal("### Centre — New direction\n\nA goal that has changed.")
      .figures,
    null,
  );
  assert.equal(mandalaGoal("No centre section").figures, null);
});

test("private loader authorizes before credentials and reads only the fixed canonical document", async () => {
  let allowed = false,
    credentialReads = 0,
    sourceReads = 0;
  let connection: object | null = { token: "fixture" };
  let document: object | null = {
    content: `# Private\n\n## Notes\n\n${body}`,
    doc_content_hash: "fixture",
    sections: [],
  };
  const testModule = {
    exports: {} as {
      loadMandala: () => Promise<{ state: string; body?: string }>;
    },
  };
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/mandala-server.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "./daily/server")
        return {
          dailyOwner: async () => {
            if (!allowed) throw Error("not_found");
            return "owner";
          },
        };
      if (name === "./daily/connections")
        return {
          emdeeConnection: async (owner: string) => {
            assert.equal(owner, "owner");
            credentialReads++;
            return connection;
          },
        };
      if (name === "./daily/emdee-client")
        return {
          readEmdee: async (_connection: object, path: string) => {
            assert.equal(path, MANDALA_PATH);
            sourceReads++;
            return document;
          },
        };
      if (name === "./mandala") return { MANDALA_PATH };
      throw Error(name);
    },
  });
  await assert.rejects(testModule.exports.loadMandala(), /not_found/);
  assert.equal(credentialReads, 0);
  assert.equal(sourceReads, 0);
  allowed = true;
  assert.equal((await testModule.exports.loadMandala()).body, body);
  connection = null;
  assert.equal((await testModule.exports.loadMandala()).state, "unavailable");
  assert.equal(sourceReads, 1);
  connection = {};
  document = null;
  assert.equal((await testModule.exports.loadMandala()).state, "missing");
  document = { content: "# No Notes" };
  assert.equal((await testModule.exports.loadMandala()).state, "empty");
});
