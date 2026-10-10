import React from 'react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  onClick,
  showSubtitle = true
}) => {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 select-none transition-opacity ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
    >
      {/* Etsy Hunter-style Hexagonal / Layered Vector Icon */}
      <div className="relative w-8 h-8 rounded-lg bg-[#14151C] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(249,115,22,0.15)] group-hover:border-orange-500/40 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent opacity-60" />
        <svg
          className="w-4 h-4 text-orange-400 relative z-10 transition-transform group-hover:scale-105 duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm tracking-tight text-white">
            Etsy<span className="text-orange-400">Hunter</span>
          </span>
          <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
            RADAR
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">
            Market Intelligence
          </span>
        )}
      </div>
    </div>
  );
};
