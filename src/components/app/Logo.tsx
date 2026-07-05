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
    <img
      src="/icons/app-icon.svg"
      alt="THD Room Finder"
      width={size}
      height={size}
      draggable={false}
      style={{ borderRadius: rounded ? Math.round(size * 0.22) : 0, display: 'block', ...style }}
    />
  );
}
