import React from 'react';
import { EtsyHunterLogo } from './EtsyHunterLogo';

export const EtsyHunterFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#22222b] bg-[#08080c] text-xs text-[#8a8f98] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <EtsyHunterLogo />
          <div className="flex items-center gap-6 font-mono text-[11px] text-[#575a65]">
            <span>STATUS: ALL ETSY SCRAPERS OPERATIONAL</span>
            <span>API LATENCY: 180MS</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-[#22222b]/50">
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Product</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#features" className="hover:text-white transition-colors">Etsy Tag Analyzer</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Competitor Sales Radar</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Margin Simulator</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing &amp; Plans</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Niches</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#8a8f98]">Digital Downloads</span></li>
              <li><span className="text-[#8a8f98]">POD Apparel &amp; Sweatshirts</span></li>
              <li><span className="text-[#8a8f98]">Home &amp; Living Crafts</span></li>
              <li><span className="text-[#8a8f98]">Personalized Jewelry</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Method</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#method" className="hover:text-white transition-colors">Sales Velocity Principles</a></li>
              <li><a href="#method" className="hover:text-white transition-colors">13 Tag SEO Formula</a></li>
              <li><a href="#customers" className="hover:text-white transition-colors">Power Seller Case Studies</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Legal &amp; Privacy</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#8a8f98]">Privacy Policy</span></li>
              <li><span className="text-[#8a8f98]">Terms of Service</span></li>
              <li><span className="text-[#8a8f98]">Etsy Trademark Disclaimer</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#22222b]/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#575a65]">
          <div>
            © {new Date().getFullYear()} Etsy Hunter AI. Not affiliated with Etsy, Inc.
          </div>
          <div>
            Built with high-performance engineering for high-performing sellers.
          </div>
        </div>
      </div>
    </footer>
  );
};
