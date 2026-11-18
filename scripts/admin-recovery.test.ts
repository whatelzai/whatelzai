import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { adminRecoveryLinks } from "../lib/admin-recovery";
import { focusPath } from "../lib/admin-focus/model";
import { domainRoute } from "../lib/domain-routing";
import vm from "node:vm";
import ts from "typescript";
import { siteSurface } from "../lib/domain-routing";
test("recovery stays local and returns to known workspace roots, never unknown parents or auth history", () => {
  for (const prefix of ["", "/admin"]) {
    const root = prefix || "/";
    assert.deepEqual(adminRecoveryLinks(prefix + "/focus/task%3Amissing"), {
      home: root,
      back: root,
    });
    assert.deepEqual(adminRecoveryLinks(prefix + "/personal/focus/removed"), {
      home: root,
      back: prefix + "/personal",
    });
    assert.deepEqual(
      adminRecoveryLinks(prefix + "/ai-business/missing/child"),
      { home: root, back: prefix + "/ai-business" },
    );
  }
  assert.equal(adminRecoveryLinks("/admin/missing/unknown").back, "/admin");
});
test("all epic task links retain their exact reference and resolve to existing detail routes through Admin rewrites", () => {
  for (const lane of [
    undefined,
    "personal",
    "ai-business",
    "network-marketing",
    "day-job",
  ] as const) {
    const id = "task:4cc06eb6-4b59-4e67-82bc-6f04df256490";
    const path = focusPath(id, "today", lane).split("?")[0];
    assert.equal(decodeURIComponent(path.split("/").at(-1)!), id);
    const clean = path.replace(/^\/admin/, "");
    assert.equal(domainRoute("admin.whatelz.ai", clean).rewrite, path);
    assert.ok(
      existsSync(
        "app/admin" + (lane ? "/" + lane : "") + "/focus/[id]/page.tsx",
      ),
    );
  }
});
test("root missing-page boundary uses Admin recovery only for Admin requests and preserves public editorial page", async () => {
  for (const [host, surface, admin] of [
    ["admin.whatelz.ai", null, true],
    ["localhost:3100", "admin", true],
    ["whatelz.ai", "public", false],
  ] as const) {
    const out = {
      exports: {} as {
        default: () => Promise<{ type: unknown; props: { children: unknown } }>;
      },
    };
    const recovery = () => null;
    vm.runInNewContext(
      ts.transpileModule(readFileSync("app/not-found.tsx", "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      {
        exports: out.exports,
        require: (n: string) =>
          n === "next/headers"
            ? {
                headers: async () =>
                  new Headers({
                    host: host,
                    ...(surface ? { "x-whatelz-surface": surface } : {}),
                  }),
              }
            : n === "@/lib/domain-routing"
              ? { siteSurface }
              : n === "@/components/admin/AdminMissingResource"
                ? { AdminMissingResource: recovery }
                : n === "react/jsx-runtime"
                  ? {
                      jsx: (type: unknown, props: unknown) => ({ type, props }),
                      jsxs: (type: unknown, props: unknown) => ({
                        type,
                        props,
                      }),
                    }
                  : {},
      },
    );
    const view = await out.exports.default();
    assert.equal(!Array.isArray(view.props.children), admin);
    if (admin)
      assert.equal((view.props.children as { type: unknown }).type, recovery);
  }
});
