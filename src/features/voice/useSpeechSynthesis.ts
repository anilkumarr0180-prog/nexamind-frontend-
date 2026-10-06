import { useState, useRef, useEffect, useCallback } from "react";
import type { SpeechState, SpeechSynthesisHook } from "./types";
import { cleanMarkdownForSpeech } from "./types";

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wasStoppedRef = useRef<boolean>(false);
  const isSupported = isSpeechSynthesisSupported();

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancellation failure
      }
    }
    activeUtteranceRef.current = null;
    if (typeof window !== "undefined") {
      (window as unknown as { __nexamindActiveUtterance?: SpeechSynthesisUtterance | null }).__nexamindActiveUtterance = null;
    }
    setSpeakingMessageId(null);
    setSpeechState("idle");
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setSpeechState("paused");
      }
    } catch {
      // ignore pause error
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setSpeechState("speaking");
      }
    } catch {
      // ignore resume error
    }
  }, [isSupported]);

  const speak = useCallback(
    (messageId: string, text: string, onEnd?: (naturalEnd?: boolean) => void) => {
      if (!isSupported) {
        onEnd?.(true);
        return;
      }

      // Ensure any currently speaking response is stopped first
      wasStoppedRef.current = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel error
      }

      const cleanText = cleanMarkdownForSpeech(text);
      if (!cleanText) {
        setSpeakingMessageId(null);
        setSpeechState("idle");
        onEnd?.(true);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select available English/Natural voice if available
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const preferredVoice =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Daniel") ||
                  v.name.includes("Alex")),
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }
      } catch {
        // fallback to browser default
      }

      utterance.onstart = () => {
        setSpeakingMessageId(messageId);
        setSpeechState("speaking");
      };

      utterance.onpause = () => {
        setSpeechState("paused");
      };

      utterance.onresume = () => {
        setSpeechState("speaking");
      };

      utterance.onend = () => {
        const isNatural = !wasStoppedRef.current;
        activeUtteranceRef.current = null;
        if (typeof window !== "undefined") {
          (window as unknown as { __nexamindActiveUtterance?: SpeechSynthesisUtterance | null }).__nexamindActiveUtterance = null;
        }
        setSpeakingMessageId(null);
        setSpeechState("idle");
        onEnd?.(isNatural);
      };

      utterance.onerror = (e) => {
        // "interrupted" or "canceled" are fired normally upon stop() or switching messages
        const isCanceled =
          wasStoppedRef.current ||
          (e as SpeechSynthesisErrorEvent)?.error === "canceled" ||
          (e as SpeechSynthesisErrorEvent)?.error === "interrupted";
        activeUtteranceRef.current = null;
        if (typeof window !== "undefined") {
          (window as unknown as { __nexamindActiveUtterance?: SpeechSynthesisUtterance | null }).__nexamindActiveUtterance = null;
        }
        setSpeakingMessageId(null);
        setSpeechState("idle");
        onEnd?.(!isCanceled);
      };

      activeUtteranceRef.current = utterance;
      // Retain utterance on window to prevent Chromium garbage collection pause bug
      if (typeof window !== "undefined") {
        (window as unknown as { __nexamindActiveUtterance?: SpeechSynthesisUtterance | null }).__nexamindActiveUtterance = utterance;
      }

      setSpeakingMessageId(messageId);
      setSpeechState("speaking");

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeakingMessageId(null);
        setSpeechState("idle");
      }
    },
    [isSupported],
  );

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      activeUtteranceRef.current = null;
      if (typeof window !== "undefined") {
        (window as unknown as { __nexamindActiveUtterance?: SpeechSynthesisUtterance | null }).__nexamindActiveUtterance = null;
      }
    };
  }, [isSupported]);

  // Window unload / pagehide cleanup
  useEffect(() => {
    if (!isSupported) return;
    const handleCleanup = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      activeUtteranceRef.current = null;
    };
    window.addEventListener("beforeunload", handleCleanup);
    window.addEventListener("pagehide", handleCleanup);
    return () => {
      window.removeEventListener("beforeunload", handleCleanup);
      window.removeEventListener("pagehide", handleCleanup);
    };
  }, [isSupported]);

  return {
    isSupported,
    speechState,
    speakingMessageId,
    speak,
    pause,
    resume,
    stop,
  };
}
