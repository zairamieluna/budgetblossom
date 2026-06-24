/**
 * src/finance/forecast/forecastEngine.js
 *
 * Forecast Engine V2
 * Uses the existing Budget Blossom data model.
 */

export function generateForecast(rawData) {
  if (!rawData) {
    return {
      income: 0,
      expenses: 0,
      savings: 0,
      cards: 0,
      remaining: 0,
      upcomingBills: [],
      upcomingIncome: [],
      projectedBalance: 0,
      insights: [],
      message: "No data available.",
    };
  }

  const sent = rawData.sent ?? {};
  const expenses = rawData.expenses ?? [];
  const savings = rawData.savings ?? [];
  const cards = rawData.cards ?? [];

  // ==========================
  // Income
  // ==========================

  const income = Object.values(sent)
    .flat()
    .reduce((sum, item) => sum + (Number(item.amt) || 0), 0);

  // ==========================
  // Expenses
  // ==========================

  const expenseTotal = expenses.reduce(
    (sum, item) => sum + (Number(item.amount ?? item.amt) || 0),
    0
  );

  // ==========================
  // Savings
  // ==========================

  const savingsTotal = savings.reduce(
    (sum, item) => sum + (Number(item.saved) || 0),
    0
  );

  // ==========================
  // Cards
  // ==========================

  const cardBalance = cards.reduce(
    (sum, card) => sum + (Number(card.balance ?? card.bal) || 0),
    0
  );

  // ==========================
  // Remaining Balance
  // ==========================

  const remaining = income - expenseTotal;

  // ==========================
  // Upcoming Bills
  // ==========================

  const today = new Date();

  const upcomingBills = expenses
    .filter((expense) => {
      if (!expense.due) return false;

      return new Date(expense.due) >= today;
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .map((expense) => ({
      name: expense.name,
      due: expense.due,
      amount: Number(expense.amount ?? expense.amt) || 0,
    }));

  // ==========================
  // Upcoming Income
  // ==========================

  const upcomingIncome = [];

  // ==========================
  // Insights
  // ==========================

  const insights = [];

  if (remaining < 0) {
    insights.push(
      "⚠️ Your current expenses exceed your income."
    );
  } else {
    insights.push(
      "✅ Your income currently covers your expenses."
    );
  }

  if (upcomingBills.length > 0) {
    insights.push(
      `📅 ${upcomingBills.length} upcoming bill(s) detected.`
    );
  }

  if (cardBalance > 0) {
    insights.push(
      `💳 Total credit card balance: $${cardBalance.toLocaleString()}`
    );
  }

  return {
    income,
    expenses: expenseTotal,
    savings: savingsTotal,
    cards: cardBalance,
    remaining,

    upcomingBills,
    upcomingIncome,

    projectedBalance: remaining,

    insights,

    message: "Forecast calculated successfully.",
  };
}
