import React, { useState } from 'react';
import { X, ArrowRight, Check, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string, name: string) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      const chosenName = name.trim() || email.split('@')[0];
      setTimeout(() => {
        onLoginSuccess(email.trim(), chosenName);
        setIsSuccess(false);
        onClose();
      }, 500);
    }, 600);
  };

  const handleQuickGoogle = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess('alex.seller@gmail.com', 'Alex Rivera');
      onClose();
    }, 450);
  };

  const handleInstantDemo = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess('demo.seller@etsyhunter.ai', 'Pro Seller (Demo)');
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0C0D12] border border-white/[0.1] p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo showSubtitle={false} />
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {mode === 'signin' ? 'Welcome back to Etsy Hunter' : 'Create your Etsy Hunter account'}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === 'signin'
                ? 'Access live shopping cart intelligence & product radars.'
                : 'Start uncovering high-margin Etsy niches in minutes.'}
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#14151D] border border-white/[0.06] text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#1D1F2A] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#1D1F2A] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleQuickGoogle}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-[#14151D] hover:bg-[#1A1C26] border border-white/[0.1] hover:border-white/[0.18] rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm group"
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
          <span className="group-hover:text-zinc-100">Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
            or with email
          </span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#12131A] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="alex.seller@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#12131A] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to registered email.')}
                  className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#12131A] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(249,115,22,0.3)] mt-2"
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Authenticated</span>
              </>
            ) : isSubmitting ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Track */}
        <div className="pt-2 border-t border-white/[0.06] text-center">
          <button
            type="button"
            onClick={handleInstantDemo}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>Or explore directly with Guest Demo Workspace</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-zinc-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
