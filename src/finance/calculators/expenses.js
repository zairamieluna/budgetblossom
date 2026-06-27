// src/finance/calculators/expenses.js

export function calculateExpenses(transactions = []) {
    return transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}
