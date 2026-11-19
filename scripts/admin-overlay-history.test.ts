import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { adminParent, adminDestination } from "../lib/admin-link-policy";
function harness(
  deferredRestoration = false,
  path = "/personal/money",
  destination = "/day-job",
) {
  const routeOptions: Array<{ scroll?: boolean } | undefined> = [];
  const frames: Array<() => void> = [];
  const effects: Array<() => unknown> = [],
    observed: Array<Overlay> = [],
    routes: string[] = [];
  let mutation = () => {},
    cursor = 0;
  const location = {
    href: "https://admin.whatelz.ai" + path,
    origin: "https://admin.whatelz.ai",
    pathname: path,
  };
  const window = new EventTarget();
  const entries: Array<Record<string, unknown>> = [
    { __NA: true, tree: "private-router-state" },
  ];
  const history = {
    get state() {
      return entries[cursor];
    },
    replaceState(state: Record<string, unknown>) {
      entries[cursor] = state;
    },
    pushState(state: Record<string, unknown>) {
      entries.splice(cursor + 1);
      entries.push(state);
      cursor++;
    },
    back() {
      if (cursor > 0) {
        cursor--;
        window.dispatchEvent(new Event("popstate"));
        // Next restores the old route after popstate listeners return. A push
        // made inside that dispatch can be replaced by the restoration.
        if (deferredRestoration) routes.length = 0;
      }
    },
  };
  class Overlay extends EventTarget {
    href = "https://admin.whatelz.ai" + destination;
    closest() {
      return this;
    }
    open = true;
    isConnected = true;
    dataset: Record<string, string> = {};
    hasAttribute(name: string) {
      return name === "open" && this.open;
    }
    removeAttribute() {
      this.open = false;
    }
    close() {
      this.open = false;
    }
  }
  class Observer {
    constructor(cb: () => void) {
      mutation = cb;
    }
    observe() {}
    disconnect() {}
  }
  const document = Object.assign(new EventTarget(), {
    body: {},
    querySelectorAll: () =>
      observed.filter((x) => x.open || x.dataset.adminOverlay === "open"),
  });
  const exported: { exports: Record<string, () => unknown> } = { exports: {} };
  const compiled = ts.transpileModule(
    fs.readFileSync("components/admin/AdminAppBoundary.tsx", "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(compiled, {
    exports: exported.exports,
    require: (name: string) => {
      if (name === "react")
        return {
          useEffect: (cb: () => unknown) => effects.push(cb),
          useEffectEvent: (cb: unknown) => cb,
          useTransition: () => [false, (cb: () => void) => cb()],
          useRef: () => ({ current: null }),
          useState: (value: unknown) => [value, () => {}],
        };
      if (name === "react/jsx-runtime")
        return { jsx: () => null, jsxs: () => null };
      if (name === "next/navigation")
        return {
          usePathname: () => location.pathname,
          useRouter: () => ({
            replace: (p: string) => routes.push(p),
            push: (p: string, options?: { scroll?: boolean }) => {
              routes.push(p);
              routeOptions.push(options);
            },
          }),
        };
      if (name === "./AdminFocus") return { useAdminFocus: () => null };
      if (name === "@/lib/admin-link-policy")
        return { adminParent, adminDestination };
      if (name === "@/lib/admin-navigation")
        return { cleanAdminPath: (p: string) => p };
      if (name === "@/lib/admin-url") return { adminUrl: (p: string) => p };
      return new Proxy({}, { get: () => () => null });
    },
    history,
    location,
    window,
    document,
    MutationObserver: Observer,
    HTMLElement: Overlay,
    HTMLDialogElement: Overlay,
    Event,
    crypto: globalThis.crypto,
    requestAnimationFrame: (cb: () => void) =>
      deferredRestoration ? frames.push(cb) : cb(),
    URL,
    Element: Overlay,
  });
  exported.exports.AdminAppBoundary();
  effects.forEach((cb) => cb());
  return {
    history,
    entries,
    routes,
    routeOptions,
    open() {
      const dialog = new Overlay();
      observed.push(dialog);
      mutation();
      return dialog;
    },
    sync: () => mutation(),
    selectDestination() {
      const event = new Event("click", { cancelable: true });
      Object.defineProperties(event, {
        target: { value: new Overlay() },
        button: { value: 0 },
      });
      document.dispatchEvent(event);
    },
    flushFrames() {
      while (frames.length) frames.shift()!();
    },
  };
}
test("Back closes a modal before reaching previous-page or auth history", () => {
  const h = harness();
  const modal = h.open();
  h.history.back();
  assert.equal(modal.open, false);
  assert.deepEqual(h.routes, []);
  assert.equal(h.history.state.tree, "private-router-state");
});
test("cancelled close restores overlay history without navigating away", () => {
  const h = harness();
  const modal = h.open();
  modal.addEventListener("cancel", (e) => e.preventDefault());
  const count = h.entries.length;
  h.history.back();
  assert.equal(modal.open, true);
  assert.equal(h.entries.length, count);
  assert.ok(h.history.state.__adminOverlay);
  assert.deepEqual(h.routes, []);
});
test("nested dialogs unwind one at a time", () => {
  const h = harness();
  const first = h.open(),
    second = h.open();
  h.history.back();
  assert.equal(first.open, true);
  assert.equal(second.open, false);
  h.history.back();
  assert.equal(first.open, false);
  assert.deepEqual(h.routes, []);
});
test("explicit Close consumes its marker rather than leaving an extra popup Back step", () => {
  const h = harness();
  const modal = h.open();
  modal.close();
  h.sync();
  assert.equal(h.history.state.__adminOverlay, undefined);
  assert.deepEqual(h.routes, []);
});
test("fresh deep-link Back falls back inside Admin and preserves Next history fields", () => {
  const h = harness();
  h.history.back();
  assert.deepEqual(h.routes, ["/admin/personal"]);
  assert.equal(h.history.state.__NA, true);
  assert.equal(h.history.state.tree, "private-router-state");
});
test("menu selection waits until popstate restoration finishes before pushing the destination", () => {
  const h = harness(true);
  const menu = h.open();
  h.selectDestination();
  assert.equal(menu.open, false);
  h.sync();
  assert.deepEqual(h.routes, []);
  h.flushFrames();
  assert.deepEqual(h.routes, ["/day-job"]);
  assert.equal(h.history.state.__NA, true);
});

test("calendar dropdown closes its overlay and preserves scroll while applying the selected scope", () => {
  const h = harness(true, "/calendar", "/calendar?space=ai-business");
  h.open();
  h.selectDestination();
  h.sync();
  h.flushFrames();
  assert.deepEqual(h.routes, ["/calendar?space=ai-business"]);
  assert.equal(h.routeOptions[0]?.scroll, false);
});
