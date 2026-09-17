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
    setIsSubmitting(false);
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

      setOptimisticMessages([]);
      setIsSubmitting(false);
      navigate(`/app/chat/${createdConv._id}`, { replace: true });
    } catch (err: unknown) {
      const classified = classifyApiError(err, 'Failed to start conversation. Please try again.');
      setErrorMessage(classified.message);
      setOptimisticMessages([]);
    } finally {
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
    <div className="flex h-full flex-col min-h-0 w-full overflow-hidden bg-[#212121]">
      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {isLoadingMessages && conversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-[#b4b4b4] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#8e8e8e]">Loading conversation...</p>
          </div>
        ) : isMessagesError && conversationId ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center">
              Failed to load conversation messages. Please try refreshing.
            </div>
          </div>
        ) : !hasMessages ? (
          /* Clean ChatGPT-Style Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 space-y-4 my-auto select-none max-w-2xl mx-auto w-full">
            <div className="h-10 w-10 rounded-full bg-[#2f2f2f] flex items-center justify-center text-white mb-1 shadow-sm">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#ececec]">
              What can I help with today?
            </h2>

            {/* Starter Suggestion Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-3">
              {[
                'Explain quantum computing in simple terms',
                'Write a clean React hook with TypeScript',
                'Summarize key ideas from an article',
                'Help me brainstorm creative ideas',
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => handleSendMessage(promptText)}
                  className="text-left p-3 rounded-2xl bg-[#212121] hover:bg-[#2f2f2f] border border-[#2f2f2f] hover:border-[#424242] transition-colors text-xs text-[#b4b4b4] hover:text-[#ececec] cursor-pointer"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Natural message stream (~768-800px width like ChatGPT) */
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-7">
            {backendMessages.map((msg) => {
              const isUser = msg.role === 'USER';

              return isUser ? (
                <div key={msg._id} className="flex justify-end animate-in fade-in duration-150">
                  <div className="max-w-[85%] sm:max-w-[70%] rounded-[24px] bg-[#2f2f2f] text-[#ececec] px-5 py-2.5 text-sm sm:text-[15px] break-words whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg._id} className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                  {/* Clean NexaMind Avatar */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-white flex-shrink-0 mt-0.5">
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

                  {/* Clean Content */}
                  <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                    <MarkdownMessage content={msg.content} />
                  </div>
                </div>
              );
            })}

            {/* Optimistic Pending User Message */}
            {optimisticMessages.map((msg) => (
              <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-[24px] bg-[#2f2f2f] text-[#ececec] px-5 py-2.5 text-sm sm:text-[15px] break-words whitespace-pre-wrap leading-relaxed opacity-85">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Subtle Assistant Typing Indicator */}
            {isSubmitting && (
              <div className="flex items-start gap-3.5 sm:gap-4 animate-in fade-in duration-150">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-white flex-shrink-0 mt-0.5">
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
                <div className="flex-1 min-w-0 space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 py-1 px-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#8e8e8e] animate-bounce" />
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

      {/* Prominent Bottom Chat Composer (Exact ChatGPT style) */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-1 flex-shrink-0">
        <div className="relative rounded-[26px] bg-[#2f2f2f] border border-white/[0.08] focus-within:border-white/20 transition-all">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 p-2 sm:p-2.5"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Message NexaMind..."
              disabled={isSubmitting}
              className="flex-1 max-h-48 min-h-[36px] resize-none bg-transparent px-3.5 py-1.5 text-sm sm:text-[15px] text-[#ececec] placeholder-[#8e8e8e] focus:outline-none disabled:opacity-50 leading-relaxed"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputValue.trim()}
              aria-label="Send message"
              className="flex-shrink-0 h-8 w-8 rounded-full bg-white text-black hover:bg-[#d9d9d9] disabled:bg-[#424242] disabled:text-[#8e8e8e] flex items-center justify-center transition-all mb-0.5 cursor-pointer disabled:cursor-not-allowed"
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
          </form>
        </div>
        <p className="text-[11px] text-center text-[#8e8e8e] mt-2 select-none">
          1 credit per query • NexaMind can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};


