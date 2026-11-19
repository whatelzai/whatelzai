import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PREFERENCES,
  validPreferences,
  translate,
} from "../lib/admin-preferences";
test("device preferences reject invalid stored values and retain explicit Admin-only defaults", () => {
  assert(validPreferences(DEFAULT_PREFERENCES));
  assert(validPreferences({ theme: "dark", size: "larger", language: "zh" }));
  for (const p of [
    null,
    {},
    { ...DEFAULT_PREFERENCES, theme: "system" },
    { ...DEFAULT_PREFERENCES, size: 100 },
    { ...DEFAULT_PREFERENCES, language: "xx" },
  ])
    assert(!validPreferences(p));
});
test("interface translations preserve source content and canonical scheduling values", () => {
  assert.equal(translate("Settings", "zh"), "设置");
  assert.equal(translate("AI Business", "zh"), "AI 业务");
  assert.equal(translate("Settings", "en"), "Settings");
  assert.equal(
    translate("A private journal entry", "zh"),
    "A private journal entry",
  );
  assert.equal(DEFAULT_PREFERENCES.theme, "light");
});
