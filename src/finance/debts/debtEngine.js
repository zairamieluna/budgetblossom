/**
 * debtEngine.js
 * Pure debt analytics engine.
 */
const MONTHS_CAP = 600;
function estimatePayoffMonths(remaining, minPayment, interestRate) {
  const P = Number(remaining) || 0;
  const M = Number(minPayment) || 0;
  const r = (Number(interestRate) || 0) / 100 / 12;
  if (P <= 0) return 0;
  if (M <= 0) return MONTHS_CAP;
  if (r === 0) return Math.ceil(P / M);
  if (M <= r * P) return MONTHS_CAP;
  return Math.min(Math.ceil(-Math.log(1-(r*P)/M)/Math.log(1+r)), MONTHS_CAP);
}
function normalisedScore(value, min, max, strategy) {
  if (max === min) return 50;
  const ratio = (value - min) / (max - min);
  return Math.round((strategy === "avalanche" ? ratio : 1 - ratio) * 100);
}
function recommendStrategy(interestRate, remaining, avgRate, avgBalance) {
  if (interestRate >= avgRate) return "avalanche";
  if (remaining   <= avgBalance) return "snowball";
  return "avalanche";
}
function analyseDebts(debts = [], options = {}) {
  const { strategy = "auto" } = options;
  if (!Array.isArray(debts) || debts.length === 0) return [];
  const sanitised = debts.map(d => ({
    ...d,
    remaining:    Math.max(Number(d.remaining)    || 0, 0),
    minPayment:   Math.max(Number(d.minPayment)   || 0, 0),
    interestRate: Math.max(Number(d.interestRate) || 0, 0),
  }));
  const rates    = sanitised.map(d => d.interestRate);
  const balances = sanitised.map(d => d.remaining);
  const minRate  = Math.min(...rates), maxRate  = Math.max(...rates);
  const minBal   = Math.min(...balances), maxBal = Math.max(...balances);
  const avgRate  = rates.reduce((s,v)=>s+v,0)/rates.length;
  const avgBal   = balances.reduce((s,v)=>s+v,0)/balances.length;
  const enriched = sanitised.map(debt => {
    const payoffMonthsEstimate = estimatePayoffMonths(debt.remaining, debt.minPayment, debt.interestRate);
    const recommended = strategy === "auto"
      ? recommendStrategy(debt.interestRate, debt.remaining, avgRate, avgBal)
      : strategy;
    const scoringStrategy = strategy === "auto" ? recommended : strategy;
    const priorityScore = scoringStrategy === "avalanche"
      ? normalisedScore(debt.interestRate, minRate, maxRate, "avalanche")
      : normalisedScore(debt.remaining, minBal, maxBal, "snowball");
    return { ...debt, priorityScore, payoffMonthsEstimate, recommendedStrategy: recommended };
  });
  enriched.sort((a,b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.payoffMonthsEstimate - b.payoffMonthsEstimate;
  });
  return enriched;
}
function totalRemaining(debts=[])   { return debts.reduce((s,d)=>s+(Number(d.remaining)||0),0); }
function totalMinPayment(debts=[])  { return debts.reduce((s,d)=>s+(Number(d.minPayment)||0),0); }

export { analyseDebts, estimatePayoffMonths, totalRemaining, totalMinPayment, MONTHS_CAP };
