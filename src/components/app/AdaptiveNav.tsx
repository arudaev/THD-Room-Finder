import { useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Logo } from './Logo';

/**
 * Material 3 adaptive navigation. One component, three forms, picked by window
 * size class (or forced for specimens):
 *   • compact  (< 600px)  → bottom navigation bar
 *   • medium   (600–839)  → navigation rail
 *   • expanded (≥ 840px)  → navigation drawer (sidebar)
 * Labels are caller-supplied, so the same nav works in English or German.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export interface AdaptiveNavProps {
  items: NavItem[];
  active?: string;
  onSelect?: (id: string) => void;
  variant?: 'auto' | 'bar' | 'rail' | 'drawer';
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}

const BP = { medium: 600, expanded: 840 };

type NavForm = 'bar' | 'rail' | 'drawer';

function classFor(w: number): NavForm {
  if (w >= BP.expanded) return 'drawer';
  if (w >= BP.medium) return 'rail';
  return 'bar';
}

function Indicator({
  icon,
  isActive,
  w = 56,
  h = 32,
}: {
  icon: ReactNode;
  isActive: boolean;
  w?: number;
  h?: number;
}) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        height: h,
        borderRadius: 'var(--radius-xl)',
        background: isActive ? 'var(--md-secondary-container)' : 'transparent',
        color: isActive ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
        transition: 'background var(--duration-medium) var(--ease-standard)',
      }}
    >
      {icon}
    </span>
  );
}

function NavBadge({ n }: { n?: number }) {
  if (n == null) return null;
  return (
    <span
      style={{
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--md-error)',
        color: 'var(--md-on-error)',
        fontSize: 10,
        fontWeight: 700,
        lineHeight: '16px',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {n}
    </span>
  );
}

export function AdaptiveNav({
  items = [],
  active,
  onSelect,
  variant = 'auto',
  title = 'THD Room Finder',
  header = null,
  footer = null,
  style = {},
}: AdaptiveNavProps) {
  const [auto, setAuto] = useState<NavForm>(() =>
    typeof window !== 'undefined' ? classFor(window.innerWidth) : 'bar',
  );
  useEffect(() => {
    if (variant !== 'auto') return;
    const on = () => setAuto(classFor(window.innerWidth));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [variant]);
  const v: NavForm = variant === 'auto' ? auto : variant;

  const onEnter = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'color-mix(in srgb, var(--md-on-surface) 8%, transparent)';
  };
  const clear = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  /* ── Bottom navigation bar (compact) ──────────────── */
  if (v === 'bar') {
    return (
      <nav
        style={{
          display: 'flex',
          height: 'var(--nav-bar-height)',
          background: 'var(--md-surface)',
          borderTop: '1px solid var(--md-outline-variant)',
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          ...style,
        }}
      >
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelect && onSelect(it.id)}
              aria-current={on ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '8px 0',
                minWidth: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{ position: 'relative' }}>
                <Indicator icon={it.icon} isActive={on} />
                <NavBadge n={it.badge} />
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: on ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  /* ── Navigation rail (medium) ─────────────────────── */
  if (v === 'rail') {
    return (
      <nav
        style={{
          width: 'var(--nav-rail-width)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          paddingBlock: 12,
          background: 'var(--md-surface)',
          borderRight: '1px solid var(--md-outline-variant)',
          flexShrink: 0,
          height: '100%',
          ...style,
        }}
      >
        <div style={{ height: 40, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
          <Logo size={28} />
        </div>
        {header}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            width: '100%',
            alignItems: 'center',
          }}
        >
          {items.map((it) => {
            const on = it.id === active;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect && onSelect(it.id)}
                aria-current={on ? 'page' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '4px 0',
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span style={{ position: 'relative' }}>
                  <Indicator icon={it.icon} isActive={on} />
                  <NavBadge n={it.badge} />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    maxWidth: 72,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: on ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                  }}
                >
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
        {footer ? <div style={{ marginTop: 'auto' }}>{footer}</div> : null}
      </nav>
    );
  }

  /* ── Navigation drawer / sidebar (expanded) ───────── */
  return (
    <nav
      style={{
        width: 'var(--nav-drawer-width)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '16px 12px',
        background: 'var(--md-surface)',
        borderRight: '1px solid var(--md-outline-variant)',
        flexShrink: 0,
        height: '100%',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 16px' }}>
        <Logo size={28} />
        <span style={{ fontWeight: 500, fontSize: '1.125rem', color: 'var(--md-on-surface)' }}>
          {title}
        </span>
      </div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelect && onSelect(it.id)}
              aria-current={on ? 'page' : undefined}
              onMouseEnter={on ? undefined : onEnter}
              onMouseLeave={on ? undefined : clear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: 'none',
                cursor: 'pointer',
                padding: '0 16px',
                height: 56,
                borderRadius: 'var(--radius-xl)',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 500,
                background: on ? 'var(--md-secondary-container)' : 'transparent',
                color: on ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                transition: 'background var(--duration-medium) var(--ease-standard)',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                {it.icon}
                <NavBadge n={it.badge} />
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
      {footer ? <div style={{ marginTop: 'auto' }}>{footer}</div> : null}
    </nav>
  );
}
