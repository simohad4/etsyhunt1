import React from 'react';
import { Sparkles } from 'lucide-react';

interface EtsyHunterLogoProps {
  className?: string;
  onClick?: () => void;
  showText?: boolean;
}

export const EtsyHunterIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 text-white' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    aria-label="Etsy Hunter Logo"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.229 60.77C-1.89 44.595 2.812 27.914 14.18 15.655 25.548 3.395 42.148-2.716 58.421.656c16.273 3.372 30.245 15.83 36.198 32.092 5.954 16.262 3.16 34.339-7.404 48.21-10.565 13.87-27.629 21.81-45.108 21.303C24.628 101.754 8.784 92.858 1.229 77.014l22.262-10.625c4.444 9.317 13.763 14.55 24.042 14.848 10.28.298 20.316-4.372 26.529-12.529 6.213-8.158 7.857-18.79 4.355-28.354-3.501-9.564-11.719-16.891-21.289-18.874-9.571-1.984-19.334 1.61-26.02 8.82-6.686 7.21-9.452 17.021-7.617 26.535L1.229 60.77Z"
    />
  </svg>
);

export const EtsyHunterLogo: React.FC<EtsyHunterLogoProps> = ({
  className = '',
  onClick,
  showText = true
}) => {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 select-none transition-all ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
    >
      <div className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white shadow-[0_0_14px_rgba(94,106,210,0.45)] group-hover:scale-105 transition-transform">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      {showText && (
        <span className="font-semibold text-sm tracking-[-0.03em] text-[#f7f8f8]">
          Etsy Hunter
        </span>
      )}
    </div>
  );
};
