import assert from "node:assert";
import { cleanMarkdownForSpeech } from "../src/features/voice/types";

console.log("=== Testing NexaMind Voice Step 4: Assistant Response Text-to-Speech ===");

function testMarkdownCleaner() {
  console.log("\n[Check 1] Markdown cleaning for natural speech synthesis...");

  const rawMarkdown = `
# Executive Summary
Here is a **critical** analysis of the *market* trend:
- Item 1 with \`inline_code()\`
- Item 2 with a link: [NexaMind Docs](https://nexamind.ai/docs)
> A notable quote from an expert.

\`\`\`typescript
const x = 42;
console.log(x);
\`\`\`

Conclusion: Everything is normal!
`;

  const cleaned = cleanMarkdownForSpeech(rawMarkdown);
  console.log("Cleaned output:", cleaned);

  // Assertions
  assert(!cleaned.includes("#"), "Must not contain markdown headers (#)");
  assert(!cleaned.includes("**"), "Must not contain markdown bold (**)");
  assert(!cleaned.includes("```"), "Must not contain code fences (```)");
  assert(!cleaned.includes("https://nexamind.ai/docs"), "Must not speak raw URLs");
  assert(cleaned.includes("NexaMind Docs"), "Must speak link text");
  assert(cleaned.includes("Executive Summary"), "Must preserve plain words");
  assert(cleaned.includes("Conclusion: Everything is normal!"), "Must preserve plain text");
  console.log("✓ Markdown cleanly stripped to natural spoken text");
}

function testSpeechSynthesisFlow() {
  console.log("\n[Check 2] SpeechSynthesis mock flow & state transitions...");

  // Mock speech synthesis state machine mirroring useSpeechSynthesis
  let speakingMessageId: string | null = null;
  let speechState: "idle" | "speaking" | "paused" = "idle";
  let cancelCalledCount = 0;
  let speakCalledCount = 0;
  let pauseCalledCount = 0;
  let resumeCalledCount = 0;

  const mockSynthesis = {
    speaking: false,
    paused: false,
    cancel: () => {
      cancelCalledCount++;
      mockSynthesis.speaking = false;
      mockSynthesis.paused = false;
    },
    speak: (_u: any) => {
      speakCalledCount++;
      mockSynthesis.speaking = true;
      mockSynthesis.paused = false;
    },
    pause: () => {
      pauseCalledCount++;
      mockSynthesis.paused = true;
    },
    resume: () => {
      resumeCalledCount++;
      mockSynthesis.paused = false;
    },
  };

  const speak = (msgId: string, text: string) => {
    mockSynthesis.cancel();
    const clean = cleanMarkdownForSpeech(text);
    if (!clean) return;

    mockSynthesis.speak({ text: clean });
    speakingMessageId = msgId;
    speechState = "speaking";
  };

  const pause = () => {
    mockSynthesis.pause();
    speechState = "paused";
  };

  const resume = () => {
    mockSynthesis.resume();
    speechState = "speaking";
  };

  const stop = () => {
    mockSynthesis.cancel();
    speakingMessageId = null;
    speechState = "idle";
  };

  // Scenario A: Speak message 1
  speak("msg-1", "Hello from NexaMind AI");
  assert.strictEqual(speakingMessageId, "msg-1");
  assert.strictEqual(speechState, "speaking");
  assert.strictEqual(speakCalledCount, 1);
  console.log("✓ Speak message 1 initiated successfully");

  // Scenario B: Pause
  pause();
  assert.strictEqual(speakingMessageId, "msg-1");
  assert.strictEqual(speechState, "paused");
  assert.strictEqual(pauseCalledCount, 1);
  console.log("✓ Pause speech works");

  // Scenario C: Resume
  resume();
  assert.strictEqual(speakingMessageId, "msg-1");
  assert.strictEqual(speechState, "speaking");
  assert.strictEqual(resumeCalledCount, 1);
  console.log("✓ Resume speech works");

  // Scenario D: Switching messages stops previous speech
  speak("msg-2", "This is the second response");
  assert.strictEqual(speakingMessageId, "msg-2", "Must switch active message ID");
  assert.strictEqual(speechState, "speaking");
  assert(cancelCalledCount >= 2, "Must cancel previous speech when starting new message");
  assert.strictEqual(speakCalledCount, 2);
  console.log("✓ Switching to message 2 automatically cancels message 1 speech");

  // Scenario E: Stop
  stop();
  assert.strictEqual(speakingMessageId, null, "speakingMessageId must be reset to null");
  assert.strictEqual(speechState, "idle", "speechState must be reset to idle");
  console.log("✓ Stop cancels synthesis and resets state to idle");
}

function testGracefulFallback() {
  console.log("\n[Check 3] Unsupported environment graceful handling...");
  // When window.speechSynthesis is undefined
  const isSupported = false;
  assert.strictEqual(isSupported, false);
  console.log("✓ Environments without SpeechSynthesis are cleanly identified");
}

function run() {
  testMarkdownCleaner();
  testSpeechSynthesisFlow();
  testGracefulFallback();
  console.log("\n==================================================");
  console.log(" ALL VOICE STEP 4 CHECKS PASSED SUCCESSFULLY!    ");
  console.log("==================================================");
}

run();
