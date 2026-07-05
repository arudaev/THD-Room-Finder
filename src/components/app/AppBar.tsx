import type { CSSProperties, ReactNode } from 'react';
import { Logo } from './Logo';
import { IconButton } from '../core/IconButton';

/**
 * Material 3 top app bar. Two modes:
 *  • brand — logo + wordmark on the left, optional trailing actions.
 *  • back  — back arrow + page title (centered-leading), no logo.
 */
export interface AppBarProps {
  mode?: 'brand' | 'back';
  title?: string;
  onBack?: () => void;
  actions?: ReactNode;
  style?: CSSProperties;
}

export function AppBar({ mode = 'brand', title, onBack, actions = null, style = {} }: AppBarProps) {
  const bar: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 'var(--appbar-height)',
    background: 'var(--md-surface)',
    borderBottom: '1px solid var(--md-outline-variant)',
    padding: '0 0.5rem',
    ...style,
  };

  if (mode === 'back') {
    return (
      <header style={bar}>
        <IconButton label="Back" onClick={onBack}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </IconButton>
        <span
          style={{
            fontWeight: 500,
            fontSize: '1.375rem',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--md-on-surface)',
            marginLeft: '0.25rem',
          }}
        >
          {title}
        </span>
        {actions}
      </header>
    );
  }

  return (
    <header style={bar}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0 0.75rem',
          flex: 1,
          minWidth: 0,
        }}
      >
        <Logo size={24} />
        <span style={{ fontWeight: 500, fontSize: '1.375rem', color: 'var(--md-on-surface)' }}>
          {title || 'THD Room Finder'}
        </span>
      </div>
      {actions}
    </header>
  );
}
