/**
 * src/finance/forecast/forecastEngine.js
 *
 * Forecast Engine V4
 */

import {
  toNumber,
  isFutureDate,
  sumBy,
  sortByDate,
} from "./forecastHelpers";

export function generateForecast(rawData) {
  if (!rawData) {
    return {
      income: 0,
      expenses: 0,
      savings: 0,
      cards: 0,
      remaining: 0,
      projectedBalance: 0,
      upcomingBills: [],
      upcomingIncome: [],
      timeline: [],
      insights: [],
      message: "No data available.",
    };
  }

  const sent = rawData.sent ?? {};
  const expenses = rawData.expenses ?? [];
  const savings = rawData.savings ?? [];
  const cards = rawData.cards ?? [];

  // =====================================================
  // Totals
  // =====================================================

  const income = sumBy(
    Object.values(sent).flat(),
    (item) => item.amt
  );

  const expenseTotal = sumBy(
    expenses,
    (item) => item.amount ?? item.amt
  );

  const savingsTotal = sumBy(
    savings,
    (item) => item.saved
  );

  const cardBalance = sumBy(
    cards,
    (card) => card.balance ?? card.bal
  );

  const remaining = income - expenseTotal;

  // =====================================================
  // Upcoming Bills
  // =====================================================

  const upcomingBills = sortByDate(
    expenses
      .filter((expense) => isFutureDate(expense.due))
      .map((expense) => ({
        name: expense.name ?? expense.label ?? "Expense",
        due: expense.due,
        amount: toNumber(expense.amount ?? expense.amt),
        category: expense.cat ?? expense.category ?? "Other",
      })),
    "due"
  );

  // =====================================================
  // Upcoming Income
  // =====================================================

  const upcomingIncome = sortByDate(
    Object.values(sent)
      .flat()
      .filter((item) => isFutureDate(item.date))
      .map((item) => ({
        source: item.src,
        date: item.date,
        amount: toNumber(item.amt),
      })),
    "date"
  );

  // =====================================================
  // Timeline
  // =====================================================

  const timeline = [];

  upcomingIncome.forEach((item) => {
    timeline.push({
      type: "income",
      title: item.source,
      date: item.date,
      amount: item.amount,
    });
  });

  upcomingBills.forEach((bill) => {
    timeline.push({
      type: "expense",
      title: bill.name,
      date: bill.due,
      amount: bill.amount,
    });
  });

  timeline.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let runningBalance = remaining;

  timeline.forEach((item) => {
    if (item.type === "income") {
      runningBalance += item.amount;
    } else {
      runningBalance -= item.amount;
    }

    item.balance = runningBalance;
  });

  // =====================================================
  // Projected Balance
  // =====================================================

  const projectedBalance =
    timeline.length > 0
      ? timeline[timeline.length - 1].balance
      : remaining;

  // =====================================================
  // Insights
  // =====================================================

  const insights = [];

  if (remaining < 0) {
    insights.push("⚠️ Your expenses currently exceed your income.");
  } else {
    insights.push("✅ Your income currently covers your expenses.");
  }

  if (upcomingBills.length > 0) {
    insights.push(`📅 ${upcomingBills.length} upcoming bill(s).`);
  }

  if (upcomingIncome.length > 0) {
    insights.push(`💰 ${upcomingIncome.length} upcoming income payment(s).`);
  }

  if (cardBalance > 0) {
    insights.push(
      `💳 Credit card balance: $${cardBalance.toLocaleString()}`
    );
  }

  if (savingsTotal > 0) {
    insights.push(
      `🏦 Savings balance: $${savingsTotal.toLocaleString()}`
    );
  }

  // =====================================================
  // Return
  // =====================================================

  return {
    income,
    expenses: expenseTotal,
    savings: savingsTotal,
    cards: cardBalance,
    remaining,
    projectedBalance,
    upcomingBills,
    upcomingIncome,
    timeline,
    insights,
    message: "Forecast calculated successfully.",
  };
}
