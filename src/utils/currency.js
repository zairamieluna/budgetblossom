// src/utils/currency.js

/**
 * Default locale and currency for Budget Blossom.
 * These can later become user settings.
 */
const DEFAULT_LOCALE = "en-CA";
const DEFAULT_CURRENCY = "CAD";

/**
 * Formats a number as currency.
 *
 * Example:
 * formatCurrency(1234.56)
 * => "$1,234.56"
 */
export function formatCurrency(
  value,
  {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = {}
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formats a plain number.
 *
 * Example:
 * formatNumber(1234567)
 * => "1,234,567"
 */
export function formatNumber(
  value,
  {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = {}
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formats a percentage.
 *
 * Example:
 * formatPercent(0.245)
 * => "24.5%"
 */
export function formatPercent(
  value,
  {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 1,
  } = {}
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}
