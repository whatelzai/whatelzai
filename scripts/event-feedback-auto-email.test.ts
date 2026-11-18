import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import * as schemas from "../lib/event-feedback/questions";
import { feedbackPath } from "../lib/event-feedback/model";

type Element = { props?: Record<string, unknown>; type?: unknown };
function harness() {
  const slots: unknown[] = [];
  let cursor = 0;
  let effect: (() => (() => void) | undefined) | undefined;
  let cleanup: (() => void) | undefined;
  let deps: unknown[] = [];
  const timers = new Map<number, () => Promise<void>>();
  let timerId = 0;
  const calls: Array<{
    email: string;
    signal: AbortSignal;
    resolve: (r: Response) => void;
    reject: (e: Error) => void;
  }> = [];
  const mod = { exports: {} as { default: (p: unknown) => Element } };
  const code = ts.transpileModule(
    readFileSync("app/events/feedback/[eventId]/FeedbackForm.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const imports: Record<string, unknown> = {
    "react/jsx-runtime": jsx,
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in slots))
          slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (next: unknown) => {
            slots[index] =
              typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect(callback: () => (() => void) | undefined, next: unknown[]) {
        if (next.some((value, i) => value !== deps[i])) {
          cleanup?.();
          effect = callback;
          deps = next;
        }
      },
    },
    "next/navigation": { useRouter: () => ({ replace() {} }) },
    "@/lib/event-feedback/model": { feedbackPath },
    "@/lib/event-feedback/questions": schemas,
  };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require(name: string) {
      if (!(name in imports)) throw Error(name);
      return imports[name];
    },
    AbortController,
    setTimeout(callback: () => Promise<void>, delay: number) {
      assert.equal(delay, 600);
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
    fetch(_path: string, options: { body: string; signal: AbortSignal }) {
      return new Promise<Response>((resolve, reject) => {
        calls.push({
          email: JSON.parse(options.body).email,
          signal: options.signal,
          resolve,
          reject,
        });
      });
    },
  });
  const config = schemas.feedbackFormConfig.parse(
    JSON.parse(
      readFileSync("content/event-feedback/feedback-v4-20261119.json", "utf8"),
    ),
  );
  let tree: Element;
  function render() {
    cursor = 0;
    tree = mod.exports.default({ eventId: "ELZ-EVT-0004", config });
    if (effect) {
      const next = effect;
      effect = undefined;
      cleanup = next();
    }
    return tree;
  }
  function all(node: unknown = tree): Element[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(all);
    const element = node as Element;
    return [element, ...all(element.props?.children ?? null)];
  }
  function change(email: string) {
    const input = all().find((n) => n.props?.id === "feedback-email")!;
    (input.props!.onChange as (e: unknown) => void)({
      target: { value: email },
    });
    render();
  }
  function status() {
    const node = all().find((n) => n.props?.id === "feedback-email-status")!;
    return node;
  }
  function disabled() {
    return all().find((n) => n.props?.type === "submit")!.props!.disabled;
  }
  async function tick() {
    const current = [...timers.values()];
    timers.clear();
    return Promise.all(current.map((fn) => fn()));
  }
  render();
  return { render, all, change, status, disabled, tick, calls, timers };
}

test("automatic email match waits for typing, rejects malformed input locally, and has no email action button", async () => {
  const h = harness();
  assert.equal(h.all().filter((n) => n.props?.type === "button").length, 0);
  assert.equal(h.disabled(), true);
  h.change("not-an-email");
  assert.equal(h.calls.length, 0);
  await h.tick();
  h.render();
  assert.equal(h.calls.length, 0);
  assert.equal(
    h.all(h.status()).find((n) => n.type === "span")?.props?.children,
    "Please use the email you registered for the event.",
  );
});

test("stale email responses cannot unlock submission; a current match shows a tick and editing clears it", async () => {
  const h = harness();
  h.change(" First@Example.test ");
  const first = h.tick();
  assert.equal(h.calls[0].email, "first@example.test");
  h.change("second@example.test");
  assert.equal(h.calls[0].signal.aborted, true);
  h.calls[0].resolve(Response.json({ matched: true }));
  await first;
  h.render();
  assert.equal(h.disabled(), true);
  const second = h.tick();
  h.calls[1].resolve(Response.json({ matched: false }));
  await second;
  h.render();
  assert.equal(
    h.all(h.status()).find((n) => n.type === "span")?.props?.children,
    "Please use the email you registered for the event.",
  );
  h.change("third@example.test");
  const third = h.tick();
  h.calls[2].resolve(Response.json({ matched: true }));
  await third;
  h.render();
  assert.equal(h.disabled(), false);
  assert.match(String(h.status().props!.className), /is-matched/);
  assert.equal(h.all().filter((n) => n.type === "svg").length, 1);
  const input = h.all().find((n) => n.props?.id === "feedback-email")!;
  assert.equal(input.props!.readOnly, undefined);
  h.change("another@example.test");
  assert.equal(h.disabled(), true);
  assert.doesNotMatch(String(h.status().props!.className), /is-matched/);
  h.change("");
  assert.equal(h.timers.size, 0);
});

test("lookup failures do not claim the address is unregistered or enable submission", async () => {
  const h = harness();
  h.change("attendee@example.test");
  const pending = h.tick();
  h.calls[0].reject(Error("network"));
  await pending;
  h.render();
  assert.match(String(h.status().props!.children), /couldn’t check/);
  assert.equal(h.disabled(), true);
});

test("unmatched registration has a visible X and topic question is a single radio group with conditional Other text", async () => {
  const h = harness();
  h.change("unregistered@example.test");
  const pending = h.tick();
  h.calls[0].resolve(Response.json({ matched: false }));
  await pending;
  h.render();
  assert.match(String(h.status().props!.className), /is-unmatched/);
  assert.equal(h.all(h.status()).filter((n) => n.type === "svg").length, 1);
  const topicRadios = () =>
    h.all().filter((n) => n.props?.name === "question-future_topic");
  assert.equal(topicRadios().length, 5);
  const select = (option: string) => {
    (
      topicRadios().find((n) => n.props?.value === option)!.props!
        .onChange as () => void
    )();
    h.render();
  };
  select("AI Skillset");
  assert.equal(topicRadios().filter((n) => n.props?.checked).length, 1);
  select("Others");
  assert.equal(topicRadios().filter((n) => n.props?.checked).length, 1);
  const other = h
    .all()
    .find((n) => n.props?.name === "question-future_topic-other")!;
  assert.equal(other.props!.required, true);
  (other.props!.onChange as (e: unknown) => void)({
    target: { value: "AI automation" },
  });
  h.render();
  assert.equal(
    h.all().find((n) => n.props?.name === "question-future_topic-other")!.props!
      .value,
    "AI automation",
  );
  select("Money Mindset");
  assert.equal(
    h.all().some((n) => n.props?.name === "question-future_topic-other"),
    false,
  );
  assert.equal(h.all().filter((n) => n.type === "fieldset").length, 10);
  const comment = h.all().find((n) => n.props?.id === "feedback-comments")!;
  assert.equal(comment.type, "textarea");
  assert.equal(comment.props!.required, undefined);
  assert.equal(comment.props!.maxLength, undefined);
});
