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

/**
 * Quick client-side image optimization for fast network transfers.
 * Downscales oversized photos (>1MB) to max 1920px at 85% JPEG quality.
 */
async function prepareImageForFastUpload(file: File): Promise<File> {
  if (
    typeof window === "undefined" ||
    file.size <= 1024 * 1024 ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    return await new Promise<File>((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 1920;
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  } catch {
    return file;
  }
}

export const uploadImageAttachment = async ({
  file,
  conversationId,
  onUploadProgress,
}: UploadImageAttachmentParams): Promise<AttachmentUploadResponse> => {
  const uploadFile = await prepareImageForFastUpload(file);
  const formData = new FormData();
  formData.append('file', uploadFile);
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
