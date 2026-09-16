import apiClient from '@/lib/api/client';
import type {
  ApiResponse,
  Memory,
  CreateMemoryDTO,
  UpdateMemoryDTO,
  GetMemoriesFilter,
} from '@/types';

export const memoryKeys = {
  all: ['memories'] as const,
  lists: () => [...memoryKeys.all, 'list'] as const,
  list: (filter?: GetMemoriesFilter) => [...memoryKeys.lists(), filter] as const,
  details: () => [...memoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...memoryKeys.details(), id] as const,
};

export const getMemories = async (filter?: GetMemoriesFilter): Promise<Memory[]> => {
  const response = await apiClient.get<ApiResponse<Memory[]>>('/memories', {
    params: filter,
  });
  return response.data.data;
};

export const getMemoryById = async (memoryId: string): Promise<Memory> => {
  const response = await apiClient.get<ApiResponse<Memory>>(`/memories/${memoryId}`);
  return response.data.data;
};

export const createMemory = async (data: CreateMemoryDTO): Promise<Memory> => {
  const response = await apiClient.post<ApiResponse<Memory>>('/memories', data);
  return response.data.data;
};

export const updateMemory = async (
  memoryId: string,
  data: UpdateMemoryDTO,
): Promise<Memory> => {
  const response = await apiClient.patch<ApiResponse<Memory>>(`/memories/${memoryId}`, data);
  return response.data.data;
};

export const deleteMemory = async (memoryId: string): Promise<Memory> => {
  const response = await apiClient.delete<ApiResponse<Memory>>(`/memories/${memoryId}`);
  return response.data.data;
};
