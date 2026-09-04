import { pad2 } from "./dates";

/* ---------- типы ---------- */

export interface DayEvent {
  id: string;
  year: number;
  title: string;
  lead: string; // летописная строка (краткая запись события)
  paragraphs: string[]; // связный текст статьи
  url?: string;
  image?: string;
  ownTitle?: string; // название статьи, посвящённой самому событию
  fromFallback?: boolean;
}

export interface Person {
  id: string;
  year: number;
  name: string;
  note: string;
  url?: string;
  image?: string;
}

export interface DayData {
  events: DayEvent[];
  births: Person[];
  deaths: Person[];
  holidays: string[];
  source: "wikipedia" | "archive";
}

interface WikiPage {
  title?: string;
  normalizedtitle?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

interface RawEntry {
  text?: string;
  year?: number;
  pages?: WikiPage[];
}

interface RawDay {
  events?: RawEntry[];
  births?: RawEntry[];
  deaths?: RawEntry[];
  holidays?: Array<{ text?: string }>;
}

/* ---------- сеть с таймаутами ---------- */

/** В закрытых средах запрос может зависнуть навсегда — прерываем его сами. */
function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`Таймаут ${ms} мс`)),
      ms
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function timeoutFetch(url: string, ms = 8000): Promise<Response> {
  return withTimeout(ms, fetch(url));
}

/* ---------- загрузка хроники дня ---------- */

const ENDPOINTS = [
  (mm: string, dd: string) => `https://api.wikimedia.org/feed/v1/wikipedia/ru/onthisday/all/${mm}/${dd}`,
  (mm: string, dd: string) => `https://ru.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`,
];

/** Лучшая связанная страница для персоны: та, у которой есть описание-выдержка. */
function pickPage(pages?: WikiPage[]): WikiPage | undefined {
  if (!pages || pages.length === 0) return undefined;
  const withExtract = pages.filter((p) => typeof p.extract === "string" && p.extract.length > 0);
  const scored = withExtract.length > 0 ? withExtract : pages;
  const preferred = scored.find((p) => {
    const t = p.title ?? "";
    return !/^\d{3,4}_год$/.test(t) && !/^\d{1,2}_/.test(t) && p.extract && p.extract.length > 60;
  });
  return preferred ?? scored[scored.length - 1];
}

/* ---------- подбор статьи, посвящённой самому событию ---------- */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const YEAR_TITLE = /^\d{3,4} год$/;
const DATE_TITLE = /^\d{1,2} [а-я]+$/;

function isMetaTitle(norm: string): boolean {
  return YEAR_TITLE.test(norm) || DATE_TITLE.test(norm);
}

/**
 * Родовые явления («Парламент», «Свадьба», «Театр»…) — это понятия, а не события.
 * Никогда не считаем такие статьи «статьёй о событии».
 */
const GENERIC_BASES = new Set([
  "армия", "ассамбле", "банк", "битва", "войн", "выбор", "газет", "город",
  "государств", "дворец", "деклараци", "договор", "желез", "завод", "закон",
  "замок", "импери", "институт", "искусств", "истори", "кафедр", "кино",
  "колледж", "компани", "конституци", "концерт", "корабл", "королевств",
  "костел", "костёл", "крушени", "культу", "мечеть", "мост", "монастыр",
  "музе", "обсерватор", "обществ", "опера", "орден", "остров", "палат",
  "паломничеств", "памятник", "парламент", "парт", "переговор", "перемир",
  "пожар", "праздник", "правительств", "предприяти", "пресс", "профсоюз",
  "революци", "реформ", "республик", "собор", "сражени", "стадион", "стату",
  "столиц", "суд", "судно", "свадьб", "театр", "университет", "флот",
  "футбол", "храм", "церков", "школ", "штаб",
]);

/** Устойчивые родовые словосочетания. */
const GENERIC_PAIRS = [
  "гражданская война", "мировая война", "отечественная война", "холодная война",
  "высший орган", "генеральный секретарь", "совет безопасности",
];

function isGenericTitle(norm: string): boolean {
  const words = norm.split(" ").filter(Boolean);
  if (words.length <= 2) {
    const base = words[0].slice(0, 5);
    if (GENERIC_BASES.has(base)) return true;
  }
  return GENERIC_PAIRS.some((pair) => norm.includes(pair));
}

/** Приблизительное усечение до основы — «революционный» ≈ «революция». */
function stem(word: string): string {
  return word.slice(0, 5);
}

function stemSet(text: string): Set<string> {
  return new Set(text.split(" ").filter((t) => t.length > 2).map(stem));
}

