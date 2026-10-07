import assert from "node:assert/strict";
import { formatVoiceDuration } from "../src/features/voice/types";

console.log("=== NexaMind Voice Step 1: Unit & Lifecycle Verification ===");

// Test 1: formatVoiceDuration
console.log("\n[Test 1] Testing formatVoiceDuration formatting...");
assert.equal(formatVoiceDuration(0), "0:00");
assert.equal(formatVoiceDuration(5), "0:05");
assert.equal(formatVoiceDuration(59), "0:59");
assert.equal(formatVoiceDuration(60), "1:00");
assert.equal(formatVoiceDuration(75), "1:15");
assert.equal(formatVoiceDuration(3605), "60:05");
console.log("✓ formatVoiceDuration produces consistent mm:ss output");

// Test 2: Voice types and module exports
console.log("\n[Test 2] Testing module imports and exports...");
import("../src/features/voice/index.js").then((mod) => {
  assert.ok(typeof mod.useAudioRecorder === "function");
  assert.ok(typeof mod.isAudioRecordingSupported === "function");
  assert.ok(typeof mod.formatVoiceDuration === "function");
  console.log("✓ useAudioRecorder, isAudioRecordingSupported, and formatVoiceDuration exported cleanly");

  // Test 3: Environment support detection in non-browser Node runtime
  console.log("\n[Test 3] Testing environment support detection in Node environment...");
  const supported = mod.isAudioRecordingSupported();
  // In Node environment without window/MediaRecorder, must safely return false
  assert.equal(supported, false);
  console.log("✓ isAudioRecordingSupported safely returns false when navigator.mediaDevices or MediaRecorder is absent");

  console.log("\n==================================================");
  console.log(" ALL VOICE RECORDER LOGIC TESTS PASSED           ");
  console.log("==================================================\n");
}).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
