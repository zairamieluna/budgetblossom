/**
 * src/finance/forecast/forecastDefaults.js
 *
 * Forecast configuration constants.
 * Pure configuration only.
 */

export const FORECAST_CONFIG = {
  lookbackPeriods: 6,
  projectionPeriods: 3,
  minDataPointsRequired: 2,
};

export const TREND_CONFIG = {
  variationThreshold: 0.4,
  trendChangeThreshold: 0.15,
};

export const RISK_THRESHOLDS = {
  criticalBalanceThreshold: 0,
  warningBalanceThreshold: 500,
  incomeDropAlertThreshold: 0.85,
  anomalyExpensePercentage: 0.30,
};

export const CONFIDENCE_RANGES = {
  high: {
    min: 75,
    max: 100,
  },
  medium: {
    min: 50,
    max: 74,
  },
  low: {
    min: 0,
    max: 49,
  },
};
