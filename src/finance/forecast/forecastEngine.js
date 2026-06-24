/**
 * src/finance/forecast/forecastEngine.js
 *
 * Forecast Engine V1
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
      message: "No data available.",
    };
  }

  const sent = rawData.sent ?? {};
  const expenses = rawData.expenses ?? [];
  const savings = rawData.savings ?? [];
  const cards = rawData.cards ?? [];

  // Income
  const income = Object.values(sent)
    .flat()
    .reduce((sum, item) => sum + (Number(item.amt) || 0), 0);

  // Expenses
  const expenseTotal = expenses.reduce(
    (sum, item) => sum + (Number(item.amount || item.amt) || 0),
    0
  );

  // Savings
  const savingsTotal = savings.reduce(
    (sum, item) => sum + (Number(item.saved) || 0),
    0
  );

  // Card balances
  const cardBalance = cards.reduce(
    (sum, card) => sum + (Number(card.balance || card.bal) || 0),
    0
  );

  return {
    income,
    expenses: expenseTotal,
    savings: savingsTotal,
    cards: cardBalance,
    remaining: income - expenseTotal,
    message: "Forecast calculated successfully.",
  };
}
