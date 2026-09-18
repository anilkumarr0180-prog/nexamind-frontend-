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

    console.log("\n=============================================================");
    console.log("=== ALL FRONTEND SSE TESTS PASSED (4/4) =====================");
    console.log("=============================================================\n");
  } finally {
    globalThis.fetch = originalFetch;
  }
};

runFrontendSSETests().catch((err) => {
  console.error("Frontend SSE test failed:", err);
  process.exit(1);
});
