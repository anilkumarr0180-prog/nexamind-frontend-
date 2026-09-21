import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { NexaMindIcon } from '@/components/ui';
import { classifyApiError } from '@/lib/utils/error';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { name?: string; email?: string; password?: string } = {};
    const trimmedName = name.trim();
    const normalizedEmail = email.trim();

    if (!trimmedName) {
      errors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }

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
        name: name.trim(),
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0a0d14] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent_70%),radial-gradient(ellipse_60%_50%_at_50%_110%,rgba(99,102,241,0.10),transparent_70%)] px-4 py-12 text-slate-100 font-sans relative overflow-hidden">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-glow-brand mb-1 transition-transform hover:scale-105 duration-200">
            <div className="h-full w-full bg-[#121626] rounded-[15px] flex items-center justify-center">
              <NexaMindIcon className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-bold tracking-tight text-white">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Start building your persistent personal memory workspace
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#12172a]/85 backdrop-blur-xl border border-white/[0.12] shadow-2xl p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {globalError && (
              <div
                role="alert"
                className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300 leading-relaxed animate-in fade-in flex items-start gap-2.5"
              >
                <svg
                  className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{globalError}</span>
              </div>
            )}

            <Input
              id="name"
              label="Name / Display Name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              error={fieldErrors.name}
              disabled={isSubmitting}
              required
            />

            <Input
              id="email"
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
              id="password"
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
                  className="text-slate-400 hover:text-slate-200 focus:outline-none p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full h-11 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-500 hover:via-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/25 border border-brand-400/25 transition-all duration-200 mt-2 cursor-pointer"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Account
            </Button>
          </form>
        </div>

        {/* Switch Link */}
        <div className="text-center text-xs sm:text-[13px] text-slate-400 select-none">
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
