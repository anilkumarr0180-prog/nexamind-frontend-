export type AttachmentType = 'IMAGE' | 'DOCUMENT';

export type AttachmentStatus = 'PENDING' | 'READY' | 'FAILED';

export interface AttachmentUploadResponse {
  attachmentId: string;
  type?: AttachmentType;
  originalName: string;
  mimeType: string;
  size: number;
  secureUrl: string;
  status: AttachmentStatus;
  extractedTextLength?: number;
}

export interface SafeAttachment {
  attachmentId: string;
  type?: AttachmentType | string;
  originalName: string;
  mimeType: string;
  size: number;
  secureUrl: string;
  status?: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  extractedTextLength?: number | null;
}
