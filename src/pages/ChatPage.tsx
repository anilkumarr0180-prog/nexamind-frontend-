import React, { useState, useRef, useEffect, useCallback, startTransition } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  chatKeys,
  getConversationMessages,
  streamAIChatMessage,
} from "@/features/chat";
import { streamAgentExecution } from "@/features/agent";
import {
  conversationKeys,
  createConversation,
  getConversationById,
  updateConversation,
  unarchiveConversation,
} from "@/features/conversations";
import { usageKeys } from "@/features/usage";
import { memoryKeys } from "@/features/memories";
import {
  uploadAttachment,
  validateAttachmentFile,
  ALLOWED_DOCUMENT_EXTENSIONS,
  type AttachmentCategory,
} from "@/features/attachments";
import { classifyApiError } from "@/lib/utils/error";
import { generateConversationTitle } from "@/lib/utils/title";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import { NexaMindIcon, AstraGalaxy } from "@/components/ui";
import { useAudioRecorder, useSpeechSynthesis, formatVoiceDuration, type VoiceModeState } from "@/features/voice";
import {
  type Message,
  type Conversation,
  type AgentPlan,
  type ToolStatusEvent,
  type PaginatedResponse,
  type ChatSourceCitation,
  isWebSourceCitation,
  getSafeWebUrl,
} from "@/types";

