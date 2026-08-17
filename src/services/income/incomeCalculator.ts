// Budget Blossom - Income & Payroll Calculation Engine

export type EarningType =
  | "regular"
  | "overtime"
  | "stat_1x"
  | "stat_1_5x"
  | "stat_2x"
  | "freezing_premium"
  | "evening_premium"
  | "training"
  | "vacation"
  | "bonus";

export interface WorkShift {
  date: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes?: number;

  hourlyRate: number;

  isStatHoliday?: boolean;
  statMultiplier?: number;

  overtimeMultiplier?: number;

  freezingPremium?: number;
  eveningPremium?: number;

  trainingHours?: number;
}

export interface Paycheck {
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;

  regularHours: number;
  overtimeHours: number;
  statHours: number;
  premiumHours: number;
  trainingHours: number;

  regularPay: number;
  overtimePay: number;
  statPay: number;
  premiumPay: number;
  trainingPay: number;
  vacationPay: number;
  bonus: number;

  grossPay: number;

  federalTax: number;
  cpp: number;
  ei: number;
  otherDeductions: number;

  totalDeductions: number;
  netPay: number;
}

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const roundHours = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;


/**
 * Converts HH:mm to decimal hours.
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes = 0
): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  // Handles overnight shifts.
  if (end < start) {
    end += 24 * 60;
  }

  const totalMinutes = end - start;
  const paidMinutes = Math.max(
    0,
    totalMinutes - unpaidBreakMinutes
  );

  return roundHours(paidMinutes / 60);
}


/**
 * Calculates a single shift.
 */
export function calculateShift(shift: WorkShift) {
  const hours = calculateShiftHours(
    shift.startTime,
    shift.endTime,
    shift.unpaidBreakMinutes ?? 0
  );

  const rate = shift.hourlyRate;

  let regularHours = hours;
  let overtimeHours = 0;
  let statHours = 0;

  /*
   * Stat holiday calculation.
   *
   * IMPORTANT:
   * The multiplier is configurable.
   * Do not assume every Canadian employer uses the same rule.
   */
  if (shift.isStatHoliday) {
    statHours = hours;
    regularHours = 0;
  }

  const statMultiplier = shift.statMultiplier ?? 1;

  const overtimeMultiplier =
    shift.overtimeMultiplier ?? 1.5;

  let regularPay = 0;
  let overtimePay = 0;
  let statPay = 0;

  if (shift.isStatHoliday) {
    statPay = statHours * rate * statMultiplier;
  } else {
    regularPay = regularHours * rate;
  }

  /*
   * Premiums
   */
  const freezingPremium =
    shift.freezingPremium ?? 0;

  const eveningPremium =
    shift.eveningPremium ?? 0;

  const premiumPay =
    freezingPremium + eveningPremium;

  /*
   * Training
   */
  const trainingHours =
    shift.trainingHours ?? 0;

  const trainingPay =
    trainingHours * rate;

  return {
    hours,

    regularHours,
    overtimeHours,
    statHours,
    trainingHours,

    regularPay: roundMoney(regularPay),

    overtimePay: roundMoney(
      overtimeHours *
        rate *
        overtimeMultiplier
    ),

    statPay: roundMoney(statPay),

    premiumPay: roundMoney(premiumPay),

    trainingPay: roundMoney(trainingPay),

    grossPay: roundMoney(
      regularPay +
      overtimePay +
      statPay +
      premiumPay +
      trainingPay
    )
  };
}


/**
 * Calculates an entire paycheck from shifts.
 */
export function calculatePaycheck(
  shifts: WorkShift[],
  options?: {
    vacationPercent?: number;
    bonus?: number;

    federalTax?: number;
    cpp?: number;
    ei?: number;
    otherDeductions?: number;
  }
): Paycheck {

  if (!shifts.length) {
    throw new Error(
      "At least one work shift is required."
    );
  }

  let regularHours = 0;
  let overtimeHours = 0;
  let statHours = 0;
  let premiumHours = 0;
  let trainingHours = 0;

  let regularPay = 0;
  let overtimePay = 0;
  let statPay = 0;
  let premiumPay = 0;
  let trainingPay = 0;

  for (const shift of shifts) {
    const result = calculateShift(shift);

    regularHours += result.regularHours;
    overtimeHours += result.overtimeHours;
    statHours += result.statHours;
    trainingHours += result.trainingHours;

    regularPay += result.regularPay;
    overtimePay += result.overtimePay;
    statPay += result.statPay;
    premiumPay += result.premiumPay;
    trainingPay += result.trainingPay;

    premiumHours +=
      (shift.freezingPremium ?? 0) > 0
        ? result.hours
        : 0;

    premiumHours +=
      (shift.eveningPremium ?? 0) > 0
        ? result.hours
        : 0;
  }

  const vacationPercent =
    options?.vacationPercent ?? 0;

  const bonus =
    options?.bonus ?? 0;

  const baseEarnings =
    regularPay +
    overtimePay +
    statPay +
    premiumPay +
    trainingPay;

  const vacationPay =
    baseEarnings * vacationPercent;

  const grossPay =
    baseEarnings +
    vacationPay +
    bonus;

  /*
   * IMPORTANT:
   *
   * These deductions are estimates unless
   * actual paystub values are supplied.
   */
  const federalTax =
    options?.federalTax ?? 0;

  const cpp =
    options?.cpp ?? 0;

  const ei =
    options?.ei ?? 0;

  const otherDeductions =
    options?.otherDeductions ?? 0;

  const totalDeductions =
    federalTax +
    cpp +
    ei +
    otherDeductions;

  const netPay =
    grossPay -
    totalDeductions;

  return {
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",

    regularHours: roundHours(regularHours),
    overtimeHours: roundHours(overtimeHours),
    statHours: roundHours(statHours),
    premiumHours: roundHours(premiumHours),
    trainingHours: roundHours(trainingHours),

    regularPay: roundMoney(regularPay),
    overtimePay: roundMoney(overtimePay),
    statPay: roundMoney(statPay),
    premiumPay: roundMoney(premiumPay),
    trainingPay: roundMoney(trainingPay),

    vacationPay: roundMoney(vacationPay),
    bonus: roundMoney(bonus),

    grossPay: roundMoney(grossPay),

    federalTax: roundMoney(federalTax),
    cpp: roundMoney(cpp),
    ei: roundMoney(ei),
    otherDeductions: roundMoney(otherDeductions),

    totalDeductions: roundMoney(totalDeductions),

    netPay: roundMoney(netPay)
  };
}
