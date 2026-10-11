import React, { useEffect, useState } from 'react';
import { X, AlertCircle, ArrowRight, Check, Mail, Key } from 'lucide-react';
import { EtsyHunterLogo } from './EtsyHunterLogo';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password' | 'update_password';
  onSuccess?: () => void;
}

export const EtsyHunterAuthModal: React.FC<EtsyHunterAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onSuccess
}) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updateRecoveredPassword,
    isLiveSupabase,
    authError,
    passwordRecoveryStatus
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'update_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const displayedError = errorMsg || authError;

  useEffect(() => {
    if (!isOpen) return;
    setMode(
      initialMode === 'update_password' && passwordRecoveryStatus !== 'ready'
        ? 'login'
        : initialMode
    );
  }, [initialMode, isOpen, passwordRecoveryStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error, needsEmailVerification } = await signUpWithEmail(email, password, fullName);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (needsEmailVerification) {
          setEmailVerificationSent(true);
          setSuccessMsg(`Account created! A confirmation link has been sent to ${email}. Please verify your email before logging in.`);
          setLoading(false);
          return;
        }
      } else if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
      } else if (mode === 'forgot_password') {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        setSuccessMsg('Password recovery link sent! Please check your email inbox and spam folder.');
        setLoading(false);
        return;
      } else if (mode === 'update_password') {
        if (passwordRecoveryStatus !== 'ready') {
          setErrorMsg('Password recovery authorization is missing or has expired.');
          setLoading(false);
          return;
        }

        const { error } = await updateRecoveredPassword(newPassword);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        setSuccessMsg('Password successfully changed! You can now log in with your new password.');
        setMode('login');
        setLoading(false);
        return;
      }

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error occurred.');
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Logo & Headline */}
          <div className="space-y-1.5 text-center">
            <div className="flex justify-center">
              <EtsyHunterLogo showText={false} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#f7f8f8]">
              {mode === 'signup'
                ? 'Create your Etsy Hunter account'
                : mode === 'login'
                ? 'Welcome back to Etsy Hunter'
                : mode === 'forgot_password'
                ? 'Reset your password'
                : 'Update your password'}
            </h2>
            <p className="text-xs text-[#8a8f98]">
              {mode === 'signup'
                ? 'Create your personal workspace to start researching product opportunities.'
                : mode === 'login'
                ? 'Sign in to access your personal dashboard and saved listings.'
                : mode === 'forgot_password'
                ? 'Enter your email address to receive password recovery instructions.'
                : 'Choose a strong new password for your account.'}
            </p>
          </div>

          {/* Feedback Banners */}
          {displayedError && (
            <div className="p-2.5 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{displayedError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-[#30a46c]/10 border border-[#30a46c]/30 text-xs text-[#30a46c] flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verification Screen if signup requires confirmation */}
          {emailVerificationSent ? (
            <div className="p-4 rounded-xl bg-[#18181f] border border-[#282835] space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#5e6ad2]/20 flex items-center justify-center mx-auto text-[#707bfb]">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-[#f7f8f8]">Verification Email Sent</h3>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed">
                We sent a confirmation link to <span className="font-semibold text-white">{email}</span>. Click the link in your email to activate your personal workspace.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEmailVerificationSent(false);
                  setMode('login');
                  setSuccessMsg(null);
                }}
                className="w-full py-2 rounded-lg bg-[#5e6ad2] text-white text-xs font-medium cursor-pointer"
              >
                Proceed to Log In
              </button>
            </div>
          ) : (
            <>
              {/* Mode Switcher Tabs */}
              {mode !== 'forgot_password' && mode !== 'update_password' && (
                <div className="flex items-center p-1 rounded-lg bg-[#0e0e13] border border-[#22222b]">
                  <button
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`w-1/2 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-[#18181f] text-[#f7f8f8] shadow-sm font-semibold'
                        : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                    }`}
                  >
                    Sign up
                  </button>
                  <button
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`w-1/2 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-[#18181f] text-[#f7f8f8] shadow-sm font-semibold'
                        : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                    }`}
                  >
                    Log in
                  </button>
                </div>
              )}

              {/* Google SSO Button */}
              {mode !== 'forgot_password' && mode !== 'update_password' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading || !isLiveSupabase}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-xs font-medium text-[#f7f8f8] flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-[#22222b] w-full" />
                    <span className="bg-[#121216] px-2 text-[10px] text-[#575a65] uppercase tracking-wider absolute">
                      or with email
                    </span>
                  </div>
                </>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                    />
                  </div>
                )}

                {mode !== 'update_password' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seller@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                    />
                  </div>
                )}

                {mode !== 'forgot_password' && mode !== 'update_password' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-[#8a8f98]">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot_password');
                            setErrorMsg(null);
                            setSuccessMsg(null);
                          }}
                          className="text-[10px] text-[#707bfb] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                    />
                  </div>
                )}

                {mode === 'update_password' && passwordRecoveryStatus === 'ready' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !isLiveSupabase ||
                    (mode === 'update_password' && passwordRecoveryStatus !== 'ready')
                  }
                  className="w-full mt-2 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold shadow-[0_0_16px_rgba(94,106,210,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Connecting...</span>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : mode === 'forgot_password' ? (
                    <span>Send Password Reset Link</span>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>

                {(mode === 'forgot_password' || mode === 'update_password') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full text-center text-xs text-[#8a8f98] hover:text-white pt-2 block cursor-pointer"
                  >
                    Back to Sign in
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
