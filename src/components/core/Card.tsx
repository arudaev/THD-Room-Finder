import type { CSSProperties, MouseEvent, MouseEventHandler, ReactNode } from 'react';

/**
 * Material 3 ElevatedCard. The universal surface container — rests at
 * elevation 1, optionally lifts to 2 on hover when `interactive`.
 */
export interface CardProps {
  interactive?: boolean;
  tone?: 'surface' | 'sunken';
  href?: string | null;
  onClick?: MouseEventHandler;
  children?: ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}

export function Card({
  interactive = false,
  tone = 'surface',
  href = null,
  onClick,
  children,
  style = {},
  ...rest
}: CardProps) {
  const tones = {
    surface: { background: 'var(--md-surface)', color: 'var(--md-on-surface)' },
    sunken: { background: 'var(--md-surface-1)', color: 'var(--md-on-surface)' },
  }[tone];
  const base: CSSProperties = {
    display: 'block',
    borderRadius: 'var(--radius-l)',
    boxShadow: 'var(--md-shadow-1)',
    padding: '1.5rem',
    textDecoration: 'none',
    cursor: interactive || href ? 'pointer' : 'default',
    transition:
      'box-shadow var(--duration-medium) var(--ease-standard), transform var(--duration-medium) var(--ease-standard)',
    ...tones,
    ...style,
  };
  const onEnter = (e: MouseEvent<HTMLElement>) => {
    if (interactive || href) {
      e.currentTarget.style.boxShadow = 'var(--md-shadow-2)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }
  };
  const onLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.boxShadow = 'var(--md-shadow-1)';
    e.currentTarget.style.transform = 'translateY(0)';
  };
  const Tag: any = href ? 'a' : 'div';
  return (
    <Tag
      href={href || undefined}
      onClick={onClick}
      style={base}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}
