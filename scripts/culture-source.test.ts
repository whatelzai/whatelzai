import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { cultureFromRows } from "../lib/knowledge/model";
import { domainRoute } from "../lib/domain-routing";

test("database culture preserves exact text and multiple chapter links while excluding provenance from reader output", () => {
  const result = cultureFromRows(
    [
      {
        id: "example",
        title: "Example collection",
        metadata: {
          displayName: "Example",
          teacher: "Teacher",
          chapters: [
            { id: "one", title: "First" },
            { id: "two", title: "Second" },
          ],
          privateSource: "not serialized",
        },
      },
    ],
    [
      {
        id: "saying",
        collection_id: "example",
        body: "Original punctuation！",
        metadata: {
          chapters: ["one", "two"],
          occurrences: [
            { chapterId: "one", sourceOrder: 1 },
            { chapterId: "two", sourceOrder: 2 },
          ],
        },
      },
    ],
  );
  assert.equal(result[0].quotes[0].text, "Original punctuation！");
  assert.deepEqual(result[0].quotes[0].chapters, ["one", "two"]);
  assert.doesNotMatch(JSON.stringify(result), /privateSource|occurrences/);
  assert.throws(
    () =>
      cultureFromRows(
        [
          {
            id: "example",
            title: "Example",
            metadata: {
              displayName: "Example",
              teacher: "Teacher",
              chapters: [],
            },
          },
        ],
        [
          {
            id: "saying",
            collection_id: "example",
            body: "Text",
            metadata: { chapters: ["missing"] },
          },
        ],
      ),
    /Unknown chapter/,
  );
});
test("Culture belongs to the protected member surface and has no bundled content dependency", () => {
  assert.equal(
    domainRoute("whatelz.ai", "/culture").redirect,
    "https://app.whatelz.ai/culture",
  );
  assert.equal(domainRoute("app.whatelz.ai", "/culture").protect, true);
  for (const file of [
    "app/culture/page.tsx",
    "components/culture/CultureLibrary.tsx",
    "lib/fcos/resources.ts",
  ])
    assert.doesNotMatch(
      readFileSync(new URL("../" + file, import.meta.url), "utf8"),
      /content\/culture|ultra\.json/,
    );
});
