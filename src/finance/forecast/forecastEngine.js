/**
 * src/finance/forecast/forecastEngine.js
 *
 * Forecast Engine V3
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

  // =====================================================
  // Income
  // =====================================================

  const income = Object.values(sent)
    .flat()
    .reduce((sum, item) => sum + (Number(item.amt) || 0), 0);

  // =====================================================
  // Expenses
  // =====================================================

  const expenseTotal = expenses.reduce(
    (sum, item) => sum + (Number(item.amount ?? item.amt) || 0),
    0
  );

  // =====================================================
  // Savings
  // =====================================================

  const savingsTotal = savings.reduce(
    (sum, item) => sum + (Number(item.saved) || 0),
    0
  );

  // =====================================================
  // Credit Cards
  // =====================================================

  const cardBalance = cards.reduce(
    (sum, card) => sum + (Number(card.balance ?? card.bal) || 0),
    0
  );

  // =====================================================
  // Remaining Balance
  // =====================================================

  const remaining = income - expenseTotal;

  // =====================================================
  // Today's Date
  // =====================================================

  const today = new Date();

  // =====================================================
  // Upcoming Bills
  // =====================================================

  const upcomingBills = expenses
    .filter((expense) => expense.due)
    .filter((expense) => new Date(expense.due) >= today)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .map((expense) => ({
      name: expense.name ?? expense.label ?? "Expense",
      due: expense.due,
      amount: Number(expense.amount ?? expense.amt) || 0,
      category: expense.cat ?? expense.category ?? "Other",
    }));

  // =====================================================
  // Upcoming Income
  // =====================================================

  const upcomingIncome = Object.values(sent)
    .flat()
    .filter((item) => item.date)
    .filter((item) => new Date(item.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((item) => ({
      source: item.src,
      date: item.date,
      amount: Number(item.amt) || 0,
    }));

  // =====================================================
  // Projected Balance
  // =====================================================

  const projectedBalance =
    remaining +
    upcomingIncome.reduce((sum, item) => sum + item.amount, 0);

  // =====================================================
  // Insights
  // =====================================================

  const insights = [];

  if (upcomingIncome.length > 0) {
    insights.push(
      `💰 ${upcomingIncome.length} upcoming income payment(s) detected.`
    );
  }

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

  if (savingsTotal > 0) {
    insights.push(
      `🏦 Total savings: $${savingsTotal.toLocaleString()}`
    );
  }

  // =====================================================
  // Return Forecast
  // =====================================================

  return {
    income,
    expenses: expenseTotal,
    savings: savingsTotal,
    cards: cardBalance,
    remaining,

    upcomingBills,
    upcomingIncome,

    projectedBalance,

    insights,

    message: "Forecast calculated successfully.",
  };
}
