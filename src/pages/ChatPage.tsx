import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  chatKeys,
  getConversationMessages,
  sendAIChatMessage,
} from '@/features/chat';
import {
  conversationKeys,
  createConversation,
} from '@/features/conversations';
import { usageKeys } from '@/features/usage';
import { memoryKeys } from '@/features/memories';
import { classifyApiError } from '@/lib/utils/error';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import type { Message } from '@/types';

interface PendingMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<PendingMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch real messages for active conversation
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useQuery({
    queryKey: chatKeys.messages(conversationId || ''),
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId,
  });

  const backendMessages: Message[] = messagesData?.data || [];

  // Scroll to bottom on message changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [backendMessages.length, optimisticMessages.length, isSubmitting]);

  // Focus input and reset states when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
    setErrorMessage(null);
    setOptimisticMessages([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [conversationId]);

  // Chat mutation for ongoing session
  const chatMutation = useMutation({
    mutationFn: (content: string) =>
      sendAIChatMessage({
        conversationId: conversationId!,
        content,
      }),
    onSuccess: () => {
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId!) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
    onError: (err: unknown) => {
      const classified = classifyApiError(err, 'Failed to generate AI response. Please try again.');
      setErrorMessage(classified.message);
      setOptimisticMessages([]);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    setInputValue('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const tempUserMsgId = `opt-${Date.now()}`;
    const newPending: PendingMessage[] = [
      {
        id: tempUserMsgId,
        role: 'USER',
        content: text,
        createdAt: new Date().toISOString(),
      },
    ];
    setOptimisticMessages(newPending);

    // Case 1: Active conversation exists
    if (conversationId) {
      chatMutation.mutate(text);
      return;
    }

    // Case 2: Root /app - Create conversation first, then send message
    try {
      const title = text.length > 35 ? `${text.slice(0, 35)}...` : text;
      const createdConv = await createConversation({ title });

      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

      await sendAIChatMessage({
        conversationId: createdConv._id,
        content: text,
      });

      queryClient.invalidateQueries({ queryKey: chatKeys.messages(createdConv._id) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usageKeys.balance() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });

      navigate(`/app/chat/${createdConv._id}`, { replace: true });
    } catch (err: unknown) {
      const classified = classifyApiError(err, 'Failed to start conversation. Please try again.');
      setErrorMessage(classified.message);
      setOptimisticMessages([]);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
  };

  const hasMessages = backendMessages.length > 0 || optimisticMessages.length > 0;

  return (
    <div className="flex h-full flex-col min-h-0 w-full overflow-hidden bg-canvas">
      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {isLoadingMessages && conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading conversation...</p>
          </div>
        ) : isMessagesError && conversationId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              Failed to load conversation messages. Please try refreshing.
            </div>
          </div>
        ) : !hasMessages ? (
          /* Clean, Minimal Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 space-y-3.5 my-auto select-none max-w-4xl mx-auto w-full">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-surface-elevated border border-white/10 shadow-subtle text-brand-400 mb-1">
              <svg
                className="w-7 h-7 text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100">
              How can I help you today?
            </h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Ask questions, analyze concepts, or brainstorm ideas with persistent cognitive recall.
            </p>
          </div>
        ) : (
          /* Natural ChatGPT-style message stream with ~800-900px comfortable width */
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">
            {backendMessages.map((msg) => {
              const isUser = msg.role === 'USER';

              return isUser ? (
                <div key={msg._id} className="flex justify-end animate-in fade-in duration-150">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-[#1a1d29] border border-white/[0.08] px-4 sm:px-5 py-3 text-sm sm:text-[15px] text-slate-100 shadow-subtle break-words whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg._id} className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                  {/* NexaMind Emblem Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-elevated border border-white/10 text-brand-400 flex-shrink-0 mt-0.5 shadow-subtle">
                    <svg
                      className="w-4 h-4 text-brand-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>

                  {/* Clean Markdown Content */}
                  <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                    <div className="text-xs font-semibold tracking-wide text-slate-300 select-none">
                      NexaMind
                    </div>
                    <MarkdownMessage content={msg.content} />
                  </div>
                </div>
              );
            })}

            {/* Optimistic Pending User Message */}
            {optimisticMessages.map((msg) => (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-[#1a1d29] border border-white/[0.08] px-4 sm:px-5 py-3 text-sm sm:text-[15px] text-slate-100 shadow-subtle break-words whitespace-pre-wrap leading-relaxed opacity-85">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Subtle Assistant Typing Indicator */}
            {isSubmitting && (
              <div className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-elevated border border-white/10 text-brand-400 flex-shrink-0 mt-0.5 shadow-subtle">
                  <svg
                    className="w-4 h-4 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                  <div className="text-xs font-semibold tracking-wide text-slate-300 select-none">
                    NexaMind
                  </div>
                  <div className="flex items-center gap-1.5 py-2 px-0.5">
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-2 flex-shrink-0">
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 ml-2 cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Prominent Bottom Chat Composer (~800-900px wide, centered) */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-1 flex-shrink-0">
        <div className="relative rounded-2xl sm:rounded-3xl bg-surface-elevated/90 backdrop-blur-md border border-white/10 shadow-elevated focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 p-2.5 sm:p-3"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Message NexaMind..."
              disabled={isSubmitting}
              className="flex-1 max-h-48 min-h-[34px] resize-none bg-transparent px-3 py-1.5 text-sm sm:text-[15px] text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50 leading-relaxed"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputValue.trim()}
              aria-label="Send message"
              className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-25 disabled:hover:bg-brand-600 text-white flex items-center justify-center transition-all shadow-subtle mb-0.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </form>
        </div>
        <p className="text-[11px] text-center text-slate-400 mt-2 select-none">
          1 credit per query • NexaMind can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};


