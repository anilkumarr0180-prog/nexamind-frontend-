import apiClient from '@/lib/api/client';
import type { ApiResponse, AttachmentUploadResponse } from '@/types';

/**
 * 10MB maximum file size limit for image attachments, matching backend exactly.
 */
export const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 5MB maximum file size limit for documents (PDF, TXT, MD, JSON, CSV), matching backend exactly.
 */
export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.pdf',
  '.docx',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  'text/json',
  'text/csv',
  'application/csv',
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/docx',
] as const;

export type AllowedDocumentExtension =
  (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

export type AttachmentCategory = 'image' | 'document';

/**
 * Determines whether a file is an allowed image or document.
 */
export const getFileCategory = (file: File): AttachmentCategory | null => {
  if (!file) return null;
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  const isImage =
    ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime as any);

  if (isImage) return 'image';

  const isDoc =
    ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mime as any) ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/csv' ||
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/docx';

  if (isDoc) return 'document';

  return null;
};

/**
 * Validates an image or document file on the frontend against supported formats and strict size limits.
 */
export const validateAttachmentFile = (
  file: File,
): { valid: boolean; error?: string; category?: AttachmentCategory } => {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const category = getFileCategory(file);

  if (!category) {
    return {
      valid: false,
      error:
        'Invalid file format. Supported files are: JPG, PNG, WEBP images and DOCX, PDF, TXT, MD, JSON, CSV documents.',
    };
  }

  if (category === 'image') {
    if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
      const maxMb = MAX_ATTACHMENT_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `Image size exceeds maximum allowed limit of ${maxMb}MB.`,
      };
    }
  } else {
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      const maxMb = MAX_DOCUMENT_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `Document size exceeds maximum allowed limit of ${maxMb}MB.`,
      };
    }
  }

  return { valid: true, category };
};

/**
 * Validates an image file (backward-compatibility helper).
 */
export const validateImageFile = (
  file: File,
): { valid: boolean; error?: string } => {
  const result = validateAttachmentFile(file);
  if (!result.valid) return result;
  if (result.category !== 'image') {
    return {
      valid: false,
      error: 'Invalid file format. Only JPG, JPEG, PNG, and WEBP images are supported.',
    };
  }
  return { valid: true };
};

export interface UploadAttachmentParams {
  file: File;
  conversationId: string;
  onUploadProgress?: (progress: number) => void;
}

export type UploadImageAttachmentParams = UploadAttachmentParams;
export type UploadDocumentAttachmentParams = UploadAttachmentParams;

/**
 * Uploads a single image attachment via multipart/form-data:
 * POST /api/v1/attachments/image
 */
export const uploadImageAttachment = async ({
  file,
  conversationId,
  onUploadProgress,
}: UploadImageAttachmentParams): Promise<AttachmentUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);

  const response = await apiClient.post<ApiResponse<AttachmentUploadResponse>>(
    '/attachments/image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(percent);
        }
      },
    },
  );

  return response.data.data;
};

/**
 * Uploads a single text-based document attachment (.txt, .md, .json, .csv) via multipart/form-data:
 * POST /api/v1/attachments/document
 */
export const uploadDocumentAttachment = async ({
  file,
  conversationId,
  onUploadProgress,
}: UploadDocumentAttachmentParams): Promise<AttachmentUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);

  const response = await apiClient.post<ApiResponse<AttachmentUploadResponse>>(
    '/attachments/document',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(percent);
        }
      },
    },
  );

  return response.data.data;
};

/**
 * Unified attachment uploader that delegates to image or document endpoint based on file category.
 */
export const uploadAttachment = async ({
  file,
  conversationId,
  onUploadProgress,
}: UploadAttachmentParams): Promise<AttachmentUploadResponse> => {
  const category = getFileCategory(file);
  if (category === 'document') {
    return uploadDocumentAttachment({ file, conversationId, onUploadProgress });
  }
  return uploadImageAttachment({ file, conversationId, onUploadProgress });
};
