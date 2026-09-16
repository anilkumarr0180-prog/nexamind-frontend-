export type MemoryType = 'FACT' | 'PREFERENCE' | 'GOAL' | 'INSTRUCTION';

export type MemoryStatus = 'ACTIVE' | 'DELETED';

export interface Memory {
  _id: string;
  userId: string;
  type: MemoryType;
  content: string;
  status: MemoryStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryDTO {
  type: MemoryType;
  content: string;
}

export interface UpdateMemoryDTO {
  type?: MemoryType;
  content?: string;
}

export interface GetMemoriesFilter {
  type?: MemoryType;
}
