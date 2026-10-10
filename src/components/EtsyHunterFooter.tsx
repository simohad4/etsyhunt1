import React from 'react';
import { EtsyHunterLogo } from './EtsyHunterLogo';

export const EtsyHunterFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#22222b] bg-[#08080c] text-xs text-[#8a8f98] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <EtsyHunterLogo />
          <div className="flex items-center gap-6 font-mono text-[11px] text-[#575a65]">
            <span>CREDIT MODEL: 1 CREDIT / PAGE</span>
            <span>DATA: OBSERVED &amp; ESTIMATED</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-[#22222b]/50">
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Product</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#features" className="hover:text-white transition-colors">Product Research</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Tag &amp; Keyword Explorer</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Margin Simulator</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing &amp; Plans</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Categories</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#8a8f98]">Digital Downloads</span></li>
              <li><span className="text-[#8a8f98]">Print-on-Demand Apparel</span></li>
              <li><span className="text-[#8a8f98]">Home &amp; Living</span></li>
              <li><span className="text-[#8a8f98]">Jewelry &amp; Accessories</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Research Workflow</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#method" className="hover:text-white transition-colors">Observed Cart Signals</a></li>
              <li><a href="#method" className="hover:text-white transition-colors">Candidate Tag Analysis</a></li>
              <li><a href="#method" className="hover:text-white transition-colors">Opportunity Scoring</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-[#f7f8f8]">Legal &amp; Disclosure</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#8a8f98]">Privacy Policy</span></li>
              <li><span className="text-[#8a8f98]">Terms of Service</span></li>
              <li><span className="text-[#8a8f98]">Research Data Methodology</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#22222b]/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#575a65]">
          <div>
            © {new Date().getFullYear()} Etsy Hunter. All rights reserved.
          </div>
          <div>
            Etsy Hunter is an independent research tool and is not endorsed by or affiliated with Etsy, Inc.
          </div>
        </div>
      </div>
    </footer>
  );
};
