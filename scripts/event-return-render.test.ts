import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import * as model from "../lib/event-return-offer/model";
import { priceLabel } from "../lib/public-events/catalog";
type Element = { props?: Record<string, unknown>; type?: unknown };
function descendants(node: unknown): Element[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  const e = node as Element;
  return [e, ...descendants(e.props?.children)];
}
test("SSR and initial hydration use the same supplied deadline snapshot without reading a new clock", () => {
  const offer = {
    id: "00000000-0000-4000-8000-000000000010",
    email: "attendee@example.test",
    expiresAt: "2026-12-01T00:05:00Z",
    initialSeconds: 287,
    amount: 800,
    regularAmount: 1300,
  };
  for (const file of [
    "app/events/feedback/[eventId]/thanks/FeedbackThanks.tsx",
    "app/events/register/RegistrationForm.tsx",
  ]) {
    const mod = { exports: {} as { default: (props: unknown) => Element } };
    const imports: Record<string, unknown> = {
      react: {
        useState: (initial: unknown) => [
          typeof initial === "function" ? initial() : initial,
          () => {},
        ],
        useRef: (initial: unknown) => ({ current: initial }),
        useEffect: () => {},
      },
      "react/jsx-runtime": jsx,
      "next/image": { __esModule: true, default: "img" },
      "next/link": { __esModule: true, default: "a" },
      "./PaymentStatus": { __esModule: true, default: "div" },
      "@/lib/public-events/catalog": { priceLabel },
      "@/lib/event-return-offer/model": model,
    };
    vm.runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      {
        module: mod,
        exports: mod.exports,
        require: (name: string) => {
          if (!(name in imports)) throw Error(name);
          return imports[name];
        },
        Date: {
          now: () => {
            throw Error("Render must not read a different client clock");
          },
        },
      },
    );
    const tree = mod.exports.default({
      event: {
        id: "ELZ-EVT-0010",
        title: "Money Mindset × AI Skillset",
        dateLabel: "Tuesday,8 December2026",
        timeLabel: "7:30–9:30 PM",
        poster: null,
        priceMinor: 1300,
        originalPriceMinor: 9700,
        registrationUrl: "/events/register?event=ELZ-EVT-0010",
      },
      offer,
      intensive: null,
      returnOffer: offer,
      price: "S$13",
      eventId: "ELZ-EVT-0010",
    });
    const timers = descendants(tree).filter((e) => e.props?.role === "timer");
    assert.equal(timers.length, 1);
    assert.equal(timers[0].props!.children, "4:47");
  }
});
