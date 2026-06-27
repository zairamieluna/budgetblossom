// src/finance/calculators/income.js

export function calculateIncome(transactions = []) {
    return transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}
