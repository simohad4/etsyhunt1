import React, { useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
  Zap
} from 'lucide-react';
import type { AdminPage } from '../appRoutes';
import {
  type AdminPermission,
  type VerifiedAdminAccess,
  canAccessAdminPage,
  useAdminAccess
} from '../security/adminAccess';
import { useAuth } from '../context/AuthContext';
import { EtsyHunterLogo } from './EtsyHunterLogo';
import { RouteAccessState, RouteLoadingState } from './AppRouteStates';

interface AdminRouteProps {
  page: AdminPage;
  pathname: string;
  session: Session;
  user: User;
  navigate: (path: string) => void;
}

interface AdminNavItem {
  label: string;
  path: string;
  page: Exclude<AdminPage, 'not_found'>;
  permission?: AdminPermission;
  superAdminOnly?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV_GROUPS: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', path: '/admin/overview', page: 'overview', permission: 'dashboard.view', icon: LayoutDashboard },
      { label: 'Analytics', path: '/admin/analytics', page: 'analytics', permission: 'analytics.view', icon: BarChart3 }
    ]
  },
  {
    label: 'Customers',
    items: [
      { label: 'Users', path: '/admin/users', page: 'users', permission: 'users.view', icon: Users },
      { label: 'Subscriptions', path: '/admin/subscriptions', page: 'subscriptions', permission: 'subscriptions.view', icon: CreditCard }
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Credits', path: '/admin/credits', page: 'credits', permission: 'credits.view', icon: Zap },
      { label: 'Research', path: '/admin/research', page: 'research', permission: 'research.view', icon: Activity }
    ]
  },
  {
    label: 'Access control',
    items: [
      { label: 'Admins & invitations', path: '/admin/admins', page: 'admins', superAdminOnly: true, icon: UserCog },
      { label: 'Audit log', path: '/admin/audit', page: 'audit', permission: 'audit.view', icon: FileClock },
      { label: 'Settings', path: '/admin/settings', page: 'settings', permission: 'settings.view', icon: Settings }
    ]
  }
];

const PAGE_DETAILS: Record<Exclude<AdminPage, 'not_found'>, { title: string; description: string }> = {
  overview: { title: 'Admin overview', description: 'Your server-verified administrative access for Etsy Hunter.' },
  users: { title: 'Users', description: 'Customer visibility requires a dedicated permission-checked server API.' },
  subscriptions: { title: 'Subscriptions', description: 'Subscription visibility will be connected after its admin API is approved.' },
  credits: { title: 'Research credits', description: 'Credit operations remain unavailable until audited backend endpoints exist.' },
  research: { title: 'Research operations', description: 'Paid research providers remain disabled in this release.' },
  analytics: { title: 'Analytics', description: 'No analytics are shown until authoritative aggregate data is available.' },
  admins: { title: 'Admins & invitations', description: 'Membership management UI is intentionally deferred beyond the routed shell.' },
  audit: { title: 'Audit log', description: 'Audit records require a permission-protected read endpoint before display.' },
  settings: { title: 'Admin settings', description: 'Administrative settings will be added only with supported server contracts.' }
};

function canAccessItem(access: VerifiedAdminAccess, item: AdminNavItem): boolean {
  if (item.superAdminOnly) return access.role === 'super_admin';
  if (!item.permission) return true;
  return access.role === 'super_admin' || access.permissions.includes(item.permission);
}

