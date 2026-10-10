import React from 'react';
import { Sparkles, Key, ShieldCheck, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenSettings: () => void;
  hasCustomToken: boolean;
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  hasCustomToken,
  onOpenHelp
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Logo />

        {/* Status badges & Controls */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Gemini 3.8 Flash</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Apify Actor Ready</span>
          </div>

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              hasCustomToken
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
            title="Configure Apify API Token"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apify Token</span>
            {hasCustomToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            )}
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
            title="How it works"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
