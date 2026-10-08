import { useState, useRef, useEffect, useCallback } from "react";
import type { AudioRecording, VoiceRecordingState, VoiceErrorType } from "./types";
import { isSilenceHallucination } from "./types";
import { transcribeAudio } from "./api";

export const EMPTY_SPEECH_ERROR_MESSAGE =
  "No speech detected. Please check that your microphone is connected, unmuted, and speak clearly.";
export const EMPTY_AUDIO_ERROR_MESSAGE =
  "No audio data was captured. Please check that your microphone is connected, unmuted, and speak clearly.";

export function extractTranscriptionErrorMessage(err: unknown): string {
  if (!err) return "Failed to transcribe audio.";
  const anyErr = err as {
    name?: string;
    code?: string;
    message?: string;
    response?: {
      status?: number;
      data?: {
        message?: string;
        error?: { message?: string; code?: string };
      };
    };
  };

  if (
    anyErr.name === "CanceledError" ||
    anyErr.name === "AbortError" ||
    anyErr.code === "ERR_CANCELED" ||
    anyErr.message === "AbortError" ||
    anyErr.message === "CanceledError"
  ) {
    return "Transcription was cancelled.";
  }

  if (
    anyErr.code === "ECONNABORTED" ||
    anyErr.code === "ETIMEDOUT" ||
    anyErr.response?.data?.error?.code === "VOICE_PROVIDER_TIMEOUT" ||
    anyErr.response?.status === 504 ||
    (typeof anyErr.message === "string" && anyErr.message.toLowerCase().includes("timeout"))
  ) {
    return "Transcription request timed out. Please try again with a shorter recording.";
  }

  if (anyErr.response?.data?.error?.code === "RATE_LIMIT_EXCEEDED" || anyErr.response?.status === 429) {
    return "Speech-to-text rate limit exceeded. Please wait a moment and try again.";
  }

  if (anyErr.response?.data?.error?.message) {
    return String(anyErr.response.data.error.message);
  }

  if (anyErr.response?.data?.message) {
    return String(anyErr.response.data.message);
  }

  if (
    anyErr.code === "ERR_NETWORK" ||
    (typeof anyErr.message === "string" && anyErr.message.toLowerCase().includes("network error"))
  ) {
    return "Unable to reach the transcription service. Please check your network connection.";
  }

  if (anyErr.message) {
    return String(anyErr.message);
  }

  return "Failed to transcribe audio.";
}

export function getAudioFilename(mimeType?: string): string {
  const clean = (mimeType || "").toLowerCase();
  if (clean.includes("webm")) {
    return "recording.webm";
  }
  if (clean.includes("mp4") || clean.includes("m4a") || clean.includes("aac")) {
    return "recording.m4a";
  }
  if (clean.includes("ogg") || clean.includes("opus") || clean.includes("oga")) {
    return "recording.ogg";
  }
  if (clean.includes("wav")) {
    return "recording.wav";
  }
  if (clean.includes("mpeg") || clean.includes("mp3")) {
    return "recording.mp3";
  }
  if (clean.includes("flac")) {
    return "recording.flac";
  }
  return "recording.webm";
}

function getSupportedAudioMimeType(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return undefined;
  }
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }

  const candidateMimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidateMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
}

export function isAudioRecordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  const hasMediaDevices =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";
  return hasMediaDevices && hasMediaRecorder;
}

export interface UseAudioRecorderOptions {
  onTranscriptionSuccess?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
  onBeforeStart?: () => void;
  language?: string;
  prompt?: string;
}

export interface UseAudioRecorderReturn {
  state: VoiceRecordingState;
  isSupported: boolean;
  durationSeconds: number;
  recording: AudioRecording | null;
  error: string | null;
  errorType: VoiceErrorType | null;
  isTranscribing: boolean;
  transcriptionText: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  discardRecording: () => void;
  transcribeRecording: () => Promise<string | null>;
  clearTranscription: () => void;
  clearError: () => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [state, setState] = useState<VoiceRecordingState>("idle");
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [recording, setRecording] = useState<AudioRecording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<VoiceErrorType | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const isDiscardingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const isTranscribingRef = useRef<boolean>(false);
  const inFlightControllerRef = useRef<AbortController | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isSupported = isAudioRecordingSupported();

