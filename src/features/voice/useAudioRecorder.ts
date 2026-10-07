import { useState, useRef, useEffect, useCallback } from "react";
import type { AudioRecording, VoiceRecordingState, VoiceErrorType } from "./types";
import { isSilenceHallucination } from "./types";
import { transcribeAudio } from "./api";

function extractTranscriptionErrorMessage(err: unknown): string {
  if (!err) return "Failed to transcribe audio.";
  const anyErr = err as {
    name?: string;
    code?: string;
    message?: string;
    response?: {
      data?: {
        message?: string;
        error?: { message?: string };
      };
    };
  };

  if (
    anyErr.name === "CanceledError" ||
    anyErr.name === "AbortError" ||
    anyErr.code === "ERR_CANCELED"
  ) {
    return "Transcription was cancelled.";
  }

  if (anyErr.code === "ECONNABORTED" || (typeof anyErr.message === "string" && anyErr.message.toLowerCase().includes("timeout"))) {
    return "Transcription request timed out after 30 seconds. Please try again with a shorter recording.";
  }

  if (anyErr.response?.data?.error?.message) {
    return String(anyErr.response.data.error.message);
  }

  if (anyErr.response?.data?.message) {
    return String(anyErr.response.data.message);
  }

  if (anyErr.message) {
    return String(anyErr.message);
  }

  return "Failed to transcribe audio.";
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
    isDiscardingRef.current = false;
  }, [clearTimer, stopStreamTracks, revokeActiveUrl]);

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

      if (blob.size === 0) {
        setErrorType("recording_failed");
        setError("No audio data was captured. Please check your microphone and try again.");
        setState("error");
        return;
      }

      const url = URL.createObjectURL(blob);
      revokeActiveUrl();
      activeUrlRef.current = url;

      const finalDuration = startTimeRef.current
        ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        : 1;

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

      // Step 3: Automatically upload and transcribe the audio immediately after recording stops
      setState("transcribing");
      setIsTranscribing(true);
      isTranscribingRef.current = true;

      const controller = new AbortController();
      inFlightControllerRef.current = controller;

      try {
        const ext =
          recordedAudio.mimeType.includes("mp4") || recordedAudio.mimeType.includes("aac")
            ? "recording.m4a"
            : recordedAudio.mimeType.includes("ogg")
            ? "recording.ogg"
            : recordedAudio.mimeType.includes("wav")
            ? "recording.wav"
            : "recording.webm";

        const res = await transcribeAudio({
          file: blob,
          filename: ext,
          language: optionsRef.current?.language,
          prompt: optionsRef.current?.prompt,
          signal: controller.signal,
        });

        if (isDiscardingRef.current) {
          return;
        }

        const text = res.text?.trim() || "";
        if (text.length > 0 && !isSilenceHallucination(text)) {
          setTranscriptionText(text);
          optionsRef.current?.onTranscriptionSuccess?.(text);
          setState("idle");
          // Audio has successfully converted to text; clean up audio session
          revokeActiveUrl();
          setRecording(null);
        } else {
          const emptyMsg = "No speech was detected in your recording. Please try speaking closer to the microphone.";
          setErrorType("recording_failed");
          setError(emptyMsg);
          setState("recorded");
          optionsRef.current?.onTranscriptionError?.(emptyMsg);
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
      clearTimer();
      stopStreamTracks();
      isStoppingRef.current = false;
      setErrorType("recording_failed");
      setError("An error occurred during audio recording.");
      setState("error");
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
      stopStreamTracks();
      clearTimer();
      isStoppingRef.current = false;
      setErrorType("recording_failed");
      setError(`Failed to start recording: ${(startErr as Error)?.message || "Unknown error"}`);
      setState("error");
    }
  }, [clearError, isSupported, revokeActiveUrl, stopStreamTracks, clearTimer]);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current || isTranscribingRef.current) {
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      isStoppingRef.current = true;
      setState("stopping");
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
        isStoppingRef.current = false;
        stopStreamTracks();
        clearTimer();
        setErrorType("recording_failed");
        setError(`Failed to stop recording: ${(stopErr as Error)?.message || "Unknown error"}`);
        setState("error");
      }
    }
  }, [stopStreamTracks, clearTimer]);

  const transcribeRecording = useCallback(async (): Promise<string | null> => {
    if (!recording?.blob || isTranscribingRef.current) return null;

    isTranscribingRef.current = true;
    setIsTranscribing(true);
    setState("transcribing");
    clearError();

    const controller = new AbortController();
    inFlightControllerRef.current = controller;

    try {
      const ext =
        recording.mimeType.includes("mp4") || recording.mimeType.includes("aac")
          ? "recording.m4a"
          : recording.mimeType.includes("ogg")
          ? "recording.ogg"
          : recording.mimeType.includes("wav")
          ? "recording.wav"
          : "recording.webm";

      const res = await transcribeAudio({
        file: recording.blob,
        filename: ext,
        language: optionsRef.current?.language,
        prompt: optionsRef.current?.prompt,
        signal: controller.signal,
      });

      if (isDiscardingRef.current) return null;

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
        setError("No speech was detected in your recording. Please try speaking closer to the microphone.");
        setState("recorded");
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
  }, [clearTimer, stopStreamTracks, revokeActiveUrl]);

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
