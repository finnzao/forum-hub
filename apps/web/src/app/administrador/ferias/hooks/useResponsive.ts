'use client';

import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function getBreakpoint(w: number): Breakpoint {
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Returns consistent 'desktop' during SSR and first client render
 * to avoid hydration mismatch. Updates to real breakpoint after mount.
 */
export function useResponsive() {
  // Always start as desktop to match SSR output
  const [bp, setBp] = useState<Breakpoint>('desktop');
  const [mounted, setMounted] = useState(false);

  const update = useCallback(() => {
    setBp(getBreakpoint(window.innerWidth));
  }, []);

  useEffect(() => {
    update();
    setMounted(true);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  return {
    bp,
    mounted,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    isMobileOrTablet: bp !== 'desktop',
  };
}
