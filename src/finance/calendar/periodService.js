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

/**
 * Build all pay periods for one year.
 *
 * Each month has:
 *   A = 1st–15th
 *   B = 16th–end of month
 *
 * Payday:
 *   A period → 7th
 *   B period → 22nd
 */
export function buildPeriods(
  year = new Date().getFullYear()
) {
  const periods = [];

  for (let month = 0; month < 12; month++) {
    const lastDay = new Date(
      year,
      month + 1,
      0
    ).getDate();

    periods.push({
      k: `${String(year).slice(-2)}${month}a`,
      lbl: `${MONTHS[month]} 1–15`,

      s: new Date(
        year,
        month,
        1,
        0,
        0,
        0
      ),

      e: new Date(
        year,
        month,
        15,
        23,
        59,
        59
      ),

      pd: new Date(
        year,
        month,
        7,
        12,
        0,
        0
      ),
    });

    periods.push({
      k: `${String(year).slice(-2)}${month}b`,
      lbl: `${MONTHS[month]} 16–${lastDay}`,

      s: new Date(
        year,
        month,
        16,
        0,
        0,
        0
      ),

      e: new Date(
        year,
        month,
        lastDay,
        23,
        59,
        59
      ),

      pd: new Date(
        year,
        month,
        22,
        12,
        0,
        0
      ),
    });
  }

  return periods;
}

/**
 * Build periods across multiple years.
 *
 * Default:
 * current year + next year.
 *
 * This means the app automatically supports
 * moving into the next calendar year.
 */
export function buildMultiYearPeriods(
  startYear = new Date().getFullYear(),
  numberOfYears = 2
) {
  const periods = [];

  for (
    let year = startYear;
    year < startYear + numberOfYears;
    year++
  ) {
    periods.push(
      ...buildPeriods(year)
    );
  }

  return periods;
}

/**
 * Global period list used throughout
 * Budget Blossom.
 */
export const PERIODS =
  buildMultiYearPeriods(
    new Date().getFullYear(),
    2
  );

/**
 * Return the period containing today.
 */
export function getCurrentPeriodIndex(
  periods = PERIODS
) {
  const today = new Date();

  const index =
    periods.findIndex(
      (period) =>
        today >= period.s &&
        today <= period.e
    );

  if (index >= 0) {
    return index;
  }

  // If today somehow falls outside
  // the generated range, use the
  // closest previous period.
  const firstFutureIndex =
    periods.findIndex(
      (period) =>
        period.s > today
    );

  if (firstFutureIndex > 0) {
    return firstFutureIndex - 1;
  }

  return 0;
}
