/**
 * src/finance/forecast/forecastHelpers.js
 *
 * Helper functions for Forecast Engine.
 * Pure functions only.
 */

// =====================================================
// Safe Number
// =====================================================

export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

// =====================================================
// Date
// =====================================================

export function toDate(value) {
  return value ? new Date(value) : null;
}

// =====================================================
// Is Future Date
// =====================================================

export function isFutureDate(value) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date >= today;
}

// =====================================================
// Sum
// =====================================================

export function sumBy(list, selector) {
  return list.reduce((sum, item) => sum + toNumber(selector(item)), 0);
}

// =====================================================
// Sort By Date
// =====================================================

export function sortByDate(list, key) {
  return [...list].sort(
    (a, b) => new Date(a[key]) - new Date(b[key])
  );
}

// =====================================================
// Currency
// =====================================================

export function currency(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}
