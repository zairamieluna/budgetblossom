/**
 * FinanceEngine.js
 *
 * Budget Blossom — Finance Layer
 *
 * Financial orchestration. Calculates all monetary values
 * for a given period from raw Supabase data.
 *
 * Change log:
 *   v1.1 — Expose `periodExpenses` in return value so
 *           dashboard components can render individual
 *           bill lines without re-filtering the raw data.
 */

import { calculateIncome }   from "./calculators/income";
import { calculateExpenses } from "./calculators/expenses";
import { calculateSavings }  from "./calculators/savings";
import { calculateCashflow } from "./calculators/cashflow";

export class FinanceEngine {
  /**
   * Calculate all financial metrics for a period.
   *
   * @param {object} rawData — from DashboardService.loadDashboard()
   * @param {object} period  — from periodService PERIODS array
   * @returns {FinanceResult}
   */
  static calculate(rawData = {}, period) {
    const expenses = rawData.expenses ?? [];
    const savings  = rawData.savings  ?? [];
    const sent     = rawData.sent     ?? {};

    // ── Income ───────────────────────────────────────────
    const periodIncome = calculateIncome(
      (sent[period?.k] ?? []).map(item => ({
        type:   "income",
        amount: Number(item.amt) || 0,
      }))
    );

    // ── Expenses for this period ──────────────────────────
    const periodExpenses = expenses.filter(expense => {
      if (!expense.due) return false;

      const dueDate = new Date(expense.due + "T12:00:00");

      return dueDate >= period.s && dueDate <= period.e;
    });

    const totalExpenses = calculateExpenses(
      periodExpenses.map(expense => ({
        type:   "expense",
        amount: Number(expense.amount || expense.amt) || 0,
      }))
    );

    const paidExpenses = periodExpenses
      .filter(expense => expense.paid)
      .reduce(
        (sum, expense) =>
          sum + (Number(expense.amount || expense.amt) || 0),
        0
      );

    // ── Savings / Goals ───────────────────────────────────
    const totalSaved = savings.reduce(
      (sum, bucket) => sum + (Number(bucket.saved) || 0),
      0
    );

    const remaining = calculateSavings(periodIncome, totalExpenses);

    // ── Return ────────────────────────────────────────────
    return {
      /** Total income logged for this period */
      income: periodIncome,

      /** Total expenses due in this period */
      expenses: totalExpenses,

      /** Income minus expenses */
      remaining,

      /** Cashflow metric (income - expenses, directional) */
      cashflow: calculateCashflow(periodIncome, totalExpenses),

      /** Dollar amount of paid expenses */
      paid: paidExpenses,

      /** Number of expenses marked paid */
      paidCount: periodExpenses.filter(e => e.paid).length,

      /** Total number of expenses due this period */
      expenseCount: periodExpenses.length,

      /** Sum of all saved amounts across goal buckets */
      totalSaved,

      /**
       * Enriched savings buckets for goals display.
       * Use GoalEngine.buildGoals(rawData.savings) for full goal objects.
       */
      savingsBuckets: savings.map(bucket => ({
        id:      bucket.id,
        label:   bucket.name,
        saved:   Number(bucket.saved)   || 0,
        target:  Number(bucket.target)  || 0,
        monthly: Number(bucket.monthly) || 0,
        color:   bucket.color,

        pct:
          bucket.target > 0
            ? Math.min(
                100,
                Math.round(
                  ((Number(bucket.saved) || 0) / Number(bucket.target)) * 100
                )
              )
            : null,
      })),

      /** Number of income entries logged this period */
      sentCount: (sent[period?.k] ?? []).length,

      /**
       * v1.1 — Raw expense objects for this period.
       * Includes: id, name/label, amount, due date, paid flag.
       * Used by CashFlowCard and upcoming bills display.
       */
      periodExpenses,
    };
  }
}

export default FinanceEngine;

/**
 * @typedef {object} FinanceResult
 * @property {number}   income
 * @property {number}   expenses
 * @property {number}   remaining
 * @property {number}   cashflow
 * @property {number}   paid
 * @property {number}   paidCount
 * @property {number}   expenseCount
 * @property {number}   totalSaved
 * @property {Array}    savingsBuckets
 * @property {number}   sentCount
 * @property {Array}    periodExpenses   ← v1.1 addition
 */
