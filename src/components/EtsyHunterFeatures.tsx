import React from 'react';
import { Tag, TrendingUp, Search, Zap, ShieldCheck, Database, Sliders, ArrowUpRight } from 'lucide-react';

export const EtsyHunterFeatures: React.FC = () => {
  const features = [
    {
      icon: Tag,
      badge: 'Algorithm Advantage',
      title: '13 Bestseller Tag Extraction',
      description: 'Instantly reverse engineer all 13 hidden algorithmic tags of top ranking Etsy listings. Copy in one click directly into your Etsy Shop Manager.',
      shortcut: 'Tag Extractor'
    },
    {
      icon: TrendingUp,
      badge: 'Live Radar',
      title: 'Real-Time Sales & Cart Velocity',
      description: 'Track how many shoppers currently have an item in cart and estimate 24h & monthly revenue velocity with 94.2% historical accuracy.',
      shortcut: 'Velocity Radar'
    },
    {
      icon: Search,
      badge: 'High Demand / Low Comp',
      title: 'Keyword Gap & Saturation Finder',
      description: 'Identify high-demand buyer search phrases with low shop saturation scores. Uncover untapped goldmine niches before competitors spot them.',
      shortcut: 'Gap Finder'
    },
    {
      icon: Database,
      badge: 'Live Sync',
      title: 'Automated Competitor Shop Watchlist',
      description: 'Pin top Etsy competitor shops to your workspace radar. Track new product launches, listing price changes, and bestseller badges automatically.',
      shortcut: 'Shop Radar'
    },
    {
      icon: Sliders,
      badge: 'Unit Economics',
      title: 'Margin & Production Simulator',
      description: 'Model POD blanks, print provider shipping, Etsy transaction and listing fees. Know your exact net profit margin before creating a single draft.',
      shortcut: 'Margin Calc'
    },
    {
      icon: Zap,
      badge: 'Keyboard Speed',
      title: 'Instant Keyboard-Driven Workflow',
      description: 'Built for high-volume research. Jump across niches with Cmd+K, open tag inspection with C, and manage pipeline stages in seconds.',
      shortcut: '⌘K + C'
    }
  ];

  return (
    <section id="features" className="py-24 border-t border-[#22222b] bg-[#08080c] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>ENGINEERED FOR POWER SELLERS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            Features built to uncover profitable niches fast
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            Stop guessing with generic tools. Etsy Hunter AI gives you verified buyer signals, exact tag combinations, and instant margin calculations.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group p-6 rounded-2xl bg-[#121216] border border-[#22222b] hover:border-[#383848] transition-all flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#18181f] border border-[#282835] flex items-center justify-center text-[#5e6ad2] mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-[#707bfb]" />
                  </div>

                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#707bfb] mb-1 font-semibold">
                    {feat.badge}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#f7f8f8]">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#22222b]/50 flex items-center justify-between text-xs text-[#575a65]">
                  <span>Etsy Hunter high-speed index</span>
                  <span className="font-mono text-[#707bfb]">0.2s latency</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
