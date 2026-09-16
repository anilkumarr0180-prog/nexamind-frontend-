export type ConversationStatus = 'ACTIVE' | 'ARCHIVED';

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  messageCount: number;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationDTO {
  title: string;
}

export interface UpdateConversationDTO {
  title?: string;
  status?: ConversationStatus;
}
