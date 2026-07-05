import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * A minimal popover: a compact trigger that reveals a floating panel, so
 * secondary controls (settings, time picker, filters) stay out of sight until
 * tapped. Closes on outside-click or Escape. The whole thing is wrapped in one
 * ref, so clicking the trigger counts as "inside" and just toggles.
 */
export function Popover({
  trigger,
  children,
  ariaLabel,
  active = false,
  round = false,
  align = 'end',
  panelStyle = {},
}: {
  /** Inner content of the trigger button. */
  trigger: ReactNode;
  /** Panel content; receives a `close` callback. */
  children: ReactNode | ((close: () => void) => ReactNode);
  ariaLabel: string;
  /** Tints the trigger to show something is applied (e.g. active filters). */
  active?: boolean;
  /** Round icon-button trigger (vs. a pill). */
  round?: boolean;
  align?: 'start' | 'end';
  panelStyle?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerStyle: CSSProperties = round
    ? {
        display: 'grid',
        placeItems: 'center',
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        background: open ? 'var(--md-secondary-container)' : 'transparent',
        color: active || open ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
        cursor: 'pointer',
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        border: '1px solid var(--md-outline-variant)',
        background: active || open ? 'var(--md-secondary-container)' : 'var(--md-surface)',
        color: active || open ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
        borderRadius: 'var(--radius-xl)',
        padding: '0.4rem 0.75rem',
        fontSize: 'var(--body-small-size)',
        fontWeight: 'var(--weight-medium)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        style={triggerStyle}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'end' ? 'right' : 'left']: 0,
            zIndex: 50,
            minWidth: 220,
            maxWidth: 'min(88vw, 320px)',
            maxHeight: 'min(70vh, 520px)',
            overflowY: 'auto',
            background: 'var(--md-surface)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: 'var(--radius-m)',
            boxShadow: 'var(--md-shadow-2)',
            padding: 'var(--space-3)',
            ...panelStyle,
          }}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/** Small caption above a group of controls inside a popover. */
export function PopoverLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-overline)',
        fontSize: 'var(--label-small-size)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--md-on-surface-variant)',
        margin: '0 0 var(--space-2)',
      }}
    >
      {children}
    </div>
  );
}
