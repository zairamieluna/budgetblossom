/**
 * HealthEngine.js
 *
 * Budget Blossom — Finance Layer
 *
 * Calculates a composite Financial Health Score from
 * the outputs of FinanceEngine and GoalEngine.
 *
 * All inputs are plain numbers — no React, no Supabase.
 * This engine is pure, deterministic, and side-effect free.
 *
 * Score breakdown (each sub-score is 0–100):
 *   savings   — average goal progress across all buckets
 *   bills     — ratio of bills paid vs total due this period
 *   cashflow  — how healthy the income-to-expense ratio is
 *   debt      — placeholder (no debt data yet; defaults to neutral)
 *
 * Composite score weights:
 *   savings   35%
 *   bills     30%
 *   cashflow  25%
 *   debt      10%
 *
 * Ratings:
 *   90–100  Excellent
 *   75–89   Good
 *   55–74   Fair
 *   0–54    Needs Attention
 */

export class HealthEngine {
  /**
   * Primary entry point.
   *
   * @param {object} finance  — output of FinanceEngine.calculate()
   * @param {Array}  goals    — output of GoalEngine.buildGoals()
   * @returns {HealthResult}
   */
  static calculate(finance = {}, goals = []) {
    const savings = HealthEngine._savingsScore(goals);
    const bills = HealthEngine._billsScore(finance);
    const cashflow = HealthEngine._cashflowScore(finance);
    const debt = HealthEngine._debtScore(finance);

    const score = Math.round(
      savings * 0.35 +
      bills   * 0.30 +
      cashflow * 0.25 +
      debt    * 0.10
    );

    return {
      score,
      rating: HealthEngine._rating(score),
      breakdown: {
        savings,
        bills,
        cashflow,
        debt,
      },
    };
  }

  // ─── Sub-score calculators ────────────────────────────

  /**
   * Savings score: average progress across all goal buckets.
   * If no goals exist, returns a neutral 50.
   *
   * @param {Array} goals — GoalEngine.buildGoals() output
   * @returns {number} 0–100
   */
  static _savingsScore(goals = []) {
    if (!goals.length) return 50;

    const total = goals.reduce(
      (sum, g) => sum + (g.progress ?? 0),
      0
    );

    return Math.min(100, Math.round(total / goals.length));
  }

  /**
   * Bills score: ratio of bills paid to bills due this period.
   * Perfect score = all bills paid.
   * No bills due = neutral 100 (nothing to fail).
   *
   * @param {object} finance — FinanceEngine output
   * @returns {number} 0–100
   */
  static _billsScore(finance = {}) {
    const { paidCount = 0, expenseCount = 0 } = finance;

    if (expenseCount === 0) return 100;

    return Math.min(
      100,
      Math.round((paidCount / expenseCount) * 100)
    );
  }

  /**
   * Cashflow score: how well income covers expenses.
   *
   * Scoring tiers:
   *   income covers 100%+ of expenses → 100
   *   income covers 80–99%            → 70–99 (linear)
   *   income covers 50–79%            → 40–69 (linear)
   *   income covers < 50%             → 0–39  (linear)
   *   no income at all                → neutral 50
   *
   * @param {object} finance — FinanceEngine output
   * @returns {number} 0–100
   */
  static _cashflowScore(finance = {}) {
    const { income = 0, expenses = 0 } = finance;

    if (income === 0 && expenses === 0) return 50;
    if (expenses === 0) return 100;

    const ratio = income / expenses;

    if (ratio >= 1) return 100;
    if (ratio >= 0.8)
      return Math.round(70 + ((ratio - 0.8) / 0.2) * 30);
    if (ratio >= 0.5)
      return Math.round(40 + ((ratio - 0.5) / 0.3) * 30);

    return Math.max(0, Math.round(ratio * 80));
  }

  /**
   * Debt score: placeholder until debt data is tracked.
   * Returns a neutral 70 — assumed manageable, not perfect.
   * Replace this when rawData.debt is available.
   *
   * @returns {number} 0–100
   */
  static _debtScore() {
    return 70;
  }

  // ─── Rating label ─────────────────────────────────────

  /**
   * Maps a composite score to a human-readable rating.
   *
   * @param {number} score — 0 to 100
   * @returns {string}
   */
  static _rating(score) {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 55) return "Fair";
    return "Needs Attention";
  }
}

export default HealthEngine;

/**
 * @typedef {object} HealthResult
 * @property {number} score           — composite 0–100
 * @property {string} rating          — "Excellent" | "Good" | "Fair" | "Needs Attention"
 * @property {object} breakdown
 * @property {number} breakdown.savings   — 0–100
 * @property {number} breakdown.bills     — 0–100
 * @property {number} breakdown.cashflow  — 0–100
 * @property {number} breakdown.debt      — 0–100
 */
