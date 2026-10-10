import React from 'react';
import { Target, Search, BarChart3, Bookmark, ArrowRight } from 'lucide-react';

export const EtsyHunterMethod: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Define Target Keywords',
      description: 'Enter one or more keyword phrases to search for listings. Review the estimated credit requirements before running the research search.',
      icon: Search
    },
    {
      number: '02',
      title: 'Analyze Listing Signals',
      description: 'Review observed prices, shop ratings, and in-cart badges alongside modeled sales estimates and saturation scores.',
      icon: BarChart3
    },
    {
      number: '03',
      title: 'Simulate Margins & Costs',
      description: 'Calculate item production blanks, packaging, shipping, and Etsy marketplace fees to estimate expected net margins.',
      icon: Target
    },
    {
      number: '04',
      title: 'Save & Track Candidates',
      description: 'Organize high-opportunity listings in your personal library and export full datasets to CSV for external planning.',
      icon: Bookmark
    }
  ];

  return (
    <section id="method" className="py-24 border-t border-[#22222b] bg-[#0b0b0f] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>STRUCTURED RESEARCH PROCESS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            The Etsy Hunter Workflow
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            A methodical four-step framework for discovering and evaluating product opportunities on Etsy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#121216] border border-[#22222b] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-2xl font-bold text-[#5e6ad2]">
                      {step.number}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#18181f] border border-[#282835] flex items-center justify-center text-[#8a8f98]">
                      <Icon className="w-4 h-4 text-[#707bfb]" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#f7f8f8] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#22222b]/40 flex items-center gap-1 text-[11px] font-mono text-[#707bfb]">
                  <span>Step {step.number}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
