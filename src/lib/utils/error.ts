import { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api';

export type ErrorType = 'NETWORK_ERROR' | 'BACKEND_4XX' | 'BACKEND_5XX' | 'UNKNOWN';

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const classifyApiError = (
  err: unknown,
  defaultMessage: string = 'An unexpected error occurred',
): ClassifiedError => {
  if (!isAxiosError<ApiErrorResponse>(err)) {
    return {
      type: 'UNKNOWN',
      message: err instanceof Error ? err.message : defaultMessage,
    };
  }

  // Network / No-response error (browser blocked or server unreachable)
  if (!err.response) {
    let networkMsg = 'Unable to connect to the backend server. Please verify your connection.';

    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost' &&
      window.location.port !== '5173'
    ) {
      networkMsg = `CORS Origin Mismatch: The application is running on ${window.location.origin}, but the backend CORS policy strictly permits http://localhost:5173. Please open http://localhost:5173 to continue.`;
    } else if (err.code === 'ECONNABORTED') {
      networkMsg = 'Connection timed out while waiting for the backend server.';
    } else if (err.message) {
      networkMsg = `Network error (${err.message}). Please verify the backend is running at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1'}.`;
    }

    return {
      type: 'NETWORK_ERROR',
      message: networkMsg,
      code: err.code || 'ERR_NETWORK',
    };
  }

  const { status, data } = err.response;
  const backendError = data?.error;

  // 4xx Client Errors (validation, auth, conflict, rate limits)
  if (status >= 400 && status < 500) {
    let message = backendError?.message || 'Invalid request. Please verify your inputs.';

    if (status === 409) {
      message =
        backendError?.message ||
        'An account with this email address already exists. Please sign in instead.';
    } else if (status === 401) {
      message = backendError?.message || 'Invalid email or password. Please try again.';
    } else if (status === 429) {
      message =
        backendError?.message ||
        'Too many attempts. Please wait a few minutes before trying again.';
    } else if (status === 400 && backendError?.details && Array.isArray(backendError.details)) {
      const issueMsgs = backendError.details
        .map((issue: { message?: string }) => issue.message)
        .filter(Boolean);
      if (issueMsgs.length > 0) {
        message = issueMsgs.join('. ');
      }
    }

    return {
      type: 'BACKEND_4XX',
      message,
      statusCode: status,
      code: backendError?.code || 'CLIENT_ERROR',
      details: backendError?.details,
    };
  }

  // 5xx Server Errors
  if (status >= 500) {
    return {
      type: 'BACKEND_5XX',
      message:
        backendError?.message ||
        `Backend server error (${status}). An unexpected issue occurred on the server.`,
      statusCode: status,
      code: backendError?.code || 'INTERNAL_SERVER_ERROR',
    };
  }

  return {
    type: 'UNKNOWN',
    message: backendError?.message || defaultMessage,
    statusCode: status,
    code: backendError?.code,
  };
};
