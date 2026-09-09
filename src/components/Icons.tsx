interface IconProps {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Песочные часы — знак летописи. */
export const HourglassMark = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <path d="M6 3h12M6 21h12M7.5 3c0 4.5 4.5 5.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 5.5-4.5 9s4.5 4.5 4.5 9" />
    </g>
  </svg>
);

export const CalendarGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <rect x="4" y="5.5" width="16" height="14.5" />
      <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5M8.5 14h2M13.5 14h2M8.5 17h2" />
    </g>
  </svg>
);

export const ChevronLeft = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}><path d="M14.5 5.5 8 12l6.5 6.5" /></g>
  </svg>
);

export const ChevronRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}><path d="M9.5 5.5 16 12l-6.5 6.5" /></g>
  </svg>
);

export const ChevronDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}><path d="M5.5 9.5 12 16l6.5-6.5" /></g>
  </svg>
);

export const SearchGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15.2 15.2 5 5" />
    </g>
  </svg>
);

export const ArrowUpRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}><path d="M7 17 17 7M9.5 7H17v7.5" /></g>
  </svg>
);

export const QuillGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <path d="M19 5c-6 .5-10.5 4-12 10.5L6 20l1.2-.6C13.8 17.6 17.6 13 19 5Z" />
      <path d="M6.5 19.5C9 14 12.5 10.5 17 8" />
    </g>
  </svg>
);

export const CypressGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <path d="M12 21V10M12 3c3.2 2 4.8 4.6 4.8 7.2 0 2.8-2 4.8-4.8 4.8s-4.8-2-4.8-4.8C7.2 7.6 8.8 5 12 3Z" />
      <path d="M9 21h6" />
    </g>
  </svg>
);

export const LaurelGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <path d="M12 20c-4.5-1-7-4.5-7-9M12 20c4.5-1 7-4.5 7-9" />
      <path d="M5 11c1.8.2 3 .9 3.6 2.4M5.6 7.4c1.7.6 2.7 1.6 3 3.2M19 11c-1.8.2-3 .9-3.6 2.4M18.4 7.4c-1.7.6-2.7 1.6-3 3.2M12 20v-6" />
    </g>
  </svg>
);

export const RetryGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <path d="M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2" />
      <path d="M19 4.5V9h-4.5M5 19.5V15h4.5" />
    </g>
  </svg>
);

export const ArrowUp = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></g>
  </svg>
);

export const SpinnerGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={`animate-spin ${className ?? ""}`} aria-hidden="true">
    <g {...base}><path d="M12 3a9 9 0 1 1-9 9" /></g>
  </svg>
);

export const SunGlyph = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </g>
  </svg>
);
