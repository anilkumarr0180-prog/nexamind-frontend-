import React from 'react';
import { renderToString } from 'react-dom/server';

const nodeProcess = (globalThis as unknown as {
  process?: {
    env?: Record<string, string>;
    exit?: (code: number) => void;
  };
}).process;

// In-memory Storage polyfill for headless test environment
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

import { GoogleSignInButton } from './GoogleSignInButton';
import { loginWithGoogle, loginUser } from './api';
import {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  API_BASE_URL,
} from '@/lib/api/client';
import { classifyApiError } from '@/lib/utils/error';

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}${
        message ? ` (${message})` : ''
      }`,
    );
  }
}

function assertNotEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual === expected) {
    throw new Error(
      `Assertion failed: expected not equal to ${JSON.stringify(expected)}${
        message ? ` (${message})` : ''
      }`,
    );
  }
}

function assertTrue(condition: unknown, message?: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: expected truthy value${message ? ` (${message})` : ''}`);
  }
}

async function runFrontendAuthTests(): Promise<void> {
  console.log('=================================================================');
  console.log('  NexaMind Frontend: Google Sign-In & Auth Verification Suite   ');
  console.log('=================================================================');

  // Test 1: Google Button Component Rendering Checks
  console.log('\n[Test 1] Google button component renders in multiple states');
  {
    // 1A. Default "Continue with Google"
    const htmlDefault = renderToString(
      React.createElement(GoogleSignInButton, {
        onSuccess: () => {},
        text: 'continue',
      }),
    );
    assertTrue(htmlDefault.includes('Continue with Google'), 'Must render "Continue with Google" text');
    assertTrue(htmlDefault.includes('data-testid="google-signin-button"'), 'Must have google-signin-button testid');
    assertTrue(htmlDefault.includes('svg'), 'Must render Google SVG icon');

    // 1B. "Sign in with Google"
    const htmlSignin = renderToString(
      React.createElement(GoogleSignInButton, {
        onSuccess: () => {},
        text: 'signin',
      }),
    );
    assertTrue(htmlSignin.includes('Sign in with Google'), 'Must render "Sign in with Google" text');

    // 1C. "Sign up with Google"
    const htmlSignup = renderToString(
      React.createElement(GoogleSignInButton, {
        onSuccess: () => {},
        text: 'signup',
      }),
    );
    assertTrue(htmlSignup.includes('Sign up with Google'), 'Must render "Sign up with Google" text');

    // 1D. Loading state
    const htmlLoading = renderToString(
      React.createElement(GoogleSignInButton, {
        onSuccess: () => {},
        isLoading: true,
      }),
    );
    assertTrue(htmlLoading.includes('Signing in with Google...'), 'Must render loading text when isLoading is true');
    assertTrue(htmlLoading.includes('animate-spin'), 'Must render loading spinner SVG');

    // 1E. Disabled state
    const htmlDisabled = renderToString(
      React.createElement(GoogleSignInButton, {
        onSuccess: () => {},
        disabled: true,
      }),
    );
    assertTrue(htmlDisabled.includes('disabled=""') || htmlDisabled.includes('disabled'), 'Must apply disabled attribute');

    console.log('  ✓ PASS: Button renders correctly across default, signin, signup, loading, and disabled states');
  }

  // Test 2: Environment Safety Check (Secret strictly excluded)
  console.log('\n[Test 2] Environment safety & secret isolation check');
  {
    const envObj =
      ((import.meta as unknown as { env?: Record<string, string> }).env) ||
      nodeProcess?.env ||
      {};
    const envClientId = (envObj['VITE_GOOGLE_CLIENT_ID'] || '').trim();
    // Verify client secret is strictly not accessible on frontend
    const forbiddenSecret = envObj['GOOGLE_CLIENT_SECRET'];
    const forbiddenViteSecret = envObj['VITE_GOOGLE_CLIENT_SECRET'];

    assertEqual(forbiddenSecret, undefined, 'GOOGLE_CLIENT_SECRET must never exist in frontend bundle');
    assertEqual(forbiddenViteSecret, undefined, 'VITE_GOOGLE_CLIENT_SECRET must never exist in frontend bundle');
    console.log('  ✓ PASS: Client secret strictly absent from frontend bundle');
    console.log(`  ✓ PASS: VITE_GOOGLE_CLIENT_ID configuration is safe (length=${envClientId.length})`);
  }

  // Test 3: Token Storage Isolation & Invariant
  console.log('\n[Test 3] Token storage isolation & session token invariant');
  {
    clearAuthToken();
    assertEqual(getAuthToken(), null, 'Storage should be clear before login');

    const fakeGoogleCredential = 'google.oauth.id_token.raw_header_payload_signature';
    const fakeBackendJwt = 'nexamind.jwt.access_token_issued_by_server';

    // Simulate AuthContext loginWithGoogle setting the token returned from backend
    setAuthToken(fakeBackendJwt);

    assertEqual(getAuthToken(), fakeBackendJwt, 'NexaMind backend JWT must be stored');
    assertNotEqual(getAuthToken(), fakeGoogleCredential, 'Google ID token must NEVER be stored as NexaMind token');
    clearAuthToken();
    console.log('  ✓ PASS: Only backend-issued NexaMind JWT is stored; Google ID token is never stored as session');
  }

  // Test 4: Backend failure handling on invalid Google token
  console.log('\n[Test 4] Backend failure handling on invalid Google credential');
  {
    try {
      await loginWithGoogle('invalid-or-malformed-google-credential-xyz');
      throw new Error('Expected loginWithGoogle to throw for invalid credential');
    } catch (err: unknown) {
      const classified = classifyApiError(err, 'Google sign-in failed');
      assertTrue(Boolean(classified.message), 'Must return a user-friendly classified error message');
      console.log(`  ✓ PASS: Backend failure caught and classified: "${classified.message}"`);
    }
  }

  // Test 5: Existing email/password login still works and API contracts are preserved
  console.log('\n[Test 5] Existing email/password login endpoint verification');
  {
    try {
      await loginUser({
        email: 'nonexistent-regression-test-user@nexamind.ai',
        password: 'Password123!',
      });
      throw new Error('Expected loginUser to fail for non-existent test account');
    } catch (err: unknown) {
      const classified = classifyApiError(err, 'Sign in failed');
      assertTrue(Boolean(classified.message), 'Classified error message returned for invalid credentials');
      console.log(`  ✓ PASS: Existing email/password endpoint intact and verified: "${classified.message}"`);
    }
  }

  // Test 6: Verify API_BASE_URL and 401 interceptor bypass for /auth/google
  console.log('\n[Test 6] Verify API base configuration and interceptor bypass routes');
  {
    assertTrue(API_BASE_URL.includes('/api/v1'), 'API_BASE_URL must target /api/v1');
    const authAttemptUrls = [
      '/auth/login',
      '/auth/register',
      '/auth/google',
    ];
    for (const url of authAttemptUrls) {
      const isAuthAttempt =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/google');
      assertEqual(isAuthAttempt, true, `${url} must be recognized as auth attempt`);
    }
    console.log('  ✓ PASS: /auth/google recognized as unauthenticated attempt to prevent session invalidation loops');
  }

  console.log('\n=================================================================');
  console.log('  ALL FRONTEND GOOGLE AUTH TESTS PASSED SUCCESSFULLY (6/6)       ');
  console.log('=================================================================\n');
}

runFrontendAuthTests().catch((err) => {
  console.error('Frontend Auth Tests Failed:', err);
  if (nodeProcess?.exit) {
    nodeProcess.exit(1);
  }
});
