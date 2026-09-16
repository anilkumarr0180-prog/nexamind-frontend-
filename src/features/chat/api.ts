import apiClient from '@/lib/api/client';
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
