import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { pullDistance, refreshThreshold } from "../lib/fcos/pull-refresh";
const requireNode = createRequire(import.meta.url);
test("refresh distance requires a vertical, single-finger, unzoomed pull at the top", () => {
  assert.equal(pullDistance({ dx: 2, dy: 90, atTop: true }), 90);
  assert.equal(refreshThreshold, 84);
  for (const args of [
    { dx: 100, dy: 50 },
    { dy: -5 },
    { atTop: false },
    { touches: 2 },
    { busy: true },
    { scale: 1.2 },
  ])
    assert.equal(pullDistance({ dx: 0, dy: 100, atTop: true, ...args }), null);
});
function harness({ standalone = true, chat = false, scope = "member" } = {}) {
  const listeners = new Map<string, (e: unknown) => void>();
  let refreshes = 0;
  let top = 0;
  let busy = false;
  let modal = false;
  let editing = false;
  let draft = false;
  let scale = 1;
  const scroller = {
    get scrollTop() {
      return top;
    },
  };
  const root = { querySelector: () => scroller };
  class Target {
    closest(selector: string) {
      return selector.includes(".fcos-tab-page") || selector === "#admin-main"
        ? root
        : null;
    }
  }
  const target = new Target();
  const cleanup: (() => void)[] = [];
  const mockRequire = (name: string) =>
    ({
      react: {
        useEffect: (fn: () => void | (() => void)) => {
          const done = fn();
          if (done) cleanup.push(done);
        },
        useState: () => [0, () => {}],
        useTransition: () => [false, (fn: () => void) => fn()],
      },
      "next/navigation": {
        useRouter: () => ({
          refresh: () => {
            refreshes++;
          },
        }),
      },
      "@/lib/fcos/pull-refresh": { pullDistance, refreshThreshold },
      "lucide-react": {},
    })[name] ?? requireNode(name);
  const mod = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      new URL("../components/fcos/PullRefresh.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: mockRequire,
    Element: Target,
    navigator: {},
    window: {
      matchMedia: (q: string) => ({
        matches: q.includes("max-width") || standalone,
      }),
      getSelection: () => ({ isCollapsed: true }),
      visualViewport: {
        get scale() {
          return scale;
        },
      },
      scrollY: 0,
    },
    document: {
      scrollingElement: scroller,
      activeElement: { matches: () => editing },
      querySelector: (q: string) =>
        q === "#member-message"
          ? { value: draft ? "Unsent draft" : "" }
          : q.includes("aria-busy")
            ? busy
              ? {}
              : null
            : modal
              ? {}
              : null,
      addEventListener: (name: string, fn: (e: unknown) => void) =>
        listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
    },
  });
  (mod.exports as { PullRefresh: (p: object) => unknown }).PullRefresh({
    chat,
    scope,
  });
  const event = (x: number, y: number, touches = 1) => ({
    target,
    touches: Array.from({ length: touches }, () => ({
      clientX: x,
      clientY: y,
    })),
    cancelable: true,
    preventDefault: () => {},
  });
  return {
    listeners,
    start: (touches = 1) => listeners.get("touchstart")?.(event(0, 0, touches)),
    move: (x: number, y: number, touches = 1) =>
      listeners.get("touchmove")?.(event(x, y, touches)),
    end: (touches = 0) => listeners.get("touchend")?.(event(0, 100, touches)),
    cancel: () => listeners.get("touchcancel")?.({}),
    refreshes: () => refreshes,
    set: (settings: {
      top?: number;
      busy?: boolean;
      modal?: boolean;
      editing?: boolean;
      draft?: boolean;
      scale?: number;
    }) => {
      top = settings.top ?? 0;
      busy = settings.busy ?? false;
      modal = settings.modal ?? false;
      editing = settings.editing ?? false;
      draft = settings.draft ?? false;
      scale = settings.scale ?? 1;
    },
    cleanup: () => cleanup.forEach((fn) => fn()),
  };
}
test("ordinary browser document scroll retains native refresh without interception", () => {
  const h = harness({ standalone: false });
  assert.equal(h.listeners.size, 0);
});
test("installed app refreshes once on release only, and cancellation never refreshes", () => {
  const h = harness();
  h.start();
  h.move(0, 100);
  assert.equal(h.refreshes(), 0);
  h.end();
  h.end();
  assert.equal(h.refreshes(), 1);
  h.start();
  h.move(0, 100);
  h.move(0, 5);
  h.end();
  assert.equal(h.refreshes(), 1);
  h.start();
  h.move(0, 40);
  h.end();
  assert.equal(h.refreshes(), 1);
  h.start();
  h.move(0, 100);
  h.cancel();
  h.end();
  assert.equal(h.refreshes(), 1);
  h.cleanup();
  assert.equal(h.listeners.size, 0);
});
test("Chat refresh rejects scrolled, streaming, editing, modal, pinch and multi-touch gestures", () => {
  const h = harness({ standalone: false, chat: true });
  for (const settings of [
    { top: 100 },
    { busy: true },
    { editing: true },
    { draft: true },
    { modal: true },
    { scale: 1.2 },
  ]) {
    h.set(settings);
    h.start();
    h.move(0, 100);
    h.end();
    assert.equal(h.refreshes(), 0);
  }
  h.set({});
  h.start();
  h.move(100, 30);
  h.end();
  assert.equal(h.refreshes(), 0);
  h.start();
  h.move(0, 100);
  h.start(2);
  h.end(1);
  h.end();
  assert.equal(h.refreshes(), 0);
  h.start();
  h.move(0, 100);
  h.end();
  assert.equal(h.refreshes(), 1);
});

test("Admin installed app refresh preserves editing, busy and modal guards", () => {
  const h = harness({ scope: "admin" });
  h.start();
  h.move(0, 100);
  h.end();
  assert.equal(h.refreshes(), 1);
  for (const state of [
    { top: 100 },
    { busy: true },
    { modal: true },
    { editing: true },
    { scale: 1.2 },
  ]) {
    h.set(state);
    h.start();
    h.move(0, 100);
    h.end();
    assert.equal(h.refreshes(), 1);
  }
  h.cleanup();
  assert.equal(
    harness({ scope: "admin", standalone: false }).listeners.size,
    0,
  );
});
