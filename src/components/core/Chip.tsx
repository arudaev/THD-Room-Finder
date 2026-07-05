import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

/** Material 3 filter chip — used for building filters in the room list. */
export interface ChipProps {
  active?: boolean;
  onClick?: MouseEventHandler;
  children?: ReactNode;
  style?: CSSProperties;
  [key: string]: unknown;
}

export function Chip({ active = false, onClick, children, style = {}, ...rest }: ChipProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.375rem 1rem',
    borderRadius: 'var(--radius-s)',
    fontSize: '0.875rem',
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
    border: active ? '1px solid transparent' : '1px solid var(--md-outline-variant)',
    background: active ? 'var(--md-secondary-container)' : 'transparent',
    color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: 0,
    minHeight: 'var(--tap-target)',
    transition:
      'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    ...style,
  };
  return (
    <button type="button" onClick={onClick} style={base} {...rest}>
      {children}
    </button>
  );
}
