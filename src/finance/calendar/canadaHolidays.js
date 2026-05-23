/**
 * canadaHolidays.js
 * Ontario statutory holiday checker — pure functions only.
 */

function getEasterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function nthWeekdayOfMonth(year, month, weekday, n) {
  const d = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === weekday) { count++; if (count === n) return new Date(d); }
    d.setDate(d.getDate() + 1);
  }
}

function lastMondayBefore(before) {
  const d = new Date(before);
  d.setDate(d.getDate() - 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return d;
}

export function getOntarioStatHolidays(year) {
  const easter    = getEasterSunday(year);
  const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
  return [
    new Date(year, 0,  1),                          // New Year's Day
    nthWeekdayOfMonth(year, 1, 1, 3),              // Family Day
    goodFriday,                                      // Good Friday
    lastMondayBefore(new Date(year, 4, 25)),        // Victoria Day
    new Date(year, 6,  1),                          // Canada Day
    nthWeekdayOfMonth(year, 8, 1, 1),              // Labour Day
    nthWeekdayOfMonth(year, 9, 1, 2),              // Thanksgiving
    new Date(year, 11, 25),                         // Christmas
    new Date(year, 11, 26),                         // Boxing Day
  ];
}

const _cache = {};

function _fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function _getHolidaySet(year) {
  if (_cache[year]) return _cache[year];
  const set = new Set(getOntarioStatHolidays(year).map(_fmt));
  _cache[year] = set;
  return set;
}

export function isStatHoliday(date) {
  if (!date) return false;
  let d;
  if (date instanceof Date) d = date;
  else if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, day] = date.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else d = new Date(date);
  } else d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return _getHolidaySet(d.getFullYear()).has(_fmt(d));
}
