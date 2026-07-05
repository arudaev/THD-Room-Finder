import type { CSSProperties } from 'react';

/**
 * The THD Room Finder app mark — an open door with green light spilling out
 * ("a free room"), white on THD blue. Renders the brand SVG inline at any size.
 */
export interface LogoProps {
  size?: number;
  rounded?: boolean;
  style?: CSSProperties;
}

export function Logo({ size = 24, rounded = true, style = {} }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="THD Room Finder"
      style={{ borderRadius: rounded ? Math.round(size * 0.22) : 0, display: 'block', ...style }}
    >
      <rect width="108" height="108" fill="#1565C0" rx="24" />
      <path fill="#FFFFFF" d="M35 84 L35 47 Q35 29 54 29 Q73 29 73 47 L73 84 Z" />
      <path fill="#1565C0" d="M43 84 L43 49 Q43 37 54 37 Q65 37 65 49 L65 84 Z" />
      <path fill="#4FD0A0" d="M43 84 L64 84 L43 63 Z" />
      <path fill="#FFFFFF" d="M43 84 L43 51 L57 57 L57 84 Z" />
      <circle cx="52.5" cy="70" r="2.1" fill="#1565C0" />
    </svg>
  );
}
