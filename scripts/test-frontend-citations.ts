import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownMessage } from "../src/components/chat/MarkdownMessage.js";
import type { ChatSourceCitation, WebSourceCitation, DocumentSourceCitation } from "../src/types/message.js";

const runCitationTests = async () => {
  console.log("=== Starting Frontend Web Search Citation Test Suite ===\n");

  const webSources: WebSourceCitation[] = [
    { type: "web", title: "React Official", url: "https://react.dev" },
    { type: "web", title: "React 19 Blog", url: "https://react.dev/blog/2024/12/05/react-19" },
    { type: "web", title: "GitHub Releases", url: "https://github.com/facebook/react/releases" },
  ];

  const docSource: DocumentSourceCitation = {
    type: "document",
    attachmentId: "att-123",
    filename: "guide.pdf",
    chunkIndex: 2,
  };

  // -------------------------------------------------------------
  // Test 1: [1] maps to first web source
  // -------------------------------------------------------------
  console.log("[Test 1] [1] maps to first web source with safe external link attributes");
  const html1 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "React 19 is now available [1].",
      sources: webSources,
    })
  );

  assert.ok(html1.includes('href="https://react.dev/"'), `Expected href https://react.dev/, got: ${html1}`);
  assert.ok(html1.includes('target="_blank"'), "Expected target=_blank");
  assert.ok(html1.includes('rel="noopener noreferrer"'), "Expected rel=noopener noreferrer");
  assert.ok(html1.includes("citation-badge"), "Expected citation-badge class");
  assert.ok(html1.includes('title="React Official"'), "Expected source title in tooltip");
  assert.ok(html1.includes(">[1]</a>"), "Expected link text [1]");
  console.log("✓ Test 1 Passed: [1] correctly mapped to first web source\n");

  // -------------------------------------------------------------
  // Test 2: [2] maps to second web source
  // -------------------------------------------------------------
  console.log("[Test 2] [2] maps to second web source");
  const html2 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "Check the release announcement [2] and GitHub [3].",
      sources: webSources,
    })
  );

  assert.ok(html2.includes('href="https://react.dev/blog/2024/12/05/react-19"'), "Expected href for [2]");
  assert.ok(html2.includes('title="React 19 Blog"'), "Expected title for [2]");
  assert.ok(html2.includes('href="https://github.com/facebook/react/releases"'), "Expected href for [3]");
  assert.ok(html2.includes('title="GitHub Releases"'), "Expected title for [3]");
  console.log("✓ Test 2 Passed: [2] and [3] correctly mapped to second and third web sources\n");

  // -------------------------------------------------------------
  // Test 3: Unmatched [99] remains non-clickable
  // -------------------------------------------------------------
  console.log("[Test 3] Unmatched [99] remains non-clickable plain text");
  const html3 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "Valid [1] and non-existent [99] and [0].",
      sources: webSources,
    })
  );

  assert.ok(html3.includes('href="https://react.dev/"'), "Expected [1] to be linked");
  assert.ok(!html3.includes('href=""'), "Should not have empty href");
  assert.ok(html3.includes("[99]"), "Expected [99] to remain literal text");
  assert.ok(!html3.includes('>[99]</a>'), "Expected [99] NOT to be inside an <a> tag");
  assert.ok(html3.includes("[0]"), "Expected [0] to remain literal text");
  assert.ok(!html3.includes('>[0]</a>'), "Expected [0] NOT to be inside an <a> tag");
  console.log("✓ Test 3 Passed: Unmatched [99] and [0] remained plain text\n");

  // -------------------------------------------------------------
  // Test 4: Malicious/invalid source URL is not linked
  // -------------------------------------------------------------
  console.log("[Test 4] Malicious / invalid source URL is not linked");
  const maliciousSources: WebSourceCitation[] = [
    { type: "web", title: "XSS Attempt", url: "javascript:alert(document.cookie)" },
    { type: "web", title: "Data URL Attempt", url: "data:text/html;base64,PHNjcmlwdD4=" },
    { type: "web", title: "Invalid Scheme", url: "ftp://attacker.com/malware" },
  ];

  const html4 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "Testing malicious citations [1], [2], and [3].",
      sources: maliciousSources,
    })
  );

  assert.ok(!html4.includes("javascript:"), "Must NOT contain javascript: URL");
  assert.ok(!html4.includes("data:text"), "Must NOT contain data: URL");
  assert.ok(!html4.includes("ftp://"), "Must NOT contain ftp: URL");
  assert.ok(!html4.includes('>[1]</a>'), "[1] must NOT be rendered as a link");
  assert.ok(!html4.includes('>[2]</a>'), "[2] must NOT be rendered as a link");
  assert.ok(!html4.includes('>[3]</a>'), "[3] must NOT be rendered as a link");
  assert.ok(html4.includes("[1], [2], and [3]"), "All markers must safely remain normal text");
  console.log("✓ Test 4 Passed: Malicious and invalid source URLs were safely blocked\n");

  // -------------------------------------------------------------
  // Test 5: Normal Markdown links still work
  // -------------------------------------------------------------
  console.log("[Test 5] Normal Markdown links still work");
  const html5 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "Visit [Documentation](https://docs.nexamind.ai) or check [1].",
      sources: webSources,
    })
  );

  assert.ok(html5.includes('href="https://docs.nexamind.ai"'), "Normal markdown link must have href");
  assert.ok(html5.includes(">Documentation</a>"), "Normal markdown link must render its children");
  assert.ok(html5.includes('target="_blank"'), "Normal link must have target=_blank");
  assert.ok(html5.includes('rel="noopener noreferrer"'), "Normal link must have rel=noopener noreferrer");
  assert.ok(html5.includes('href="https://react.dev/"'), "Citation link must still work alongside normal link");
  console.log("✓ Test 5 Passed: Normal Markdown links render correctly alongside citations\n");

  // -------------------------------------------------------------
  // Test 6: Document sources mixed with web sources
  // -------------------------------------------------------------
  console.log("[Test 6] Document sources mixed with web sources preserve 1-based web indexing");
  const mixedSources: ChatSourceCitation[] = [
    docSource, // Document source at index 0 of combined array
    webSources[0]!, // First web source -> should map to [1]
    webSources[1]!, // Second web source -> should map to [2]
  ];

  const html6 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "According to web search [1] and [2].",
      sources: mixedSources,
    })
  );

  assert.ok(html6.includes('href="https://react.dev/"'), "[1] must map to first web source even with doc source present");
  assert.ok(html6.includes('title="React Official"'), "[1] title must match first web source");
  assert.ok(html6.includes('href="https://react.dev/blog/2024/12/05/react-19"'), "[2] must map to second web source");
  console.log("✓ Test 6 Passed: Web citation numbering maps to 1-based order of web sources\n");

  // -------------------------------------------------------------
  // Test 7: Code blocks containing "[1]" are not converted into citations
  // -------------------------------------------------------------
  console.log("[Test 7] Code blocks and inline code containing [1] are NOT converted into citations");
  const codeContent = `
Inline code: \`const nums = [1];\`

\`\`\`javascript
// Code block
const matrix = [[1], [2]];
console.log(matrix[0]);
\`\`\`

Narrative citation: See [1].
`;

  const html7 = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: codeContent,
      sources: webSources,
    })
  );

  assert.ok(html7.includes("const nums = [1];"), "Inline code must preserve [1] as raw text");
  assert.ok(!html7.includes("const nums = <a"), "Inline code must NOT contain link tag");
  assert.ok(html7.includes("const matrix = [[1], [2]];"), "Block code must preserve [[1], [2]] as raw code");
  assert.ok(html7.includes('href="https://react.dev/"'), "Narrative citation [1] outside code must be converted");
  console.log("✓ Test 7 Passed: Code blocks and inline code strictly preserved\n");

  console.log("=============================================================");
  console.log("=== ALL FRONTEND CITATION UI TESTS PASSED (7/7) =============");
  console.log("=============================================================\n");
};

runCitationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
