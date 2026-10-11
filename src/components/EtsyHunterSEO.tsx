import React, { useEffect } from 'react';
import { EtsyProductItem } from '../types/etsyHunter';
import type { AdminPage } from '../appRoutes';

interface EtsyHunterSEOProps {
  viewMode: 'landing' | 'workspace' | 'admin';
  activeTab?: 'board' | 'watchlist' | 'settings';
  adminPage?: AdminPage;
  workspaceName?: string;
  selectedProduct?: EtsyProductItem | null;
}

export const EtsyHunterSEO: React.FC<EtsyHunterSEOProps> = ({
  viewMode,
  activeTab,
  adminPage,
  workspaceName,
  selectedProduct
}) => {
  useEffect(() => {
    let title = 'Etsy Hunter — Product Research & Market Intelligence';
    let description =
      'Etsy product research and market intelligence tool. Evaluate niches, inspect candidate tags, analyze observed marketplace signals, and model demand metrics.';

    if (viewMode === 'landing') {
      title = 'Etsy Hunter — Product Research & Market Intelligence for Sellers';
      description =
        'Etsy product research and market intelligence tool. Evaluate niches, inspect candidate tags, analyze observed marketplace signals, and model demand metrics.';
    } else if (viewMode === 'admin') {
      const pageName = adminPage === 'not_found'
        ? 'Page Not Found'
        : (adminPage || 'overview').replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
      title = `${pageName} | Admin Console — Etsy Hunter`;
      description = 'Protected Etsy Hunter administration workspace.';
    } else if (viewMode === 'workspace') {
      const wsTitle = workspaceName || 'Personal Workspace';
      if (selectedProduct) {
        title = `${selectedProduct.identifier}: ${selectedProduct.title} | ${wsTitle} — Etsy Hunter`;
        description = `Observed price: $${selectedProduct.observedPrice.toFixed(2)}, estimated monthly revenue: $${selectedProduct.estimatedMonthlyRevenue.toLocaleString()}/mo.`;
      } else if (activeTab === 'board') {
        title = `Product Research Board | ${wsTitle} — Etsy Hunter`;
        description = `Evaluate candidate Etsy listings and research stages inside ${wsTitle}.`;
      } else if (activeTab === 'watchlist') {
        title = `Saved Listings Library | ${wsTitle} — Etsy Hunter`;
        description = `Manage your curated library of candidate listings inside ${wsTitle}.`;
      } else if (activeTab === 'settings') {
        title = `Plan & Research Credits | ${wsTitle} — Etsy Hunter`;
        description = `Manage research credits, saved listing quotas, and plan tiers in ${wsTitle}.`;
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
  }, [viewMode, activeTab, adminPage, workspaceName, selectedProduct]);

  return null;
};
