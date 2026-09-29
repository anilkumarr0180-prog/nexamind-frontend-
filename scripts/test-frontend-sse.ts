import assert from "node:assert/strict";
import { streamAIChatMessage } from "../src/features/chat/api.js";

// Helper to create a readable stream from chunks
const createMockStreamResponse = (chunks: string[], status = 200) => {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
};

const runFrontendSSETests = async () => {
  console.log("=== Starting Frontend SSE Lifecycle & Parser Test Suite ===");
  const originalFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------
    // Test 1: start -> chunks -> done = success
    // -------------------------------------------------------------
    console.log("\n[Test 1] start -> chunks -> done lifecycle");
    globalThis.fetch = async () => {
      return createMockStreamResponse([
        'data: {"type":"start","userMessage":{"id":"u1"},"conversationId":"c1"}\n\n',
        'data: {"type":"chunk","content":"Hello "}\n\n',
        'data: {"type":"chunk","content":"World!"}\n\n',
        'data: {"type":"done","message":{"id":"a1","content":"Hello World!"}}\n\n',
      ]);
    };

    let startCalled = false;
    let chunks: string[] = [];
    let doneCalled = false;
    let errorCalled = false;

    await streamAIChatMessage(
      { conversationId: "c1", content: "Hi" },
      {
        onStart: () => {
          startCalled = true;
        },
        onChunk: (chunk) => {
          chunks.push(chunk);
        },
        onDone: () => {
          doneCalled = true;
        },
        onError: () => {
          errorCalled = true;
        },
      },
    );

    assert.ok(startCalled, "onStart must be called");
    assert.deepEqual(chunks, ["Hello ", "World!"], "All chunks must be received");
    assert.ok(doneCalled, "onDone must be called");
    assert.equal(errorCalled, false, "onError must NOT be called on success");
    console.log("✓ Test 1 Passed: start -> chunks -> done completed successfully");

    // -------------------------------------------------------------
    // Test 2: start -> chunks -> error = real error, halts immediately
    // -------------------------------------------------------------
    console.log("\n[Test 2] start -> chunks -> error lifecycle & stops processing immediately");
    globalThis.fetch = async () => {
      return createMockStreamResponse([
        'data: {"type":"start","userMessage":{"id":"u1"},"conversationId":"c1"}\n\n',
        'data: {"type":"chunk","content":"Partial content before 413"}\n\n',
        'data: {"type":"error","error":{"message":"AI request is too large. Please start a new conversation or shorten the context.","statusCode":413,"code":"REQUEST_TOO_LARGE"}}\n\n',
        'data: {"type":"chunk","content":"Should be ignored"}\n\n',
        'data: {"type":"done","message":{}}\n\n',
      ]);
    };

    let errorReceived: any = null;
    let chunksReceivedInErrorTest: string[] = [];
    let doneCalledInErrorTest = false;
    let threwError = false;

    try {
      await streamAIChatMessage(
        { conversationId: "c1", content: "Hi" },
        {
          onChunk: (c) => chunksReceivedInErrorTest.push(c),
          onDone: () => {
            doneCalledInErrorTest = true;
          },
          onError: (err) => {
            errorReceived = err;
          },
        },
      );
    } catch (err) {
      threwError = true;
    }

    assert.ok(threwError, "streamAIChatMessage must reject with error");
    assert.ok(errorReceived, "onError callback must receive the error");
    assert.equal(errorReceived.statusCode, 413, "Error must retain statusCode 413");
    assert.equal(errorReceived.code, "REQUEST_TOO_LARGE", "Error must retain code REQUEST_TOO_LARGE");
    assert.ok(
      errorReceived.message.includes("AI request is too large"),
      "Error must contain 413 message",
    );
    assert.deepEqual(
      chunksReceivedInErrorTest,
      ["Partial content before 413"],
      "Processing must stop immediately after error event (no subsequent chunks)",
    );
    assert.equal(doneCalledInErrorTest, false, "onDone must NOT be called when error occurs");
    console.log("✓ Test 2 Passed: Error emitted with 413 and processing halted immediately");

    // -------------------------------------------------------------
    // Test 3: AbortController cancellation must remain silent
    // -------------------------------------------------------------
    console.log("\n[Test 3] AbortController cancellation must remain completely silent");
    const abortController = new AbortController();

    globalThis.fetch = async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async pull(controller) {
          controller.enqueue(encoder.encode('data: {"type":"start"}\n\n'));
          controller.enqueue(encoder.encode('data: {"type":"chunk","content":"c1"}\n\n'));
          abortController.abort();
          // After abort, simulate read throwing AbortError
          throw new DOMException("The user aborted a request.", "AbortError");
        },
      });
      return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    };

    let abortErrorCalled = false;
    let abortThrew = false;

    try {
      await streamAIChatMessage(
        { conversationId: "c1", content: "Hi" },
        {
          onChunk: () => {},
          onDone: () => {},
          onError: () => {
            abortErrorCalled = true;
          },
        },
        abortController.signal,
      );
    } catch {
      abortThrew = true;
    }

    assert.equal(abortErrorCalled, false, "onError must NOT be called on AbortController abort");
    assert.equal(abortThrew, false, "streamAIChatMessage must NOT throw on AbortController abort");
    console.log("✓ Test 3 Passed: AbortController cancellation is completely silent");

    // -------------------------------------------------------------
    // Test 4: Pre-aborted signal is immediately silent
    // -------------------------------------------------------------
    console.log("\n[Test 4] Pre-aborted signal exits silently before fetch");
    const preAborted = new AbortController();
    preAborted.abort();

    let preAbortErrorCalled = false;
    let preAbortThrew = false;

    try {
      await streamAIChatMessage(
        { conversationId: "c1", content: "Hi" },
        {
          onChunk: () => {},
          onDone: () => {},
          onError: () => {
            preAbortErrorCalled = true;
          },
        },
        preAborted.signal,
      );
    } catch {
      preAbortThrew = true;
    }

    assert.equal(preAbortErrorCalled, false, "onError must NOT be called on pre-aborted signal");
    assert.equal(preAbortThrew, false, "Must NOT throw on pre-aborted signal");
    console.log("✓ Test 4 Passed: Pre-aborted signal handled silently");

    // -------------------------------------------------------------
    // Test 5: SSE stream with 'sources' event containing web sources
    // -------------------------------------------------------------
    console.log("\n[Test 5] SSE stream with 'sources' event & web source validation");
    const mockWebSources = [
      {
        type: "web",
        title: "TypeScript Documentation",
        url: "https://www.typescriptlang.org",
      },
      {
        type: "web",
        title: "Node.js Official",
        url: "nodejs.org/en",
      },
      {
        type: "web",
        title: "XSS Attempt",
        url: "javascript:alert('pwned')",
      },
      {
        type: "document",
        attachmentId: "att-123",
        filename: "notes.pdf",
        chunkIndex: 2,
      },
    ];

    globalThis.fetch = async () => {
      return createMockStreamResponse([
        'data: {"type":"start","userMessage":{"id":"u1"},"conversationId":"c1"}\n\n',
        `data: ${JSON.stringify({ type: "sources", sources: mockWebSources })}\n\n`,
        'data: {"type":"chunk","content":"Here are the search results."}\n\n',
        'data: {"type":"done","message":{"id":"a1","content":"Here are the search results."}}\n\n',
      ]);
    };

    let receivedSources: any[] | null = null;
    await streamAIChatMessage(
      { conversationId: "c1", content: "Search web" },
      {
        onChunk: () => {},
        onDone: () => {},
        onSources: (srcs) => {
          receivedSources = srcs;
        },
      },
    );

    assert.ok(receivedSources, "onSources callback should have been called");
    assert.equal(receivedSources!.length, 4, "Should have received 4 sources");

    // Verify type safety & URL sanitization
    const { isWebSourceCitation, isDocumentSourceCitation, getSafeWebUrl } = await import("../src/types/message.js");

    assert.equal(isWebSourceCitation(receivedSources![0]), true);
    assert.equal(getSafeWebUrl(receivedSources![0].url), "https://www.typescriptlang.org/");

    assert.equal(isWebSourceCitation(receivedSources![1]), true);
    assert.equal(getSafeWebUrl(receivedSources![1].url), "https://nodejs.org/en");

    assert.equal(isWebSourceCitation(receivedSources![2]), true);
    assert.equal(getSafeWebUrl(receivedSources![2].url), null, "Dangerous javascript: URL must be blocked");

    assert.equal(isWebSourceCitation(receivedSources![3]), false);
    assert.equal(isDocumentSourceCitation(receivedSources![3]), true);

    // Additional URL safety tests
    assert.equal(getSafeWebUrl(""), null);
    assert.equal(getSafeWebUrl(null), null);
    assert.equal(getSafeWebUrl(undefined), null);
    assert.equal(getSafeWebUrl("data:text/html,bad"), null);
    assert.equal(getSafeWebUrl("http://localhost:3000"), "http://localhost:3000/");

    console.log("✓ Test 5 Passed: Web sources parsed, passed via SSE, and safely sanitized");

    console.log("\n=============================================================");
    console.log("=== ALL FRONTEND SSE & WEB SOURCE TESTS PASSED (5/5) ========");
    console.log("=============================================================\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
};

runFrontendSSETests().catch((err) => {
  console.error("Frontend SSE test failed:", err);
  process.exit(1);
});
