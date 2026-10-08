import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  GoogleButtonConfiguration,
  GoogleCredentialResponse,
} from './google.types';

const GIS_SCRIPT_ID = 'google-identity-services-script';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export interface UseGoogleIdentityServicesOptions {
  onSuccess: (credential: string) => void | Promise<void>;
  onError?: (error: Error | string) => void;
  context?: 'signin' | 'signup' | 'use';
}

export interface UseGoogleIdentityServicesReturn {
  isLoaded: boolean;
  isReady: boolean;
  clientId: string;
  isConfigured: boolean;
  renderButton: (element: HTMLElement | null, options?: GoogleButtonConfiguration) => void;
  prompt: () => void;
}

export const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(true);
  }

  const existingScript = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve) => {
      if (window.google?.accounts?.id) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

export const useGoogleIdentityServices = (
  options: UseGoogleIdentityServicesOptions,
): UseGoogleIdentityServicesReturn => {
  const { onSuccess, onError, context = 'signin' } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const clientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isConfigured = Boolean(clientId);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Track if Google ID is initialized
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (!isConfigured) {
      return;
    }

    loadGoogleIdentityScript().then((loaded) => {
      if (!isMounted) return;
      setIsLoaded(loaded);

      if (loaded && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            context,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: (response: GoogleCredentialResponse) => {
              if (response.credential) {
                onSuccessRef.current(response.credential);
              } else {
                onErrorRef.current?.(new Error('No credential returned by Google'));
              }
            },
          });
          initializedRef.current = true;
          setIsReady(true);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to initialize Google Sign-In';
          onErrorRef.current?.(new Error(message));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clientId, isConfigured, context]);

  const renderButton = useCallback(
    (element: HTMLElement | null, buttonOptions?: GoogleButtonConfiguration) => {
      if (!element || !window.google?.accounts?.id || !initializedRef.current) {
        return;
      }

      try {
        const mergedOptions: GoogleButtonConfiguration = {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          ...buttonOptions,
        };

        window.google.accounts.id.renderButton(element, mergedOptions);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to render Google button';
        onErrorRef.current?.(new Error(message));
      }
    },
    [],
  );

  const prompt = useCallback(() => {
    if (!window.google?.accounts?.id || !initializedRef.current) {
      onErrorRef.current?.(new Error('Google Sign-In is not initialized yet'));
      return;
    }

    try {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.debug('[GoogleAuth] Prompt not displayed:', reason);
        } else if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason();
          console.debug('[GoogleAuth] Prompt skipped:', reason);
        } else if (notification.isDismissedMoment()) {
          const reason = notification.getDismissedReason();
          console.debug('[GoogleAuth] Prompt dismissed:', reason);
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open Google Sign-In prompt';
      onErrorRef.current?.(new Error(message));
    }
  }, []);

  return {
    isLoaded,
    isReady,
    clientId,
    isConfigured,
    renderButton,
    prompt,
  };
};
