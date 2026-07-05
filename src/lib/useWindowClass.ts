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

/**
 * Whether to use the wide, side-by-side (map + panel, rail/drawer) layout.
 * True only when the viewport is both wide enough *and* landscape — a tablet
 * held upright (portrait) is tall and narrow, so it gets the mobile stacked
 * layout even though its width alone would qualify as medium/expanded.
 */
export function isWideLayout(width: number, height: number): boolean {
  return width >= 600 && width > height;
}

export function useWideLayout(): boolean {
  const [wide, setWide] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isWideLayout(window.innerWidth, window.innerHeight) : false,
  );
  useEffect(() => {
    const on = () => setWide(isWideLayout(window.innerWidth, window.innerHeight));
    on();
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return wide;
}
