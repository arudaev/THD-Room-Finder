import { useEffect, useState } from 'react';

/**
 * Material 3 window size class — the same breakpoints AdaptiveNav uses, exposed
 * to the app shell so it can place navigation (bottom bar vs rail vs drawer)
 * and switch single-column vs list-detail layouts.
 */
export type WindowClass = 'compact' | 'medium' | 'expanded';

export function classFor(width: number): WindowClass {
  if (width >= 840) return 'expanded';
  if (width >= 600) return 'medium';
  return 'compact';
}

export function useWindowClass(): WindowClass {
  const [cls, setCls] = useState<WindowClass>(() =>
    typeof window !== 'undefined' ? classFor(window.innerWidth) : 'compact',
  );
  useEffect(() => {
    const on = () => setCls(classFor(window.innerWidth));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cls;
}
