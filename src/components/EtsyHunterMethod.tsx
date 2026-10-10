import React from 'react';
import { Target, Search, BarChart3, Rocket, ArrowRight } from 'lucide-react';

export const EtsyHunterMethod: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Scan Buyer Cart Signals',
      description: 'Etsy shows "In 20+ carts" tags on products that are currently being actively purchased. We track velocity shifts so you spot early momentum before search results become crowded.',
      icon: Search
    },
    {
      number: '02',
      title: 'Reverse Engineer All 13 Tags',
      description: 'Etsy allows exactly 13 tags per listing. We unpack the exact long-tail keywords that competitors are using to dominate page 1 of search rankings.',
      icon: Target
    },
    {
      number: '03',
      title: 'Simulate Margins & Unit Economics',
      description: 'Calculate Printify / Gelato production costs, Etsy listing and payment fees, and shipping. Ensure listings target 65%+ net margins before launch.',
      icon: BarChart3
    },
    {
      number: '04',
      title: 'Launch & Track Ranking Velocity',
      description: 'Move winning ideas through your workspace research stages. Monitor competitor sales updates and adjust tags to defend your top position.',
      icon: Rocket
    }
  ];

  return (
    <section id="method" className="py-24 border-t border-[#22222b] bg-[#0b0b0f] text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181f] border border-[#282835] text-xs font-mono text-[#707bfb]">
            <span>THE 4-STEP RESEARCH METHOD</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#f7f8f8]">
            The Etsy Hunter System
          </h2>
          <p className="text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            A proven methodology applied by six-figure shops to turn speculative product ideas into predictable, passive cash flow.
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
                  <span>Step {step.number} Protocol</span>
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
