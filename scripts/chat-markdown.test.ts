import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMarkdown } from "../app/assistant/ChatMarkdown";
test("assistant GFM renders tables, relative links, bold, lists and fenced code safely", () => {
  const html = renderToStaticMarkup(
    createElement(ChatMarkdown, {
      body: "# Heading\n\n**Hello**\n\n- First\n- Second\n\n| Lead | Stage |\n|---|---|\n| [Daron](/leads/example) | Guest |\n\n```js\nconst x = 1;\n```\n\n[bad](javascript:alert%281%29)\n\n![tracking](https://example.invalid/private.png)\n\n<script>alert(1)</script>",
    }),
  );
  for (const token of [
    "<h1>",
    "<strong>Hello</strong>",
    "<ul>",
    "<table",
    'href="/leads/example"',
    "<pre>",
    '<code class="language-js"',
    'aria-label="Reply table"',
  ])
    assert.ok(html.includes(token), token);
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes('src="https://example.invalid'));
});
