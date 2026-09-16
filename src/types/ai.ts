import type { MessageUsage } from './message';

export interface ChatRequestDTO {
  conversationId: string;
  content: string;
}

export interface OrchestratedChatResult {
  conversation: {
    id: string;
    title: string;
    status: string;
    messageCount: number;
    lastMessageAt: string;
  };
  userMessage: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    status: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    status: string;
    model: string | null;
    provider: string | null;
    usage: MessageUsage | null;
    createdAt: string;
  };
  usage: MessageUsage | null;
}
