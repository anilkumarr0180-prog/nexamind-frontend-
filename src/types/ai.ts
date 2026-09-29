import type { MessageUsage, ChatSourceCitation } from './message';

export interface ChatRequestDTO {
  conversationId: string;
  content: string;
  editMessageId?: string;
  attachmentId?: string | null;
}

export interface OrchestratedChatResult {
  conversation: {
    id: string;
    title: string;
    status: string;
    messageCount: number;
    lastMessageAt: string;
    activeLeafMessageId?: string | null;
  };
  userMessage: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    status: string;
    parentMessageId?: string | null;
    originalMessageId?: string | null;
    attachmentId?: string | null;
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
    parentMessageId?: string | null;
    usage: MessageUsage | null;
    sources?: ChatSourceCitation[] | null;
    createdAt: string;
  };
  sources?: ChatSourceCitation[] | null;
  usage: MessageUsage | null;
}
