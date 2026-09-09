import type { ReactNode } from "react";
import type { Person } from "../lib/api";
import { ArrowUpRight } from "./Icons";

interface Props {
  title: string;
  subtitle: string;
  people: Person[];
  tone: "life" | "memory";
  icon: ReactNode;
}

export default function PeopleStrip({ title, subtitle, people, tone, icon }: Props) {
  if (people.length === 0) return null;
  const accent = tone === "life" ? "#74a68d" : "#8fa6ba";

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3" style={{ color: accent }}>
            {icon}
            <h2 className="font-display text-3xl text-ivory-100 sm:text-4xl">{title}</h2>
          </div>
          <p className="label-mono mt-2 text-ivory-600">{subtitle}</p>
        </div>
        <span className="label-mono hidden shrink-0 text-ivory-600/70 sm:block">
          {people.length} {people.length === 1 ? "запись" : people.length < 5 ? "записи" : "записей"} · листайте →
        </span>
      </div>

      <div className="fade-x relative mt-7">
        <div className="scroll-thin flex snap-x gap-4 overflow-x-auto pb-3">
          {people.map((p) => (
            <a
              key={p.id}
              href={p.url ?? "#"}
              target={p.url ? "_blank" : undefined}
              rel="noreferrer"
              onClick={(e) => {
                if (!p.url) e.preventDefault();
              }}
              className="group relative w-[248px] shrink-0 snap-start border border-ivory-200/12 bg-ink-850/70 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/50 hover:bg-ink-800"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 h-[3px] w-full transition-transform duration-500 group-hover:scale-x-105"
                style={{ background: accent, transformOrigin: "left" }}
              />
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xl font-semibold" style={{ color: accent }}>
                  {p.year}
                </span>
                {p.url && (
                  <ArrowUpRight className="h-4 w-4 text-ivory-600 transition-colors group-hover:text-gold-300" />
                )}
              </div>
              <div className="mt-3 flex items-start gap-3">
                {p.image && (
                  <img
                    src={p.image}
                    alt=""
                    loading="lazy"
                    className="img-archive h-14 w-14 shrink-0 border border-ivory-200/15 object-cover"
                  />
                )}
                <h3 className="font-display text-lg leading-snug text-ivory-100">{p.name}</h3>
              </div>
              <p className="mt-3 line-clamp-4 font-body text-[0.82rem] leading-relaxed text-ivory-400/85">
                {p.note}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
