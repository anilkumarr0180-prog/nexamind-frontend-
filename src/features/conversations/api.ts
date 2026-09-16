import apiClient from '@/lib/api/client';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Conversation,
  CreateConversationDTO,
  UpdateConversationDTO,
} from '@/types';

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...conversationKeys.lists(), params] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

export const getConversations = async (
  params?: PaginationParams,
): Promise<PaginatedResponse<Conversation>> => {
  const response = await apiClient.get<PaginatedResponse<Conversation>>('/conversations', {
    params,
  });
  return response.data;
};

export const getConversationById = async (conversationId: string): Promise<Conversation> => {
  const response = await apiClient.get<ApiResponse<Conversation>>(
    `/conversations/${conversationId}`,
  );
  return response.data.data;
};

export const createConversation = async (
  data: CreateConversationDTO,
): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>('/conversations', data);
  return response.data.data;
};

export const updateConversation = async (
  conversationId: string,
  data: UpdateConversationDTO,
): Promise<Conversation> => {
  const response = await apiClient.patch<ApiResponse<Conversation>>(
    `/conversations/${conversationId}`,
    data,
  );
  return response.data.data;
};

export const archiveConversation = async (conversationId: string): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/conversations/${conversationId}/archive`,
  );
  return response.data.data;
};

export const unarchiveConversation = async (conversationId: string): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/conversations/${conversationId}/unarchive`,
  );
  return response.data.data;
};

export const deleteConversation = async (conversationId: string): Promise<Conversation> => {
  const response = await apiClient.delete<ApiResponse<Conversation>>(
    `/conversations/${conversationId}`,
  );
  return response.data.data;
};
