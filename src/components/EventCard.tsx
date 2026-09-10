import { useState } from "react";
import type { DayEvent } from "../lib/api";
import { fetchArticleIntro, findEventArticle } from "../lib/api";
import { centuryOf, eraOf, romanNumeral, plural, yearsAgoLabel } from "../lib/dates";
import { ArrowUpRight, SpinnerGlyph, QuillGlyph } from "./Icons";

interface Props {
  event: DayEvent;
  nowYear: number;
  highlighted: boolean;
  index: number;
}

export default function EventCard({ event, nowYear, highlighted, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>(event.paragraphs);
  const [fullLoaded, setFullLoaded] = useState(Boolean(event.fromFallback));
  const [articleTitle, setArticleTitle] = useState<string | undefined>(event.ownTitle);

  const era = eraOf(event.year);
  const century = centuryOf(event.year);
  const ago = nowYear - event.year;

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!fullLoaded && !event.fromFallback) {
      setLoading(true);
      try {
        let intro: string[] = [];
        let title: string | undefined;
        if (event.ownTitle) {
          // у события есть собственная статья — читаем её целиком
          intro = await fetchArticleIntro(event.ownTitle);
          if (intro.length > 0) title = event.ownTitle;
        }
        if (intro.length === 0) {
          // собственной статьи нет (или она пуста) — ищем по тексту самого события
          const found = await findEventArticle(event.lead);
          if (found) {
            intro = found.paragraphs;
            title = found.title;
          }
        }
        if (intro.length > 0) {
          setParagraphs(intro);
          setArticleTitle(title);
        }
      } catch {
        /* остаёмся с тем, что есть */
      } finally {
        setLoading(false);
        setFullLoaded(true);
      }
    }
  };

  const visible = expanded ? paragraphs : paragraphs.slice(0, 1);

  // Structured data для поисковых систем
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "startDate": `${event.year}-01-01`,
    "description": event.lead,
    "url": event.url,
    "image": event.image,
    "eventStatus": "https://schema.org/EventCompleted",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
  };

  return (
    <article
      id={event.id}
      className={`group relative scroll-mt-32 transition-colors duration-500 ${
        highlighted ? "highlight-flash rounded-sm" : ""
      }`}
      itemScope
      itemType="https://schema.org/Event"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="grid grid-cols-[64px_1fr] gap-x-4 sm:grid-cols-[110px_1fr] sm:gap-x-7">
        {/* рельса времени */}
        <div className="relative flex flex-col items-end pt-1 text-right">
          <span
            className="font-mono text-[1.35rem] leading-none font-semibold tracking-tight sm:text-[1.7rem]"
            style={{ color: era.color }}
            itemProp="startDate"
            content={`${event.year}-01-01`}
          >
            {event.year}
          </span>
          <span className="label-mono mt-2 hidden text-ivory-600 sm:block">{romanNumeral(century)} век</span>
          <span className="label-mono mt-1 hidden text-ivory-600/70 sm:block">
            {ago > 0 ? `${ago} ${plural(ago, "год", "года", "лет")}` : "ныне"}
          </span>
          <span aria-hidden="true" className="absolute top-0 -right-4 h-full w-px bg-ivory-200/10 sm:-right-7" />
          <span
            aria-hidden="true"
            className="absolute top-2 -right-[20.5px] h-[9px] w-[9px] rounded-full border-2 bg-ink-900 transition-transform duration-300 group-hover:scale-125 sm:-right-[32.5px]"
            style={{ borderColor: era.color }}
          />
        </div>

          {/* содержание */}
          <div className="pb-12">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="font-display text-[1.55rem] leading-tight text-ivory-100 sm:text-[1.8rem]" itemProp="name">
                {event.title}
              </h3>            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className="label-mono inline-flex items-center gap-1.5 border border-ivory-200/15 px-2.5 py-1 text-ivory-600 transition-all duration-300 hover:border-gold-400/60 hover:text-gold-300"
                title="Открыть связанную статью в Википедии"
              >
                Википедия <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* летописная строка */}
          <p
            className="mt-3 border-l-2 pl-4 font-body text-[0.98rem] leading-relaxed text-ivory-400 italic"
            style={{ borderColor: era.color }}
            itemProp="description"
          >
            {event.lead}
          </p>

          <div className="mt-5 flex flex-col gap-6 sm:flex-row">
            <div className="min-w-0 flex-1">
              {loading ? (
                <div className="space-y-3 py-1" aria-label="Загружаем статью">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-[92%]" />
                  <div className="skeleton h-4 w-[96%]" />
                  <div className="skeleton h-4 w-[64%]" />
                </div>
              ) : visible.length > 0 ? (
                <div className="space-y-4">
                  <p className="label-mono text-gold-400/90">
                    {articleTitle ? `статья · ${articleTitle}` : "из летописи Википедии"}
                  </p>
                  {visible.map((p, i) => (
                    <p
                      key={i}
                      className={`font-body text-[0.95rem] leading-[1.75] text-ivory-200/90 ${
                        i === 0 && expanded ? "dropcap" : ""
                      }`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              ) : fullLoaded ? (
                <p className="font-body text-[0.95rem] text-ivory-600 italic">
                  Отдельную статью об этом событии найти не удалось — загляните в летопись Википедии по ссылке выше.
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {(!event.fromFallback || paragraphs.length > 0) && (
                  <button
                    onClick={toggle}
                    disabled={loading}
                    className="label-mono inline-flex items-center gap-2 border border-gold-400/40 bg-gold-400/5 px-4 py-2 text-gold-300 transition-all duration-300 hover:bg-gold-400/15 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <SpinnerGlyph className="h-3.5 w-3.5" /> Листаем свитки…
                      </>
                    ) : expanded ? (
                      <>
                        <QuillGlyph className="h-3.5 w-3.5" /> Свернуть запись
                      </>
                    ) : (
                      <>
                        <QuillGlyph className="h-3.5 w-3.5" /> Читать статью
                      </>
                    )}
                  </button>
                )}
                <span className="label-mono text-ivory-600/70">{yearsAgoLabel(event.year, nowYear)}</span>
              </div>
            </div>

            {event.image && (
              <figure className="relative w-full shrink-0 self-start overflow-hidden border border-ivory-200/12 sm:w-[190px]">
                <div className="aspect-[4/3] overflow-hidden bg-ink-800">
                  <img
                    src={event.image}
                    alt={`Иллюстрация к событию: ${event.title}, ${event.year} год`}
                    loading="lazy"
                    decoding="async"
                    className="img-archive h-full w-full object-cover"
                    width="190"
                    height="143"
                  />
                </div>
                <figcaption className="label-mono flex items-center justify-between px-2.5 py-1.5 text-ivory-600/80">
                  <span>илл. №{index + 1}</span>
                  <span style={{ color: era.color }}>{event.year} г.</span>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
