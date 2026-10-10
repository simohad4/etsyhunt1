import React, { useEffect } from 'react';
import { EtsyProductItem } from '../types/etsyHunter';

interface EtsyHunterSEOProps {
  viewMode: 'landing' | 'workspace';
  activeTab?: 'board' | 'watchlist' | 'settings';
  workspaceName?: string;
  selectedProduct?: EtsyProductItem | null;
}

export const EtsyHunterSEO: React.FC<EtsyHunterSEOProps> = ({
  viewMode,
  activeTab,
  workspaceName,
  selectedProduct
}) => {
  useEffect(() => {
    let title = 'Etsy Hunter AI';
    let description =
      'AI-powered market research, demand validation, and winning product generator for Etsy, POD, and dropshipping sellers.';

    if (viewMode === 'landing') {
      title = 'Etsy Hunter AI';
      description =
        'AI-powered market research, demand validation, and winning product generator for Etsy, POD, and dropshipping sellers.';
    } else if (viewMode === 'workspace') {
      const shopTitle = workspaceName || 'Etsy Hunter Shop';
      if (selectedProduct) {
        title = `${selectedProduct.identifier}: ${selectedProduct.title} | ${shopTitle} — Etsy Hunter AI`;
        description = `Live sales velocity: $${selectedProduct.estimatedMonthlyRevenue.toLocaleString()}/mo, ${selectedProduct.inCartCount} buyers currently have this listing in cart.`;
      } else if (activeTab === 'board') {
        title = `Niche Research Board | ${shopTitle} — Etsy Hunter AI`;
        description = `Track high-potential Etsy product ideas, 13 tags, and buyer cart volume inside ${shopTitle}.`;
      } else if (activeTab === 'watchlist') {
        title = `Competitor Shop Watchlist | ${shopTitle} — Etsy Hunter AI`;
        description = `Real-time competitor shop tracking and winning listing radar inside ${shopTitle}.`;
      } else if (activeTab === 'settings') {
        title = `Shop Settings & Quota | ${shopTitle} — Etsy Hunter AI`;
        description = `Manage multi-tenant Etsy shop configurations, API scan quotas, and seats in ${shopTitle}.`;
      }
    }

    document.title = title;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // OpenGraph Title & Description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    // Twitter Title & Description
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);

    let twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', description);
  }, [viewMode, activeTab, workspaceName, selectedProduct]);

  return null;
};
