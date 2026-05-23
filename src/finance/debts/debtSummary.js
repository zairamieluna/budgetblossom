/**
 * debtSummary.js
 * Pure debt summary analyser.
 */
const DTI_THRESHOLDS     = { low: 0.15, medium: 0.30, high: 0.43 };
const BALANCE_THRESHOLDS = { low: 2000, medium: 8000, high: 20000 };
function pos(v) { return Math.max(Number(v)||0, 0); }
function riskFromDTI(r)     { return r<DTI_THRESHOLDS.low?"low":r<DTI_THRESHOLDS.medium?"medium":r<DTI_THRESHOLDS.high?"high":"critical"; }
function riskFromBalance(b) { return b<=BALANCE_THRESHOLDS.low?"low":b<=BALANCE_THRESHOLDS.medium?"medium":b<=BALANCE_THRESHOLDS.high?"high":"critical"; }
function summariseDebts(debts=[], monthlyIncome=null) {
  if (!Array.isArray(debts)||debts.length===0) return {
    totalDebt:0,totalMinPayments:0,highestInterestDebt:null,lowestBalanceDebt:null,
    monthlyPressureRatio:null,riskLevel:"low",debtCount:0,avgInterestRate:0,estimatedAnnualInterest:0
  };
  const clean = debts.map(d=>({...d,remaining:pos(d.remaining),minPayment:pos(d.minPayment),interestRate:pos(d.interestRate)}));
  const totalDebt        = clean.reduce((s,d)=>s+d.remaining,0);
  const totalMinPayments = clean.reduce((s,d)=>s+d.minPayment,0);
  const estimatedAnnualInterest = clean.reduce((s,d)=>s+d.remaining*(d.interestRate/100),0);
  const avgInterestRate = totalDebt>0
    ? clean.reduce((s,d)=>s+d.interestRate*d.remaining,0)/totalDebt
    : clean.reduce((s,d)=>s+d.interestRate,0)/clean.length;
  const highestInterestDebt = clean.reduce((b,d)=>d.interestRate>b.interestRate?d:b, clean[0]);
  const lowestBalanceDebt   = clean.reduce((b,d)=>d.remaining<b.remaining?d:b,       clean[0]);
  const income = monthlyIncome!=null ? pos(monthlyIncome) : null;
  const monthlyPressureRatio = income!=null&&income>0 ? totalMinPayments/income : null;
  const riskLevel = monthlyPressureRatio!=null ? riskFromDTI(monthlyPressureRatio) : riskFromBalance(totalDebt);
  return {
    totalDebt:              parseFloat(totalDebt.toFixed(2)),
    totalMinPayments:       parseFloat(totalMinPayments.toFixed(2)),
    highestInterestDebt,    lowestBalanceDebt,
    monthlyPressureRatio:   monthlyPressureRatio!=null ? parseFloat(monthlyPressureRatio.toFixed(4)) : null,
    riskLevel,              debtCount: clean.length,
    avgInterestRate:        parseFloat(avgInterestRate.toFixed(4)),
    estimatedAnnualInterest: parseFloat(estimatedAnnualInterest.toFixed(2)),
  };
}

export { summariseDebts, riskFromDTI, riskFromBalance, DTI_THRESHOLDS, BALANCE_THRESHOLDS };