/** Варианты названия статьи: полное, без уточнения в скобках, «Имя Фамилия» для «Фамилия, Имя». */
function nameVariants(raw: string): string[] {
  const base = normalize(raw.replace(/_/g, " "));
  const stripped = base.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const reverse = (s: string): string => {
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : s;
  };
  const variants = new Set<string>([base, stripped, reverse(base), reverse(stripped)]);
  return [...variants].filter(Boolean);
}

function overlap(titleRaw: string, leadNorm: string): { ratio: number; matched: number } {
  const titleStems = [...stemSet(normalize(titleRaw.replace(/_/g, " ")))].filter((t) => t.length > 3);
  if (titleStems.length === 0) return { ratio: 0, matched: 0 };
  const leadStems = stemSet(leadNorm);
  let matched = 0;
  for (const t of titleStems) if (leadStems.has(t)) matched += 1;
  return { ratio: matched / titleStems.length, matched };
}

interface PageMatch {
  page: WikiPage;
  score: number;
  exact: boolean; // название статьи буквально присутствует в тексте события
}

function scorePageForEvent(page: WikiPage, leadNorm: string): PageMatch | null {
  const raw = page.normalizedtitle ?? page.title ?? "";
  if (!raw) return null;
  const variants = nameVariants(raw);
  if (variants.some(isMetaTitle)) return null;
  // родовые понятия («Парламент», «Свадьба»…) никогда не бывают статьёй о событии
  if (isGenericTitle(variants[0])) return null;
  if ((page.extract ?? "").length <= 60) return null;

  let best = 0;
  let exact = false;
  for (const v of variants) {
    if (v.length >= 8 && leadNorm.includes(v)) {
      best = Math.max(best, 40 + v.length);
      // точным считаем совпадение по «прямому» варианту (не перевёрнутому «Фамилия, Имя»)
      if (v === variants[0] || v === variants[1]) exact = true;
    }
  }
  if (best === 0) {
    const { ratio, matched } = overlap(raw, leadNorm);
    if (matched >= 3 && ratio >= 0.55) best = matched * 8 + Math.round(ratio * 10);
  }
  return best > 0 ? { page, score: best, exact } : null;
}

function findEventPage(lead: string, pages?: WikiPage[]): PageMatch | null {
  if (!pages || pages.length === 0) return null;
  const leadNorm = normalize(lead);
  let top: PageMatch | null = null;
  for (const p of pages) {
    const m = scorePageForEvent(p, leadNorm);
    if (m && (!top || m.score > top.score)) top = m;
  }
  return top;
}

/** Связанная страница для ссылки «Википедия», когда собственной статьи у события нет. */
function pickRelated(lead: string, pages?: WikiPage[]): WikiPage | undefined {
  if (!pages || pages.length === 0) return undefined;
  const candidates = pages.filter((p) => {
    const raw = p.normalizedtitle ?? p.title ?? "";
    return raw && !nameVariants(raw).some(isMetaTitle);
  });
  const pool = candidates.length > 0 ? candidates : pages;
  const leadNorm = normalize(lead);
  let best: { page: WikiPage; score: number } | undefined;
  for (const p of pool) {
    const raw = p.normalizedtitle ?? p.title ?? "";
    const { matched } = overlap(raw, leadNorm);
    const words = normalize(raw.replace(/_/g, " ")).split(" ").filter(Boolean).length;
    let score = matched * 4;
    if (!isGenericTitle(raw)) score += 6; // конкретные статьи предпочитаем родовым
    if (words >= 2) score += 3;
    if ((p.extract ?? "").length > 60) score += 2;
    if (!best || score > best.score) best = { page: p, score };
  }
  return best?.page ?? pool[pool.length - 1];
}

/** Заголовок события из летописной строки: с заглавной буквы, обрезанный по словам. */
function headline(lead: string): string {
  const sentence = lead.split(/[.!?]/)[0].trim();
  const base = sentence.length >= 16 ? sentence : lead.replace(/[.!?]+$/, "").trim();
  const capped = base.charAt(0).toUpperCase() + base.slice(1);
  if (capped.length <= 110) return capped;
  return `${capped.slice(0, 107).replace(/\s+\S*$/, "")}…`;
}

