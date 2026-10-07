export type VoiceRecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "transcribing"
  | "recorded"
  | "error";

export type VoiceModeState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

export type VoiceErrorType =
  | "permission_denied"
  | "not_supported"
  | "device_not_found"
  | "recording_failed";

export interface AudioRecording {
  blob: Blob;
  url: string;
  durationSeconds: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

export type SpeechState = "idle" | "speaking" | "paused";

export interface SpeechSynthesisHook {
  isSupported: boolean;
  speechState: SpeechState;
  speakingMessageId: string | null;
  speak: (messageId: string, text: string, onEnd?: (naturalEnd?: boolean) => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function formatVoiceDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Cleans Markdown syntax from assistant responses so speech synthesis reads cleanly and naturally.
 */
export function cleanMarkdownForSpeech(content: string): string {
  if (!content) return "";
  return (
    content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      // Convert links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove headings (# Header)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic (* or _)
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
      // Remove blockquotes (> text)
      .replace(/^>\s+/gm, "")
      // Remove list bullets (*, -, +)
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Remove numbered lists (1. text)
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Detects common Whisper autoregressive hallucinations on silence or quiet background noise.
 */
export function isSilenceHallucination(text: string): boolean {
  if (!text) return true;
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()"'`\-—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return true;

  const words = cleaned.split(" ");
  if (words.every((w) => w === "thank" || w === "you" || w === "thanks")) {
    return true;
  }

  if (
    cleaned === "thank you very much" ||
    cleaned === "thank you for watching" ||
    cleaned === "thanks for watching" ||
    cleaned.startsWith("subtitles by") ||
    cleaned.startsWith("please subscribe") ||
    cleaned.startsWith("like and subscribe")
  ) {
    return true;
  }

  const uniqueWords = new Set(words);
  if (uniqueWords.size === 1 && words.length >= 2) {
    return true;
  }

  return false;
}
