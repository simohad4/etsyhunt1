import React from 'react';
import { Target, Search, BarChart3, Database } from 'lucide-react';

export const EtsyHunterCustomers: React.FC = () => {
  const useCases = [
    {
      title: 'Digital Download Creators',
      description: 'Analyze spreadsheet templates, digital planners, and wall art keywords with low production overhead.',
      category: 'Digital Products'
    },
    {
      title: 'Print-on-Demand Apparel',
      description: 'Evaluate seasonal sweatshirt and t-shirt design trends, model blank margins, and inspect candidate tags.',
      category: 'POD Sellers'
    },
    {
      title: 'Handmade Crafts & Gifts',
      description: 'Review custom keepsake demand, price dispersion, and active cart volumes across gift categories.',
      category: 'Handmade & Custom'
    },
    {
      title: 'Multi-Niche Catalog Managers',
      description: 'Organize candidate listings by category and export clean CSV datasets for inventory forecasting.',
      category: 'Catalog Research'
    }
  ];

  return (
    <section id="customers" className="py-20 border-t border-[#22222b] bg-[#0b0b0f] text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase font-mono tracking-widest text-[#8a8f98] mb-4">
          SUPPORTED SELLER WORKFLOWS
        </p>
        <h3 className="text-2xl sm:text-3xl font-bold text-[#f7f8f8] mb-12">
          Designed for diverse Etsy product categories
        </h3>

        {/* Use Cases Grid (Truthful, non-fabricated) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {useCases.map((uc, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#121216] border border-[#22222b] hover:border-[#333342] transition-colors"
            >
              <div className="text-[11px] font-mono text-[#707bfb] mb-1 font-semibold">
                {uc.category}
              </div>
              <div className="text-sm font-semibold text-[#f7f8f8] mb-2">
                {uc.title}
              </div>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
