/**
 * FinanceEngine.js
 *
 * Budget Blossom
 * Financial orchestration layer.
 */

import { calculateIncome } from "./calculators/income";
import { calculateExpenses } from "./calculators/expenses";
import { calculateSavings } from "./calculators/savings";
import { calculateCashflow } from "./calculators/cashflow";

export class FinanceEngine {
  static calculate(rawData = {}, period) {
    const expenses = rawData.expenses ?? [];
    const savings = rawData.savings ?? [];
    const sent = rawData.sent ?? {};

    const periodIncome = calculateIncome(
      (sent[period?.k] ?? []).map(item => ({
        type: "income",
        amount: Number(item.amt) || 0,
      }))
    );

    const periodExpenses = expenses.filter(expense => {
      if (!expense.due) return false;

      const dueDate = new Date(expense.due + "T12:00:00");

      return (
        dueDate >= period.s &&
        dueDate <= period.e
      );
    });

    const totalExpenses = calculateExpenses(
      periodExpenses.map(expense => ({
        type: "expense",
        amount: Number(expense.amount || expense.amt) || 0,
      }))
    );

    const paidExpenses = periodExpenses
      .filter(expense => expense.paid)
      .reduce(
        (sum, expense) =>
          sum +
          (Number(expense.amount || expense.amt) || 0),
        0
      );

    const totalSaved = savings.reduce(
      (sum, bucket) =>
        sum + (Number(bucket.saved) || 0),
      0
    );

    const remaining = calculateSavings(
      periodIncome,
      totalExpenses
    );

    return {
      income: periodIncome,

      expenses: totalExpenses,

      remaining,

      cashflow: calculateCashflow(
        periodIncome,
        totalExpenses
      ),

      paid: paidExpenses,

      paidCount: periodExpenses.filter(
        expense => expense.paid
      ).length,

      expenseCount: periodExpenses.length,

      totalSaved,

      savingsBuckets: savings.map(bucket => ({
        id: bucket.id,
        label: bucket.name,
        saved: Number(bucket.saved) || 0,
        target: Number(bucket.target) || 0,
        monthly: Number(bucket.monthly) || 0,
        color: bucket.color,

        pct:
          bucket.target > 0
            ? Math.min(
                100,
                Math.round(
                  ((Number(bucket.saved) || 0) /
                    Number(bucket.target)) *
                    100
                )
              )
            : null,
      })),

      sentCount: (sent[period?.k] ?? []).length,
    };
  }
}

export default FinanceEngine;
