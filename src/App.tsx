import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Background from "./components/Background";
import Reveal from "./components/Reveal";
import EventCard from "./components/EventCard";
import PeopleStrip from "./components/PeopleStrip";
import {
  HourglassMark,
  CalendarGlyph,
  ChevronLeft,
  ChevronRight,
  SearchGlyph,
  ArrowUp,
  LaurelGlyph,
  CypressGlyph,
  RetryGlyph,
  SunGlyph,
} from "./components/Icons";
import { fetchDay } from "./lib/api";
import type { DayData, DayEvent } from "./lib/api";
import { archiveFor } from "./data/fallback";
import {
  MONTHS_GEN,
  MONTHS_NOM,
  pad2,
  daysInMonth,
  weekdayOf,
  dayOfYear,
  centuryOf,
  romanNumeral,
  ERAS,
  eraOf,
  plural,
  getToday,
} from "./lib/dates";

type Status = "loading" | "ready" | "error";

interface TimelineItem {
  kind: "divider" | "event";
  century?: number;
  event?: DayEvent;
}

function parseHash(): { month: number; day: number } | null {
  const m = window.location.hash.match(/#d=(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return null;
  return { month, day };
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TODAY = getToday();

export default function App() {
  const initial = useMemo(() => parseHash() ?? { month: TODAY.month, day: TODAY.day }, []);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [data, setData] = useState<DayData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [updatedAt, setUpdatedAt] = useState("");
  const [eraFilter, setEraFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const [showTop, setShowTop] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const loadSeq = useRef(0);

  /* ---------- навигация ---------- */

  const navigate = useCallback((m: number, d: number) => {
    const dm = daysInMonth(m);
    const dd = Math.min(d, dm);
    setMonth(m);
    setDay(dd);
    window.history.replaceState(null, "", `#d=${pad2(m)}-${pad2(dd)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToday = useCallback(() => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    navigate(TODAY.month, TODAY.day);
  }, [navigate]);

  const shiftDay = useCallback(
    (delta: number) => {
      const base = new Date(2000, month - 1, day + delta); // 2000-й — високосный
      navigate(base.getMonth() + 1, base.getDate());
    },
    [month, day, navigate]
  );

  const load = useCallback((m: number, d: number) => {
    const seq = ++loadSeq.current;
    setStatus("loading");
    setData(null);
    setEraFilter("all");

    fetchDay(m, d)
      .then((loaded) => {
        if (loadSeq.current !== seq) return;
        setData(loaded);
        setStatus("ready");
        setUpdatedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => {
        if (loadSeq.current !== seq) return;
        const arch = archiveFor(m, d);
        if (arch) {
          setData(arch);
          setStatus("ready");
          setUpdatedAt("бумажный архив");
        } else {
          setStatus("error");
        }
      });
  }, []);

  /* ---------- загрузка хроники дня ---------- */

  useEffect(() => {
    load(month, day);
  }, [month, day, load]);

  /* ---------- живые часы и смена суток ---------- */

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (window.location.hash.includes("#d=")) return; // листается вручную — не мешаем
      const now = new Date();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      setMonth((prev) => (prev !== m ? m : prev));
      setDay((prev) => (prev !== d ? d : prev));
    }, 30000);
    return () => window.clearInterval(t);
  }, []);

  /* ---------- прогресс чтения ---------- */

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 700);
      const el = timelineRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = Math.max(rect.height - window.innerHeight * 0.4, 1);
        const passed = Math.min(Math.max(window.innerHeight * 0.75 - rect.top, 0), total);
        setReadProgress(passed / total);
      }
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [status]);

  /* ---------- производные данные ---------- */

  const events = data?.events ?? [];
  const nowYear = clock.getFullYear();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (eraFilter !== "all" && eraOf(e.year).id !== eraFilter) return false;
      if (q && !`${e.title} ${e.lead}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, eraFilter, query]);

  const eraCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const id = eraOf(e.year).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    let lastCentury = 0;
    for (const e of filtered) {
      const c = centuryOf(e.year);
      if (c !== lastCentury) {
        out.push({ kind: "divider", century: c });
        lastCentury = c;
      }
      out.push({ kind: "event", event: e });
    }
    return out;
  }, [filtered]);

  const randomPages = useMemo(() => {
    const rnd = mulberry32(month * 1000 + day * 7 + 13);
    const picked: Array<{ month: number; day: number }> = [];
    let guard = 0;
    while (picked.length < 6 && guard < 200) {
      guard += 1;
      const m = 1 + Math.floor(rnd() * 12);
      const d = 1 + Math.floor(rnd() * daysInMonth(m));
      if (m === month && d === day) continue;
      if (picked.some((p) => p.month === m && p.day === d)) continue;
      picked.push({ month: m, day: d });
    }
    return picked;
  }, [month, day]);

  const oldest = events.length ? events[0].year : null;
  const newest = events.length ? events[events.length - 1].year : null;
  const centuryCount = useMemo(() => new Set(events.map((e) => centuryOf(e.year))).size, [events]);
  const isToday = month === TODAY.month && day === TODAY.day;

  /* ---------- динамические title и description для SEO ---------- */

  useEffect(() => {
    const title = `${day} ${MONTHS_GEN[month - 1]} — что произошло в этот день в истории | Летопись дня`;
    const description = `Исторические события ${day} ${MONTHS_GEN[month - 1]}: ${events.length} записей от ${oldest ?? 'древности'} до ${newest ?? 'наших дней'} года. Сражения, открытия, рождения и смерти великих людей. Подробные статьи из Википедии.`;
    
    document.title = title;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // Обновляем Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);
    
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description);
    
    // Canonical URL с датой
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `/#d=${pad2(month)}-${pad2(day)}`);
    }
  }, [month, day, events.length, oldest, newest]);

  const selectCls =
    "border border-ivory-200/15 bg-ink-850 px-3 py-2 font-mono text-sm text-ivory-200 outline-none transition-colors hover:border-gold-400/50 focus:border-gold-400/70";

  /* ---------- разметка ---------- */

  return (
    <div className="relative min-h-screen">
      <Background />

      {/* прогресс чтения страницы */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px]">
        <div
          className="h-full bg-gold-400/90 transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* верхняя планка */}
      <header className="relative z-10 border-b border-ivory-200/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={goToday} className="group flex items-center gap-3 text-left">
            <HourglassMark className="h-7 w-7 text-gold-400 transition-transform duration-500 group-hover:rotate-180" />
            <span>
              <span className="font-display block text-xl leading-none text-ivory-100">Летопись дня</span>
              <span className="label-mono mt-1 block text-ivory-600">исторический календарь</span>
            </span>
          </button>
          <div className="text-right">
            <p className="font-mono text-lg tabular-nums text-gold-300">
              {clock.toLocaleTimeString("ru-RU")}
            </p>
            <p className="label-mono text-ivory-600">местное время · {nowYear}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* титульный лист */}
        <section className="border-b border-ivory-200/10">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid gap-10 py-12 lg:grid-cols-[1fr_320px] lg:gap-14">
              <div>
                <p className="label-mono flex items-center gap-3 text-gold-400">
                  <CalendarGlyph className="h-4 w-4" />
                  лист {dayOfYear(month, day)} из 366 · {MONTHS_NOM[month - 1].toLowerCase()}
                </p>
                <h1
                  key={`${month}-${day}`}
                  className="tick-in mt-5 font-display text-[clamp(3rem,9vw,6.2rem)] leading-[0.95] text-ivory-100"
                >
                  {day} {MONTHS_GEN[month - 1]}
                </h1>
                <p className="label-mono mt-6 max-w-xl leading-relaxed text-ivory-600">
                  {weekdayOf(month, day)}
                  {isToday ? " · сегодня" : ""} — что произошло в этот день в разные годы: от Древнего
                  мира до наших дней
                </p>

                {/* управление датой */}
                <div className="mt-8 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => shiftDay(-1)}
                    title="Предыдущий день"
                    className="flex h-11 w-11 items-center justify-center border border-ivory-200/15 text-ivory-400 transition-all duration-300 hover:border-gold-400/60 hover:text-gold-300"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <select
                    value={month}
                    onChange={(e) => navigate(Number(e.target.value), day)}
                    className={selectCls}
                    aria-label="Месяц"
                  >
                    {MONTHS_NOM.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={day}
                    onChange={(e) => navigate(month, Number(e.target.value))}
                    className={selectCls}
                    aria-label="День"
                  >
                    {Array.from({ length: daysInMonth(month) }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d} {MONTHS_GEN[month - 1]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => shiftDay(1)}
                    title="Следующий день"
                    className="flex h-11 w-11 items-center justify-center border border-ivory-200/15 text-ivory-400 transition-all duration-300 hover:border-gold-400/60 hover:text-gold-300"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToday}
                    className={`label-mono flex items-center gap-2 border px-4 py-2.5 transition-all duration-300 ${
                      isToday
                        ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                        : "border-ivory-200/15 text-ivory-400 hover:border-gold-400/60 hover:text-gold-300"
                    }`}
                  >
                    <SunGlyph className="h-4 w-4" />
                    {isToday ? "сегодняшний лист" : "к сегодняшнему листу"}
                  </button>
                </div>

                {/* памятные праздники даты */}
                {status === "ready" && data && data.holidays.length > 0 && (
                  <div className="tick-in mt-7 flex flex-wrap gap-2.5">
                    {data.holidays.map((h, i) => (
                      <span
                        key={i}
                        className="label-mono border border-patina-400/40 bg-patina-400/5 px-3 py-1.5 normal-case tracking-wider text-patina-400"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* сводка дня */}
              <aside className="relative self-start border border-gold-400/25 bg-ink-850/80 p-6">
                {["-top-px -left-px", "-top-px -right-px", "-bottom-px -left-px", "-bottom-px -right-px"].map(
                  (pos) => (
                    <span
                      key={pos}
                      aria-hidden="true"
                      className={`absolute ${pos} h-3 w-3 border-gold-400`}
                      style={{
                        borderTopWidth: pos.includes("top") ? 2 : 0,
                        borderBottomWidth: pos.includes("bottom") ? 2 : 0,
                        borderLeftWidth: pos.includes("left") ? 2 : 0,
                        borderRightWidth: pos.includes("right") ? 2 : 0,
                        borderStyle: "solid",
                      }}
                    />
                  )
                )}
                <p className="label-mono text-gold-400">сводка дня</p>
                {status === "loading" ? (
                  <div className="mt-5 space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-5 w-full" />
                    ))}
                  </div>
                ) : status === "error" ? (
                  <p className="mt-5 font-body text-sm text-ivory-400 italic">
                    Лист ещё не переплетён — не удалось связаться с хранилищем.
                  </p>
                ) : (
                  data && (
                    <dl className="mt-5 space-y-4">
                      {[
                        ["Событий в хронике", String(events.length)],
                        ["Охват лет", oldest !== null && newest !== null ? `${oldest} — ${newest}` : "—"],
                        ["Веков затронуто", String(centuryCount)],
                        ["Родились в этот день", String(data.births.length)],
                        ["Ушли из жизни", String(data.deaths.length)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-ivory-200/10 pb-3">
                          <dt className="label-mono text-ivory-600">{k}</dt>
                          <dd className="font-mono text-lg text-ivory-100">{v}</dd>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="label-mono text-ivory-600">Источник</dt>
                        <dd
                          className={`label-mono ${
                            data.source === "wikipedia" ? "text-patina-400" : "text-bronze-400"
                          }`}
                        >
                          {data.source === "wikipedia" ? `Википедия · ${updatedAt}` : "бумажный архив"}
                        </dd>
                      </div>
                    </dl>
                  )
                )}
              </aside>
            </div>
          </div>
        </section>

        {/* фильтры эпох и поиск */}
        <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEraFilter("all")}
                className={`label-mono border px-3.5 py-2 transition-all duration-300 ${
                  eraFilter === "all"
                    ? "border-gold-400/70 bg-gold-400/10 text-gold-300"
                    : "border-ivory-200/15 text-ivory-400 hover:border-ivory-200/40"
                }`}
              >
                Все эпохи · {events.length}
              </button>
              {ERAS.map((era) => {
                const count = eraCounts.get(era.id) ?? 0;
                const active = eraFilter === era.id;
                return (
                  <button
                    key={era.id}
                    onClick={() => setEraFilter(active ? "all" : era.id)}
                    disabled={count === 0 && !active}
                    className={`label-mono flex items-center gap-2 border px-3.5 py-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                      active
                        ? "border-current bg-ink-800"
                        : "border-ivory-200/15 text-ivory-400 hover:border-ivory-200/40"
                    }`}
                    style={active ? { color: era.color, borderColor: era.color } : undefined}
                    title={era.range}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ background: era.color, opacity: count === 0 ? 0.3 : 1 }}
                    />
                    {era.name} · {count}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full lg:w-72">
              <SearchGlyph className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ivory-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Искать в хронике…"
                className="w-full border border-ivory-200/15 bg-ink-850 py-2.5 pr-3 pl-9 font-body text-sm text-ivory-200 outline-none transition-colors placeholder:text-ivory-600/70 hover:border-ivory-200/30 focus:border-gold-400/60"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl text-ivory-100 sm:text-4xl">Хроника дня</h2>
              {status === "ready" && (
                <span className="label-mono text-ivory-600">
                  {filtered.length} из {events.length}
                </span>
              )}
            </div>
            <span className="h-px flex-1 bg-ivory-200/10" />
            {status === "ready" && filtered.length > 0 && (
              <span className="label-mono shrink-0 text-gold-400/90 tabular-nums">
                прочитано {Math.round(readProgress * 100)}%
              </span>
            )}
          </div>
        </section>

        {/* лента времени */}
        <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
          {status === "loading" && (
            <div className="space-y-10 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[64px_1fr] gap-x-4 sm:grid-cols-[110px_1fr] sm:gap-x-7">
                  <div className="skeleton h-8 w-16 self-start" />
                  <div className="space-y-3 pb-8">
                    <div className="skeleton h-7 w-2/3" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-[88%]" />
                  </div>
                </div>
              ))}
              <p className="label-mono pt-2 text-center text-ivory-600">
                Разворачиваем свитки Википедии за {day} {MONTHS_GEN[month - 1]}…
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="mx-auto max-w-xl border border-blood-400/30 bg-ink-850/80 p-8 text-center">
              <RetryGlyph className="mx-auto h-9 w-9 text-blood-400" />
              <h3 className="mt-4 font-display text-2xl text-ivory-100">Свитки не доехали</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-ivory-400">
                Не удалось связаться с хранилищем Википедии, а в бумажном архиве пока нет записей за{" "}
                {day} {MONTHS_GEN[month - 1]}. Проверьте связь и попробуйте ещё раз — или листайте
                соседние дни: многие из них есть в архиве.
              </p>
              <button
                onClick={() => load(month, day)}
                className="label-mono mx-auto mt-6 flex items-center gap-2 border border-gold-400/50 bg-gold-400/10 px-5 py-2.5 text-gold-300 transition-all duration-300 hover:bg-gold-400/20"
              >
                <RetryGlyph className="h-4 w-4" /> Повторить попытку
              </button>
            </div>
          )}

          {status === "ready" && filtered.length === 0 && events.length > 0 && (
            <div className="mx-auto max-w-xl border border-ivory-200/12 bg-ink-850/60 p-8 text-center">
              <SearchGlyph className="mx-auto h-8 w-8 text-ivory-600" />
              <p className="mt-4 font-body text-sm text-ivory-400 italic">
                По этому запросу в выбранной эпохе записей не нашлось. Попробуйте другое слово или
                снимите фильтр.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setEraFilter("all");
                }}
                className="label-mono mx-auto mt-5 border border-ivory-200/20 px-4 py-2 text-ivory-400 transition-colors hover:border-gold-400/50 hover:text-gold-300"
              >
                Сбросить фильтры
              </button>
            </div>
          )}

          {status === "ready" && timeline.length > 0 && (
            <div ref={timelineRef}>
              {timeline.map((item, i) =>
                item.kind === "divider" ? (
                  <div key={`c-${item.century}`} className="flex items-center gap-5 pb-2 pt-6">
                    <span className="h-px flex-1 bg-ivory-200/12" />
                    <span className="label-mono text-gold-400/90">{romanNumeral(item.century ?? 1)} век</span>
                    <span className="h-px flex-1 bg-ivory-200/12" />
                  </div>
                ) : (
                  <Reveal key={item.event!.id} delay={Math.min(i * 30, 180)}>
                    <EventCard
                      event={item.event!}
                      nowYear={nowYear}
                      highlighted={false}
                      index={i}
                    />
                  </Reveal>
                )
              )}
            </div>
          )}

          {/* люди дня */}
          {status === "ready" && data && (
            <>
              <PeopleStrip
                title="Родились в этот день"
                subtitle="имена, которые появились на свет под этой датой"
                people={data.births}
                tone="life"
                icon={<LaurelGlyph className="h-7 w-7" />}
              />
              <PeopleStrip
                title="Ушли из жизни"
                subtitle="память, закреплённая за этой датой"
                people={data.deaths}
                tone="memory"
                icon={<CypressGlyph className="h-7 w-7" />}
              />
            </>
          )}
        </section>

        {/* другие листы календаря */}
        <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl text-ivory-100 sm:text-4xl">Другие листы календаря</h2>
              <p className="label-mono mt-2 text-ivory-600">
                шесть дат наугад — перелистнуть историю одним движением
              </p>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {randomPages.map((p, i) => (
              <Reveal key={`${p.month}-${p.day}`} delay={i * 60}>
                <button
                  onClick={() => navigate(p.month, p.day)}
                  className="group w-full border border-ivory-200/12 bg-ink-850/60 p-5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/50 hover:bg-ink-800"
                >
                  <span className="label-mono block text-ivory-600">{weekdayOf(p.month, p.day)}</span>
                  <span className="mt-2 block font-display text-2xl leading-tight text-ivory-100">
                    {p.day} {MONTHS_GEN[p.month - 1]}
                  </span>
                  <span className="label-mono mt-3 block text-gold-400/80 transition-colors group-hover:text-gold-300">
                    перелистнуть →
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* подвал */}
      <footer className="relative z-10 mt-24 border-t border-ivory-200/10">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-3">
                <HourglassMark className="h-6 w-6 text-gold-400" />
                <p className="font-display text-lg text-ivory-100">Летопись дня</p>
              </div>
              <p className="mt-4 font-body text-sm leading-relaxed text-ivory-400/85">
                Страница обновляется сама: каждый новый день она разворачивает свитки Википедии и
                показывает, что случилось именно в этот день и месяц — столетие за столетием. Если
                сеть недоступна, открывается бумажный архив с заранее написанными статьями.
              </p>
            </div>
            <div className="label-mono space-y-2.5 text-ivory-600">
              <p>источник хроники — Википедия, «Этот день в истории»</p>
              <p>
                сегодня: {TODAY.day} {MONTHS_GEN[TODAY.month - 1]} {nowYear} ·{" "}
                {weekdayOf(TODAY.month, TODAY.day)}
              </p>
              <p>
                лист: {day} {MONTHS_GEN[month - 1]} · записей: {events.length}
              </p>
              <a
                href={`https://ru.wikipedia.org/wiki/${day}_${MONTHS_NOM[month - 1].toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-gold-400 transition-colors hover:text-gold-300"
              >
                Открыть хранилище ↗
              </a>
            </div>
          </div>
          <p className="label-mono mt-10 border-t border-ivory-200/10 pt-6 text-ivory-600/60">
            переплетено вручную · события, люди и даты принадлежат истории
          </p>
        </div>
      </footer>

      {/* наверх */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="К началу листа"
        className={`fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center border border-gold-400/50 bg-ink-850/90 text-gold-300 shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-300 hover:bg-gold-400/15 ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
