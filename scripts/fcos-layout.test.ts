import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
for (const surface of ["app", "public", "admin"])
  test(`root ${surface} layout keeps member loading free of unused identity/admin reads`, async () => {
    let auth = 0,
      identity = 0;
    const testModule = { exports: {} };
    const mocks: Record<string, unknown> = {
      "next/headers": {
        headers: async () => ({ get: () => `${surface}.example.test` }),
      },
      "@/lib/domain-routing": { siteSurface: () => surface },
      "next/font/google": Object.fromEntries(
        ["Geist", "Geist_Mono", "Fraunces"].map((n) => [
          n,
          () => ({ variable: n }),
        ]),
      ),
      "@/lib/users": {
        ensureUserRow: async () => {
          auth++;
          return { id: "owner" };
        },
      },
      "@/lib/admin-policy": { isOwnerUser: () => true },
      "@/lib/site-identity": {
        getSiteIdentity: async () => {
          identity++;
          return { owner_name: "Fixture", linkedin_url: null };
        },
      },
      "@/components/shell/ShellProvider": { ShellProvider: () => null },
    };
    const code = ts.transpileModule(
      fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    vm.runInNewContext(code, {
      module: testModule,
      exports: testModule.exports,
      require: (name: string) =>
        name.endsWith(".css") ? {} : name in mocks ? mocks[name] : req(name),
    });
    const exports = testModule.exports as {
      default: (args: { children: unknown }) => Promise<unknown>;
    };
    const child = "protected page content";
    await exports.default({ children: child });
    assert.equal(auth, surface === "app" ? 0 : 1);
    assert.equal(identity, surface === "app" ? 0 : 1);
  });
