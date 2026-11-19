import { test } from "node:test";
import assert from "node:assert/strict";
import { keyboardIsOpen } from "../lib/fcos/chat-viewport";
test("keyboard hiding requires an editable focus and a substantial height reduction", () => {
  assert.equal(
    keyboardIsOpen({ focused: true, baseline: 844, height: 480 }),
    true,
  );
  assert.equal(
    keyboardIsOpen({ focused: false, baseline: 844, height: 480 }),
    false,
  );
  assert.equal(
    keyboardIsOpen({ focused: true, baseline: 844, height: 780 }),
    false,
  );
});
test("dismissal restores navigation even when the composer retains focus", () => {
  assert.equal(
    keyboardIsOpen({ focused: true, baseline: 844, height: 844 }),
    false,
  );
});
test("pinch zoom does not hide navigation as if a keyboard opened", () => {
  assert.equal(
    keyboardIsOpen({ focused: true, baseline: 844, height: 480, scale: 1.5 }),
    false,
  );
});

test("keep navigation hidden while the keyboard is closing after focus leaves", () => {
  assert.equal(
    keyboardIsOpen({
      focused: false,
      previouslyOpen: true,
      baseline: 844,
      height: 480,
    }),
    true,
  );
  assert.equal(
    keyboardIsOpen({
      focused: false,
      previouslyOpen: true,
      baseline: 844,
      height: 844,
    }),
    false,
  );
});
