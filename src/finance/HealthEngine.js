/**
 * HealthEngine.js
 *
 * Budget Blossom
 * Calculates the user's Financial Health Score.
 */

export class HealthEngine {
  static calculate({
    income = 0,
    expenses = 0,
    paid = 0,
    expenseCount = 0,
    paidCount = 0,
    goals = [],
    cards = [],
  }) {
    // Bills (25)
    const billsScore =
      expenseCount > 0
        ? (paidCount / expenseCount) * 25
        : 25;

    // Cash Flow (25)
    const remaining = income - expenses;

    const cashFlowScore =
      remaining >= 0
        ? 25
        : Math.max(
            0,
            25 - Math.abs(remaining) / 50
          );

    // Goals (25)
    const goalProgress =
      goals.length === 0
        ? 25
        : goals.reduce(
            (sum, goal) => sum + (goal.progress || 0),
            0
          ) /
          goals.length /
          4;

    // Debt (25)
    let debtScore = 25;

    if (cards.length > 0) {
      const utilization =
        cards.reduce(
          (sum, card) =>
            sum +
            ((Number(card.balance) || 0) /
              Math.max(Number(card.limit) || 1, 1)),
          0
        ) / cards.length;

      debtScore = Math.max(
        0,
        25 - utilization * 25
      );
    }

    const score = Math.round(
      billsScore +
        cashFlowScore +
        goalProgress +
        debtScore
    );

    let rating = "Needs Attention";

    if (score >= 90) rating = "Excellent";
    else if (score >= 75) rating = "Great";
    else if (score >= 60) rating = "Good";
    else if (score >= 40) rating = "Fair";

    return {
      score,
      rating,
      breakdown: {
        bills: Math.round(billsScore),
        cashFlow: Math.round(cashFlowScore),
        goals: Math.round(goalProgress),
        debt: Math.round(debtScore),
      },
    };
  }
}

export default HealthEngine;
