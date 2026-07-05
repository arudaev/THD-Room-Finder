import type { ReactNode } from 'react';

/**
 * Inline Feather/Lucide-style line icons — 24×24, fill none, stroke
 * currentColor, stroke-width 2, round caps/joins. They inherit text color, so
 * they recolor with their context. The repo has always hand-inlined icons; we
 * keep that (no icon font, no dependency).
 */
interface IconProps {
  size?: number;
}

function svg(size: number, children: ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconList = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ));

export const IconMap = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </>
  ));

export const IconStar = ({ size = 24 }: IconProps) =>
  svg(size, <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />);

export const IconStarFilled = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconClock = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ));

export const IconRefresh = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </>
  ));

export const IconUsers = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ));

export const IconMail = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ));

export const IconChevronRight = ({ size = 24 }: IconProps) =>
  svg(size, <polyline points="9 18 15 12 9 6" />);

export const IconMapPin = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ));

export const IconSun = ({ size = 24 }: IconProps) =>
  svg(size, (
    <>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>
  ));

export const IconMoon = ({ size = 24 }: IconProps) =>
  svg(size, <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />);
