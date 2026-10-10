import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, Zap } from 'lucide-react';

interface EtsyHunterPricingProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenWorkspace: () => void;
}

export const EtsyHunterPricing: React.FC<EtsyHunterPricingProps> = ({
  onOpenAuth,
  onOpenWorkspace
}) => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: 'Free Starter',
      price: 0,
      description: 'Ideal for new sellers validating their first product niche on Etsy.',
      features: [
        '100 Etsy API Scans / mo',
        'Basic 13-Tag Extractor',
        '3 Competitor Shops Watchlist',
        'Personal Workspace',
        'Standard Margin Calculator'
      ],
      popular: false,
      cta: 'Start Free'
    },
    {
      name: 'Pro Hunter',
      price: annual ? 29 : 39,
      description: 'Built for active Etsy & POD stores needing deep competitor intelligence.',
      features: [
        '500 Etsy API Scans / mo',
        'Unlimited 13-Tag Reverse Engineering',
        '20 Competitor Shops Watchlist',
        'Real-time Buyer Cart Velocity Radar',
        'Multi-Tenant Shop Switcher',
        'Export Listings to CSV',
        'Priority Scraper Cluster Access'
      ],
      popular: true,
      cta: 'Start 7-Day Trial'
    },
    {
      name: 'Enterprise Agency',
      price: annual ? 89 : 119,
      description: 'For e-commerce agencies managing multiple Etsy client catalogs.',
      features: [
        '2,000 Etsy API Scans / mo',
        'Unlimited Competitor Watchlists',
        '100 Team Member Seats',
        'Custom Webhooks & Alerts',
        'Dedicated IP Proxy Cluster',
        'Dedicated 1-on-1 Account Manager'
      ],
      popular: false,
      cta: 'Contact Sales'
    }
  ];

  return (
    <section id="pricing" className="py-24 border-t border-[#22222b] bg-[#08080c] text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>TRANSPARENT PRICING</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            Invest in winning products, not guesswork
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            One successful Etsy listing can generate $3,000+ per month in profit. Choose the plan that matches your shop volume.
          </p>

          {/* Billing Switcher */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs ${!annual ? 'text-[#f7f8f8] font-semibold' : 'text-[#8a8f98]'}`}>
              Monthly billing
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full bg-[#18181f] border border-[#282835] p-0.5 transition-colors cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded-full bg-[#5e6ad2] transition-transform ${
                  annual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${annual ? 'text-[#f7f8f8] font-semibold' : 'text-[#8a8f98]'}`}>
                Annual billing
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#30a46c]/15 text-[#30a46c] border border-[#30a46c]/30">
                SAVE 25%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`p-7 rounded-2xl bg-[#121216] border transition-all flex flex-col justify-between relative ${
                p.popular
                  ? 'border-[#5e6ad2] shadow-[0_0_40px_rgba(94,106,210,0.15)] ring-1 ring-[#5e6ad2]'
                  : 'border-[#22222b] hover:border-[#383848]'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#5e6ad2] text-white text-[10px] font-semibold tracking-wider uppercase shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Most Popular for Sellers</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#f7f8f8]">{p.name}</h3>
                </div>

                <p className="text-xs text-[#8a8f98] mb-6 leading-relaxed">
                  {p.description}
                </p>

                <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-[#22222b]">
                  <span className="text-4xl font-extrabold text-[#f7f8f8] tracking-tight">
                    ${p.price}
                  </span>
                  <span className="text-xs text-[#8a8f98]">
                    {p.price === 0 ? 'forever' : '/ month'}
                  </span>
                </div>

                <ul className="space-y-3 mb-8 text-xs text-[#8a8f98]">
                  {p.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <Check className="w-3.5 h-3.5 text-[#30a46c] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  if (p.price === 0) onOpenWorkspace();
                  else onOpenAuth('signup');
                }}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  p.popular
                    ? 'bg-[#5e6ad2] hover:bg-[#6875e5] text-white shadow-[0_0_16px_rgba(94,106,210,0.35)]'
                    : 'bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-[#f7f8f8]'
                }`}
              >
                <span>{p.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
