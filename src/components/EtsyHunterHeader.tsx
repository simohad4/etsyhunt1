import React, { useState } from 'react';
import { EtsyHunterLogo } from './EtsyHunterLogo';
import { ArrowRight, Menu, X, Command } from 'lucide-react';

interface EtsyHunterHeaderProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenWorkspace: () => void;
  onOpenCommandMenu?: () => void;
  activeSection?: string;
}

export const EtsyHunterHeader: React.FC<EtsyHunterHeaderProps> = ({
  onOpenAuth,
  onOpenWorkspace,
  onOpenCommandMenu
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#22222b] bg-[#0b0b0f]/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <EtsyHunterLogo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-[#8a8f98]">
            <a href="#features" className="hover:text-[#f7f8f8] transition-colors">
              Features
            </a>
            <a href="#method" className="hover:text-[#f7f8f8] transition-colors">
              Method
            </a>
            <a href="#customers" className="hover:text-[#f7f8f8] transition-colors">
              Customers
            </a>
            <a href="#changelog" className="hover:text-[#f7f8f8] transition-colors flex items-center gap-1.5">
              <span>Changelog</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18181f] text-[#8a8f98] border border-[#282835]">
                2026.10
              </span>
            </a>
            <a href="#pricing" className="hover:text-[#f7f8f8] transition-colors">
              Pricing
            </a>
          </nav>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Quick Cmd+K search launcher */}
          {onOpenCommandMenu && (
            <button
              onClick={onOpenCommandMenu}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#121216] border border-[#22222b] hover:border-[#333342] text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] transition-all cursor-pointer"
              title="Search command menu (Cmd+K)"
            >
              <Command className="w-3 h-3 text-[#5e6ad2]" />
              <span>Search</span>
              <span className="text-[10px] font-mono text-[#575a65] border border-[#22222b] px-1 rounded">⌘K</span>
            </button>
          )}

          <button
            onClick={() => onOpenAuth('login')}
            className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors px-2.5 py-1 cursor-pointer"
          >
            Log in
          </button>

          <button
            onClick={() => onOpenAuth('signup')}
            className="px-3.5 py-1.5 rounded-md bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-[13px] font-medium transition-all shadow-[0_0_16px_rgba(94,106,210,0.35)] flex items-center gap-1.5 cursor-pointer"
          >
            <span>Start Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded text-[#8a8f98] hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#22222b] bg-[#121216] px-4 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#8a8f98] hover:text-white"
          >
            Features
          </a>
          <a
            href="#method"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#8a8f98] hover:text-white"
          >
            Method
          </a>
          <a
            href="#customers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#8a8f98] hover:text-white"
          >
            Customers
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-[#8a8f98] hover:text-white"
          >
            Pricing
          </a>
          <div className="pt-2 border-t border-[#22222b] flex gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('login');
              }}
              className="w-1/2 py-2 rounded bg-[#18181f] text-xs text-[#f7f8f8]"
            >
              Log in
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('signup');
              }}
              className="w-1/2 py-2 rounded bg-[#5e6ad2] text-xs text-white"
            >
              Start Free
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
