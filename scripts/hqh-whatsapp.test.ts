import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { whatsappHref } from "../lib/fcos/whatsapp";
import { hqhFacts } from "../lib/leads/hqh-model";
test("WhatsApp handoff preserves Chinese, emoji, indentation, newlines and separators without recipient/send parameters", () => {
  const message =
    "会前会\n1. Example > ❌ 未破题\n  目标 > 认识朋友 & 交流\n2. Another > ❌ Not 破题";
  const url = new URL(whatsappHref(message));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.searchParams.get("text"), message);
  assert.deepEqual([...url.searchParams.keys()], ["text"]);
  assert.equal(url.pathname, "/");
});
test("HQH metadata is allowlisted and membership never implies disclosure", () => {
  const result = hqhFacts({
    email: "secret",
    private_remarks: "secret",
    membership: "Catalyst",
    social_comfort: {
      level: "tentative_low",
      certainty: "not observed",
      secret: "secret",
    },
    intro_gather_logistics: {
      badminton_planned: false,
      overnight_planned: false,
    },
    hqh_intakes: [
      {
        raw_input: "Facts",
        organizer_objective: "Meet people",
        contact: "secret",
      },
    ],
  });
  assert.equal(result.poti_status, "unknown");
  assert.equal(result.social_comfort.certainty, "not observed");
  assert.equal(result.logistics.badminton, false);
  assert.ok(!JSON.stringify(result).includes("secret"));
  assert.equal(hqhFacts({ poti_status: "not_yet" }).poti_status, "not_yet");
});
test("HQH extra context is never queried for hidden or ambiguous matches", async () => {
  for (const items of [
    [],
    [
      { id: "one", name: "Same" },
      { id: "two", name: "Same" },
    ],
  ]) {
    const code = ts.transpileModule(
      fs.readFileSync(new URL("../lib/leads/hqh.ts", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const mod = { exports: {} };
    const mocks: Record<string, unknown> = {
      "server-only": {},
      "./context": { readLeadContext: async () => ({ items }) },
      "./hqh-model": { hqhFacts },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            throw Error("Must not query hidden/ambiguous context");
          },
        },
      },
    };
    vm.runInNewContext(code, {
      module: mod,
      exports: mod.exports,
      require: (name: string) => mocks[name],
    });
    const result = await (
      mod.exports as {
        readHqhContext: (q: string) => Promise<{ items: unknown[] }>;
      }
    ).readHqhContext("Same");
    assert.equal(result.items.length, 0);
  }
});
