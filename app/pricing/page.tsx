'use client';

import React from 'react';
import { PricingPage } from '@/src/components/PricingPage';

export default function NextPricingPage() {
  return (
    <PricingPage
      onBackToHome={() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }}
      onSelectPlan={(planName) => {
        if (typeof window !== 'undefined') {
          window.location.href = `/?plan=${encodeURIComponent(planName)}`;
        }
      }}
      onOpenAuth={() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/?auth=1';
        }
      }}
      isLoggedIn={false}
    />
  );
}
