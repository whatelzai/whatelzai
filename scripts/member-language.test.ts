import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as language from "../lib/fcos/language";
import { resetCountdown } from "../lib/profile/usage";

test("member language validates choices and preserves stored or unknown text", () => {
  for (const value of [undefined, null, "fr", "ZH", {}, "<script>"])
    assert.equal(language.memberLanguage(value), "en");
  assert.equal(language.memberLanguage("zh"), "zh");
  assert.equal(language.memberText("zh", "Profile"), "个人");
  assert.equal(language.memberText("en", "Profile"), "Profile");
  assert.equal(
    language.memberText("zh", "Original saved story"),
    "Original saved story",
  );
  assert.equal(
    resetCountdown(
      "2026-10-28T01:02:00Z",
      Date.parse("2026-10-27T00:00:00Z"),
      "zh",
    ),
    "1天 1小时 2分钟后重置",
  );
});
test("language action gates identity, rejects invalid input and writes only a bounded host cookie", async () => {
  let assigned = true;
  const writes: unknown[][] = [];
  const target = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/profile/language-actions.ts", import.meta.url),
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
    module: target,
    exports: target.exports,
    process: { env: { NODE_ENV: "production" } },
    require: (name: string) => {
      if (name === "@/lib/fcos/language") return language;
      if (name === "@/lib/app-access")
        return {
          requireAssignedUser: async () => {
            if (!assigned) throw Error("denied");
          },
        };
      if (name === "next/headers")
        return {
          cookies: async () => ({
            set: (...args: unknown[]) => writes.push(args),
          }),
        };
      throw Error(name);
    },
  });
  const { saveMemberLanguage } = target.exports as {
    saveMemberLanguage: (
      state: { error: string },
      form: FormData,
    ) => Promise<{ error: string }>;
  };
  const form = new FormData();
  form.set("language", "zh");
  assigned = false;
  await assert.rejects(saveMemberLanguage({ error: "" }, form), /denied/);
  assert.equal(writes.length, 0);
  assigned = true;
  form.set("language", "fr");
  assert.ok((await saveMemberLanguage({ error: "" }, form)).error);
  assert.equal(writes.length, 0);
  form.set("language", "zh");
  assert.equal((await saveMemberLanguage({ error: "" }, form)).error, "");
  assert.equal(
    JSON.stringify(writes),
    JSON.stringify([
      [
        language.MEMBER_LANGUAGE_COOKIE,
        "zh",
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 31536000,
        },
      ],
    ]),
  );
});
