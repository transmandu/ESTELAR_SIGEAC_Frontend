'use client';

import { Suspense } from 'react';
import LoadingPage from '@/components/misc/LoadingPage';
import { HardTimeDashboard } from './_components/hard-time-dashboard';

export default function HardTimePage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <HardTimeDashboard />
    </Suspense>
  );
}
