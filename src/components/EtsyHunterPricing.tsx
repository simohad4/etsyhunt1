import React from 'react';
import { PRICING_PLANS } from '../config/pricing';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

interface EtsyHunterPricingProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenWorkspace: () => void;
}

export const EtsyHunterPricing: React.FC<EtsyHunterPricingProps> = ({
  onOpenAuth,
  onOpenWorkspace
}) => {
  const plans = [PRICING_PLANS.starter, PRICING_PLANS.pro, PRICING_PLANS.agency];

  return (
    <section id="pricing" className="py-24 border-t border-[#22222b] bg-[#08080c] text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>SUBSCRIPTION PLANS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            Simple, credit-based research pricing
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            Choose the plan that fits your monthly product research volume. Each research credit queries one keyword search page with approximately up to 36 listings.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-7 rounded-2xl bg-[#121216] border transition-all flex flex-col justify-between relative ${
                p.recommended
                  ? 'border-[#5e6ad2] shadow-[0_0_40px_rgba(94,106,210,0.15)] ring-1 ring-[#5e6ad2]'
                  : 'border-[#22222b] hover:border-[#383848]'
              }`}
            >
              {p.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#5e6ad2] text-white text-[10px] font-semibold tracking-wider uppercase shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommended</span>
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
                    / month
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
                onClick={() => onOpenAuth('signup')}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  p.recommended
                    ? 'bg-[#5e6ad2] hover:bg-[#6875e5] text-white shadow-[0_0_16px_rgba(94,106,210,0.35)]'
                    : 'bg-[#18181f] hover:bg-[#202029] border border-[#282835] text-[#f7f8f8]'
                }`}
              >
                <span>{p.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Pricing Transparency Footnote */}
        <div className="mt-12 text-xs text-[#575a65] max-w-2xl mx-auto space-y-1">
          <p>
            1 credit = 1 keyword search page (approx. up to 36 listings depending on provider results).
          </p>
          <p>
            Credits reset monthly. Unused credits do not roll over. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};
