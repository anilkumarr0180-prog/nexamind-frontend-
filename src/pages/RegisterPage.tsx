import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { classifyApiError } from '@/lib/utils/error';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (password.length > 128) {
      errors.password = 'Password cannot exceed 128 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);

    if (isSubmitting || !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
      });

      // Backend returns active session with token, navigate to workspace
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      const classified = classifyApiError(err, 'Registration failed. Please check your inputs and try again.');
      setGlobalError(classified.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 text-slate-100 font-sans">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Heading */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-base shadow-subtle mb-2">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Create an Account</h1>
          <p className="text-xs text-slate-400">
            Start building your persistent personal memory workspace
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 space-y-4 shadow-card">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {globalError && (
                <div
                  role="alert"
                  className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300 leading-relaxed animate-in fade-in"
                >
                  {globalError}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                error={fieldErrors.email}
                disabled={isSubmitting}
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••••"
                hint="Must be at least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                error={fieldErrors.password}
                disabled={isSubmitting}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Switch Link */}
        <div className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
