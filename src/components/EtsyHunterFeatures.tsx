import React from 'react';
import { Tag, TrendingUp, Search, Zap, ShieldCheck, Database, Sliders, BarChart2 } from 'lucide-react';

export const EtsyHunterFeatures: React.FC = () => {
  const features = [
    {
      icon: Tag,
      badge: 'Listing Inspection',
      title: 'Candidate Tag & Keyword Analysis',
      description: 'Inspect listing tags and identify relevant search phrases used by ranking products in your niche category.',
      shortcut: 'Tag Analysis'
    },
    {
      icon: TrendingUp,
      badge: 'Marketplace Signals',
      title: 'Observed Cart Signals & Demand Trends',
      description: 'Observe active buyer in-cart badges and compare estimated monthly sales volume across competing listings.',
      shortcut: 'Demand Signals'
    },
    {
      icon: Search,
      badge: 'Opportunity Discovery',
      title: 'Competition & Opportunity Scoring',
      description: 'Review modeled saturation ratings and opportunity scores to identify low-competition niches with proven interest.',
      shortcut: 'Opportunity'
    },
    {
      icon: Database,
      badge: 'Curated Tracking',
      title: 'Personal Saved Listings Library',
      description: 'Save high-interest listings to your personal workspace. Organize candidate concepts by research stage.',
      shortcut: 'Saved Listings'
    },
    {
      icon: Sliders,
      badge: 'Unit Economics',
      title: 'Estimated Margin Simulator',
      description: 'Simulate production blanks, shipping costs, and Etsy platform fees to model potential net margins before investing.',
      shortcut: 'Margin Model'
    },
    {
      icon: Zap,
      badge: 'Workflow Speed',
      title: 'Fast Keyboard-Driven Interface',
      description: 'Designed for efficient research sessions. Jump between views with ⌘K, inspect listing tags, and export datasets to CSV.',
      shortcut: '⌘K'
    }
  ];

  return (
    <section id="features" className="py-24 border-t border-[#22222b] bg-[#08080c] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>BUILT FOR ETSY SELLERS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            Core tools to research and evaluate product niches
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            Etsy Hunter provides transparent market intelligence, separating directly observed platform signals from estimated projections.
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

                  <p className="text-xs sm:text-sm text-[#8a8f98] leading-relaxed mt-2">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#22222b]/50 flex items-center justify-between text-xs text-[#575a65]">
                  <span>{feat.shortcut}</span>
                  <span className="font-mono text-[#707bfb]">Research Feature</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
