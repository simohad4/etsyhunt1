import React from 'react';
import { AlertTriangle, ArrowLeft, LoaderCircle, LockKeyhole, ShieldX } from 'lucide-react';
import { EtsyHunterLogo } from './EtsyHunterLogo';
import { DashboardLoadingSkeleton } from './dashboard/DashboardUI';

interface RouteStateFrameProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}

const RouteStateFrame: React.FC<RouteStateFrameProps> = ({ icon, title, description, children }) => (
  <main className="min-h-screen bg-[#0b0b0f] text-[#f7f8f8] flex items-center justify-center p-6 eh-grid-bg">
    <div className="w-full max-w-md rounded-2xl border border-[#282835] bg-[#121216] p-7 shadow-2xl">
      <EtsyHunterLogo />
      <div className="mt-8 w-11 h-11 rounded-xl border border-[#282835] bg-[#18181f] flex items-center justify-center text-[#707bfb]">
        {icon}
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#8a8f98]">{description}</p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </div>
  </main>
);

export const RouteLoadingState: React.FC<{ label?: string; dashboard?: boolean }> = ({
  label = 'Restoring your secure session…',
  dashboard = false
}) => dashboard ? (
  <main className="min-h-screen bg-[#0b0b0f] p-4 text-[#f7f8f8] sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl">
      <DashboardLoadingSkeleton label={label} />
    </div>
  </main>
) : (
  <RouteStateFrame icon={<LoaderCircle className="w-5 h-5 animate-spin" />} title="Loading Etsy Hunter" description={label} />
);

interface RouteAccessStateProps {
  kind: 'unauthorized' | 'forbidden' | 'unavailable';
  message: string;
  onHome: () => void;
  onLogin?: () => void;
  onRetry?: () => void;
}

export const RouteAccessState: React.FC<RouteAccessStateProps> = ({ kind, message, onHome, onLogin, onRetry }) => {
  const title = kind === 'unauthorized' ? 'Sign in required' : kind === 'forbidden' ? 'Access denied' : 'Access check unavailable';
  const icon = kind === 'unauthorized'
    ? <LockKeyhole className="w-5 h-5" />
    : kind === 'forbidden'
      ? <ShieldX className="w-5 h-5" />
      : <AlertTriangle className="w-5 h-5" />;

  return (
    <RouteStateFrame icon={icon} title={title} description={message}>
      {onLogin && <button type="button" onClick={onLogin} className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-sm font-semibold text-white">Sign in</button>}
      {onRetry && <button type="button" onClick={onRetry} className="px-4 py-2 rounded-lg bg-[#18181f] border border-[#282835] hover:border-[#5e6ad2] text-sm">Retry verification</button>}
      <button type="button" onClick={onHome} className="px-4 py-2 rounded-lg bg-[#18181f] border border-[#282835] hover:border-[#383848] text-sm flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Public site
      </button>
    </RouteStateFrame>
  );
};

export const RouteNotFoundState: React.FC<{ onHome: () => void; onWorkspace?: () => void }> = ({ onHome, onWorkspace }) => (
  <RouteStateFrame icon={<AlertTriangle className="w-5 h-5" />} title="Page not found" description="The requested Etsy Hunter page does not exist or is not available in this release.">
    {onWorkspace && <button type="button" onClick={onWorkspace} className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-sm font-semibold text-white">Open workspace</button>}
    <button type="button" onClick={onHome} className="px-4 py-2 rounded-lg bg-[#18181f] border border-[#282835] hover:border-[#383848] text-sm">Public site</button>
  </RouteStateFrame>
);
