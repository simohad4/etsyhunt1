import React, { useState } from 'react';
import { X, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { EtsyHunterLogo } from './EtsyHunterLogo';
import { useAuth } from '../context/AuthContext';

interface EtsyHunterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: (email?: string) => void;
}

export const EtsyHunterAuthModal: React.FC<EtsyHunterAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onSuccess
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      if (onSuccess) onSuccess(email);
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
      if (onSuccess) onSuccess('elena.rostova@etsyhunter.ai');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google OAuth failed');
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    const { error } = await signInWithEmail('elena.rostova@etsyhunter.ai', 'password123');
    setLoading(false);
    if (!error) {
      if (onSuccess) onSuccess('elena.rostova@etsyhunter.ai');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#121216] border border-[#22222b] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-[#575a65] hover:text-[#f7f8f8] hover:bg-[#18181f] transition-colors"
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
              {mode === 'signup' ? 'Create your Etsy Hunter workspace' : 'Welcome back to Etsy Hunter'}
            </h2>
            <p className="text-xs text-[#8a8f98]">
              {mode === 'signup'
                ? 'Automatic personal seller workspace created on signup.'
                : 'Sign in to access your Etsy product radar, tag analysis, and shop watchlists.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#0e0e13] border border-[#22222b]">
            <button
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`w-1/2 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              }}
              className={`w-1/2 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'login'
                  ? 'bg-[#18181f] text-[#f7f8f8] shadow-sm font-semibold'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              Log in
            </button>
          </div>

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
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
                  placeholder="Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="seller@etsyhunter.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#18181f] border border-[#282835] text-xs text-[#f7f8f8] placeholder-[#575a65] focus:outline-none focus:border-[#5e6ad2] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8a8f98] mb-1">
                Password
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-semibold shadow-[0_0_16px_rgba(94,106,210,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Etsy Hunter Workspace' : 'Sign in to Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-[#22222b]/60 flex items-center justify-between text-[11px] text-[#575a65]">
            <span>Fast test?</span>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="text-[#707bfb] hover:text-[#8a94fd] hover:underline cursor-pointer font-medium"
            >
              Auto-fill demo seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
