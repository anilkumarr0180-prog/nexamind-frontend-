import apiClient from "../../lib/api/client";
import type { ApiResponse } from "../../types";
import type { TranscriptionResult } from "./types";

export interface TranscribeAudioParams {
  file: Blob;
  filename?: string;
  language?: string;
  prompt?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Uploads an audio Blob to the backend speech-to-text endpoint for Groq Whisper transcription.
 */
export async function transcribeAudio({
  file,
  filename = "recording.webm",
  language,
  prompt,
  signal,
  timeoutMs = 30000,
}: TranscribeAudioParams): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", file, filename);

  if (language) {
    formData.append("language", language);
  }
  if (prompt) {
    formData.append("prompt", prompt);
  }

  const response = await apiClient.post<ApiResponse<TranscriptionResult>>(
    "/voice/transcribe",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
      timeout: timeoutMs,
    },
  );

  return response.data.data;
}
