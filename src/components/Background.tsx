import { useMemo, type CSSProperties } from "react";

interface DustSpec {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
}

/** Астролябия-гравюра: концентрические окружности, деления и стрелки. */
function Astrolabe({ className, style }: { className?: string; style?: CSSProperties }) {
  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i * 6), []);
  const spokes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 30), []);
  return (
    <svg viewBox="0 0 400 400" className={className} style={style} aria-hidden="true">
      <g stroke="currentColor" fill="none">
        <circle cx="200" cy="200" r="196" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="168" strokeWidth="0.8" />
        <circle cx="200" cy="200" r="120" strokeWidth="0.8" />
        <circle cx="200" cy="200" r="66" strokeWidth="0.8" />
        <circle cx="200" cy="200" r="4" fill="currentColor" stroke="none" />
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="200" y1="6" x2="200" y2={deg % 30 === 0 ? "20" : "13"}
            strokeWidth={deg % 30 === 0 ? 1.1 : 0.6}
            transform={`rotate(${deg} 200 200)`}
          />
        ))}
        {spokes.map((deg) => (
          <line key={deg} x1="200" y1="80" x2="200" y2="134" strokeWidth="0.6" transform={`rotate(${deg} 200 200)`} />
        ))}
        <path d="M200 34 L208 200 L200 366 L192 200 Z" strokeWidth="0.7" />
        <path d="M34 200 L200 208 L366 200 L200 192 Z" strokeWidth="0.7" />
        <circle cx="200" cy="200" r="142" strokeWidth="0.5" strokeDasharray="2 6" />
      </g>
    </svg>
  );
}

export default function Background() {
  const dust = useMemo<DustSpec[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 61) % 97}%`,
        top: `${(i * 37 + 11) % 92}%`,
        size: 1.5 + ((i * 7) % 3),
        duration: 9 + ((i * 5) % 14),
        delay: -((i * 3) % 12),
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-vignette" />

      <Astrolabe className="animate-spin-slow absolute -top-44 -right-44 h-[560px] w-[560px] text-gold-400 opacity-[0.07]" />
      <Astrolabe className="animate-spin-slower absolute -bottom-56 -left-40 h-[640px] w-[640px] text-patina-400 opacity-[0.05]" />

      {dust.map((d, i) => (
        <span
          key={i}
          className="dust"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      <div className="bg-noise absolute inset-0" />
    </div>
  );
}
