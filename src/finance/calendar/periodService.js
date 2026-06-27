// src/finance/calendar/periodService.js

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns the current month and year.
 */
export function getCurrentPeriod(date = new Date()) {
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
    label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  };
}

/**
 * Returns a formatted label for any month/year.
 */
export function getPeriodLabel(month, year) {
  return `${MONTHS[month]} ${year}`;
}

/**
 * Returns previous month/year.
 */
export function getPreviousPeriod(month, year) {
  if (month === 0) {
    return {
      month: 11,
      year: year - 1,
    };
  }

  return {
    month: month - 1,
    year,
  };
}

/**
 * Returns next month/year.
 */
export function getNextPeriod(month, year) {
  if (month === 11) {
    return {
      month: 0,
      year: year + 1,
    };
  }

  return {
    month: month + 1,
    year,
  };
}

/**
 * Returns an array of recent periods.
 *
 * Example:
 * June 2026
 * May 2026
 * April 2026
 * ...
 */
export function getRecentPeriods(count = 12) {
  const periods = [];

  const current = new Date();

  let month = current.getMonth();
  let year = current.getFullYear();

  for (let i = 0; i < count; i++) {
    periods.push({
      month,
      year,
      label: getPeriodLabel(month, year),
    });

    const previous = getPreviousPeriod(month, year);

    month = previous.month;
    year = previous.year;
  }

  return periods;
}
