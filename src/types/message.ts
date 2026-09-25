import type { SafeAttachment } from './attachment';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export type MessageStatus = 'COMPLETED' | 'FAILED';

export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model: string | null;
  provider: string | null;
  usage: MessageUsage | null;
  parentMessageId?: string | null;
  originalMessageId?: string | null;
  attachmentId?: string | null;
  attachment?: SafeAttachment | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageDTO {
  content: string;
  attachmentId?: string | null;
}
