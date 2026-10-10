import React from 'react';

export const EtsyHunterCustomers: React.FC = () => {
  const brandLogos = [
    { name: 'AuraCraft Studios', metric: '$480k/yr on Etsy', badge: 'Top 0.1% Seller' },
    { name: 'Lumina Digital Lab', metric: '42,000 Sales', badge: 'Digital Download Powerhouse' },
    { name: 'Paws & Thread Co', metric: '68% Net Margin', badge: 'POD Apparel Leader' },
    { name: 'Velvet Oak Woodworks', metric: '$28k/mo Sales', badge: 'Handmade Home Decor' },
    { name: 'Starlight Jewels', metric: '18,500 Reviews', badge: 'Star Seller Awardee' }
  ];

  return (
    <section id="customers" className="py-20 border-t border-[#22222b] bg-[#0b0b0f] text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase font-mono tracking-widest text-[#8a8f98] mb-8">
          Powering over 12,000+ top 1% Etsy sellers, POD creators &amp; digital store owners
        </p>

        {/* Brand Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {brandLogos.map((brand, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#121216] border border-[#22222b] hover:border-[#333342] transition-colors text-left group"
            >
              <div className="text-[11px] font-mono text-[#707bfb] mb-1 font-semibold">
                {brand.badge}
              </div>
              <div className="text-sm font-semibold text-[#f7f8f8] group-hover:text-white transition-colors">
                {brand.name}
              </div>
              <div className="text-xs font-mono text-[#30a46c] mt-1">
                {brand.metric}
              </div>
            </div>
          ))}
        </div>

        {/* Featured Testimonial Card */}
        <div className="max-w-3xl mx-auto mt-12 p-6 sm:p-8 rounded-2xl bg-[#121216] border border-[#22222b] relative text-left">
          <div className="flex items-center gap-1 text-[#f5d90a] mb-4">
            {'★★★★★'.split('').map((star, idx) => (
              <span key={idx} className="text-sm">★</span>
            ))}
          </div>
          <blockquote className="text-base sm:text-lg text-[#f7f8f8] leading-relaxed font-normal">
            &ldquo;Etsy Hunter AI replaced both eRank and Everbee for our studio. The lightning-speed keyboard workflows and 13-tag extractor helped us launch 12 winning listings last month that are now generating over $42,000 in monthly revenue.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Elena Rostova"
              className="w-9 h-9 rounded-full ring-1 ring-[#5e6ad2]"
            />
            <div>
              <div className="text-xs font-semibold text-[#f7f8f8]">Elena Rostova</div>
              <div className="text-[11px] text-[#8a8f98]">Founder &amp; Lead Designer, AuraCraft Studios ($480k/yr on Etsy)</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
