import apiClient, { getAuthToken, API_BASE_URL } from '@/lib/api/client';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Message,
  CreateMessageDTO,
  ChatRequestDTO,
  OrchestratedChatResult,
  ToolStatusEvent,
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
    {
      content: data.content,
      ...(data.attachmentId ? { attachmentId: data.attachmentId } : {}),
    },
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
  onStatus?: (status: string, message: string) => void;
  onToolStatus?: (event: ToolStatusEvent) => void;
}

export const streamAIChatMessage = async (
  data: ChatRequestDTO,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> => {
  if (signal?.aborted) {
    return;
  }

  const token = getAuthToken();
  const url = `${API_BASE_URL}/ai/chat`;

  let response: Response;
  try {
    response = await fetch(url, {
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
  } catch (fetchErr: unknown) {
    if (
      signal?.aborted ||
      (fetchErr instanceof Error &&
        (fetchErr.name === 'AbortError' ||
          fetchErr.message.toLowerCase().includes('aborted')))
    ) {
      return;
    }
    const err = fetchErr instanceof Error ? fetchErr : new Error('Network error during streaming');
    callbacks.onError?.(err);
    throw err;
  }

  if (signal?.aborted) {
    return;
  }

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
    } else if (payload.type === 'status') {
      callbacks.onStatus?.(payload.status, payload.message);
    } else if (payload.type === 'tool_status') {
      callbacks.onToolStatus?.(payload);
    } else if (payload.type === 'chunk') {
      if (payload.content) {
        callbacks.onChunk(payload.content);
      }
    } else if (payload.type === 'done') {
      doneReceived = true;
      callbacks.onDone(payload);
      return true; // Completed successfully, stop processing
    } else if (payload.type === 'aborted') {
      return true; // Stream aborted by server, stop processing
    } else if (payload.type === 'error') {
      if (!doneReceived && !errorEmitted) {
        errorEmitted = true;
        const err = new Error(payload.error?.message || 'Streaming failed');
        if (payload.error?.code) (err as any).code = payload.error.code;
        if (payload.error?.statusCode) (err as any).statusCode = payload.error.statusCode;
        callbacks.onError?.(err);
        throw err;
      }
      return true;
    }
    return false;
  };

  try {
    while (true) {
      if (signal?.aborted) {
        return;
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
            // Process payload outside try/catch so error events thrown from processJsonPayload are not swallowed
            const shouldStop = processJsonPayload(payload);
            if (shouldStop) return;
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
          const shouldStop = processJsonPayload(payload);
          if (shouldStop) return;
        }
      }
    }
  } catch (streamErr: unknown) {
    const isAbort =
      signal?.aborted ||
      (streamErr instanceof Error &&
        (streamErr.name === 'AbortError' ||
          streamErr.message.toLowerCase().includes('aborted')));

    if (isAbort || doneReceived) {
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