  const stopStreamTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore cleanup failures
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const clearStoppingTimeout = useCallback(() => {
    if (stoppingTimeoutRef.current) {
      clearTimeout(stoppingTimeoutRef.current);
      stoppingTimeoutRef.current = null;
    }
  }, []);

  const revokeActiveUrl = useCallback(() => {
    if (activeUrlRef.current) {
      try {
        URL.revokeObjectURL(activeUrlRef.current);
      } catch {
        // ignore revoke errors
      }
      activeUrlRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorType(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state]);

  const discardRecording = useCallback(() => {
    isDiscardingRef.current = true;
    isStoppingRef.current = false;
    clearTimer();
    clearStoppingTimeout();

    // Abort any active in-flight transcription request
    if (inFlightControllerRef.current) {
      try {
        inFlightControllerRef.current.abort();
      } catch {
        // ignore abort error
      }
      inFlightControllerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      const rec = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.onerror = null;
      if (rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          // ignore stop errors
        }
      }
    }
    stopStreamTracks();
    audioChunksRef.current = [];

    revokeActiveUrl();
    setRecording(null);
    setDurationSeconds(0);
    setTranscriptionText(null);
    setIsTranscribing(false);
    isTranscribingRef.current = false;
    setError(null);
    setErrorType(null);
    setState("idle");

    setTimeout(() => {
      isDiscardingRef.current = false;
    }, 100);
  }, [clearTimer, clearStoppingTimeout, stopStreamTracks, revokeActiveUrl]);

  const startRecording = useCallback(async () => {
    try {
      optionsRef.current?.onBeforeStart?.();
    } catch {
      // ignore onBeforeStart handler errors
    }
    clearError();
    setTranscriptionText(null);
    setIsTranscribing(false);
    isStoppingRef.current = false;
    isTranscribingRef.current = false;
    clearStoppingTimeout();

    // Clean up any in-flight transcription request before starting a new recording
    if (inFlightControllerRef.current) {
      try {
        inFlightControllerRef.current.abort();
      } catch {
        // ignore abort
      }
      inFlightControllerRef.current = null;
    }

    if (!isSupported) {
      setErrorType("not_supported");
      setError("Audio recording is not supported on this browser or device.");
      setState("error");
      return;
    }

    // Clean up any existing recorded session
    revokeActiveUrl();
    setRecording(null);
    setDurationSeconds(0);
    audioChunksRef.current = [];
    isDiscardingRef.current = false;

    if (mediaRecorderRef.current) {
      const prevRec = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      prevRec.ondataavailable = null;
      prevRec.onstop = null;
      prevRec.onerror = null;
      if (prevRec.state !== "inactive") {
        try {
          prevRec.stop();
        } catch {
          // ignore
        }
      }
    }
    stopStreamTracks();

    setState("requesting_permission");

    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        // Fallback to simple audio constraint if browser rejects audio processing options
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: unknown) {
      const errName = (err as Error)?.name || "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setErrorType("permission_denied");
        setError("Microphone permission was denied. Please allow microphone access in your browser settings to record audio.");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setErrorType("device_not_found");
        setError("No microphone was detected on this device. Please connect a microphone and try again.");
      } else {
        setErrorType("recording_failed");
        setError(`Failed to access microphone: ${(err as Error)?.message || "Unknown error"}`);
      }
      setState("error");
      return;
    }

    mediaStreamRef.current = stream;

    const mimeType = getSupportedAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      // Fallback without mimeType options if browser rejects specified mimeType
      try {
        recorder = new MediaRecorder(stream);
      } catch (recErr) {
        stopStreamTracks();
        setErrorType("recording_failed");
        setError(`Failed to initialize MediaRecorder: ${(recErr as Error)?.message || "Unknown error"}`);
        setState("error");
        return;
      }
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      clearStoppingTimeout();
      clearTimer();
      stopStreamTracks();
      isStoppingRef.current = false;

      if (isDiscardingRef.current) {
        audioChunksRef.current = [];
        return;
      }

      const effectiveMimeType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: effectiveMimeType });
      audioChunksRef.current = [];

      const finalDuration = startTimeRef.current
        ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        : 1;

      const ext = getAudioFilename(effectiveMimeType);

      if (blob.size < 100) {
        setErrorType("recording_failed");
        setError(EMPTY_AUDIO_ERROR_MESSAGE);
        setState("error");
        optionsRef.current?.onTranscriptionError?.(EMPTY_AUDIO_ERROR_MESSAGE);
        return;
      }

      const url = URL.createObjectURL(blob);
      revokeActiveUrl();
      activeUrlRef.current = url;

      const recordedAudio: AudioRecording = {
        blob,
        url,
        durationSeconds: finalDuration,
        sizeBytes: blob.size,
        mimeType: blob.type || effectiveMimeType,
        createdAt: new Date(),
      };

      setRecording(recordedAudio);
      setDurationSeconds(finalDuration);

      // Automatically upload and transcribe immediately after recording stops
      setState("transcribing");
      setIsTranscribing(true);
      isTranscribingRef.current = true;

      const controller = new AbortController();
      inFlightControllerRef.current = controller;

      try {
        const res = await transcribeAudio({
          file: blob,
          filename: ext,
          language: optionsRef.current?.language,
          prompt: optionsRef.current?.prompt,
          signal: controller.signal,
        });

        if (isDiscardingRef.current || controller.signal.aborted) {
          return;
        }

        const text = res.text?.trim() || "";
        if (text.length > 0 && !isSilenceHallucination(text)) {
          setTranscriptionText(text);
          optionsRef.current?.onTranscriptionSuccess?.(text);
          setState("idle");
          revokeActiveUrl();
          setRecording(null);
        } else {
          setErrorType("recording_failed");
          setError(EMPTY_SPEECH_ERROR_MESSAGE);
          setState("recorded");
          optionsRef.current?.onTranscriptionError?.(EMPTY_SPEECH_ERROR_MESSAGE);
        }
      } catch (err: unknown) {
        if (isDiscardingRef.current || controller.signal.aborted) {
          return;
        }
        const msg = extractTranscriptionErrorMessage(err);
        setError(msg);
        setErrorType("recording_failed");
        setState("recorded");
        optionsRef.current?.onTranscriptionError?.(msg);
      } finally {
        isTranscribingRef.current = false;
        inFlightControllerRef.current = null;
        setIsTranscribing(false);
      }
    };

    recorder.onerror = (_event: Event) => {
      clearStoppingTimeout();
      clearTimer();
      stopStreamTracks();
      isStoppingRef.current = false;
      setErrorType("recording_failed");
      const errMsg = "An error occurred during audio recording.";
      setError(errMsg);
      setState("error");
      optionsRef.current?.onTranscriptionError?.(errMsg);
    };

    try {
      recorder.start(250); // collect chunks every 250ms for smooth streaming
      startTimeRef.current = Date.now();
      setState("recording");

      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDurationSeconds(elapsed);
        }
      }, 500);
    } catch (startErr) {
      clearStoppingTimeout();
      stopStreamTracks();
      clearTimer();
      isStoppingRef.current = false;
      setErrorType("recording_failed");
      const errMsg = `Failed to start recording: ${(startErr as Error)?.message || "Unknown error"}`;
      setError(errMsg);
      setState("error");
      optionsRef.current?.onTranscriptionError?.(errMsg);
    }
  }, [clearError, isSupported, revokeActiveUrl, stopStreamTracks, clearTimer, clearStoppingTimeout]);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current || isTranscribingRef.current) {
      return;
    }
    clearStoppingTimeout();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      isStoppingRef.current = true;
      setState("stopping");

      // Safety timeout: If browser MediaRecorder never fires onstop within 3.5s, force cleanup
      stoppingTimeoutRef.current = setTimeout(() => {
        if (isStoppingRef.current) {
          isStoppingRef.current = false;
          stopStreamTracks();
          clearTimer();
          setErrorType("recording_failed");
          const msg = "Audio recording timed out while stopping. Please try again.";
          setError(msg);
          setState("error");
          optionsRef.current?.onTranscriptionError?.(msg);
        }
      }, 3500);

      try {
        if (typeof mediaRecorderRef.current.requestData === "function") {
          try {
            mediaRecorderRef.current.requestData();
          } catch {
            // ignore if not supported in state
          }
        }
        mediaRecorderRef.current.stop();
      } catch (stopErr) {
        clearStoppingTimeout();
        isStoppingRef.current = false;
        stopStreamTracks();
        clearTimer();
        setErrorType("recording_failed");
        const msg = `Failed to stop recording: ${(stopErr as Error)?.message || "Unknown error"}`;
        setError(msg);
        setState("error");
        optionsRef.current?.onTranscriptionError?.(msg);
      }
    } else {
      // If recorder is not in recording state, reset cleanly
      stopStreamTracks();
      clearTimer();
      isStoppingRef.current = false;
      if (state === "recording" || state === "stopping") {
        setState("idle");
      }
    }
  }, [stopStreamTracks, clearTimer, clearStoppingTimeout, state]);

  const transcribeRecording = useCallback(async (): Promise<string | null> => {
    if (!recording?.blob || isTranscribingRef.current) return null;

    // Abort any old controller if still hanging
    if (inFlightControllerRef.current) {
      try {
        inFlightControllerRef.current.abort();
      } catch {
        // ignore
      }
      inFlightControllerRef.current = null;
    }

    isTranscribingRef.current = true;
    setIsTranscribing(true);
    setState("transcribing");
    clearError();

    const controller = new AbortController();
    inFlightControllerRef.current = controller;

    try {
      const ext = getAudioFilename(recording.mimeType);

      const res = await transcribeAudio({
        file: recording.blob,
        filename: ext,
        language: optionsRef.current?.language,
        prompt: optionsRef.current?.prompt,
        signal: controller.signal,
      });

      if (isDiscardingRef.current || controller.signal.aborted) return null;

      const text = res.text?.trim() || "";
      if (text.length > 0 && !isSilenceHallucination(text)) {
        setTranscriptionText(text);
        optionsRef.current?.onTranscriptionSuccess?.(text);
        setState("idle");
        revokeActiveUrl();
        setRecording(null);
        return text;
      } else {
        setErrorType("recording_failed");
        setError(EMPTY_SPEECH_ERROR_MESSAGE);
        setState("recorded");
        optionsRef.current?.onTranscriptionError?.(EMPTY_SPEECH_ERROR_MESSAGE);
        return null;
      }
    } catch (err: unknown) {
      if (isDiscardingRef.current || controller.signal.aborted) {
        return null;
      }
      const msg = extractTranscriptionErrorMessage(err);
      setError(msg);
      setErrorType("recording_failed");
      setState("recorded");
      optionsRef.current?.onTranscriptionError?.(msg);
      return null;
    } finally {
      isTranscribingRef.current = false;
      inFlightControllerRef.current = null;
      setIsTranscribing(false);
    }
  }, [recording, clearError, revokeActiveUrl]);

  const clearTranscription = useCallback(() => {
    setTranscriptionText(null);
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      clearTimer();
      clearStoppingTimeout();
      if (inFlightControllerRef.current) {
        try {
          inFlightControllerRef.current.abort();
        } catch {
          // ignore abort error
        }
        inFlightControllerRef.current = null;
      }
      if (mediaRecorderRef.current) {
        const rec = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        rec.ondataavailable = null;
        rec.onstop = null;
        rec.onerror = null;
        if (rec.state !== "inactive") {
          try {
            rec.stop();
          } catch {
            // ignore cleanup errors
          }
        }
      }
      stopStreamTracks();
      revokeActiveUrl();
    };
  }, [clearTimer, clearStoppingTimeout, stopStreamTracks, revokeActiveUrl]);

  return {
    state,
    isSupported,
    durationSeconds,
    recording,
    error,
    errorType,
    isTranscribing,
    transcriptionText,
    startRecording,
    stopRecording,
    discardRecording,
    transcribeRecording,
    clearTranscription,
    clearError,
  };
}
