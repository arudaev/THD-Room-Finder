import type { CSSProperties, MouseEvent, MouseEventHandler, ReactNode } from 'react';

/** Circular icon button (app-bar actions, back, sponsor). 44px tap target. */
export interface IconButtonProps {
  label: string;
  tone?: 'standard' | 'sponsor' | 'primary';
  href?: string | null;
  onClick?: MouseEventHandler;
  children?: ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}

export function IconButton({
  label,
  tone = 'standard',
  href = null,
  onClick,
  children,
  style = {},
  ...rest
}: IconButtonProps) {
  const tones = {
    standard: { color: 'var(--md-on-surface)' },
    sponsor: { color: 'var(--sponsor)' },
    primary: { color: 'var(--md-primary)' },
  }[tone];
  const hoverBg = {
    standard: 'color-mix(in srgb, var(--md-on-surface) 8%, transparent)',
    sponsor: 'var(--sponsor-container)',
    primary: 'var(--md-primary-container)',
  }[tone];
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--tap-target)',
    height: 'var(--tap-target)',
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background var(--duration-fast) var(--ease-standard)',
    ...tones,
    ...style,
  };
  const Tag: any = href ? 'a' : 'button';
  return (
    <Tag
      href={href || undefined}
      onClick={onClick}
      aria-label={label}
      title={label}
      style={base}
      onMouseEnter={(e: MouseEvent<HTMLElement>) => {
        e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e: MouseEvent<HTMLElement>) => {
        e.currentTarget.style.background = 'transparent';
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
