import type { SafeAttachment } from './attachment';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export type MessageStatus = 'COMPLETED' | 'FAILED';

export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface DocumentSourceCitation {
  type?: "document";
  attachmentId: string;
  filename: string;
  chunkIndex: number;
}

export interface WebSourceCitation {
  type: "web";
  title: string;
  url: string;
}

export type ChatSourceCitation = DocumentSourceCitation | WebSourceCitation;

export function isWebSourceCitation(source: ChatSourceCitation | null | undefined): source is WebSourceCitation {
  if (!source) return false;
  return source.type === "web" || ("url" in source && typeof (source as any).url === "string");
}

export function isDocumentSourceCitation(source: ChatSourceCitation | null | undefined): source is DocumentSourceCitation {
  if (!source) return false;
  return !isWebSourceCitation(source);
}

/**
 * Validates and safely formats external web URLs.
 * Ensures the protocol is http or https and disallows unsafe schemes (javascript:, data:, etc.).
 * Returns null if the URL is missing, invalid, or dangerous.
 */
export function getSafeWebUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // Disallow dangerous schemes immediately
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }

  // Prepend protocol if protocol-relative or bare domain
  if (trimmed.startsWith("//")) {
    trimmed = "https:" + trimmed;
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
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
  sources?: ChatSourceCitation[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageDTO {
  content: string;
  attachmentId?: string | null;
}
