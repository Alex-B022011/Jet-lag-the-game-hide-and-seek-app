/** All artwork here is original, generic line-art — no franchise marks. */
type P = { className?: string };

export const IconClassic = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M16 3l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="16" cy="15" r="2.2" fill="currentColor" />
  </svg>
);

export const IconQuote = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M12 8c-4 1.6-6 4.6-6 9v7h8v-8H9c0-2.6 1.1-4.4 3.6-5.4zm14 0c-4 1.6-6 4.6-6 9v7h8v-8h-5c0-2.6 1.1-4.4 3.6-5.4z" fill="currentColor" />
  </svg>
);

export const IconSpell = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M6 26L24 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M22 6l4 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M9 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" />
  </svg>
);

export const IconDescription = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <circle cx="13" cy="11" r="5" fill="currentColor" />
    <path d="M3 27c0-5.2 4.5-8 10-8s10 2.8 10 8z" fill="currentColor" />
    <circle cx="23" cy="12" r="4" fill="currentColor" opacity=".55" />
  </svg>
);

export const IconLocation = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M16 4a8 8 0 00-8 8c0 6 8 16 8 16s8-10 8-16a8 8 0 00-8-8z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const IconFlame = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M16 2c1 6-4 7-4 12a4 4 0 004 4 4 4 0 004-4c0-2-1-3-1-5 3 2 6 5 6 10a9 9 0 11-18 0C7 12 14 10 16 2z" fill="currentColor" />
  </svg>
);

export const IconInfinity = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M10 11a5 5 0 100 10c4 0 6-10 12-10a5 5 0 110 10c-6 0-8-10-12-10z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
);

export const IconCalendar = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect x="5" y="7" width="22" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M5 13h22M11 4v6M21 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconEyeOff = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M4 16s5-8 12-8 12 8 12 8-5 8-12 8S4 16 4 16z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="16" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M5 27L27 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const IconInfo = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 14v9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="16" cy="9.5" r="1.6" fill="currentColor" />
  </svg>
);

export const IconChart = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M6 26V15M13 26V7M20 26v-8M27 26V11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const IconShield = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M16 3l11 4v9c0 7-5 11-11 13C10 27 5 23 5 16V7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const MODE_ICONS = {
  classic: IconClassic,
  quote: IconQuote,
  spell: IconSpell,
  description: IconDescription,
  location: IconLocation,
} as const;
