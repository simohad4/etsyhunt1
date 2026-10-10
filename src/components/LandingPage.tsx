import React, { useState } from 'react';
import { Logo } from './Logo';
import {
  Flame,
  ArrowRight,
  ShoppingCart,
  ShieldCheck,
  Target,
  Star,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Percent,
  Check,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  Command,
  Zap,
  Layers,
  Users,
  Compass,
  ArrowUpRight
} from 'lucide-react';

interface LandingPageProps {
  onGoToApp: (presetKeyword?: string) => void;
  onGoToPricing: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  isLoggedIn: boolean;
  userEmail?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToApp,
  onGoToPricing,
  onOpenAuth,
  isLoggedIn,
  userEmail
}) => {
  const [demoQuery, setDemoQuery] = useState('');
  const [mockActiveTab, setMockActiveTab] = useState<'table' | 'kpis' | 'economics'>('table');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoQuery.trim()) {
      onGoToApp(demoQuery.trim());
    } else {
      onGoToApp('ghost mug');
    }
  };

  const trendingSignals = [
    'ghost mug',
    'retro nurse sweatshirt',
    'custom birth flower ring',
    'bachelorette favor bags',
    'leather keychain'
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-zinc-100 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* 1. Etsy Hunter-style Navigation Header */}
      <header className="border-b border-white/[0.07] bg-[#08090C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Logo onClick={() => onGoToApp()} />

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#radar-preview" className="hover:text-zinc-100 transition-colors">
              Radar Preview
            </a>
            <a href="#methodology" className="hover:text-zinc-100 transition-colors">
              Cart Intelligence
            </a>
            <button
              onClick={onGoToPricing}
              className="hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <a href="#faq" className="hover:text-zinc-100 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <button
                onClick={() => onGoToApp()}
                className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.3)]"
              >
                <span>Open Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => onGoToApp()}
                  className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                >
                  <span>Live Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Etsy Hunter Glowing Grid */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6 overflow-hidden">
        {/* Etsy Hunter Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Minimalist Etsy Hunter Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12131A] border border-white/[0.08] text-xs font-medium text-zinc-300 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#F97316]" />
          <span className="text-[11px] text-zinc-300">Live In-Cart Intelligence for High-Growth Etsy &amp; POD Sellers</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          Find Winning Etsy Products Backed by Real-Time Cart Intelligence.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Stop guessing seasonal demand from stale search volume. Uncover exact items sitting in active buyer shopping carts and calculate take-home margins before creating inventory.
        </p>

        {/* Live Interactive Search Bar (Etsy Hunter Quick-Query Input) */}
        <form onSubmit={handleDemoSubmit} className="max-w-xl mx-auto pt-2">
          <div className="relative flex items-center p-1 rounded-xl bg-[#12131A] border border-white/[0.1] hover:border-white/[0.2] focus-within:border-orange-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all">
            <Search className="w-4 h-4 text-zinc-400 ml-3 pointer-events-none shrink-0" />
            <input
              type="text"
              value={demoQuery}
              onChange={(e) => setDemoQuery(e.target.value)}
              placeholder="Test any keyword (e.g. ghost mug, wedding gift)..."
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.3)] cursor-pointer"
            >
              <span>Scan Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trending signals */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Live signals:</span>
            {trendingSignals.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onGoToApp(item)}
                className="px-2 py-0.5 rounded-md bg-[#12131A] hover:bg-[#161822] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] text-[11px] transition-colors cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </form>

        {/* 3. Social Proof / Metrics Bar (Etsy Hunter Ticker) */}
        <div className="pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <div className="p-3.5 rounded-xl bg-[#0F1016] border border-white/[0.07] text-center">
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">2,400,000+</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Listings Indexed Daily</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F1016] border border-white/[0.07] text-center">
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">98.4%</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Cart Demand Precision</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F1016] border border-white/[0.07] text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-400 font-mono">&lt; 1.2s</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Real-Time Radar Speed</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F1016] border border-white/[0.07] text-center">
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">6 Global</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Etsy Marketplaces Tracked</div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 font-mono">
            *Verified marketplace analytics workspace benchmark
          </p>
        </div>

        {/* 4. Hero Preview Mockup (Etsy Hunter Dashboard Window) */}
        <div id="radar-preview" className="pt-8 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-[#0C0D13] border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden text-left">
            {/* Window title bar */}
            <div className="h-10 px-4 border-b border-white/[0.07] bg-[#0A0B10] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                </div>
                <div className="h-3 w-px bg-white/[0.08] mx-1" />
                <span className="text-[11px] text-zinc-400 font-mono">
                  etsyhunter.app/workspace/radar?q=ghost+mug
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
                  LIVE RADAR ACTIVE
                </span>
              </div>
            </div>

            {/* Dashboard Inner Preview */}
            <div className="p-5 space-y-4">
              {/* Preview KPI row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/[0.08]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                    Buyer Demand Score
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">88 / 100</div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    High cart addition velocity (240+ carts)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/[0.08]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                    Competition Saturation
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">42 / 100</div>
                  <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Moderate saturation · Open angles available
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#12131A] border border-white/[0.08]">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                    Opportunity Index
                  </div>
                  <div className="text-2xl font-bold text-orange-400 font-mono mt-1">82 / 100</div>
                  <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    High profit potential for POD ceramic drinkware
                  </div>
                </div>
              </div>

              {/* Preview Rows Table */}
              <div className="rounded-xl bg-[#101118] border border-white/[0.07] overflow-hidden">
                <div className="px-4 py-2 border-b border-white/[0.06] text-[10px] font-semibold uppercase text-zinc-500 tracking-wider flex items-center justify-between">
                  <span>Top Live Competitors Sampled</span>
                  <span className="font-mono text-zinc-400">Query: &ldquo;ghost mug&rdquo;</span>
                </div>
                <div className="divide-y divide-white/[0.04] text-xs">
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#181922] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono text-zinc-500">
                        ☕
                      </div>
                      <div>
                        <div className="text-zinc-200 font-medium">Ghost Ceramic Coffee Mug with Floral Accents</div>
                        <div className="text-[10px] text-zinc-500 font-mono">SpookyPotteryStudio · 4.9 ★ (1,840)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 font-mono text-right">
                      <div>
                        <div className="text-zinc-200 font-semibold">$24.95</div>
                        <div className="text-[10px] text-zinc-500">Retail</div>
                      </div>
                      <div>
                        <div className="text-orange-400 font-semibold">24 in carts</div>
                        <div className="text-[10px] text-emerald-400">+18 sold 24h</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        BESTSELLER
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#181922] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono text-zinc-500">
                        👻
                      </div>
                      <div>
                        <div className="text-zinc-200 font-medium">Personalized Cute Ghost Campfire Enamel Mug</div>
                        <div className="text-[10px] text-zinc-500 font-mono">FallVibesPrintShop · 5.0 ★ (920)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 font-mono text-right">
                      <div>
                        <div className="text-zinc-200 font-semibold">$28.00</div>
                        <div className="text-[10px] text-zinc-500">Retail</div>
                      </div>
                      <div>
                        <div className="text-orange-400 font-semibold">18 in carts</div>
                        <div className="text-[10px] text-emerald-400">+12 sold 24h</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        HIGH DEMAND
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-400">
                  Ready to test your niche idea in the real workspace?
                </span>
                <button
                  onClick={() => onGoToApp('ghost mug')}
                  className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Launch Live Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Trending Niche Cards (Etsy Hunter Issue-Card Grid) */}
      <section className="py-16 border-t border-white/[0.07] bg-[#08090E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono font-medium text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#F97316]" />
                RADAR INTELLIGENCE
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Live Trending Niche Cards
              </h2>
              <p className="text-xs text-zinc-400 max-w-xl">
                Real-time buyer shopping cart volume indexed across active Etsy shop listings. Test any niche directly in your workspace.
              </p>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Simulated Live Radar Metrics</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Niche Card 1 */}
            <div className="group rounded-xl bg-[#0F1017] hover:bg-[#131520] border border-white/[0.08] hover:border-orange-500/40 p-4 space-y-3.5 transition-all duration-200 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
                    Drinkware &amp; Ceramic
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    94 Score
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Ghost Ceramic Mug
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Spooky &amp; fall season gift drinkware with 3D embossed handle
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">Active Carts</div>
                    <div className="text-orange-400 font-bold flex items-center gap-1 mt-0.5">
                      <ShoppingCart className="w-3 h-3 shrink-0" />
                      142 carts
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">24h Velocity</div>
                    <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      +58 orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.06]">
                  <span>Sweet Spot: <strong className="text-zinc-200">$24.50</strong></span>
                  <span className="text-emerald-400 font-medium">~68% Margin</span>
                </div>
              </div>
              <button
                onClick={() => onGoToApp('ghost mug')}
                className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-orange-500 hover:text-white text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Analyze in Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Niche Card 2 */}
            <div className="group rounded-xl bg-[#0F1017] hover:bg-[#131520] border border-white/[0.08] hover:border-orange-500/40 p-4 space-y-3.5 transition-all duration-200 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
                    POD Apparel
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    91 Score
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Retro Nurse Sweatshirt
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Evergreen healthcare appreciation oversized aesthetic crewneck
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">Active Carts</div>
                    <div className="text-orange-400 font-bold flex items-center gap-1 mt-0.5">
                      <ShoppingCart className="w-3 h-3 shrink-0" />
                      215 carts
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">24h Velocity</div>
                    <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      +74 orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.06]">
                  <span>Sweet Spot: <strong className="text-zinc-200">$38.00</strong></span>
                  <span className="text-emerald-400 font-medium">~54% Margin</span>
                </div>
              </div>
              <button
                onClick={() => onGoToApp('retro nurse sweatshirt')}
                className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-orange-500 hover:text-white text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Analyze in Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Niche Card 3 */}
            <div className="group rounded-xl bg-[#0F1017] hover:bg-[#131520] border border-white/[0.08] hover:border-orange-500/40 p-4 space-y-3.5 transition-all duration-200 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
                    Custom Keepsake
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    87 Score
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Custom Birth Flower Ring
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Minimalist botanical personalized engraved stainless steel / silver
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">Active Carts</div>
                    <div className="text-orange-400 font-bold flex items-center gap-1 mt-0.5">
                      <ShoppingCart className="w-3 h-3 shrink-0" />
                      98 carts
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">24h Velocity</div>
                    <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      +39 orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.06]">
                  <span>Sweet Spot: <strong className="text-zinc-200">$29.90</strong></span>
                  <span className="text-emerald-400 font-medium">~72% Margin</span>
                </div>
              </div>
              <button
                onClick={() => onGoToApp('custom birth flower ring')}
                className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-orange-500 hover:text-white text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Analyze in Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Niche Card 4 */}
            <div className="group rounded-xl bg-[#0F1017] hover:bg-[#131520] border border-white/[0.08] hover:border-orange-500/40 p-4 space-y-3.5 transition-all duration-200 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
                    Wedding &amp; Favors
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    89 Score
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Bachelorette Favor Bags
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Bridal party hangover survival kit custom canvas pouches
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">Active Carts</div>
                    <div className="text-orange-400 font-bold flex items-center gap-1 mt-0.5">
                      <ShoppingCart className="w-3 h-3 shrink-0" />
                      120 carts
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                    <div className="text-[10px] text-zinc-500">24h Velocity</div>
                    <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      +45 orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.06]">
                  <span>Sweet Spot: <strong className="text-zinc-200">$14.50</strong></span>
                  <span className="text-emerald-400 font-medium">~81% Margin</span>
                </div>
              </div>
              <button
                onClick={() => onGoToApp('bachelorette favor bags')}
                className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.05] hover:bg-orange-500 hover:text-white text-zinc-300 text-xs font-medium border border-white/[0.08] hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Analyze in Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Features Grid (Etsy Hunter Architecture) */}
      <section id="features" className="py-20 border-t border-white/[0.07] bg-[#0A0B10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
              Platform Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered for High-Velocity Etsy Research
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Four specialized modules built to validate demand before investing time or blank inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="group rounded-xl bg-[#0E0F16] hover:bg-[#12131C] border border-white/[0.08] hover:border-white/[0.14] p-5 space-y-3 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-[#14151E] border border-white/[0.08] flex items-center justify-center text-orange-400 group-hover:border-orange-500/40 transition-colors">
                <ShoppingCart className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Real-Time Cart Tracking
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                See exact numbers of items currently sitting in active buyer shopping carts and 24-hour transaction frequency.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-xl bg-[#0E0F16] hover:bg-[#12131C] border border-white/[0.08] hover:border-white/[0.14] p-5 space-y-3 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-[#14151E] border border-white/[0.08] flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Demand &amp; Saturation Score
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Algorithmic score comparing active customer velocity against competing bestseller saturation in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-xl bg-[#0E0F16] hover:bg-[#12131C] border border-white/[0.08] hover:border-white/[0.14] p-5 space-y-3 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-[#14151E] border border-white/[0.08] flex items-center justify-center text-amber-400 group-hover:border-amber-500/40 transition-colors">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Unit Margin Simulator
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Simulate net profit factoring listing fees, 6.5% Etsy transaction fees, payment processing, and blank costs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-xl bg-[#0E0F16] hover:bg-[#12131C] border border-white/[0.08] hover:border-white/[0.14] p-5 space-y-3 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-[#14151E] border border-white/[0.08] flex items-center justify-center text-sky-400 group-hover:border-sky-500/40 transition-colors">
                <Download className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Etsy Hunter CSV Data Exports
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instant one-click exports with full competitor metadata, tags, and pricing ready for spreadsheet analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why Cart Intelligence vs Search Volume */}
      <section id="methodology" className="py-20 border-t border-white/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
              The Critical Difference
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why Cart Velocity Beats Stale Search Volume
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Most tools rely on estimated historical Google trends that are weeks behind live buyer intent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* The Old Way */}
            <div className="rounded-xl bg-[#0F1015] border border-white/[0.06] p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <XCircle className="w-4 h-4" />
                <span>The Legacy Keyword Approach</span>
              </div>
              <ul className="space-y-2.5 text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500">•</span>
                  <span>Relies on delayed search volume averages that miss 48-hour viral TikTok spikes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500">•</span>
                  <span>Search queries do not indicate intent to purchase or actual items added to carts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500">•</span>
                  <span>Results in bloated stores with hundreds of dead listings that never sell.</span>
                </li>
              </ul>
            </div>

            {/* The EtsyHunter Way */}
            <div className="rounded-xl bg-[#0E1218] border border-orange-500/20 p-5 space-y-3 shadow-[0_0_20px_rgba(249,115,22,0.06)]">
              <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-orange-400" />
                <span>EtsyHunter Cart Intelligence</span>
              </div>
              <ul className="space-y-2.5 text-zinc-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span>Tracks real buyer cart additions directly from active Etsy sessions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span>Measures 24-hour checkout volume to confirm real money changing hands.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span>Pinpoints high-margin angles with calculated platform fees before listing.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Preview (Aligned Standard SaaS Tiers) */}
      <section className="py-20 border-t border-white/[0.07] bg-[#0A0B10]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
              Predictable Pricing
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Scale Your Product Catalog with Certainty
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Transparent plans designed for solo creators, handmade stores, and scaling POD sellers.
            </p>

            {/* Toggle Billing */}
            <div className="inline-flex items-center p-1 rounded-lg bg-[#12131A] border border-white/[0.08] text-xs pt-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  billingPeriod === 'monthly' ? 'bg-white/[0.1] text-white font-medium' : 'text-zinc-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  billingPeriod === 'annual' ? 'bg-white/[0.1] text-white font-medium' : 'text-zinc-400'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] text-orange-400 font-mono font-semibold">SAVE 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter */}
            <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Starter</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    For individual creators validating initial Etsy product concepts.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white font-mono">
                    ${billingPeriod === 'annual' ? '23' : '29'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/month</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-white/[0.06]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>150 Live niche searches / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Active buyer in-cart radar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>24h Checkout velocity signals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Standard CSV data export</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToPricing}
                className="w-full py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Choose Starter
              </button>
            </div>

            {/* Professional (Highlighted) */}
            <div className="relative rounded-xl bg-[#101118] border border-orange-500/40 p-6 flex flex-col justify-between space-y-6 shadow-[0_0_30px_rgba(249,115,22,0.12)]">
              <div className="absolute -top-2.5 right-6 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-mono font-semibold tracking-wider">
                MOST POPULAR
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Professional</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    For active POD and handmade store owners scaling listings weekly.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white font-mono">
                    ${billingPeriod === 'annual' ? '47' : '59'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/month</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-200 pt-2 border-t border-white/[0.06]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>500 Live niche searches / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Full AI Winning Blueprints</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Ready-to-paste Etsy SEO tag groups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Interactive Margin Simulator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Global Marketplaces (US, UK, DE, CA)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToPricing}
                className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-xs font-medium text-white transition-colors cursor-pointer shadow-[0_0_14px_rgba(249,115,22,0.3)]"
              >
                Start 7-Day Free Trial
              </button>
            </div>

            {/* Agency & Pro */}
            <div className="rounded-xl bg-[#0D0E14] border border-white/[0.08] p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white">Agency &amp; Pro</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    For power sellers and automated catalog operators.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white font-mono">
                    ${billingPeriod === 'annual' ? '79' : '99'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/month</span>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 pt-2 border-t border-white/[0.06]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>2,000 Live niche searches / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>All 6 Global marketplaces</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Bulk CSV exports &amp; automated alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Priority radar queue processing</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToPricing}
                className="w-full py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Select Agency &amp; Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" className="py-20 border-t border-white/[0.07]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-zinc-400">
              Clear answers regarding data sources, scraping accuracy, and Etsy compliance.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-[#0E0F15] border border-white/[0.07] p-4 space-y-1.5">
              <div className="font-semibold text-zinc-200">
                Where does the live cart and 24h order count data come from?
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Etsy displays live buyer signals (e.g. &ldquo;in 20+ carts&rdquo;, &ldquo;15 bought in the last 24 hours&rdquo;) directly on listing pages during active customer sessions. Our engine indexes these real-time signals without relying on simulated guesses.
              </p>
            </div>

            <div className="rounded-lg bg-[#0E0F15] border border-white/[0.07] p-4 space-y-1.5">
              <div className="font-semibold text-zinc-200">
                How does the profit and fee calculator work?
              </div>
              <p className="text-zinc-400 leading-relaxed">
                The simulator models Etsy's current fee schedule: $0.20 listing fee, 6.5% transaction fee on item and shipping, plus 3% + $0.25 payment processing fees, and subtracts your supplier blank cost.
              </p>
            </div>

            <div className="rounded-lg bg-[#0E0F15] border border-white/[0.07] p-4 space-y-1.5">
              <div className="font-semibold text-zinc-200">
                Can I export data for Excel or Google Sheets?
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Yes. Every search allows clean CSV exports including listing title, shop, exact price, in-cart counts, ratings, and listing URLs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Final CTA & Footer */}
      <section className="py-16 border-t border-white/[0.07] bg-gradient-to-b from-[#08090C] to-[#0D0E14] text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Ready to Find Your Next Bestseller?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Launch your first radar scan in seconds. No credit card required for the initial workspace preview.
        </p>
        <button
          onClick={() => onGoToApp('ghost mug')}
          className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-[0_0_16px_rgba(249,115,22,0.35)] transition-all cursor-pointer"
        >
          <span>Launch Free Market Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] bg-[#060709] py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo showSubtitle={false} />
          <div className="flex items-center gap-6 text-[11px]">
            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
            <button onClick={onGoToPricing} className="hover:text-zinc-300 transition-colors cursor-pointer">Pricing</button>
            <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
            <span>© 2026 EtsyHunter AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
