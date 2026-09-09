export const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export const MONTHS_NOM = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const WEEKDAYS = [
  "воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота",
];

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export function daysInMonth(month: number): number {
  // месяц 1–12; 2000-й — високосный, поэтому 29 февраля доступно
  return new Date(2000, month, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** День недели для даты в текущем (или заданном) году. Для 29.02 в невисокосный год — по високосному 2000-му. */
export function weekdayOf(month: number, day: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  if (month === 2 && day === 29 && !isLeapYear(y)) {
    return WEEKDAYS[new Date(2000, 1, 29).getDay()];
  }
  return WEEKDAYS[new Date(y, month - 1, day).getDay()];
}

export function dayOfYear(month: number, day: number): number {
  const start = Date.UTC(2001, 0, 0);
  const target = Date.UTC(2001, month - 1, day);
  return Math.round((target - start) / 86400000);
}

export function centuryOf(year: number): number {
  return Math.floor((year - 1) / 100) + 1;
}

export function romanNumeral(n: number): string {
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = n;
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

export interface Era {
  id: string;
  name: string;
  range: string;
  color: string; // основной акцент эпохи
  test: (year: number) => boolean;
}

export const ERAS: Era[] = [
  {
    id: "ancient",
    name: "Древний мир",
    range: "до 476",
    color: "#c08a4e",
    test: (y) => y <= 476,
  },
  {
    id: "medieval",
    name: "Средние века",
    range: "477–1492",
    color: "#c25647",
    test: (y) => y >= 477 && y <= 1492,
  },
  {
    id: "earlymodern",
    name: "Новое время",
    range: "1493–1789",
    color: "#74a68d",
    test: (y) => y >= 1493 && y <= 1789,
  },
  {
    id: "modern",
    name: "XIX — сер. XX в.",
    range: "1790–1945",
    color: "#8fa6ba",
    test: (y) => y >= 1790 && y <= 1945,
  },
  {
    id: "contemporary",
    name: "Современность",
    range: "с 1946",
    color: "#c9a24b",
    test: (y) => y >= 1946,
  },
];

export function eraOf(year: number): Era {
  return ERAS.find((e) => e.test(year)) ?? ERAS[ERAS.length - 1];
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function yearsAgoLabel(year: number, nowYear: number): string {
  const k = nowYear - year;
  if (k <= 0) return "в этом году";
  return `${k} ${plural(k, "год", "года", "лет")} назад`;
}

export function getToday(): { month: number; day: number; year: number } {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
}
