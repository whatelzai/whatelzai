import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminDestination as resolve,
  adminParent,
} from "../lib/admin-link-policy";
const origin = "https://admin.whatelz.ai";
test("author book links open owner reader, never sales or checkout", () => {
  for (const path of ["/playbook", "/playbook/read", "/playbook/chapter"])
    assert.deepEqual(
      resolve("https://whatelz.ai" + path, origin, "/ai-business"),
      { kind: "navigate", href: "/playbook" },
    );
});
test("member/public routes stay in the Admin origin with query and hash preserved", () => {
  assert.deepEqual(
    resolve("https://app.whatelz.ai/leads?id=1", origin, "/network-marketing"),
    { kind: "navigate", href: "/network-marketing/app/leads?id=1" },
  );
  assert.deepEqual(
    resolve("https://whatelz.ai/blog/my-story#chapter", origin, "/blog"),
    { kind: "navigate", href: "/preview/blog/my-story#chapter" },
  );
  assert.deepEqual(
    resolve(
      "https://admin.whatelz.ai/leads/abc",
      origin,
      "/network-marketing/app/leads",
    ),
    { kind: "navigate", href: "/network-marketing/app/leads/abc" },
  );
  assert.deepEqual(
    resolve("https://admin.whatelz.ai/events", origin, "/preview/about"),
    { kind: "navigate", href: "/preview/events" },
  );
});
test("preview/local links use local Admin paths and files open internally", () => {
  assert.deepEqual(
    resolve("https://whatelz.ai/playbook", "http://localhost:3198", "/admin"),
    { kind: "navigate", href: "/admin/playbook" },
  );
  assert.deepEqual(
    resolve(origin + "/api/admin/event-poster?event=abc", origin, "/events"),
    { kind: "file", url: origin + "/api/admin/event-poster?event=abc" },
  );
  assert.equal(
    resolve("https://other.example/dashboard", origin, "/").kind,
    "external",
  );
  assert.equal(resolve("javascript:alert(1)", origin, "/").kind, "external");
  assert.equal(
    resolve("https://whatelz.ai.evil.example/playbook", origin, "/").kind,
    "external",
  );
});
test("Back resolves deterministic Admin parents without consulting referrer or auth history", () => {
  assert.equal(adminParent("/playbook"), "/admin/ai-business");
  assert.equal(adminParent("/admin/personal/money"), "/admin/personal");
  assert.equal(adminParent("/admin/testimonials/123"), "/admin/testimonials");
  assert.equal(
    adminParent("/network-marketing/app/leads/123"),
    "/admin/network-marketing/app/leads",
  );
  assert.equal(adminParent("/day-job"), "/admin");
});
