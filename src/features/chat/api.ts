import apiClient, { getAuthToken, API_BASE_URL } from '@/lib/api/client';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Message,
  CreateMessageDTO,
  ChatRequestDTO,
  OrchestratedChatResult,
} from '@/types';

export const chatKeys = {
  all: ['chat'] as const,
  messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
  messagesList: (conversationId: string, params?: PaginationParams) =>
    [...chatKeys.messages(conversationId), params] as const,
};

export const getConversationMessages = async (
  conversationId: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<Message>> => {
  const response = await apiClient.get<PaginatedResponse<Message>>(
    `/conversations/${conversationId}/messages`,
    { params },
  );
  return response.data;
};

export const sendDirectMessage = async (
  conversationId: string,
  data: CreateMessageDTO,
): Promise<Message> => {
  const response = await apiClient.post<ApiResponse<Message>>(
    `/conversations/${conversationId}/messages`,
    { content: data.content },
  );
  return response.data.data;
};

export const sendAIChatMessage = async (
  data: ChatRequestDTO,
): Promise<OrchestratedChatResult> => {
  const response = await apiClient.post<ApiResponse<OrchestratedChatResult>>('/ai/chat', data);
  return response.data.data;
};

export interface StreamChatCallbacks {
  onStart?: (data: { userMessage: Message; conversationId: string }) => void;
  onChunk: (chunk: string) => void;
  onDone: (result: OrchestratedChatResult) => void;
  onError?: (error: Error) => void;
}

export const streamAIChatMessage = async (
  data: ChatRequestDTO,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}/ai/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...data,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      // Fallback
    }
    const error = new Error(errorMessage);
    callbacks.onError?.(error);
    throw error;
  }

  if (!response.body) {
    const error = new Error('No response body returned from streaming server');
    callbacks.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneReceived = false;
  let errorEmitted = false;

  const processJsonPayload = (payload: any): boolean => {
    if (payload.type === 'start') {
      callbacks.onStart?.(payload);
    } else if (payload.type === 'chunk') {
      if (payload.content) {
        callbacks.onChunk(payload.content);
      }
    } else if (payload.type === 'done') {
      doneReceived = true;
      callbacks.onDone(payload);
    } else if (payload.type === 'aborted') {
      return true;
    } else if (payload.type === 'error') {
      if (!doneReceived && !errorEmitted) {
        errorEmitted = true;
        const err = new Error(payload.error?.message || 'Streaming failed');
        callbacks.onError?.(err);
        throw err;
      }
    }
    return false;
  };

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        for (const line of trimmed.split('\n')) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            let payload: any;
            try {
              payload = JSON.parse(jsonStr);
            } catch {
              continue;
            }
            const isAborted = processJsonPayload(payload);
            if (isAborted) return;
          }
        }
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.trim().split('\n')) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          let payload: any;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
            continue;
          }
          const isAborted = processJsonPayload(payload);
          if (isAborted) return;
        }
      }
    }
  } catch (streamErr: unknown) {
    if (signal?.aborted || doneReceived) {
      return;
    }
    if (!errorEmitted) {
      errorEmitted = true;
      if (streamErr instanceof Error) {
        callbacks.onError?.(streamErr);
      } else {
        callbacks.onError?.(new Error('Streaming failed'));
      }
    }
    throw streamErr;
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
};

