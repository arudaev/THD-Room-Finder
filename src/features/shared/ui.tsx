import type { CSSProperties, ReactNode } from 'react';

/** A page content column with the responsive gutter + a sensible max width. */
export function Page({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 640,
        marginInline: 'auto',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-overline)',
        fontSize: 'var(--label-small-size)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-10) 0',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          border: '3px solid var(--md-outline-variant)',
          borderTopColor: 'var(--md-primary)',
          borderRadius: '50%',
          animation: 'thd-spin 0.9s linear infinite',
        }}
      />
      {label && <span style={{ fontSize: 'var(--body-medium-size)' }}>{label}</span>}
      <style>{'@keyframes thd-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-4)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      <div style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>{title}</div>
      {hint && <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--body-medium-size)' }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, retryLabel }: {
  message: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-10) var(--space-4)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      <div style={{ fontWeight: 500, color: 'var(--status-occupied)' }}>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 'var(--space-4)',
            border: 'none',
            background: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.5rem 1.25rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
