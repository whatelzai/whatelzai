import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { THEME_INIT_SCRIPT, resolveTheme } from "../lib/theme-preference";
test("first paint defaults to light, preserves explicit choices, and tolerates blocked storage", () => {
  for (const [saved, expected] of [
    [null, "light"],
    ["invalid", "light"],
    ["light", "light"],
    ["dark", "dark"],
  ] as const) {
    const document = { documentElement: { dataset: { theme: "" } } };
    runInNewContext(THEME_INIT_SCRIPT, {
      document,
      localStorage: { getItem: () => saved },
      matchMedia: () => {
        throw new Error("OS preference must not control the default");
      },
    });
    assert.equal(document.documentElement.dataset.theme, expected);
    assert.equal(resolveTheme(saved), expected);
  }
  const document = { documentElement: { dataset: { theme: "" } } };
  runInNewContext(THEME_INIT_SCRIPT, {
    document,
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
    },
  });
  assert.equal(document.documentElement.dataset.theme, "light");
});
