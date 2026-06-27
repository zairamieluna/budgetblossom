// src/finance/calendar/periodService.js

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function buildPeriods(year = new Date().getFullYear()) {
  const periods = [];

  for (let month = 0; month < 12; month++) {
    const lastDay = new Date(year, month + 1, 0).getDate();

    periods.push({
      k: `${String(year).slice(-2)}${month}a`,
      lbl: `${MONTHS[month]} 1–15`,
      s: new Date(year, month, 1),
      e: new Date(year, month, 15, 23, 59, 59),
      pd: new Date(year, month, 7),
    });

    periods.push({
      k: `${String(year).slice(-2)}${month}b`,
      lbl: `${MONTHS[month]} 16–${lastDay}`,
      s: new Date(year, month, 16),
      e: new Date(year, month, lastDay, 23, 59, 59),
      pd: new Date(year, month, 22),
    });
  }

  return periods;
}

export const PERIODS = buildPeriods();

export function getCurrentPeriodIndex(periods = PERIODS) {
  const today = new Date();

  const index = periods.findIndex(
    (period) => today >= period.s && today <= period.e
  );

  return index >= 0 ? index : 0;
}
