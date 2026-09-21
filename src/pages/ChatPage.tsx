import React, { useState, useRef, useEffect } from "react";
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
import { classifyApiError } from "@/lib/utils/error";
import { generateConversationTitle } from "@/lib/utils/title";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import type { Message, Conversation, ToolStatusEvent, PaginatedResponse } from "@/types";

interface PendingMessage {
  id: string;
  conversationId?: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface ToolStatusItem {
  id: string;
  tool: string;
  status: "running" | "completed" | "failed";
  error?: string;
}

export interface ConversationStreamState {
  type: "chat" | "agent";
  streamingContent: string;
  agentStatusText?: string;
  toolStatuses: ToolStatusItem[];
}

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentMode, setAgentMode] = useState<boolean>(false);
  const [streamingMap, setStreamingMap] = useState<Record<string, ConversationStreamState>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<PendingMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

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

  // Scoped active stream for the current conversation
  const currentStream = conversationId ? streamingMap[conversationId] : null;
  const isCurrentConvStreaming = !!currentStream;

  // Scroll to bottom on message changes or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    backendMessages.length,
    visibleOptimisticMessages.length,
    isSubmitting,
    isCurrentConvStreaming,
    currentStream?.streamingContent,
    currentStream?.agentStatusText,
    currentStream?.toolStatuses.length,
  ]);

  // Focus input and reset view states when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
    setErrorMessage(null);
    setIsSubmitting(false);
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

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSubmitting || isCurrentConvStreaming || isArchived) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    setInputValue("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    let targetConvId = conversationId;

    // Root /app: Create conversation first with deterministic title
    if (!targetConvId) {
      try {
        const title = generateConversationTitle(text);
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
        navigate(`/app/chat/${targetConvId}`, { replace: true });
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

    const tempUserMsgId = `opt-${Date.now()}`;
    const newPending: PendingMessage = {
      id: tempUserMsgId,
      conversationId: targetConvId,
      role: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages((prev) => [...prev, newPending]);

    // Check if user requested Agent mode (via state toggle or /agent or @agent prefix)
    const isAgentCommand = text.startsWith("/agent ") || text.startsWith("@agent ");
    const effectiveTask = isAgentCommand ? text.replace(/^(\/agent|@agent)\s+/, "") : text;
    const isAgentRun = agentMode || isAgentCommand;

    // Initialize scoped streaming state for this conversation
    setIsSubmitting(false);
    setStreamingMap((prev) => ({
      ...prev,
      [targetConvId]: {
        type: isAgentRun ? "agent" : "chat",
        streamingContent: "",
        agentStatusText: isAgentRun ? "Working..." : undefined,
        toolStatuses: [],
      },
    }));

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
            onDone: async () => {
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
            },
            onError: (err) => {
              if (abortController.signal.aborted) return;
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
      try {
        await streamAIChatMessage(
          {
            conversationId: targetConvId,
            content: text,
          },
          {
            onStart: () => {},
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
                  model: result.assistantMessage.model ?? null,
                  provider: result.assistantMessage.provider ?? null,
                  usage: result.assistantMessage.usage ?? null,
                  createdAt: result.assistantMessage.createdAt,
                  updatedAt: result.assistantMessage.createdAt,
                };

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
            },
            onError: (err) => {
              if (abortController.signal.aborted) return;
              const classified = classifyApiError(
                err,
                "Failed to generate AI response. Please try again.",
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

  const hasMessages =
    backendMessages.length > 0 || visibleOptimisticMessages.length > 0;

  return (
    <div className="flex h-full flex-col min-h-0 w-full overflow-hidden bg-[#16161a] relative">
      {/* Subtle ambient lighting mesh */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_800px_500px_at_50%_-80px,rgba(139,92,246,0.07),transparent_70%)]" />

      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col relative z-10">
        {isLoadingMessages && conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-5 h-5 border-2 border-[#a1a1aa]/50 border-t-violet-500/80 rounded-full animate-spin" />
            <p className="text-sm text-[#8080a0]">Loading conversation...</p>
          </div>
        ) : isMessagesError && conversationId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center">
              Failed to load conversation messages. Please try refreshing.
            </div>
          </div>
        ) : !hasMessages && !isCurrentConvStreaming ? (
          /* Clean Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 space-y-6 my-auto select-none max-w-2xl mx-auto w-full">
            <div className="relative flex items-center justify-center mb-1">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-white/20 flex items-center justify-center text-white shadow-lg shadow-violet-900/40 ring-4 ring-violet-500/10">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-white leading-tight">
                What can I help with today?
              </h2>
              <p className="text-sm sm:text-[15px] text-[#8080a8] font-normal leading-relaxed">
                Ask a question, analyze ideas, or run an autonomous task
              </p>
            </div>

            {/* Starter Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4">
              {[
                "Calculate 1542 * 38 using calculator",
                "Explain quantum computing in simple terms",
                "Write a clean React hook with TypeScript",
                "Help me brainstorm creative ideas",
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => {
                    if (promptText.includes("calculator")) {
                      setAgentMode(true);
                    }
                    handleSendMessage(promptText);
                  }}
                  className="group relative flex items-center justify-between gap-3 text-left p-4 rounded-2xl bg-[#1e1e28]/90 hover:bg-[#24242f] border border-white/[0.1] hover:border-white/[0.2] shadow-sm hover:shadow-lg hover:shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <span className="text-sm text-[#c8c8e0] group-hover:text-white leading-relaxed font-normal">
                    {promptText}
                  </span>
                  <span className="text-sm text-[#6060a0] group-hover:text-white/70 transition-colors flex-shrink-0 opacity-60 group-hover:opacity-100">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Natural message stream (~768-800px width like ChatGPT) */
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-7 sm:space-y-8">
            {backendMessages.map((msg) => {
              const isUser = msg.role === "USER";

              return isUser ? (
                <div key={msg._id} className="flex justify-end animate-in fade-in duration-150">
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-[22px] bg-[#252535] text-[#f0f0f8] border border-violet-500/[0.12] px-5 py-3 text-[15px] break-words whitespace-pre-wrap leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg._id} className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-white/15 text-white flex-shrink-0 mt-0.5 shadow-sm shadow-violet-900/40">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                    <MarkdownMessage content={msg.content} />
                  </div>
                </div>
              );
            })}

            {/* Optimistic Pending User Message */}
            {visibleOptimisticMessages.map((msg) => (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-[24px] bg-[#252535] text-[#e8e8f0] border border-violet-500/[0.1] px-5 py-3 text-[15px] break-words whitespace-pre-wrap leading-relaxed opacity-80">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Progressive Streaming Assistant Message */}
            {isCurrentConvStreaming && currentStream && (
              <div className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-white/15 text-white flex-shrink-0 mt-0.5 shadow-sm shadow-violet-900/30">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                  {/* Tool Status UI for Agent Execution */}
                  {currentStream.type === "agent" &&
                    (currentStream.agentStatusText || currentStream.toolStatuses.length > 0) && (
                      <div className="rounded-xl bg-[#1e1e28] border border-white/[0.09] p-3.5 text-xs font-mono select-none space-y-2 shadow-sm max-w-md">
                        {/* Status line: Working... */}
                        {currentStream.agentStatusText && !currentStream.toolStatuses.length && (
                          <div className="flex items-center gap-2 text-[#ececec]">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span>{currentStream.agentStatusText}</span>
                          </div>
                        )}

                        {/* Tool Status Events */}
                        {currentStream.toolStatuses.map((toolItem) => (
                          <div key={toolItem.id} className="flex items-center gap-2">
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
                                <span className="text-[#8e8e8e]">— completed</span>
                              </>
                            ) : (
                              <>
                                <span className="text-rose-400 font-bold">✕</span>
                                <span className="text-[#ececec] font-medium">{toolItem.tool}</span>
                                <span className="text-rose-400/80">— failed</span>
                              </>
                            )}
                          </div>
                        ))}

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
                      <MarkdownMessage content={currentStream.streamingContent} />
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
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-5 sm:pb-7 pt-2 flex-shrink-0 relative z-10">
        <div className="relative rounded-[26px] bg-[#1d1d25]/98 border border-white/[0.14] focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-200 p-2 sm:p-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-1.5"
          >
            {/* Input Row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  isArchived
                    ? "Conversation is archived"
                    : agentMode
                      ? "Assign an agent task (e.g. calculate 45 * 82)..."
                      : "Message NexaMind..."
                }
                disabled={isSubmitting || isCurrentConvStreaming || isArchived}
                className="flex-1 max-h-48 min-h-[40px] resize-none bg-transparent px-3.5 py-2 text-[15px] text-[#e8e8f0] placeholder-[#60608a] focus:outline-none disabled:opacity-50 leading-relaxed"
              />

              {isCurrentConvStreaming ? (
                <button
                  type="button"
                  onClick={() => handleStopGenerating(conversationId)}
                  aria-label={currentStream?.type === "agent" ? "Stop Agent" : "Stop generating"}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-all mb-0.5 cursor-pointer shadow-sm active:scale-95"
                  title={currentStream?.type === "agent" ? "Stop Agent" : "Stop generating"}
                >
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-black" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isCurrentConvStreaming || isArchived || !inputValue.trim()}
                  aria-label="Send message"
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-[#323236] disabled:text-[#71717a] flex items-center justify-center transition-all mb-0.5 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
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
            </div>

            {/* Mode Toolbar: Agent Mode Toggle */}
            <div className="flex items-center justify-between px-2 pt-1.5 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAgentMode((prev) => !prev)}
                  disabled={isCurrentConvStreaming || isArchived}
                  title={agentMode ? "Switch to standard Chat" : "Switch to Agent Mode (with tools)"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                    agentMode
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/35 shadow-sm shadow-violet-900/20"
                      : "bg-white/[0.05] text-[#8080a8] border border-white/[0.08] hover:text-white hover:bg-white/[0.09]"
                  }`}
                >
                  <span className="text-xs">{agentMode ? "⚡" : "⚙"}</span>
                  <span>Agent {agentMode ? "On" : "Off"}</span>
                </button>
              </div>

              <span className="text-xs text-[#60608a] select-none">
                {agentMode ? "Autonomous tool execution enabled" : "1 credit per query"}
              </span>
            </div>
          </form>
        </div>
        <p className="text-[11px] text-center text-[#50506a] mt-2 select-none">
          NexaMind can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};
