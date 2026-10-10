'use client';

import React from 'react';
import { LandingPage } from '@/src/components/LandingPage';

export default function NextLandingPage() {
  return (
    <LandingPage
      onGoToApp={(preset) => {
        if (typeof window !== 'undefined') {
          window.location.href = preset ? `/?q=${encodeURIComponent(preset)}` : '/';
        }
      }}
      onGoToPricing={() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/pricing';
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
