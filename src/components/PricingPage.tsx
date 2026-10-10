import React, { useState } from 'react';
import { Logo } from './Logo';
import {
  Check,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Zap,
  Layers,
  HelpCircle
} from 'lucide-react';

interface PricingPageProps {
  onBackToHome: () => void;
  onSelectPlan: (planName: string, price: number) => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  onBackToHome,
  onSelectPlan,
  onOpenAuth,
  isLoggedIn
}) => {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      id: 'starter',
      name: 'Starter Plan',
      description: 'Ideal for newer Etsy sellers validating their initial product catalog.',
      monthlyPrice: 29,
      annualPrice: 23,
      features: [
        '150 Niche searches / month',
        'Live buyer in-cart counts & signals',
        '24-Hour checkout velocity indicators',
        'Top 20 competitor listings per search',
        'Unit margin & platform fee simulator',
        'Standard CSV spreadsheet export',
        'Etsy US Marketplace access'
      ],
      ctaText: 'Get Started'
    },
    {
      id: 'pro',
      name: 'Professional Plan',
      badge: 'MOST POPULAR',
      description: 'Built for active Print-on-Demand (POD) and handmade store owners scaling sales.',
      monthlyPrice: 59,
      annualPrice: 47,
      highlight: true,
      features: [
        '500 Niche searches / month',
        'Unlimited live cart radar queries',
        'High-margin winning product angles',
        '13 Ready-to-paste Etsy SEO tag groups',
        'Supplier blank cost & profit calculator',
        'Full competitor grid with CSV exports',
        'Multi-marketplace support (US, UK, DE, CA)',
        'Priority search query speed'
      ],
      ctaText: 'Start 7-Day Free Trial'
    },
    {
      id: 'enterprise',
      name: 'Agency & Pro Plan',
      description: 'For power sellers and high-volume POD brands managing large product catalogs.',
      monthlyPrice: 99,
      annualPrice: 79,
      features: [
        '2,000 Niche searches / month',
        'Multi-store catalog monitoring & tracking',
        'All global Etsy marketplaces (US, UK, DE, CA, AU)',
        'Unlimited bulk CSV data exports',
        'High-frequency radar updates for seasonal trends',
        'Automated saturation threshold alerts',
        'Direct priority customer support'
      ],
      ctaText: 'Upgrade to Agency & Pro'
    }
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-zinc-100 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-white/[0.07] bg-[#08090C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div onClick={onBackToHome} className="cursor-pointer">
            <Logo showSubtitle={false} />
          </div>

          <div>
            {!isLoggedIn ? (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <span className="text-xs font-mono text-zinc-400">Logged in</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Pricing Hero */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 text-center">
        <div className="space-y-3 max-w-xl mx-auto">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
            Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Simple, Transparent Plans for Every Stage
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Uncover high-velocity Etsy niches and stop guessing product margins.
          </p>

          {/* Billing Toggle (Etsy Hunter Pill) */}
          <div className="pt-2">
            <div className="inline-flex items-center p-1 rounded-lg bg-[#12131A] border border-white/[0.08] text-xs">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  !isAnnual ? 'bg-white/[0.1] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isAnnual ? 'bg-white/[0.1] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-mono font-semibold text-orange-400">SAVE 20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {plans.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-6 flex flex-col justify-between space-y-6 transition-all ${
                  plan.highlight
                    ? 'bg-[#101118] border border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.12)]'
                    : 'bg-[#0D0E14] border border-white/[0.08] hover:border-white/[0.14]'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 right-6 px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-mono font-semibold tracking-wider">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">{plan.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1 min-h-[36px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white font-mono">
                      ${price}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/month</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 font-mono">
                    {isAnnual ? `Billed annually ($${price * 12}/yr)` : 'Billed monthly'}
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-white/[0.06]">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectPlan(plan.name, price)}
                  className={`w-full py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    plan.highlight
                      ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-[0_0_14px_rgba(249,115,22,0.3)]'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-white'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Guarantee Banner */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-[#0D0E14] border border-white/[0.07] flex items-center gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200 block">7-Day Satisfaction Guarantee</span>
            Cancel anytime within your account dashboard with zero lock-in or cancellation penalties.
          </div>
        </div>
      </main>
    </div>
  );
};
