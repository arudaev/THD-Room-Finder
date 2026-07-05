import type { CSSProperties, ReactNode } from 'react';

/**
 * Small status badge / pill. Tones map to the app's semantics:
 * free (green), allday (blue), occupied (red), neutral (grey).
 */
export type BadgeTone = 'free' | 'allday' | 'occupied' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children?: ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}

export function Badge({ tone = 'neutral', children, style = {}, ...rest }: BadgeProps) {
  const tones = {
    free: { background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)' },
    allday: { background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' },
    occupied: { background: 'var(--md-error-container)', color: 'var(--md-on-error-container)' },
    neutral: { background: 'var(--md-surface-variant)', color: 'var(--md-on-surface-variant)' },
  }[tone];
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--radius-s)',
    whiteSpace: 'nowrap',
    ...tones,
    ...style,
  };
  return (
    <span style={base} {...rest}>
      {children}
    </span>
  );
}