function cleanText(s: string): string {
  return s.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function toEvent(raw: RawEntry, index: number): DayEvent | null {
  const year = raw.year;
  if (typeof year !== "number") return null;
  const lead = cleanText(raw.text ?? "");
  if (!lead) return null;

  const match = findEventPage(lead, raw.pages);
  const eventPage = match?.page;
  // выдержку показываем, только если статья действительно про это событие
  const extract = eventPage ? cleanText(eventPage.extract ?? "") : "";
  const related = eventPage ?? pickRelated(lead, raw.pages);
  // заголовок — из названия статьи события, если оно буквально совпало с текстом;
  // иначе — из самой летописной строки (никаких «Свадьба» вместо свадьбы Грибоедова)
  const title = match?.exact && eventPage?.normalizedtitle
    ? eventPage.normalizedtitle.replace(/_/g, " ")
    : headline(lead);

  return {
    id: `ev-${year}-${index}`,
    year,
    title,
    lead,
    paragraphs: extract ? [extract] : [],
    url: related?.content_urls?.desktop?.page,
    image: eventPage?.thumbnail?.source ?? related?.thumbnail?.source,
    ownTitle: eventPage?.normalizedtitle,
  };
}

function parsePerson(raw: RawEntry, index: number, kind: string): Person | null {
  const year = raw.year;
  if (typeof year !== "number") return null;
  const text = cleanText(raw.text ?? "");
  if (!text) return null;
  const page = pickPage(raw.pages);
  const name = page?.normalizedtitle?.replace(/_/g, " ") ?? text.split(/\s*[—–,]/)[0];
  const note = page?.extract ? cleanText(page.extract) : text;
  return {
    id: `${kind}-${year}-${index}`,
    year,
    name,
    note,
    url: page?.content_urls?.desktop?.page,
    image: page?.thumbnail?.source,
  };
}

export async function fetchDay(month: number, day: number): Promise<DayData> {
  const mm = pad2(month);
  const dd = pad2(day);
  let lastError: unknown = null;

  for (const makeUrl of ENDPOINTS) {
    try {
      const res = await timeoutFetch(makeUrl(mm, dd));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await withTimeout(8000, res.json())) as RawDay;

      const events = (json.events ?? [])
        .map((e, i) => toEvent(e, i))
        .filter((e): e is DayEvent => e !== null)
        .sort((a, b) => a.year - b.year);

      const births = (json.births ?? [])
        .map((e, i) => parsePerson(e, i, "b"))
        .filter((p): p is Person => p !== null)
        .sort((a, b) => a.year - b.year);

      const deaths = (json.deaths ?? [])
        .map((e, i) => parsePerson(e, i, "d"))
        .filter((p): p is Person => p !== null)
        .sort((a, b) => a.year - b.year);

      const holidays = (json.holidays ?? [])
        .map((h) => cleanText(h.text ?? ""))
        .filter(Boolean);

      if (events.length === 0) throw new Error("empty");

      return { events, births, deaths, holidays, source: "wikipedia" };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось загрузить данные");
}

/* ---------- полные статьи (вводные разделы) ---------- */

const articleCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

export function fetchArticleIntro(title: string): Promise<string[]> {
  const cached = articleCache.get(title);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(title);
  if (pending) return pending;

  const url =
    "https://ru.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      redirects: "1",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      titles: title,
    }).toString();

  const task = (async () => {
    try {
      const res = await timeoutFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await withTimeout(8000, res.json());
      const pages = json?.query?.pages ?? {};
      const page = Object.values(pages)[0] as { extract?: string } | undefined;
      const raw = page?.extract ?? "";
      const paragraphs = raw
        .split(/\n+/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 40)
        .slice(0, 6);
      const result = paragraphs.length > 0 ? paragraphs : [];
      articleCache.set(title, result);
      return result;
    } finally {
      inflight.delete(title);
    }
  })();

  inflight.set(title, task);
  return task;
}

/* ---------- поиск статьи по тексту события ---------- */

export interface ArticleResult {
  title: string;
  paragraphs: string[];
}

const searchCache = new Map<string, ArticleResult | null>();

/**
 * Если у события нет собственной статьи в списке связанных страниц,
 * ищем её в Википедии по тексту летописной записи.
 */
export async function findEventArticle(query: string): Promise<ArticleResult | null> {
  const key = query.slice(0, 160);
  const cached = searchCache.get(key);
  if (cached !== undefined) return cached;

  const url =
    "https://ru.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      list: "search",
      srsearch: key,
      srlimit: "5",
      srprop: "",
    }).toString();

  try {
    const res = await timeoutFetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await withTimeout(8000, res.json());
    const results: Array<{ title?: string }> = json?.query?.search ?? [];
    const keyNorm = normalize(key);
    for (const r of results) {
      const t = r.title;
      if (!t) continue;
      const norm = normalize(t);
      if (isMetaTitle(norm)) continue;
      // пропускаем статьи о родовых явлениях («Парламент», «Театр»…)
      if (isGenericTitle(norm)) continue;
      // статья должна пересекаться с текстом события хотя бы одним словом
      if (overlap(t, keyNorm).matched < 1) continue;
      const paragraphs = await fetchArticleIntro(t);
      if (paragraphs.length > 0) {
        const result: ArticleResult = { title: t, paragraphs };
        searchCache.set(key, result);
        return result;
      }
    }
  } catch {
    /* сеть недоступна — вернём null */
  }
  searchCache.set(key, null);
  return null;
}