const AdminShell: React.FC<{
  access: VerifiedAdminAccess;
  page: AdminPage;
  user: User;
  navigate: (path: string) => void;
}> = ({ access, page, user, navigate }) => {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const details = page === 'not_found' ? null : PAGE_DETAILS[page];

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const sidebar = (
    <aside className="h-full w-72 lg:w-64 bg-[#0b0b0f] border-r border-[#22222b] flex flex-col">
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#22222b]">
        <EtsyHunterLogo onClick={() => go('/admin/overview')} />
        <button type="button" onClick={() => setMobileOpen(false)} className="lg:hidden p-2 text-[#8a8f98] hover:text-white" aria-label="Close admin navigation">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="px-3 py-4 overflow-y-auto flex-1">
        <div className="mb-5 px-3 py-3 rounded-xl border border-[#5e6ad2]/30 bg-[#5e6ad2]/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f7f8f8]"><ShieldCheck className="w-4 h-4 text-[#707bfb]" /> Server verified</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-[#8a8f98]">{access.role.replace('_', ' ')}</div>
        </div>
        <nav aria-label="Admin navigation" className="space-y-5">
          {ADMIN_NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => canAccessItem(access, item));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#575a65]">{group.label}</div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = page === item.page;
                    return (
                      <button key={item.path} type="button" onClick={() => go(item.path)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#18181f] border border-[#282835] text-white' : 'text-[#8a8f98] hover:text-white hover:bg-[#121216]'}`}>
                        <Icon className={`w-4 h-4 ${active ? 'text-[#707bfb]' : 'text-[#575a65]'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="p-3 border-t border-[#22222b] space-y-2">
        <button type="button" onClick={() => go('/app/board')} className="w-full px-3 py-2 rounded-lg text-xs text-[#8a8f98] hover:text-white hover:bg-[#121216] flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4" /> Customer workspace
        </button>
        <div className="p-2.5 rounded-lg bg-[#121216] border border-[#22222b] flex items-center justify-between gap-2">
          <div className="min-w-0"><div className="text-xs font-medium truncate">{user.email || 'Admin account'}</div><div className="text-[10px] text-[#575a65]">Authenticated</div></div>
          <button type="button" onClick={() => void signOut().then(() => navigate('/'))} className="p-2 text-[#575a65] hover:text-[#e5484d]" aria-label="Log out"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="h-dvh bg-[#0b0b0f] text-[#f7f8f8] flex overflow-hidden">
      <div className="hidden lg:block shrink-0">{sidebar}</div>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close admin navigation overlay" />}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="h-16 px-4 sm:px-6 border-b border-[#22222b] bg-[#0e0e13]/90 backdrop-blur flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 text-[#8a8f98] hover:text-white" aria-label="Open admin navigation"><Menu className="w-5 h-5" /></button>
            <div className="min-w-0"><div className="text-[10px] uppercase tracking-[0.14em] text-[#575a65]">Admin console</div><div className="text-sm font-semibold truncate">{details?.title || 'Not found'}</div></div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#8a8f98]"><ShieldCheck className="w-3.5 h-3.5 text-[#30a46c]" /> Current access verified</div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {page === 'not_found' ? (
            <section className="max-w-2xl rounded-2xl border border-[#282835] bg-[#121216] p-6 sm:p-8">
              <h1 className="text-2xl font-semibold tracking-tight">Admin page not found</h1>
              <p className="mt-2 text-sm leading-6 text-[#8a8f98]">The requested admin route does not exist or is not available in this release.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate('/admin/overview')} className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-sm font-semibold text-white">Admin overview</button>
                <button type="button" onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-[#18181f] border border-[#282835] hover:border-[#383848] text-sm">Public site</button>
              </div>
            </section>
          ) : page === 'overview' ? (
            <div className="max-w-5xl space-y-6">
              <div><h1 className="text-2xl font-semibold tracking-tight">{details?.title}</h1><p className="mt-1 text-sm text-[#8a8f98]">{details?.description}</p></div>
              <section className="rounded-2xl border border-[#282835] bg-[#121216] overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-[#22222b] flex items-start justify-between gap-4"><div><div className="text-sm font-semibold">Administrative access</div><div className="mt-1 text-xs text-[#8a8f98]">Loaded from the protected server authorization endpoint.</div></div><span className="px-2.5 py-1 rounded-full bg-[#30a46c]/10 border border-[#30a46c]/30 text-[10px] font-semibold uppercase tracking-wider text-[#30a46c]">Active</span></div>
                <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-4 text-sm"><div className="rounded-xl bg-[#18181f] border border-[#282835] p-4"><div className="text-xs text-[#8a8f98]">Role</div><div className="mt-2 font-medium capitalize">{access.role.replace('_', ' ')}</div></div><div className="rounded-xl bg-[#18181f] border border-[#282835] p-4"><div className="text-xs text-[#8a8f98]">Granted permissions</div><div className="mt-2 font-mono text-[#707bfb]">{access.permissions.length}</div></div></div>
              </section>
            </div>
          ) : (
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-xs text-[#575a65] mb-5"><span>Admin</span><ChevronRight className="w-3.5 h-3.5" /><span className="text-[#8a8f98]">{details?.title}</span></div>
              <section className="rounded-2xl border border-[#282835] bg-[#121216] p-6 sm:p-8"><h1 className="text-2xl font-semibold tracking-tight">{details?.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8f98]">{details?.description}</p><div className="mt-8 rounded-xl border border-dashed border-[#333342] bg-[#0b0b0f] p-6 text-sm text-[#8a8f98]">This shell does not invent administrative data or capabilities. The operational screen will be implemented after its server contract is available and reviewed.</div></section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const EtsyHunterAdminRoute: React.FC<AdminRouteProps> = ({ page, pathname, session, user, navigate }) => {
  const { state, retry } = useAdminAccess(session.access_token, pathname);

  if (state.status === 'loading') return <RouteLoadingState label="Verifying current admin membership and permissions…" />;
  if (state.status !== 'authorized') {
    return <RouteAccessState kind={state.status} message={state.message} onHome={() => navigate('/')} onRetry={state.status === 'unavailable' ? retry : undefined} />;
  }
  if (!canAccessAdminPage(state.access, page)) {
    return <RouteAccessState kind="forbidden" message="Your verified admin permissions do not allow this page." onHome={() => navigate('/')} />;
  }
  return <AdminShell access={state.access} page={page} user={user} navigate={navigate} />;
};
