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
  | "bonus"
  | "other";

export interface WorkShift {
  date: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes?: number;
  hourlyRate: number;
  overtimeThreshold?: number;
  overtimeMultiplier?: number;
  isStatHoliday?: boolean;
  statMultiplier?: number;
  freezingPremium?: number;
  eveningPremium?: number;
  trainingHours?: number;
  bonus?: number;
  otherEarnings?: number;
  notes?: string;

  // Legacy Budget Blossom fields
  id?: number | string;
  inT?: string;
  outT?: string;
  brk?: number;
  type?: EarningType | string;
  rate?: number;
  hol?: string | null;
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
  otherEarnings: number;

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

export function calculateShiftHours(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes = 0
): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end < start) {
    end += 24 * 60;
  }

  const totalMinutes = Math.max(0, end - start);
  const paidMinutes = Math.max(
    0,
    totalMinutes - Math.max(0, unpaidBreakMinutes)
  );

  return roundHours(paidMinutes / 60);
}

/**
 * Calculates one shift.
 *
 * Overtime is intentionally NOT assigned here. It is calculated
 * cumulatively by calculatePaycheck() using the employer's
 * configured pay-period overtime threshold.
 */
export function calculateShift(shift: WorkShift) {
  const hours = calculateShiftHours(
    shift.startTime ?? shift.inT ?? "",
    shift.endTime ?? shift.outT ?? "",
    shift.unpaidBreakMinutes ?? shift.brk ?? 0
  );

  const rate = Number(shift.hourlyRate ?? shift.rate ?? 0);

  const statMultiplier =
    Number.isFinite(Number(shift.statMultiplier))
      ? Number(shift.statMultiplier)
      : 1;

  const isStatHoliday = Boolean(shift.isStatHoliday);

  const regularHours = isStatHoliday ? 0 : hours;
  const statHours = isStatHoliday ? hours : 0;

  const regularPay = regularHours * rate;
  const statPay = statHours * rate * statMultiplier;

  const premiumPay =
    Number(shift.freezingPremium ?? 0) +
    Number(shift.eveningPremium ?? 0);

  const trainingHours = Math.min(
    hours,
    Math.max(0, Number(shift.trainingHours ?? 0))
  );

  const trainingPay = trainingHours * rate;
  const bonus = Number(shift.bonus ?? 0);
  const otherEarnings = Number(shift.otherEarnings ?? 0);

  return {
    hours: roundHours(hours),
    regularHours: roundHours(regularHours),
    overtimeHours: 0,
    statHours: roundHours(statHours),
    trainingHours: roundHours(trainingHours),

    regularPay: roundMoney(regularPay),
    overtimePay: 0,
    statPay: roundMoney(statPay),
    premiumPay: roundMoney(premiumPay),
    trainingPay: roundMoney(trainingPay),
    bonus: roundMoney(bonus),
    otherEarnings: roundMoney(otherEarnings),

    grossPay: roundMoney(
      regularPay +
        statPay +
        premiumPay +
        trainingPay +
        bonus +
        otherEarnings
    )
  };
}

/**
 * Calculates a complete paycheck from all shifts in a pay period.
 *
 * Default overtime rule:
 *   first 44 non-stat hours = regular
 *   hours above 44 = overtime at 1.5x
 *
 * Both threshold and multiplier are configurable.
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
    overtimeThreshold?: number;
    overtimeMultiplier?: number;
  }
): Paycheck {
  if (!shifts.length) {
    throw new Error("At least one work shift is required.");
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
  let shiftBonus = 0;
  let otherEarningsPay = 0;

  const thresholdFromShift = shifts.find(
    shift => Number.isFinite(Number(shift.overtimeThreshold))
  )?.overtimeThreshold;

  const overtimeThreshold = Math.max(
    0,
    Number(
      options?.overtimeThreshold ??
        thresholdFromShift ??
        44
    )
  );

  const multiplierFromShift = shifts.find(
    shift => Number.isFinite(Number(shift.overtimeMultiplier))
  )?.overtimeMultiplier;

  const defaultOvertimeMultiplier =
    Number(
      options?.overtimeMultiplier ??
        multiplierFromShift ??
        1.5
    ) || 1.5;

  let cumulativeRegularHours = 0;

  for (const shift of shifts) {
    const result = calculateShift(shift);

    if (shift.isStatHoliday) {
      statHours += result.statHours;
      statPay += result.statPay;
    } else {
      const remainingRegular = Math.max(
        0,
        overtimeThreshold - cumulativeRegularHours
      );

      const shiftRegularHours = Math.min(
        result.hours,
        remainingRegular
      );

      const shiftOvertimeHours = Math.max(
        0,
        result.hours - shiftRegularHours
      );

      const rate = Number(
        shift.hourlyRate ?? shift.rate ?? 0
      );

      const multiplier =
        Number(shift.overtimeMultiplier) ||
        defaultOvertimeMultiplier;

      regularHours += shiftRegularHours;
      overtimeHours += shiftOvertimeHours;

      regularPay += shiftRegularHours * rate;
      overtimePay +=
        shiftOvertimeHours * rate * multiplier;

      cumulativeRegularHours += shiftRegularHours;
    }

    premiumPay += result.premiumPay;
    premiumHours +=
      Number(shift.freezingPremium ?? 0) > 0 ||
      Number(shift.eveningPremium ?? 0) > 0
        ? result.hours
        : 0;

    trainingHours += result.trainingHours;
    trainingPay += result.trainingPay;
    shiftBonus += result.bonus;
    otherEarningsPay += result.otherEarnings;
  }

  const vacationPercent = Number(
    options?.vacationPercent ?? 0
  );

  const additionalBonus = Number(
    options?.bonus ?? 0
  );

  const baseEarnings =
    regularPay +
    overtimePay +
    statPay +
    premiumPay +
    trainingPay +
    shiftBonus +
    otherEarningsPay;

  const vacationPay =
    baseEarnings * vacationPercent;

  const grossPay =
    baseEarnings +
    vacationPay +
    additionalBonus;

  const federalTax = Number(
    options?.federalTax ?? 0
  );
  const cpp = Number(options?.cpp ?? 0);
  const ei = Number(options?.ei ?? 0);
  const otherDeductions = Number(
    options?.otherDeductions ?? 0
  );

  const totalDeductions =
    federalTax +
    cpp +
    ei +
    otherDeductions;

  const netPay =
    grossPay - totalDeductions;

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
    bonus: roundMoney(
      additionalBonus + shiftBonus
    ),
    otherEarnings: roundMoney(otherEarningsPay),

    grossPay: roundMoney(grossPay),

    federalTax: roundMoney(federalTax),
    cpp: roundMoney(cpp),
    ei: roundMoney(ei),
    otherDeductions: roundMoney(otherDeductions),

    totalDeductions: roundMoney(totalDeductions),
    netPay: roundMoney(netPay)
  };
}
