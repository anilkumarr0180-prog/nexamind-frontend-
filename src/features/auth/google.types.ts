export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
  clientId?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  prompt_parent_id?: string;
  state_cookie_domain?: string;
  ux_mode?: 'popup' | 'redirect';
  login_uri?: string;
}

export interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
}

export interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

export interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
  prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
  revoke: (hint: string, callback?: (response: { successful: boolean; error: string }) => void) => void;
}

export interface GoogleAccounts {
  id: GoogleAccountsId;
}

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}