function isDocumentAttachment(att?: { type?: string | null; originalName?: string | null; format?: string | null } | null): boolean {
  if (!att) return false;
  if (att.type === "DOCUMENT") return true;
  const name = (att.originalName || "").toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

interface PendingMessage {
  id: string;
  conversationId?: string;
  role: "USER" | "ASSISTANT";
  content: string;
  attachmentId?: string | null;
  attachmentPreviewUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
}

export interface ToolStatusItem {
  id: string;
  tool: string;
  status: "running" | "completed" | "failed";
  error?: string;
  durationMs?: number;
}

export interface ConversationStreamState {
  type: "chat" | "agent";
  streamingContent: string;
  agentStatusText?: string;
  plan?: AgentPlan | null;
  toolStatuses: ToolStatusItem[];
  sources?: ChatSourceCitation[] | null;
}

interface MessageSourcesProps {
  sources?: ChatSourceCitation[] | null;
  onSourceClick: (src: ChatSourceCitation) => void;
}

const MessageSources: React.FC<MessageSourcesProps> = ({ sources, onSourceClick }) => {
  if (!sources || sources.length === 0) return null;

  const webSources = sources.filter(isWebSourceCitation);

  return (
    <div className="mt-3 pt-2.5 border-t border-white/[0.08] text-xs">
      <div className="flex items-center gap-1.5 font-medium text-violet-300/90 mb-1.5">
        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span>Sources</span>
      </div>
      <ul className="space-y-1 list-none pl-0 m-0">
        {sources.map((src, idx) => {
          const isWeb = isWebSourceCitation(src);
          const safeUrl = isWeb ? getSafeWebUrl(src.url) : null;
          const webIndex = isWeb ? webSources.indexOf(src) + 1 : null;
          const titleText = isWeb
            ? (src.title?.trim() || safeUrl || "Web source")
            : src.filename;
          const tooltip = isWeb
            ? (safeUrl ? (src.title?.trim() ? `${src.title.trim()}\n${safeUrl}` : safeUrl) : "Web source (invalid or missing link)")
            : `View source: ${src.filename} (chunk ${src.chunkIndex})`;

          return (
            <li
              key={isWeb ? `web-${safeUrl || src.title || idx}-${idx}` : `${src.attachmentId}-${src.chunkIndex}-${idx}`}
              className="flex items-center gap-1.5 text-white/70"
            >
              {isWeb ? (
                <span className="font-mono text-[11px] font-semibold text-violet-400 min-w-[18px]">
                  [{webIndex}]
                </span>
              ) : (
                <span className="text-violet-400/80">•</span>
              )}
              {isWeb ? (
                safeUrl ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-left text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline transition-colors text-xs font-medium cursor-pointer"
                    title={tooltip}
                  >
                    <span className="truncate max-w-[280px] sm:max-w-md">{titleText}</span>
                    <svg className="w-3 h-3 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-left text-white/60 text-xs font-medium"
                    title={tooltip}
                  >
                    <span className="truncate max-w-[280px] sm:max-w-md">{titleText}</span>
                  </span>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onSourceClick(src)}
                  className="text-left hover:text-violet-300 underline-offset-2 hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs"
                  title={tooltip}
                >
                  <span className="font-medium text-white/90">{src.filename}</span>
                  <span className="text-white/40 ml-1.5">— chunk {src.chunkIndex}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const AGENT_MODE_STORAGE_KEY = "nexamind_agent_mode_prefs";

function getStoredAgentMode(convId?: string): boolean {
  if (!convId || typeof window === "undefined" || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    const prefs: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    return Boolean(prefs[convId]);
  } catch {
    return false;
  }
}

function setStoredAgentMode(convId: string, enabled: boolean): void {
  if (!convId || typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    const prefs: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    prefs[convId] = enabled;
    window.localStorage.setItem(AGENT_MODE_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentMode, setAgentMode] = useState<boolean>(() => getStoredAgentMode(conversationId));
  const [streamingMap, setStreamingMap] = useState<Record<string, ConversationStreamState>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<PendingMessage[]>([]);

  const handleSourceClick = (src: ChatSourceCitation) => {
    if (isWebSourceCitation(src)) {
      const safeUrl = getSafeWebUrl(src.url);
      if (safeUrl) {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    const matchingMsg = activeMessages.find(
      (m) =>
        m.attachmentId === src.attachmentId ||
        (m.attachment && m.attachment.attachmentId === src.attachmentId),
    );
    if (matchingMsg?.attachment?.secureUrl) {
      window.open(matchingMsg.attachment.secureUrl, "_blank", "noopener,noreferrer");
    } else if (matchingMsg) {
      const el = document.getElementById(`msg-${matchingMsg._id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Attachment state (Step 3: Image & Step 10: Document upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<AttachmentCategory | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUploadedAttachmentId, setLastUploadedAttachmentId] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; name?: string } | null>(null);
  const lastAttachmentIdRef = useRef<string | null>(null);
  const isNavigatingFromSendRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Mode State (Step 5)
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const [voiceModeState, setVoiceModeState] = useState<VoiceModeState>("idle");
  const [voiceModeError, setVoiceModeError] = useState<string | null>(null);
  const isVoiceModeRef = useRef<boolean>(false);
  isVoiceModeRef.current = isVoiceMode;
  const handleSendMessageRef = useRef<(textToSend?: string, editMessageId?: string) => Promise<void>>(async () => {});

  // Local Voice Recording & Transcription State (Steps 1, 2, 3, 5 & 6)
  const voiceRecorder = useAudioRecorder({
    onBeforeStart: () => {
      // Step 6: When recording starts, immediately cancel any active SpeechSynthesis!
      speechSynthesizer.stop();
    },
    onTranscriptionSuccess: (text) => {
      if (isVoiceModeRef.current) {
        setVoiceModeState("thinking");
        handleSendMessageRef.current(text);
      } else {
        setInputValue((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 192)}px`;
          }
        }, 0);
      }
    },
    onTranscriptionError: (err) => {
      if (isVoiceModeRef.current) {
        setVoiceModeState("error");
        setVoiceModeError(err);
      }
    },
  });

  // Assistant Speech Synthesis (TTS - Step 4, 5 & 6)
  const speechSynthesizer = useSpeechSynthesis();

  const exitVoiceMode = useCallback(() => {
    setIsVoiceMode(false);
    setVoiceModeState("idle");
    setVoiceModeError(null);
    voiceRecorder.discardRecording();
    speechSynthesizer.stop();
  }, [voiceRecorder, speechSynthesizer]);

  const startVoiceMode = useCallback(async () => {
    setIsVoiceMode(true);
    setVoiceModeState("listening");
    setVoiceModeError(null);
    speechSynthesizer.stop();
    await voiceRecorder.startRecording();
  }, [voiceRecorder, speechSynthesizer]);

  // Step 6: Voice Mode Interruption (barge-in)
  // While speaking: immediately cancel SpeechSynthesis, transition Speaking -> Listening, start mic recording
  const handleVoiceInterruption = useCallback(async () => {
    if (!isVoiceModeRef.current) return;

    // 1. Immediately cancel the active SpeechSynthesis
    speechSynthesizer.stop();

    // 2. Cleanly transition: Speaking -> Listening
    setVoiceModeState("listening");
    setVoiceModeError(null);

    // 3. Prevent overlapping MediaRecorder sessions
    if (voiceRecorder.state === "recording") {
      voiceRecorder.discardRecording();
    }

    // 4. Start microphone recording
    await voiceRecorder.startRecording();
  }, [speechSynthesizer, voiceRecorder]);

  // Synchronize Voice Mode state with audio recorder status
  useEffect(() => {
    if (isVoiceMode) {
      if (voiceRecorder.state === "error" && voiceRecorder.error) {
        setVoiceModeState("error");
        setVoiceModeError(voiceRecorder.error);
      } else if (
        voiceRecorder.state === "recording" ||
        voiceRecorder.state === "requesting_permission"
      ) {
        setVoiceModeState("listening");
      } else if (
        voiceRecorder.state === "stopping" ||
        voiceRecorder.state === "transcribing" ||
        voiceRecorder.isTranscribing
      ) {
        setVoiceModeState("transcribing");
      }
    }
  }, [isVoiceMode, voiceRecorder.state, voiceRecorder.error, voiceRecorder.isTranscribing]);

  // Cleanup Voice Mode and audio sessions strictly on unmount
  const voiceRecorderDiscardRef = useRef(voiceRecorder.discardRecording);
  voiceRecorderDiscardRef.current = voiceRecorder.discardRecording;
  const speechSynthesizerStopRef = useRef(speechSynthesizer.stop);
  speechSynthesizerStopRef.current = speechSynthesizer.stop;

  useEffect(() => {
    return () => {
      voiceRecorderDiscardRef.current();
      speechSynthesizerStopRef.current();
    };
  }, []);

  // Retain lastUploadedAttachmentId available across renders for Step 4 integration
  useEffect(() => {
    lastAttachmentIdRef.current = lastUploadedAttachmentId;
  }, [lastUploadedAttachmentId]);

  // Handle Escape key to close image preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewModalImage) {
        setPreviewModalImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalImage]);

  // Branch & Versioning state
  const [selectedLeafId, setSelectedLeafId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputContent, setEditInputContent] = useState<string>("");

  // 1. Fetch active conversation details (for title, status, archiving check)
  const { data: conversationData } = useQuery<Conversation>({
    queryKey: conversationKeys.detail(conversationId || ""),
    queryFn: () => getConversationById(conversationId!),
    enabled: !!conversationId,
  });

  const isArchived = conversationData?.status === "ARCHIVED";

  // 2. Fetch real messages for active conversation (preserving pagination limit: 100)
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useQuery({
    queryKey: chatKeys.messages(conversationId || ""),
    queryFn: () => getConversationMessages(conversationId!, { limit: 100 }),
    enabled: !!conversationId,
  });

  // Conversation isolation: ensure only messages belonging to this conversation are visible
  const backendMessages: Message[] = (messagesData?.data || []).filter(
    (msg) => msg.conversationId === conversationId,
  );

  const visibleOptimisticMessages = optimisticMessages.filter(
    (msg) => !msg.conversationId || msg.conversationId === conversationId,
  );

  // Sync selected leaf when conversation data updates
  useEffect(() => {
    setSelectedLeafId(conversationData?.activeLeafMessageId || null);
    setEditingMessageId(null);
  }, [conversationId, conversationData?.activeLeafMessageId]);

  const filePreviewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    filePreviewUrlRef.current = filePreviewUrl;
  }, [filePreviewUrl]);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (filePreviewUrlRef.current) {
        URL.revokeObjectURL(filePreviewUrlRef.current);
      }
    };
  }, []);

  // Reset attachment draft state when conversation changes (unless navigating from message submission)
  useEffect(() => {
    if (isNavigatingFromSendRef.current) {
      return;
    }
    if (filePreviewUrlRef.current) {
      URL.revokeObjectURL(filePreviewUrlRef.current);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileCategory(null);
    setUploadProgress(null);
    setIsUploadingAttachment(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [conversationId]);

  // Compute active branch messages and turn version groupings
  const { activeMessages, versionMap } = React.useMemo(() => {
    if (!backendMessages.length) {
      return {
        activeMessages: [] as Message[],
        versionMap: new Map<string, { versions: Message[]; currentIndex: number }>(),
      };
    }

    const msgMap = new Map<string, Message>();
    const versionGroups = new Map<string, Message[]>();

    for (const msg of backendMessages) {
      msgMap.set(msg._id, msg);
      if (msg.role === "USER") {
        const rootKey = msg.originalMessageId || msg._id;
        const grp = versionGroups.get(rootKey) || [];
        grp.push(msg);
        versionGroups.set(rootKey, grp);
      }
    }

    for (const grp of versionGroups.values()) {
      grp.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    let currentLeaf: Message | undefined;
    if (selectedLeafId && msgMap.has(selectedLeafId)) {
      currentLeaf = msgMap.get(selectedLeafId);
    } else if (
      conversationData?.activeLeafMessageId &&
      msgMap.has(conversationData.activeLeafMessageId)
    ) {
      currentLeaf = msgMap.get(conversationData.activeLeafMessageId);
    } else {
      currentLeaf = backendMessages[backendMessages.length - 1];
    }

    const activePath: Message[] = [];
    const visited = new Set<string>();
    let curr = currentLeaf;

    while (curr && !visited.has(curr._id)) {
      visited.add(curr._id);
      activePath.unshift(curr);
      if (curr.parentMessageId && msgMap.has(curr.parentMessageId)) {
        curr = msgMap.get(curr.parentMessageId);
      } else {
        const legacyBefore = backendMessages.filter(
          (m) =>
            !m.parentMessageId &&
            new Date(m.createdAt).getTime() < new Date(curr!.createdAt).getTime() &&
            !visited.has(m._id),
        );
        if (legacyBefore.length > 0) {
          activePath.unshift(...legacyBefore);
        }
        break;
      }
    }

    const displayList = activePath.length ? activePath : backendMessages;

    const vMap = new Map<string, { versions: Message[]; currentIndex: number }>();
    for (const msg of displayList) {
      if (msg.role === "USER") {
        const rootKey = msg.originalMessageId || msg._id;
        const versions = versionGroups.get(rootKey) || [msg];
        const currentIndex = versions.findIndex((v) => v._id === msg._id);
        vMap.set(msg._id, {
          versions,
          currentIndex: currentIndex >= 0 ? currentIndex : 0,
        });
      }
    }

    return { activeMessages: displayList, versionMap: vMap };
  }, [backendMessages, selectedLeafId, conversationData]);

  // Scoped active stream for the current conversation
  const currentStream = conversationId ? streamingMap[conversationId] : null;
  const isCurrentConvStreaming = !!currentStream;

  // Scroll to bottom on message changes or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    activeMessages.length,
    visibleOptimisticMessages.length,
    isSubmitting,
    isCurrentConvStreaming,
    currentStream?.streamingContent,
    currentStream?.agentStatusText,
    currentStream?.toolStatuses.length,
  ]);

  // Branch navigation & editing handlers
  const handleSwitchVersion = async (targetMsg: Message) => {
    let cur: Message = targetMsg;
    while (true) {
      const children = backendMessages.filter((m) => m.parentMessageId === cur._id);
      if (!children.length) break;
      cur = children[children.length - 1]!;
    }

    setSelectedLeafId(cur._id);
    if (conversationId) {
      try {
        await updateConversation(conversationId, { activeLeafMessageId: cur._id });
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      } catch (err) {
        console.error("Non-fatal branch sync error:", err);
      }
    }
  };

  const handleStartEdit = (msg: Message) => {
    if (isCurrentConvStreaming || isSubmitting || isArchived) return;
    setEditingMessageId(msg._id);
    setEditInputContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInputContent("");
  };

  const handleSubmitEdit = async (msgId: string) => {
    const text = editInputContent.trim();
    if (!text || isSubmitting || isCurrentConvStreaming || isArchived) return;

    setEditingMessageId(null);
    setEditInputContent("");
    handleSendMessage(text, msgId);
  };

  // Focus input and reset view states when conversation changes
  useEffect(() => {
    if (isNavigatingFromSendRef.current) {
      isNavigatingFromSendRef.current = false;
      return;
    }
    inputRef.current?.focus();
    setErrorMessage(null);
    setIsSubmitting(false);
    voiceRecorderDiscardRef.current();
    speechSynthesizerStopRef.current();
    setIsVoiceMode(false);
    setVoiceModeState("idle");
    setVoiceModeError(null);
    // Restore persistent conversation-level Agent mode (defaults to false for new chats)
    setAgentMode(getStoredAgentMode(conversationId));
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [conversationId]);

  // Automatically restore focus to textarea when generation/streaming completes
  useEffect(() => {
    if (!isCurrentConvStreaming && !isSubmitting && !isArchived) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCurrentConvStreaming, isSubmitting, isArchived]);

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveConversation(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(conversationKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(updated._id) });
    },
    onError: (err: unknown) => {
      const classified = classifyApiError(err, "Failed to unarchive conversation.");
      setErrorMessage(classified.message);
    },
  });

  // Stop generating / Stop Agent control: cleanly aborts target conversation's request
  const handleStopGenerating = (targetConvId?: string) => {
    const convIdToStop = targetConvId || conversationId;
    if (!convIdToStop) return;

    const controller = abortControllersRef.current.get(convIdToStop);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(convIdToStop);
    }

    setStreamingMap((prev) => {
      const next = { ...prev };
      delete next[convIdToStop];
      return next;
    });

    setOptimisticMessages((prev) => prev.filter((m) => m.conversationId !== convIdToStop));
    setIsSubmitting(false);

    queryClient.invalidateQueries({ queryKey: chatKeys.messages(convIdToStop) });
    queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    queryClient.invalidateQueries({ queryKey: conversationKeys.detail(convIdToStop) });
    queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
  };

  // Attachment handlers
  const handleAttachmentClick = () => {
    if (isSubmitting || isUploadingAttachment || isCurrentConvStreaming || isArchived) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachmentFile(file);
    if (!validation.valid || !validation.category) {
      setErrorMessage(validation.error || "Invalid file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrorMessage(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const preview = validation.category === "image" ? URL.createObjectURL(file) : null;
    setSelectedFile(file);
    setFilePreviewUrl(preview);
    setFileCategory(validation.category);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = () => {
    if (isUploadingAttachment) return;
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileCategory(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (textToSend?: string, editMessageId?: string) => {
    const rawText = (textToSend || inputValue).trim();
    const text = rawText || (selectedFile ? (fileCategory === "document" ? "Uploaded document" : "Uploaded image") : "");
    if (!text || isSubmitting || isUploadingAttachment || isCurrentConvStreaming || isArchived) return;

    // Capture pending attachment state before clearing input bar
    const fileToUpload = selectedFile;
    const previewUrlToUse = filePreviewUrl;
    const categoryToUse = fileCategory;
    const fileNameToUse = fileToUpload?.name || null;
    const fileSizeToUse = fileToUpload?.size || null;
    const fileTypeToUse = categoryToUse === "document" ? "DOCUMENT" : "IMAGE";

    // Clear input bar and draft attachment state immediately for zero-lag UI response
    setErrorMessage(null);
    speechSynthesizer.stop();
    setIsSubmitting(true);
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileCategory(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    let targetConvId = conversationId;
    const isNewConversation = !targetConvId;

    // Root /app: Create conversation first with deterministic title
    if (!targetConvId) {
      try {
        const title = generateConversationTitle(rawText || (categoryToUse === "document" ? "Document upload" : "Image upload"));
        const createdConv = await createConversation({ title });
        targetConvId = createdConv._id;
        queryClient.setQueryData(chatKeys.messages(targetConvId), {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 100,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
        queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      } catch (createErr: unknown) {
        const classified = classifyApiError(
          createErr,
          "Failed to start conversation. Please try again.",
        );
        setErrorMessage(classified.message);
        setIsSubmitting(false);
        return;
      }
    }

    // Immediately create optimistic message with local preview URL so user message is visible on frame 1
    const tempUserMsgId = `opt-${Date.now()}`;
    const newPending: PendingMessage = {
      id: tempUserMsgId,
      conversationId: targetConvId,
      role: "USER",
      content: text,
      attachmentId: null,
      attachmentPreviewUrl: previewUrlToUse,
      attachmentName: fileNameToUse,
      attachmentType: fileTypeToUse,
      attachmentSize: fileSizeToUse,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, newPending]);

    // Check if user requested Agent mode (via state toggle or /agent or @agent prefix)
    const isAgentCommand = text.startsWith("/agent ") || text.startsWith("@agent ");
    const effectiveTask = isAgentCommand ? text.replace(/^(\/agent|@agent)\s+/, "") : text;
    const isAgentRun = agentMode || isAgentCommand;

    // Initialize scoped streaming state for this conversation immediately
    setStreamingMap((prev) => ({
      ...prev,
      [targetConvId]: {
        type: isAgentRun ? "agent" : "chat",
        streamingContent: "",
        agentStatusText: fileToUpload
          ? (categoryToUse === "document" ? "Uploading document..." : "Uploading image...")
          : (isAgentRun ? "Working..." : undefined),
        toolStatuses: [],
        plan: null,
      },
    }));

    // If new conversation, navigate immediately now that optimistic message and streaming state are loaded
    if (isNewConversation) {
      if (agentMode) {
        setStoredAgentMode(targetConvId, true);
      }
      isNavigatingFromSendRef.current = true;
      startTransition(() => {
        navigate(`/app/chat/${targetConvId}`, { replace: true });
      });
    }

    const abortController = new AbortController();
    abortControllersRef.current.set(targetConvId, abortController);

    // Title generation on initial message
    const isFirstMessage =
      backendMessages.length === 0 || conversationData?.title === "New Chat";
    if (isFirstMessage && targetConvId) {
      const title = generateConversationTitle(text);
      updateConversation(targetConvId, { title })
        .then((updated) => {
          queryClient.setQueryData(conversationKeys.detail(targetConvId), updated);
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
        })
        .catch((titleErr) => {
          console.error("Non-fatal title update error:", titleErr);
        });
    }

    // Handle background attachment upload (Image or Document)
    let currentAttachmentId: string | null = null;
    if (fileToUpload && targetConvId) {
      setIsUploadingAttachment(true);
      setUploadProgress(0);
      try {
        const uploadResult = await uploadAttachment({
          file: fileToUpload,
          conversationId: targetConvId,
          onUploadProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        if (abortController.signal.aborted) {
          if (previewUrlToUse) URL.revokeObjectURL(previewUrlToUse);
          setIsUploadingAttachment(false);
          setUploadProgress(null);
          return;
        }

        currentAttachmentId = uploadResult.attachmentId;
        setLastUploadedAttachmentId(uploadResult.attachmentId);

        // Update optimistic message with Cloudinary secureUrl & attachmentId
        setOptimisticMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMsgId
              ? {
                  ...msg,
                  attachmentId: uploadResult.attachmentId,
                  attachmentPreviewUrl: uploadResult.secureUrl || msg.attachmentPreviewUrl,
                  attachmentName: uploadResult.originalName || msg.attachmentName,
                  attachmentType: uploadResult.type || msg.attachmentType,
                  attachmentSize: uploadResult.size || msg.attachmentSize,
                }
              : msg
          )
        );

        // Revoke temporary blob URL now that permanent secureUrl is active
        if (previewUrlToUse) {
          URL.revokeObjectURL(previewUrlToUse);
        }
        setIsUploadingAttachment(false);
        setUploadProgress(null);

        // Update streaming indicator status text
        setStreamingMap((prev) => {
          const cur = prev[targetConvId];
          if (!cur) return prev;
          return {
            ...prev,
            [targetConvId]: {
              ...cur,
              agentStatusText: isAgentRun ? "Working..." : undefined,
            },
          };
        });
      } catch (uploadErr: unknown) {
        if (previewUrlToUse) {
          URL.revokeObjectURL(previewUrlToUse);
        }
        setIsUploadingAttachment(false);
        setUploadProgress(null);
        const classified = classifyApiError(
          uploadErr,
          `Failed to upload ${categoryToUse === "document" ? "document" : "image"}. Please try again.`,
        );
        setErrorMessage(classified.message);
        // Rollback optimistic state on upload failure
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempUserMsgId));
        setStreamingMap((prev) => {
          const next = { ...prev };
          delete next[targetConvId];
          return next;
        });
        abortControllersRef.current.delete(targetConvId);
        setIsSubmitting(false);
        return; // Halt message flow if attachment upload fails
      }
    }

    setIsSubmitting(false);

        if (isAgentRun) {
      // -------------------------------------------------------------
      // Autonomous Agent Streaming Pipeline
      // -------------------------------------------------------------
      try {
        await streamAgentExecution(
          {
            conversationId: targetConvId,
            task: effectiveTask,
          },
          {
            onStart: () => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    agentStatusText: "Working...",
                  },
                };
              });
            },
            onStatus: (_status: string, message: string) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    agentStatusText: message,
                  },
                };
              });
            },
            onPlan: (plan: AgentPlan) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    plan,
                  },
                };
              });
            },
            onToolStatus: (event: ToolStatusEvent) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                const existingIdx = cur.toolStatuses.findIndex(
                  (t) => t.tool === event.tool && (t.id === event.toolCallId || !t.id),
                );
                let nextTools: ToolStatusItem[];
                if (existingIdx >= 0) {
                  nextTools = [...cur.toolStatuses];
                  nextTools[existingIdx] = {
                    id: event.toolCallId || nextTools[existingIdx]!.id,
                    tool: event.tool,
                    status: event.status,
                    error: event.error,
                    durationMs: event.durationMs ?? nextTools[existingIdx]!.durationMs,
                  };
                } else {
                  nextTools = [
                    ...cur.toolStatuses,
                    {
                      id: event.toolCallId || `t-${Date.now()}-${cur.toolStatuses.length}`,
                      tool: event.tool,
                      status: event.status,
                      error: event.error,
                      durationMs: event.durationMs,
                    },
                  ];
                }
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    toolStatuses: nextTools,
                  },
                };
              });
            },
            onSources: (sources: ChatSourceCitation[]) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    sources,
                  },
                };
              });
            },
            onTrace: (_trace) => {
              // Structured execution trace step received
            },
            onChunk: (chunk: string) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    streamingContent: cur.streamingContent + chunk,
                  },
                };
              });
            },
            onDone: async () => {
              const assistantContent = streamingMap[targetConvId]?.streamingContent || "";
              await queryClient.refetchQueries({ queryKey: chatKeys.messages(targetConvId!) });

              setOptimisticMessages((prev) =>
                prev.filter((m) => m.conversationId !== targetConvId),
              );
              setStreamingMap((prev) => {
                const next = { ...prev };
                delete next[targetConvId];
                return next;
              });
              abortControllersRef.current.delete(targetConvId);

              queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
              queryClient.invalidateQueries({ queryKey: conversationKeys.detail(targetConvId!) });
              queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
              queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });

              if (isVoiceModeRef.current) {
                if (assistantContent.trim() && speechSynthesizer.isSupported) {
                  setVoiceModeState("speaking");
                  speechSynthesizer.speak(targetConvId, assistantContent, (naturalEnd) => {
                    if (isVoiceModeRef.current && naturalEnd) {
                      setVoiceModeState((prev) => (prev === "speaking" ? "idle" : prev));
                    }
                  });
                } else {
                  setVoiceModeState("idle");
                }
              }
            },
            onError: (err) => {
              if (abortController.signal.aborted) return;
              const classified = classifyApiError(
                err,
                "Agent execution failed. Please try again.",
              );
              setErrorMessage(classified.message);
              if (isVoiceModeRef.current) {
                setVoiceModeState("error");
                setVoiceModeError(classified.message);
              }
              setOptimisticMessages((prev) =>
                prev.filter((m) => m.conversationId !== targetConvId),
              );
              setStreamingMap((prev) => {
                const next = { ...prev };
                delete next[targetConvId];
                return next;
              });
              abortControllersRef.current.delete(targetConvId);
            },
          },
          abortController.signal,
        );
      } catch (err: unknown) {
        if (
          abortController.signal.aborted ||
          (err instanceof Error &&
            (err.name === "AbortError" || err.message.includes("aborted")))
        ) {
          // Clean cancellation
          return;
        }
        const classified = classifyApiError(
          err,
          "Agent execution failed. Please try again.",
        );
        setErrorMessage(classified.message);
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.conversationId !== targetConvId),
        );
        setStreamingMap((prev) => {
          const next = { ...prev };
          delete next[targetConvId];
          return next;
        });
        abortControllersRef.current.delete(targetConvId);
      }
    } else {
      // -------------------------------------------------------------
      // Standard Chat Streaming Pipeline (Batch 2)
      // -------------------------------------------------------------
      let streamedSources: ChatSourceCitation[] | null = null;
      try {
        await streamAIChatMessage(
          {
            conversationId: targetConvId,
            content: text,
            ...(editMessageId ? { editMessageId } : {}),
            ...(currentAttachmentId ? { attachmentId: currentAttachmentId } : {}),
          },
          {
            onStart: () => {},
            onSources: (sources: ChatSourceCitation[]) => {
              streamedSources = sources;
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    sources,
                  },
                };
              });
            },
            onStatus: (_status: string, message: string) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    agentStatusText: message,
                  },
                };
              });
            },
            onToolStatus: (event: ToolStatusEvent) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                const existingIdx = cur.toolStatuses.findIndex(
                  (t) => t.tool === event.tool && (t.id === event.toolCallId || !t.id),
                );
                let nextTools: ToolStatusItem[];
                if (existingIdx >= 0) {
                  nextTools = [...cur.toolStatuses];
                  nextTools[existingIdx] = {
                    id: event.toolCallId || nextTools[existingIdx]!.id,
                    tool: event.tool,
                    status: event.status,
                    error: event.error,
                  };
                } else {
                  nextTools = [
                    ...cur.toolStatuses,
                    {
                      id: event.toolCallId || `t-${Date.now()}-${cur.toolStatuses.length}`,
                      tool: event.tool,
                      status: event.status,
                      error: event.error,
                    },
                  ];
                }
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    toolStatuses: nextTools,
                  },
                };
              });
            },
            onChunk: (chunk: string) => {
              setStreamingMap((prev) => {
                const cur = prev[targetConvId];
                if (!cur) return prev;
                return {
                  ...prev,
                  [targetConvId]: {
                    ...cur,
                    streamingContent: cur.streamingContent + chunk,
                  },
                };
              });
            },
            onDone: (result) => {
              if (result?.userMessage && result?.assistantMessage) {
                const normUserMsg: Message = {
                  _id: (result.userMessage as any)._id || result.userMessage.id,
                  conversationId: targetConvId,
                  userId: (result.userMessage as any).userId || "",
                  role: (result.userMessage.role as any) || "USER",
                  content: result.userMessage.content,
                  status: (result.userMessage.status as any) || "COMPLETED",
                  parentMessageId: (result.userMessage as any).parentMessageId ?? null,
                  originalMessageId: (result.userMessage as any).originalMessageId ?? null,
                  attachmentId: (result.userMessage as any).attachmentId ?? null,
                  attachment: (result.userMessage as any).attachment ?? null,
                  model: null,
                  provider: null,
                  usage: null,
                  createdAt: result.userMessage.createdAt,
                  updatedAt: result.userMessage.createdAt,
                };

                const normAssistantMsg: Message = {
                  _id: (result.assistantMessage as any)._id || result.assistantMessage.id,
                  conversationId: targetConvId,
                  userId: (result.assistantMessage as any).userId || "",
                  role: (result.assistantMessage.role as any) || "ASSISTANT",
                  content: result.assistantMessage.content,
                  status: (result.assistantMessage.status as any) || "COMPLETED",
                  parentMessageId: (result.assistantMessage as any).parentMessageId ?? null,
                  model: result.assistantMessage.model ?? null,
                  provider: result.assistantMessage.provider ?? null,
                  usage: result.assistantMessage.usage ?? null,
                  sources: (result.assistantMessage as any).sources ?? result.sources ?? streamedSources ?? null,
                  createdAt: result.assistantMessage.createdAt,
                  updatedAt: result.assistantMessage.createdAt,
                };

                setSelectedLeafId(normAssistantMsg._id);

                queryClient.setQueryData<PaginatedResponse<Message>>(
                  chatKeys.messages(targetConvId!),
                  (old) => {
                    const existing = old?.data || [];
                    const existingIds = new Set(existing.map((m) => m._id));
                    const toAdd = [normUserMsg, normAssistantMsg].filter(
                      (m) => m._id && !existingIds.has(m._id),
                    );
                    const updatedData = [...existing, ...toAdd];
                    return {
                      success: true,
                      data: updatedData,
                      pagination: old?.pagination || {
                        page: 1,
                        limit: 100,
                        total: updatedData.length,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false,
                      },
                    };
                  },
                );
              }

              setOptimisticMessages((prev) =>
                prev.filter((m) => m.conversationId !== targetConvId),
              );
              setStreamingMap((prev) => {
                const next = { ...prev };
                delete next[targetConvId];
                return next;
              });
              abortControllersRef.current.delete(targetConvId);

              queryClient.invalidateQueries({ queryKey: chatKeys.messages(targetConvId!) });
              queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
              queryClient.invalidateQueries({ queryKey: conversationKeys.detail(targetConvId!) });
              queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
              queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });

              // Voice Mode completion
              if (isVoiceModeRef.current) {
                const assistantContent =
                  result?.assistantMessage?.content ||
                  streamingMap[targetConvId]?.streamingContent ||
                  "";
                const assistantMsgId =
                  (result?.assistantMessage as any)?._id ||
                  result?.assistantMessage?.id ||
                  targetConvId;
                if (assistantContent.trim() && speechSynthesizer.isSupported) {
                  setVoiceModeState("speaking");
                  speechSynthesizer.speak(assistantMsgId, assistantContent, (naturalEnd) => {
                    if (isVoiceModeRef.current && naturalEnd) {
                      setVoiceModeState((prev) => (prev === "speaking" ? "idle" : prev));
                    }
                  });
                } else {
                  setVoiceModeState("idle");
                }
              }
            },
            onError: (err) => {
              if (abortController.signal.aborted) return;
              const classified = classifyApiError(
                err,
                "Failed to generate AI response. Please try again.",
              );
              setErrorMessage(classified.message);
              if (isVoiceModeRef.current) {
                setVoiceModeState("error");
                setVoiceModeError(classified.message);
              }
              queryClient.invalidateQueries({ queryKey: chatKeys.messages(targetConvId!) }).finally(() => {
                setOptimisticMessages((prev) =>
                  prev.filter((m) => m.conversationId !== targetConvId),
                );
              });
              setStreamingMap((prev) => {
                const next = { ...prev };
                delete next[targetConvId];
                return next;
              });
              abortControllersRef.current.delete(targetConvId);
            },
          },
          abortController.signal,
        );
      } catch (err: unknown) {
        if (
          abortController.signal.aborted ||
          (err instanceof Error &&
            (err.name === "AbortError" || err.message.includes("aborted")))
        ) {
          return;
        }
        const classified = classifyApiError(
          err,
          "Failed to generate AI response. Please try again.",
        );
        setErrorMessage(classified.message);
        queryClient.invalidateQueries({ queryKey: chatKeys.messages(targetConvId!) }).finally(() => {
          setOptimisticMessages((prev) =>
            prev.filter((m) => m.conversationId !== targetConvId),
          );
        });
        setStreamingMap((prev) => {
          const next = { ...prev };
          delete next[targetConvId];
          return next;
        });
        abortControllersRef.current.delete(targetConvId);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const hasMessages =
    activeMessages.length > 0 || visibleOptimisticMessages.length > 0;

  return (
    <div className="flex h-full flex-col min-h-0 w-full overflow-hidden bg-[#fafafc] dark:bg-[#16161a] relative">
      {/* Subtle ambient lighting mesh — tailored for Dark & Light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_800px_500px_at_50%_-80px,rgba(139,92,246,0.07),transparent_70%)] dark:block hidden" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_1000px_700px_at_50%_35%,rgba(56,189,248,0.05),rgba(245,158,11,0.03),rgba(99,102,241,0.035),transparent_75%)] dark:hidden block" />

      {/* Astra Cosmic Galaxy Background — only visible on initial visit / empty state */}
      {!hasMessages && !isCurrentConvStreaming && (
        <AstraGalaxy
          mode="spiral"
          hasMessages={false}
          isStreaming={false}
          className="absolute inset-0 w-full h-full z-0 animate-in fade-in duration-500"
        />
      )}

      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col relative z-10">
        {isLoadingMessages && conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-5 h-5 border-2 border-slate-300 dark:border-[#a1a1aa]/50 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-[#8080a0]">Loading conversation...</p>
          </div>
        ) : isMessagesError && conversationId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs text-center">
              Failed to load conversation messages. Please try refreshing.
            </div>
          </div>
        ) : !hasMessages && !isCurrentConvStreaming ? (
          /* Clean Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-3 sm:px-6 py-8 sm:py-16 space-y-5 sm:space-y-6 my-auto select-none max-w-2xl mx-auto w-full relative z-10">
            {/* NexaMind Mind Icon Badge */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="relative flex items-center justify-center">
                {/* Glow ring in light and dark */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-cyan-500/20 blur-xl opacity-70 group-hover:opacity-100 transition duration-500" />
                <div className="relative h-16 w-16 rounded-2xl bg-white/95 dark:bg-gradient-to-br dark:from-[#1e1b4b]/80 dark:via-[#16143c]/80 dark:to-[#0c0b1e]/90 backdrop-blur-xl border border-slate-200/90 dark:border-cyan-400/40 flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(99,102,241,0.15)] dark:shadow-2xl dark:shadow-cyan-950/70 ring-4 ring-indigo-50 dark:ring-cyan-500/20 group transition-all duration-300 hover:scale-105 hover:border-indigo-400/50 dark:hover:border-cyan-300">
                  <NexaMindIcon className="w-9 h-9" />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2.5 max-w-lg">
              <h2 className="text-2xl sm:text-[34px] md:text-[38px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                What can I help with today?
              </h2>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-200 font-medium leading-relaxed">
                Ask a question, analyze ideas, or run an autonomous task
              </p>
            </div>

            {/* Starter Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-lg pt-2">
              {[
                { title: "Calculate 1542 * 38 using calculator", isCalc: true },
                { title: "Explain quantum computing in simple terms" },
                { title: "Write a clean React hook with TypeScript" },
                { title: "Help me brainstorm creative ideas" },
              ].map(({ title: promptText, isCalc }) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => {
                    if (isCalc) {
                      setAgentMode(true);
                      if (conversationId) {
                        setStoredAgentMode(conversationId, true);
                      }
                    }
                    handleSendMessage(promptText);
                  }}
                  className="group relative flex items-center justify-between gap-3 text-left p-4 rounded-2xl bg-white/85 dark:bg-[#1e1e28]/75 backdrop-blur-xl hover:bg-white dark:hover:bg-[#24242f]/90 border border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-400/60 dark:hover:border-cyan-400/30 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_-4px_rgba(99,102,241,0.12)] dark:hover:shadow-cyan-950/20 transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-sm text-slate-800 dark:text-white group-hover:text-slate-950 dark:group-hover:text-white leading-relaxed font-semibold">
                    {promptText}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/[0.06] group-hover:bg-indigo-500/10 dark:group-hover:bg-cyan-400/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <span className="text-xs text-slate-600 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors font-bold">
                      ↗
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        ) : (
          /* Natural message stream (~768-800px width like ChatGPT) */
          <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8">
            {activeMessages.map((msg) => {
              const isUser = msg.role === "USER";
              const versionInfo = versionMap.get(msg._id);

              return isUser ? (
                <div key={msg._id} className="group/msg flex flex-col items-end gap-1.5 animate-in fade-in duration-150">
                  {editingMessageId === msg._id ? (
                    <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-[20px] bg-[#1e1e28] border border-violet-500/40 p-3.5 shadow-xl shadow-black/50 space-y-2.5 animate-in fade-in">
                      <textarea
                        value={editInputContent}
                        onChange={(e) => setEditInputContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitEdit(msg._id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        rows={Math.max(2, Math.min(8, editInputContent.split("\n").length))}
                        className="w-full resize-none bg-transparent text-[15px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none leading-relaxed"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-black dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitEdit(msg._id)}
                          disabled={!editInputContent.trim()}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                        >
                          Save & Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 max-w-full">
                      {!isArchived && !isCurrentConvStreaming && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-[#8080a0] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                          title="Edit message and regenerate response"
                          aria-label="Edit message"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <div className="max-w-[85%] sm:max-w-[70%] rounded-[22px] bg-[#252535] text-[#f0f0f8] border border-violet-500/[0.12] px-5 py-3 text-[15px] break-words whitespace-pre-wrap leading-relaxed shadow-sm">
                        {msg.attachment?.secureUrl && (
                          isDocumentAttachment(msg.attachment) ? (
                            <a
                              href={msg.attachment.secureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-2.5 rounded-xl p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] flex items-center gap-3 max-w-sm transition-colors text-inherit no-underline group/doc select-none"
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 flex flex-col items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white/90 truncate group-hover/doc:text-violet-300 transition-colors">
                                  {msg.attachment.originalName}
                                </p>
                                <p className="text-[11px] text-white/50 mt-0.5">
                                  {(msg.attachment.format || msg.attachment.originalName.split(".").pop() || "doc").toUpperCase()} •{" "}
                                  {msg.attachment.size > 1024 * 1024
                                    ? `${(msg.attachment.size / (1024 * 1024)).toFixed(2)} MB`
                                    : `${(msg.attachment.size / 1024).toFixed(1)} KB`}
                                </p>
                              </div>
                              <svg className="w-4 h-4 text-white/40 group-hover/doc:text-white/80 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <div
                              className="mb-2.5 rounded-xl overflow-hidden max-w-sm border border-white/[0.1] bg-black/40 group/img relative cursor-pointer select-none"
                              onClick={() => setPreviewModalImage({ url: msg.attachment!.secureUrl, name: msg.attachment!.originalName })}
                            >
                              <img
                                src={msg.attachment.secureUrl}
                                alt={msg.attachment.originalName || "Attached image"}
                                className="w-full max-h-64 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.01]"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                <span className="bg-black/75 backdrop-blur-sm text-white/90 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                  Click to preview
                                </span>
                              </div>
                            </div>
                          )
                        )}
                        {msg.content}
                      </div>
                    </div>
                  )}

                  {/* Version Navigation Pill */}
                  {versionInfo && versionInfo.versions.length > 1 && editingMessageId !== msg._id && (
                    <div className="flex items-center gap-1.5 text-xs text-[#8080a8] select-none pr-1">
                      <button
                        type="button"
                        disabled={versionInfo.currentIndex === 0 || isCurrentConvStreaming}
                        onClick={() => {
                          const prevVersion = versionInfo.versions[versionInfo.currentIndex - 1];
                          if (prevVersion) handleSwitchVersion(prevVersion);
                        }}
                        className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors text-sm font-bold"
                        title="Previous version"
                        aria-label="Previous version"
                      >
                        ‹
                      </button>
                      <span className="text-[11px] font-mono text-[#a0a0b8]">
                        {versionInfo.currentIndex + 1} / {versionInfo.versions.length}
                      </span>
                      <button
                        type="button"
                        disabled={versionInfo.currentIndex === versionInfo.versions.length - 1 || isCurrentConvStreaming}
                        onClick={() => {
                          const nextVersion = versionInfo.versions[versionInfo.currentIndex + 1];
                          if (nextVersion) handleSwitchVersion(nextVersion);
                        }}
                        className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors text-sm font-bold"
                        title="Next version"
                        aria-label="Next version"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div key={msg._id} className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e1b4b] via-[#16143c] to-[#0c0b1e] border border-violet-500/30 text-white flex-shrink-0 mt-0.5 shadow-sm shadow-violet-950/40">
                    <NexaMindIcon className="w-4 h-4" showGlow={false} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                    <MarkdownMessage content={msg.content} sources={msg.sources} />
                    <MessageSources sources={msg.sources} onSourceClick={handleSourceClick} />

                    {/* Assistant Message Voice Controls (TTS - Step 4) */}
                    {speechSynthesizer.isSupported && msg.content && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {speechSynthesizer.speakingMessageId === msg._id ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs shadow-sm">
                            {/* Animated sound wave bars */}
                            <span className="flex items-center gap-0.5 h-3 px-0.5" aria-hidden="true">
                              <span
                                className={`w-0.5 bg-violet-400 rounded-full transition-all ${
                                  speechSynthesizer.speechState === "speaking" ? "h-3 animate-pulse" : "h-1.5"
                                }`}
                              />
                              <span
                                className={`w-0.5 bg-violet-400 rounded-full transition-all ${
                                  speechSynthesizer.speechState === "speaking" ? "h-2 animate-pulse delay-75" : "h-2"
                                }`}
                              />
                              <span
                                className={`w-0.5 bg-violet-400 rounded-full transition-all ${
                                  speechSynthesizer.speechState === "speaking" ? "h-3 animate-pulse delay-150" : "h-1"
                                }`}
                              />
                            </span>

                            <span className="text-[11px] font-medium text-violet-200">
                              {speechSynthesizer.speechState === "speaking" ? "Speaking" : "Paused"}
                            </span>

                            {/* Pause / Resume button */}
                            {speechSynthesizer.speechState === "speaking" ? (
                              <button
                                type="button"
                                onClick={speechSynthesizer.pause}
                                title="Pause read aloud"
                                aria-label="Pause read aloud"
                                className="p-1 rounded-full hover:bg-violet-500/25 text-violet-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={speechSynthesizer.resume}
                                title="Resume read aloud"
                                aria-label="Resume read aloud"
                                className="p-1 rounded-full hover:bg-violet-500/25 text-violet-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                            )}

                            {/* Stop button */}
                            <button
                              type="button"
                              onClick={speechSynthesizer.stop}
                              title="Stop read aloud"
                              aria-label="Stop read aloud"
                              className="p-1 rounded-full hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="1.5" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => speechSynthesizer.speak(msg._id, msg.content)}
                            title="Read aloud"
                            aria-label="Read aloud response"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-slate-500 dark:text-[#8080a8] hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                              />
                            </svg>
                            <span>Read aloud</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Optimistic Pending User Message */}
            {visibleOptimisticMessages.map((msg) => (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-[24px] bg-[#252535] text-[#e8e8f0] border border-violet-500/[0.1] px-5 py-3 text-[15px] break-words whitespace-pre-wrap leading-relaxed opacity-80">
                  {(msg.attachmentPreviewUrl || msg.attachmentName) && (
                    msg.attachmentType === "DOCUMENT" ||
                    (msg.attachmentName && ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => msg.attachmentName!.toLowerCase().endsWith(ext))) ? (
                      <div className="mb-2.5 rounded-xl p-3 bg-white/[0.04] border border-white/[0.1] flex items-center gap-3 max-w-sm">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/30 flex flex-col items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/90 truncate">
                            {msg.attachmentName || "Attached document"}
                          </p>
                          <p className="text-[11px] text-white/50 mt-0.5">
                            {(msg.attachmentName?.split(".").pop() || "doc").toUpperCase()}
                            {msg.attachmentSize ? ` • ${(msg.attachmentSize > 1024 * 1024 ? `${(msg.attachmentSize / (1024 * 1024)).toFixed(2)} MB` : `${(msg.attachmentSize / 1024).toFixed(1)} KB`)}` : ""}
                          </p>
                        </div>
                      </div>
                    ) : (
                      msg.attachmentPreviewUrl ? (
                        <div
                          className="mb-2.5 rounded-xl overflow-hidden max-w-sm border border-white/[0.1] bg-black/40 relative cursor-pointer select-none"
                          onClick={() => setPreviewModalImage({ url: msg.attachmentPreviewUrl!, name: msg.attachmentName || "Attached image" })}
                        >
                          <img
                            src={msg.attachmentPreviewUrl}
                            alt={msg.attachmentName || "Attached image"}
                            className="w-full max-h-64 object-cover rounded-xl"
                          />
                        </div>
                      ) : null
                    )
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Progressive Streaming Assistant Message */}
            {isCurrentConvStreaming && currentStream && (
              <div className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e1b4b] via-[#16143c] to-[#0c0b1e] border border-violet-500/30 text-white flex-shrink-0 mt-0.5 shadow-sm shadow-violet-950/30 animate-pulse">
                  <NexaMindIcon className="w-4 h-4" showGlow={false} />
                </div>

                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                  {/* Tool Status UI for Agent Execution & Tool Calling */}
                  {(currentStream.plan || currentStream.agentStatusText || currentStream.toolStatuses.length > 0) && (
                      <div className="rounded-xl bg-[#1e1e28] border border-white/[0.09] p-3.5 text-xs font-mono select-none space-y-2 shadow-sm max-w-md">
                        {/* Plan preview with step status icons */}
                        {currentStream.plan && currentStream.plan.steps.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                              Plan
                            </div>
                            {currentStream.plan.steps.map((step, idx) => (
                              <div key={step.id || idx} className="flex items-center gap-2 text-xs">
                                {step.status === "completed" ? (
                                  <span className="text-emerald-400 font-bold">✓</span>
                                ) : step.status === "running" ? (
                                  <span className="text-amber-400 font-bold animate-pulse">●</span>
                                ) : step.status === "failed" ? (
                                  <span className="text-rose-400 font-bold">✕</span>
                                ) : (
                                  <span className="text-neutral-500">○</span>
                                )}
                                <span
                                  className={
                                    step.status === "completed"
                                      ? "text-neutral-300"
                                      : step.status === "running"
                                      ? "text-white font-medium"
                                      : step.status === "failed"
                                      ? "text-rose-300"
                                      : "text-neutral-400"
                                  }
                                >
                                  {idx + 1}. {step.title}
                                </span>
                                {step.error && (
                                  <span className="text-rose-400/80 text-[10px]" title={step.error}>
                                    ({step.error})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {/* Fallback status line: Working... */}
                            {currentStream.agentStatusText && !currentStream.toolStatuses.length && (
                              <div className="flex items-center gap-2 text-[#ececec]">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                <span>{currentStream.agentStatusText}</span>
                              </div>
                            )}

                            {/* Fallback tool status events */}
                            {currentStream.toolStatuses.map((toolItem) => {
                              const isFailedWebSearch =
                                toolItem.status === "failed" &&
                                toolItem.tool === "web_search";
                              return (
                                <div
                                  key={toolItem.id}
                                  className="flex items-center gap-2"
                                  title={
                                    isFailedWebSearch
                                      ? "Real-time web search was unavailable; answering from available knowledge."
                                      : undefined
                                  }
                                >
                                  {toolItem.status === "running" ? (
                                    <>
                                      <span className="text-amber-400">🔧</span>
                                      <span className="text-[#ececec] font-medium">{toolItem.tool}</span>
                                      <span className="text-[#8e8e8e]">— running</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" />
                                    </>
                                  ) : toolItem.status === "completed" ? (
                                    <>
                                      <span className="text-emerald-400 font-bold">✓</span>
                                      <span className="text-[#ececec] font-medium">{toolItem.tool}</span>
                                      <span className="text-[#8e8e8e]">
                                        — completed{typeof toolItem.durationMs === "number" && toolItem.durationMs > 0 ? ` (${toolItem.durationMs}ms)` : ""}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-rose-400 font-bold">✕</span>
                                      <span className="text-[#ececec] font-medium">{toolItem.tool}</span>
                                      <span className="text-rose-400/80" title={toolItem.error}>
                                        — failed{toolItem.error ? `: ${toolItem.error}` : ""}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}

                        {/* Status line: Generating response... */}
                        {currentStream.agentStatusText === "Generating response..." && (
                          <div className="flex items-center gap-2 text-indigo-300 pt-1 border-t border-white/[0.06]">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span>Generating response...</span>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Progressive Streamed Text Content */}
                  {currentStream.streamingContent ? (
                    <div className="relative">
                      <MarkdownMessage content={currentStream.streamingContent} sources={currentStream.sources} />
                      <MessageSources sources={currentStream.sources} onSourceClick={handleSourceClick} />
                    </div>
                  ) : (
                    currentStream.type === "chat" && (
                      <div className="flex items-center gap-1.5 py-1 px-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce" />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Prominent Stop Pill (Floating above composer) */}
      {isCurrentConvStreaming && (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex justify-center mb-2 flex-shrink-0 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => handleStopGenerating(conversationId)}
            className="px-4 py-1.5 rounded-full bg-[#1e1e28] hover:bg-[#26263a] border border-white/[0.12] text-sm text-[#c0c0e0] font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer select-none"
          >
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#ececec]" />
            {currentStream?.type === "agent" ? "Stop Agent" : "Stop generating"}
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mb-2 flex-shrink-0">
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between animate-in fade-in shadow-sm">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white ml-2 cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Archived Conversation Banner */}
      {isArchived && (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mb-2 flex-shrink-0">
          <div className="rounded-xl bg-[#1e1e28] border border-white/[0.09] px-4 py-3 text-xs text-[#c8c8e0] flex items-center justify-between animate-in fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#8e8e8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <span>This conversation is archived and read-only.</span>
            </div>
            <button
              type="button"
              onClick={() => unarchiveMutation.mutate(conversationId!)}
              disabled={unarchiveMutation.isPending}
              className="text-xs px-2.5 py-1 rounded bg-white/[0.1] hover:bg-white/[0.15] text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {unarchiveMutation.isPending ? "Unarchiving..." : "Unarchive"}
            </button>
          </div>
        </div>
      )}

      {/* Prominent Bottom Chat Composer */}
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 pb-3 sm:pb-7 pt-1 sm:pt-2 flex-shrink-0 relative z-10">
        <div className="chat-composer-box relative rounded-[26px] bg-white dark:bg-[#1d1d25] border border-slate-200/90 dark:border-white/[0.14] focus-within:border-indigo-500/50 dark:focus-within:border-violet-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:focus-within:ring-violet-500/20 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.07)] dark:shadow-xl dark:shadow-black/50 backdrop-blur-xl transition-all duration-200 p-2 sm:p-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-1.5"
          >
            {/* Local Attachment Preview (Image or Document) */}
            {selectedFile && (
              <div className="relative mx-1.5 mb-1 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                {fileCategory === "image" && filePreviewUrl ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-black/40 border border-slate-300 dark:border-white/[0.08]">
                    <img
                      src={filePreviewUrl}
                      alt={selectedFile.name}
                      className="w-full h-full object-cover"
                    />
                    {isUploadingAttachment && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/20 dark:from-violet-600/30 dark:to-indigo-600/20 border border-indigo-200/60 dark:border-violet-500/30 flex flex-col items-center justify-center flex-shrink-0">
                    {isUploadingAttachment ? (
                      <svg className="animate-spin h-5 w-5 text-indigo-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-indigo-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-violet-200 mt-0.5 uppercase tracking-wider">
                          {selectedFile.name.split(".").pop() || "doc"}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-[#e0e0f0] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#707090] mt-0.5">
                    <span className="uppercase font-semibold text-slate-400 dark:text-white/50">
                      {selectedFile.name.split(".").pop() || "file"}
                    </span>
                    {" • "}
                    {selectedFile.size > 1024 * 1024
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                    {isUploadingAttachment && typeof uploadProgress === "number" && ` • Uploading ${uploadProgress}%`}
                  </p>
                  {isUploadingAttachment && typeof uploadProgress === "number" && (
                    <div className="w-full bg-slate-200 dark:bg-white/[0.1] h-1 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-violet-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {!isUploadingAttachment && (
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    title="Remove attachment"
                    aria-label="Remove attachment"
                    className="h-6 w-6 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.16] text-slate-500 hover:text-slate-800 dark:text-[#a0a0c0] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Local Audio Recording Preview & Transcription (Step 2) */}
            {voiceRecorder.recording && (
              <div className="relative mx-1.5 mb-1 p-2.5 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2.5 sm:gap-3 w-full">
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/15 to-violet-500/20 dark:from-rose-500/25 dark:to-violet-600/30 border border-rose-300/50 dark:border-rose-400/30 flex items-center justify-center flex-shrink-0 text-rose-500 dark:text-rose-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-[#e0e0f0]">
                        Voice Recording
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                        Local audio
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#707090] mt-0.5">
                      <span>{formatVoiceDuration(voiceRecorder.recording.durationSeconds)}</span>
                      {" • "}
                      <span>{(voiceRecorder.recording.sizeBytes / 1024).toFixed(1)} KB</span>
                    </p>
                  </div>

                  <audio
                    src={voiceRecorder.recording.url}
                    controls
                    className="h-7 max-w-[140px] sm:max-w-[200px]"
                  />

                  {/* Transcribe / Retry Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      await voiceRecorder.transcribeRecording();
                    }}
                    disabled={voiceRecorder.isTranscribing}
                    title="Transcribe speech to text using Groq Whisper"
                    aria-label="Transcribe audio"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                  >
                    {voiceRecorder.isTranscribing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Retry</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={voiceRecorder.discardRecording}
                    title="Discard recording"
                    aria-label="Discard recording"
                    className="h-6 w-6 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.16] text-slate-500 hover:text-rose-600 dark:text-[#a0a0c0] dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Transcribed Text Preview */}
                {voiceRecorder.transcriptionText && (
                  <div className="w-full pt-2 border-t border-slate-200/70 dark:border-white/[0.08] flex items-start justify-between gap-3 animate-in fade-in">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-violet-400">
                        Transcript:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 line-clamp-2">
                        {voiceRecorder.transcriptionText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInputValue((prev) =>
                          prev.trim() ? `${prev.trim()} ${voiceRecorder.transcriptionText}` : voiceRecorder.transcriptionText!
                        );
                        inputRef.current?.focus();
                      }}
                      title="Insert transcript into message input"
                      className="text-[11px] font-medium text-indigo-600 dark:text-violet-300 hover:underline flex-shrink-0 cursor-pointer pt-0.5"
                    >
                      Insert into input
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Voice Recording Error Banner */}
            {voiceRecorder.error && (
              <div className="mx-1.5 mb-1 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="truncate">{voiceRecorder.error}</span>
                </div>
                <button
                  type="button"
                  onClick={voiceRecorder.clearError}
                  className="text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white ml-2 text-xs cursor-pointer font-bold flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-2">
              {isVoiceMode ? (
                /* Voice Mode Interactive Panel (Step 5) */
                <div className="flex-1 min-h-[48px] flex items-center justify-between px-3.5 py-2 rounded-2xl bg-gradient-to-r from-violet-950/30 via-slate-900/40 to-violet-950/30 dark:from-[#1b1736] dark:via-[#141228] dark:to-[#10101c] border border-violet-500/30 shadow-md shadow-violet-950/20 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {voiceModeState === "listening" ? (
                      <>
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-rose-500 dark:text-rose-400">Listening...</span>
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                              {formatVoiceDuration(voiceRecorder.durationSeconds)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Speak your message</p>
                        </div>
                      </>
                    ) : voiceModeState === "transcribing" ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-indigo-400">Transcribing...</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Converting speech to text</p>
                        </div>
                      </>
                    ) : voiceModeState === "thinking" ? (
                      <>
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 flex-shrink-0 animate-pulse">
                          <span className="text-[10px] font-bold">⚡</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-violet-300">
                            {currentStream?.agentStatusText || "Thinking..."}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Generating answer</p>
                        </div>
                      </>
                    ) : voiceModeState === "speaking" ? (
                      <div
                        onClick={handleVoiceInterruption}
                        role="button"
                        tabIndex={0}
                        title="Click or tap to interrupt and speak"
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer group select-none py-0.5 -my-0.5 rounded-lg hover:opacity-90 transition-opacity"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleVoiceInterruption();
                          }
                        }}
                      >
                        <span className="flex items-center gap-0.5 h-3.5 px-0.5" aria-hidden="true">
                          <span className="w-0.5 bg-emerald-400 rounded-full h-3.5 animate-pulse" />
                          <span className="w-0.5 bg-emerald-400 rounded-full h-2 animate-pulse delay-75" />
                          <span className="w-0.5 bg-emerald-400 rounded-full h-3 animate-pulse delay-150" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-400">Speaking...</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 group-hover:text-rose-400 dark:group-hover:text-rose-300 font-semibold transition-colors flex items-center gap-0.5">
                              <span>🎙</span>
                              <span>Tap to interrupt</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Reading AI response</p>
                        </div>
                      </div>
                    ) : voiceModeState === "error" ? (
                      <>
                        <span className="text-amber-400 text-xs flex-shrink-0">⚠️</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-amber-400">Voice Error</span>
                          <p className="text-[11px] text-amber-300/80 truncate max-w-[200px] sm:max-w-xs">
                            {voiceModeError || "Operation failed"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 flex-shrink-0">
                          <span className="text-[10px] font-bold">🎙</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Voice Mode Ready</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Tap to speak again</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {voiceModeState === "listening" ? (
                      <>
                        <button
                          type="button"
                          onClick={exitVoiceMode}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={voiceRecorder.stopRecording}
                          className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span className="w-2 h-2 rounded-sm bg-white" />
                          <span>Done</span>
                        </button>
                      </>
                    ) : voiceModeState === "transcribing" ? (
                      <button
                        type="button"
                        onClick={exitVoiceMode}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    ) : voiceModeState === "thinking" ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleStopGenerating(conversationId);
                          setVoiceModeState("idle");
                        }}
                        className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Stop
                      </button>
                    ) : voiceModeState === "speaking" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleVoiceInterruption}
                          title="Interrupt and speak"
                          aria-label="Interrupt response and speak"
                          className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>Interrupt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            speechSynthesizer.stop();
                            setVoiceModeState("idle");
                          }}
                          className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                          title="Stop speaking"
                        >
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={exitVoiceMode}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-white font-medium transition-colors cursor-pointer"
                          title="Exit Voice Mode"
                        >
                          Exit
                        </button>
                      </>
                    ) : voiceModeState === "error" ? (
                      <>
                        <button
                          type="button"
                          onClick={startVoiceMode}
                          className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={exitVoiceMode}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-white font-medium transition-colors cursor-pointer"
                        >
                          Exit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={startVoiceMode}
                          className="px-3 py-1 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span>🎙</span>
                          <span>Speak</span>
                        </button>
                        <button
                          type="button"
                          onClick={exitVoiceMode}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer"
                        >
                          Exit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Attachment Input & Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,text/plain,.txt,text/markdown,.md,application/json,.json,text/csv,.csv,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isSubmitting || isUploadingAttachment || isCurrentConvStreaming || isArchived || voiceRecorder.state === "recording" || voiceRecorder.state === "stopping" || voiceRecorder.isTranscribing}
                  />
                  <button
                    type="button"
                    onClick={handleAttachmentClick}
                    disabled={isSubmitting || isUploadingAttachment || isCurrentConvStreaming || isArchived || voiceRecorder.state === "recording" || voiceRecorder.state === "stopping" || voiceRecorder.isTranscribing}
                    title="Attach file (Images up to 10MB, DOCX, PDF, TXT, MD, JSON, CSV up to 5MB)"
                    aria-label="Attach file"
                    className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8080a8] dark:hover:text-white dark:hover:bg-white/[0.08] transition-all mb-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>

                  {/* Textarea or Active Recording / Transcribing Bar */}
                  {voiceRecorder.state === "recording" ? (
                    <div className="flex-1 min-h-[40px] flex items-center justify-between px-3.5 py-1.5 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 rounded-2xl animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                          Recording
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-white px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                          {formatVoiceDuration(voiceRecorder.durationSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={voiceRecorder.discardRecording}
                          title="Discard recording"
                          aria-label="Discard recording"
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={voiceRecorder.stopRecording}
                          title="Stop recording"
                          aria-label="Stop recording"
                          className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <span className="w-2 h-2 rounded-sm bg-white" />
                          <span>Stop</span>
                        </button>
                      </div>
                    </div>
                  ) : voiceRecorder.state === "stopping" || voiceRecorder.state === "transcribing" || voiceRecorder.isTranscribing ? (
                    <div className="flex-1 min-h-[40px] flex items-center justify-between px-3.5 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 rounded-2xl animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>
                          {voiceRecorder.state === "stopping"
                            ? "Processing audio recording..."
                            : "Transcribing speech to text..."}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={voiceRecorder.discardRecording}
                        title="Cancel transcription"
                        aria-label="Cancel transcription"
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputValue}
                      onChange={handleTextareaInput}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isArchived
                          ? "Conversation is archived"
                          : isUploadingAttachment
                            ? `Uploading ${fileCategory === "document" ? "document" : "image"}...`
                            : agentMode
                              ? "Assign an agent task (e.g. calculate 45 * 82)..."
                              : "Message NexaMind..."
                      }
                      disabled={isSubmitting || isUploadingAttachment || isCurrentConvStreaming || isArchived}
                      className="flex-1 max-h-48 min-h-[40px] resize-none bg-transparent px-3.5 py-2 text-[15px] text-black dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none disabled:opacity-50 leading-relaxed font-normal"
                    />
                  )}

                  {/* Microphone Recording Button */}
                  {voiceRecorder.state !== "recording" && voiceRecorder.state !== "stopping" && !voiceRecorder.isTranscribing && (
                    <button
                      type="button"
                      onClick={voiceRecorder.startRecording}
                      disabled={
                        isSubmitting ||
                        isUploadingAttachment ||
                        isCurrentConvStreaming ||
                        isArchived ||
                        voiceRecorder.isTranscribing ||
                        !voiceRecorder.isSupported
                      }
                      title={
                        !voiceRecorder.isSupported
                          ? "Microphone recording is not supported in this browser"
                          : voiceRecorder.state === "requesting_permission"
                          ? "Requesting microphone permission..."
                          : "Record voice message"
                      }
                      aria-label="Record voice message"
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all mb-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${
                        voiceRecorder.state === "requesting_permission"
                          ? "text-amber-500 bg-amber-500/10 animate-pulse"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-[#8080a8] dark:hover:text-white dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {voiceRecorder.state === "requesting_permission" ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Send or Stop Generation Button */}
                  {isCurrentConvStreaming ? (
                    <button
                      type="button"
                      onClick={() => handleStopGenerating(conversationId)}
                      aria-label={currentStream?.type === "agent" ? "Stop Agent" : "Stop generating"}
                      className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 flex items-center justify-center transition-all mb-0.5 cursor-pointer shadow-sm active:scale-95"
                      title={currentStream?.type === "agent" ? "Stop Agent" : "Stop generating"}
                    >
                      <span className="w-2.5 h-2.5 rounded-[2px] bg-white dark:bg-black" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        isUploadingAttachment ||
                        isCurrentConvStreaming ||
                        isArchived ||
                        voiceRecorder.state === "recording" ||
                        voiceRecorder.state === "stopping" ||
                        voiceRecorder.isTranscribing ||
                        (!inputValue.trim() && !selectedFile)
                      }
                      aria-label="Send message"
                      className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:disabled:bg-[#323236] dark:disabled:text-[#71717a] flex items-center justify-center transition-all mb-0.5 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-sm"
                    >
                      {isSubmitting || isUploadingAttachment ? (
                        <svg className="animate-spin h-3.5 w-3.5 text-white dark:text-black" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Mode Toolbar: Agent Mode & Voice Mode Toggles */}
            <div className="flex items-center justify-between px-2 pt-1.5 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAgentMode((prev) => {
                      const next = !prev;
                      if (conversationId) {
                        setStoredAgentMode(conversationId, next);
                      }
                      return next;
                    });
                  }}
                  disabled={isCurrentConvStreaming || isArchived}
                  title={agentMode ? "Switch to standard Chat" : "Switch to Agent Mode (with tools)"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    agentMode
                      ? "bg-indigo-50 dark:bg-violet-500/25 text-indigo-700 dark:text-violet-200 border border-indigo-200/80 dark:border-violet-400/40 shadow-sm shadow-indigo-500/10 font-bold"
                      : "bg-slate-100/90 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.12] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.12]"
                  }`}
                >
                  <span className="text-xs">{agentMode ? "⚡" : "⚙"}</span>
                  <span>Agent {agentMode ? "On" : "Off"}</span>
                </button>

                {/* Voice Mode Toggle Button (Step 5) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isVoiceMode) {
                      exitVoiceMode();
                    } else {
                      startVoiceMode();
                    }
                  }}
                  disabled={isCurrentConvStreaming || isArchived}
                  title={isVoiceMode ? "Exit Voice Mode" : "Start Voice Mode"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    isVoiceMode
                      ? "bg-rose-50 dark:bg-rose-500/25 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-400/40 shadow-sm shadow-rose-500/15 font-bold"
                      : "bg-slate-100/90 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.12] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.12]"
                  }`}
                >
                  <span className="text-xs">{isVoiceMode ? "🔴" : "🎙"}</span>
                  <span>Voice Mode {isVoiceMode ? "On" : "Off"}</span>
                </button>
              </div>

              <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-200 select-none font-semibold truncate ml-2">
                {agentMode ? (
                  <>
                    <span className="hidden sm:inline">Autonomous tool execution enabled</span>
                    <span className="sm:hidden">Autonomous tools</span>
                  </>
                ) : (
                  "1 credit per query"
                )}
              </span>
            </div>
          </form>
        </div>
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 select-none font-medium">
          NexaMind can make mistakes. Verify important info.
        </p>
      </div>

      {/* Image Preview Lightbox Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPreviewModalImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 text-white/80">
              <span className="text-sm font-medium truncate max-w-md">
                {previewModalImage.name || "Image Preview"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewModalImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors"
                  title="Open full image in new tab"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                  title="Close preview (Esc)"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <img
              src={previewModalImage.url}
              alt={previewModalImage.name || "Enlarged preview"}
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/[0.1] shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
