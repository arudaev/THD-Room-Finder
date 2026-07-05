import type { CSSProperties } from 'react';

/**
 * EN / DE language toggle — a Material 3 segmented control. THD Room Finder
 * ships bilingual (English UI, German preserved where it helps); this is the
 * single in-app control that flips locale. Two sizes: a compact app-bar pill
 * and a full segmented row for settings.
 */
export type Locale = 'en' | 'de';

export interface LocaleOption {
  id: Locale;
  short: string;
  label: string;
}

export interface LanguageToggleProps {
  value?: Locale;
  onChange?: (id: Locale) => void;
  size?: 'small' | 'medium';
  locales?: LocaleOption[];
  style?: CSSProperties;
}

const DEFAULT_LOCALES: LocaleOption[] = [
  { id: 'en', short: 'EN', label: 'English' },
  { id: 'de', short: 'DE', label: 'Deutsch' },
];

export function LanguageToggle({
  value = 'en',
  onChange,
  size = 'medium',
  locales = DEFAULT_LOCALES,
  style = {},
}: LanguageToggleProps) {
  const small = size === 'small';
  const wrap: CSSProperties = {
    display: 'inline-flex',
    padding: 3,
    gap: 3,
    background: 'var(--md-surface-variant)',
    borderRadius: 'var(--radius-xl)',
    fontFamily: 'var(--font-sans)',
    ...style,
  };
  return (
    <div role="group" aria-label="Language" style={wrap}>
      {locales.map((loc) => {
        const on = loc.id === value;
        return (
          <button
            key={loc.id}
            type="button"
            aria-pressed={on}
            onClick={() => !on && onChange && onChange(loc.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: on ? 'default' : 'pointer',
              borderRadius: 'var(--radius-xl)',
              padding: small ? '5px 12px' : '8px 18px',
              minHeight: small ? 32 : 40,
              fontSize: small ? 13 : 14,
              fontWeight: 500,
              letterSpacing: 0,
              background: on ? 'var(--md-primary)' : 'transparent',
              color: on ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
              transition:
                'background var(--duration-medium) var(--ease-standard), color var(--duration-medium) var(--ease-standard)',
            }}
          >
            {small ? loc.short : loc.label}
          </button>
        );
      })}
    </div>
  );
}
