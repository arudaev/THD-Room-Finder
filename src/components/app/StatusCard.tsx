import type { CSSProperties } from 'react';
import type { RoomStatus } from '../../domain/models';

/**
 * Large status banner at the top of a room detail screen — a Material 3 tonal
 * container. Answer-first: an optional duration reads as the hero on the right
 * (mono, tabular), so "how long" is the first thing the eye lands on.
 *   free → green · soon → amber · occupied → red.
 */
export interface StatusCardProps {
  status?: RoomStatus;
  title: string;
  sub?: string;
  duration?: string;
  style?: CSSProperties;
}

export function StatusCard({ status = 'free', title, sub, duration, style = {} }: StatusCardProps) {
  const tones = {
    free: { background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)' },
    soon: { background: 'var(--md-warning-container)', color: 'var(--md-on-warning-container)' },
    occupied: { background: 'var(--md-error-container)', color: 'var(--md-on-error-container)' },
  }[status];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-l)',
        boxShadow: 'var(--md-shadow-1)',
        ...tones,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '1rem' }}>{title}</div>
        {sub && <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.92 }}>{sub}</div>}
      </div>
      {duration && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.75rem',
            fontWeight: 400,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {duration}
        </div>
      )}
    </div>
  );
}
