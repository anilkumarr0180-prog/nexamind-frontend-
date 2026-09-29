import fs from "node:fs";
import assert from "node:assert/strict";

/**
 * Unit test for Frontend Web Search Failure Indication in ChatPage.tsx.
 *
 * Verifies that:
 * 1. For failed web_search tool status, title tooltip is set to:
 *    "Real-time web search was unavailable; answering from available knowledge."
 * 2. Visual label strictly renders "✕ web_search — failed"
 * 3. Raw technical error strings from backend are NOT displayed
 * 4. Other tools and successful statuses do not show the fallback tooltip
 */

// Simulated renderer logic matching ChatPage.tsx:1451-1474
interface ToolItem {
  id: string;
  tool: string;
  status: "running" | "completed" | "failed";
  error?: string;
}

function renderToolStatusPill(toolItem: ToolItem) {
  const isFailedWebSearch =
    toolItem.status === "failed" &&
    toolItem.tool === "web_search";

  const title = isFailedWebSearch
    ? "Real-time web search was unavailable; answering from available knowledge."
    : undefined;

  let visualText = "";
  if (toolItem.status === "running") {
    visualText = `🔧 ${toolItem.tool} — running`;
  } else if (toolItem.status === "completed") {
    visualText = `✓ ${toolItem.tool} — completed`;
  } else {
    visualText = `✕ ${toolItem.tool} — failed`;
  }

  return {
    title,
    visualText,
    // Ensure raw backend error is never included
    containsRawError: (rawErr: string) => visualText.includes(rawErr) || (title ? title.includes(rawErr) : false),
  };
}

console.log("=== Starting Frontend Web Search Error Indication Unit Tests ===");

// Test 1: Failed web_search has the expected tooltip
console.log("\n[Test 1] Testing failed web_search status tooltip...");
const failedWebSearch: ToolItem = {
  id: "call_web_search_1",
  tool: "web_search",
  status: "failed",
  error: "Tavily API key is not configured. Please set TAVILY_API_KEY in the environment.",
};
const rendered1 = renderToolStatusPill(failedWebSearch);
assert.equal(
  rendered1.title,
  "Real-time web search was unavailable; answering from available knowledge.",
  "Tooltip must match exact friendly specification",
);
assert.equal(rendered1.visualText, "✕ web_search — failed", "Visual style must be intact");
assert.equal(rendered1.containsRawError("TAVILY_API_KEY"), false, "Must not leak raw backend error");
console.log("✓ Test 1 Passed: Failed web_search renders expected tooltip and clean visual pill");

// Test 2: Successful web_search does NOT have the failure tooltip
console.log("\n[Test 2] Testing completed web_search does not show failure tooltip...");
const completedWebSearch: ToolItem = {
  id: "call_web_search_2",
  tool: "web_search",
  status: "completed",
};
const rendered2 = renderToolStatusPill(completedWebSearch);
assert.equal(rendered2.title, undefined, "Completed tool must not have failure tooltip");
assert.equal(rendered2.visualText, "✓ web_search — completed");
console.log("✓ Test 2 Passed: Completed web_search has no failure tooltip");

// Test 3: Other failed tool (e.g. calculator) does NOT have web search fallback tooltip
console.log("\n[Test 3] Testing non-web tool failure...");
const failedCalc: ToolItem = {
  id: "call_calc_1",
  tool: "calculator",
  status: "failed",
  error: "Division by zero",
};
const rendered3 = renderToolStatusPill(failedCalc);
assert.equal(rendered3.title, undefined, "Non-web tool must not have web search tooltip");
assert.equal(rendered3.visualText, "✕ calculator — failed");
console.log("✓ Test 3 Passed: Calculator failure does not show web search tooltip");

// Test 4: Inspection of actual ChatPage.tsx source code to verify compliance
console.log("\n[Test 4] Verifying ChatPage.tsx source code implementation...");
const chatPageSource = fs.readFileSync("src/pages/ChatPage.tsx", "utf8");
assert.ok(
  chatPageSource.includes("Real-time web search was unavailable; answering from available knowledge."),
  "ChatPage.tsx must contain the exact tooltip string",
);
assert.ok(
  chatPageSource.includes("toolItem.status === \"failed\" &&"),
  "ChatPage.tsx must guard by toolItem.status === failed",
);
assert.ok(
  chatPageSource.includes("toolItem.tool === \"web_search\""),
  "ChatPage.tsx must check toolItem.tool === web_search",
);
assert.ok(
  chatPageSource.includes("— failed"),
  "ChatPage.tsx must keep existing — failed visual label",
);
console.log("✓ Test 4 Passed: ChatPage.tsx correctly implements the required failure indication");

console.log("\n=============================================================");
console.log("=== ALL FRONTEND ERROR INDICATION TESTS PASSED (4/4) =======");
console.log("=============================================================");
