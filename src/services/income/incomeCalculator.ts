// Budget Blossom - Income & Payroll Calculation Engine
//
// IMPORTANT:
// - Pay period dates and payday are separate concepts.
// - Premiums such as freezing/evening are hourly premiums.
// - Overtime is calculated cumulatively inside the pay period.
// - Stat holiday treatment is configurable per shift/job.
// - Existing/legacy field names remain supported.

export type EarningType =
  | "regular"
  | "overtime"
  | "stat"
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

  startTime?: string;
  endTime?: string;
  unpaidBreakMinutes?: number;

  hourlyRate?: number;

  overtimeThreshold?: number;
  overtimeMultiplier?: number;

  isStatHoliday?: boolean;
  statMultiplier?: number;

  // HOURLY premium rates.
  // Example:
  // freezingPremium: 1.50
  // 8 hours × $1.50 = $12.00
  freezingPremium?: number;

  // HOURLY premium rate.
  eveningPremium?: number;

  trainingHours?: number;

  bonus?: number;
  otherEarnings?: number;

  notes?: string;

  // Optional explicit overtime hours.
  // Normally leave this empty and let the calculator determine OT.
  overtimeHours?: number;

  // Legacy Budget Blossom fields
  id?: number | string;
  inT?: string;
  outT?: string;
  brk?: number;
  type?: EarningType | string;
  rate?: number;
  hol?: string | null;

  // Compatibility if an older version stored a fixed premium amount.
  freezingPremiumAmount?: number;
  eveningPremiumAmount?: number;
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
  statPremiumPay: number;

  premiumPay: number;
  freezingPremiumPay: number;
  eveningPremiumPay: number;

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
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const roundHours = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* =========================================================
   SHIFT HOURS
========================================================= */

export function calculateShiftHours(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes = 0
): number {
  if (!startTime || !endTime) {
    return 0;
  }

  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);

  const startHour = startParts[0] ?? 0;
  const startMinute = startParts[1] ?? 0;

  const endHour = endParts[0] ?? 0;
  const endMinute = endParts[1] ?? 0;

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  // Overnight shift.
  if (end < start) {
    end += 24 * 60;
  }

  const totalMinutes = Math.max(0, end - start);

  const breakMinutes = Math.max(
    0,
    safeNumber(unpaidBreakMinutes)
  );

  const paidMinutes = Math.max(
    0,
    totalMinutes - breakMinutes
  );

  return roundHours(paidMinutes / 60);
}

/* =========================================================
   ONE SHIFT
========================================================= */

export function calculateShift(shift: WorkShift) {
  const startTime =
    shift.startTime ??
    shift.inT ??
    "";

  const endTime =
    shift.endTime ??
    shift.outT ??
    "";

  const breakMinutes =
    shift.unpaidBreakMinutes ??
    shift.brk ??
    0;

  const hours = calculateShiftHours(
    startTime,
    endTime,
    breakMinutes
  );

  const rate = safeNumber(
    shift.hourlyRate ??
      shift.rate ??
      0
  );

  const statMultiplier =
    Number.isFinite(
      Number(shift.statMultiplier)
    )
      ? safeNumber(shift.statMultiplier)
      : 1;

  const isStatHoliday =
    Boolean(
      shift.isStatHoliday
    ) ||
    shift.type === "stat" ||
    shift.type === "stat_1x" ||
    shift.type === "stat_1_5x" ||
    shift.type === "stat_2x" ||
    Boolean(shift.hol);

  const regularHours =
    isStatHoliday
      ? 0
      : hours;

  const statHours =
    isStatHoliday
      ? hours
      : 0;

  const regularPay =
    regularHours * rate;

  const statPay =
    statHours *
    rate *
    statMultiplier;

  /*
   * PREMIUMS
   *
   * These are HOURLY premium rates.
   *
   * Example:
   * 8 hours
   * $1.50 freezing premium
   *
   * 8 × $1.50 = $12.00
   */

  const freezingRate =
    safeNumber(
      shift.freezingPremium
    );

  const eveningRate =
    safeNumber(
      shift.eveningPremium
    );

  const freezingPremiumPay =
    hours * freezingRate;

  const eveningPremiumPay =
    hours * eveningRate;

  /*
   * Compatibility with an older version that may have
   * stored an already-calculated fixed amount.
   */
  const freezingFixed =
    safeNumber(
      shift.freezingPremiumAmount
    );

  const eveningFixed =
    safeNumber(
      shift.eveningPremiumAmount
    );

  const freezingPay =
    freezingPremiumPay +
    freezingFixed;

  const eveningPay =
    eveningPremiumPay +
    eveningFixed;

  const premiumPay =
    freezingPay +
    eveningPay;

  const premiumHours =
    premiumPay > 0
      ? hours
      : 0;

  const trainingHours =
    Math.min(
      hours,
      Math.max(
        0,
        safeNumber(
          shift.trainingHours
        )
      )
    );

  const trainingPay =
    trainingHours * rate;

  const bonus =
    safeNumber(
      shift.bonus
    );

  const otherEarnings =
    safeNumber(
      shift.otherEarnings
    );

  return {
    hours:
      roundHours(hours),

    regularHours:
      roundHours(regularHours),

    overtimeHours:
      0,

    statHours:
      roundHours(statHours),

    premiumHours:
      roundHours(premiumHours),

    trainingHours:
      roundHours(trainingHours),

    regularPay:
      roundMoney(regularPay),

    overtimePay:
      0,

    statPay:
      roundMoney(statPay),

    statPremiumPay:
      0,

    premiumPay:
      roundMoney(premiumPay),

    freezingPremiumPay:
      roundMoney(freezingPay),

    eveningPremiumPay:
      roundMoney(eveningPay),

    trainingPay:
      roundMoney(trainingPay),

    bonus:
      roundMoney(bonus),

    otherEarnings:
      roundMoney(otherEarnings),

    grossPay:
      roundMoney(
        regularPay +
        statPay +
        premiumPay +
        trainingPay +
        bonus +
        otherEarnings +
        premiumPay
      )
  };
}

/* =========================================================
   COMPLETE PAYCHECK
========================================================= */

export function calculatePaycheck(
  shifts: WorkShift[],
  options?: {
    payPeriodStart?: string;
    payPeriodEnd?: string;
    payDate?: string;

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
  const validShifts =
    Array.isArray(shifts)
      ? [...shifts]
          .filter(Boolean)
          .sort(
            (a, b) =>
              String(a.date ?? "")
                .localeCompare(
                  String(b.date ?? "")
                )
          )
      : [];

  let regularHours = 0;
  let overtimeHours = 0;
  let statHours = 0;
  let premiumHours = 0;
  let trainingHours = 0;

  let regularPay = 0;
  let overtimePay = 0;
  let statPay = 0;
  let premiumPay = 0;
  let freezingPremiumPay = 0;
  let eveningPremiumPay = 0;
  let statPremiumPay = 0;
  let trainingPay = 0;
  let shiftBonus = 0;
  let otherEarningsPay = 0;

  /*
   * Employer-level overtime settings.
   */
  const thresholdFromShift =
    validShifts.find(
      shift =>
        Number.isFinite(
          Number(
            shift.overtimeThreshold
          )
        )
    )
      ?.overtimeThreshold;

  const overtimeThreshold =
    Math.max(
      0,
      safeNumber(
        options?.overtimeThreshold ??
          thresholdFromShift ??
          44
      )
    );

  const multiplierFromShift =
    validShifts.find(
      shift =>
        Number.isFinite(
          Number(
            shift.overtimeMultiplier
          )
        )
    )
      ?.overtimeMultiplier;

  const defaultOvertimeMultiplier =
    safeNumber(
      options?.overtimeMultiplier ??
        multiplierFromShift ??
        1.5
    ) || 1.5;

  let cumulativeRegularHours = 0;

  for (
    const shift of validShifts
  ) {
    const result =
      calculateShift(
        shift
      );

    /*
     * Stat holiday shifts are handled separately.
     */
    if (
      Boolean(
        result.statHours
      )
    ) {
      statHours +=
        result.statHours;

      statPay +=
        result.statPay;
    } else {
      /*
       * Regular hours and overtime are calculated
       * cumulatively within THIS paycheck.
       */
      const remainingRegular =
        Math.max(
          0,
          overtimeThreshold -
            cumulativeRegularHours
        );

      const regularForShift =
        Math.min(
          result.hours,
          remainingRegular
        );

      const overtimeForShift =
        Math.max(
          0,
          result.hours -
            regularForShift
        );

      const rate =
        safeNumber(
          shift.hourlyRate ??
            shift.rate ??
            0
        );

      const multiplier =
        safeNumber(
          shift.overtimeMultiplier ??
            defaultOvertimeMultiplier
        ) ||
        defaultOvertimeMultiplier;

      regularHours +=
        regularForShift;

      overtimeHours +=
        overtimeForShift;

      regularPay +=
        regularForShift *
        rate;

      overtimePay +=
        overtimeForShift *
        rate *
        multiplier;

      cumulativeRegularHours +=
        regularForShift;
    }

    premiumHours +=
      result.premiumHours;

    premiumPay +=
      result.premiumPay;

    freezingPremiumPay +=
      result.freezingPremiumPay;

    eveningPremiumPay +=
      result.eveningPremiumPay;

    trainingHours +=
      result.trainingHours;

    trainingPay +=
      result.trainingPay;

    shiftBonus +=
      result.bonus;

    otherEarningsPay +=
      result.otherEarnings;
  }

  /*
   * Vacation pay.
   *
   * Example:
   * 4 = 4%
   * 0.04 = 4%
   *
   * The function accepts either.
   */
  const rawVacation =
    safeNumber(
      options?.vacationPercent
    );

  const vacationPercent =
    rawVacation > 1
      ? rawVacation / 100
      : rawVacation;

  const additionalBonus =
    safeNumber(
      options?.bonus
    );

  /*
   * Premiums and other eligible earnings
   * are included in the vacation base for now.
   */
  const baseEarnings =
    regularPay +
    overtimePay +
    statPay +
    premiumPay +
    trainingPay +
    shiftBonus +
    otherEarningsPay;

  const vacationPay =
    baseEarnings *
    vacationPercent;

  const grossPay =
    baseEarnings +
    vacationPay +
    additionalBonus;

  const federalTax =
    safeNumber(
      options?.federalTax
    );

  const cpp =
    safeNumber(
      options?.cpp
    );

  const ei =
    safeNumber(
      options?.ei
    );

  const otherDeductions =
    safeNumber(
      options?.otherDeductions
    );

  const totalDeductions =
    federalTax +
    cpp +
    ei +
    otherDeductions;

  const netPay =
    grossPay -
    totalDeductions;

  return {
    payPeriodStart:
      options?.payPeriodStart ??
      "",

    payPeriodEnd:
      options?.payPeriodEnd ??
      "",

    payDate:
      options?.payDate ??
      "",

    regularHours:
      roundHours(
        regularHours
      ),

    overtimeHours:
      roundHours(
        overtimeHours
      ),

    statHours:
      roundHours(
        statHours
      ),

    premiumHours:
      roundHours(
        premiumHours
      ),

    trainingHours:
      roundHours(
        trainingHours
      ),

    regularPay:
      roundMoney(
        regularPay
      ),

    overtimePay:
      roundMoney(
        overtimePay
      ),

    statPay:
      roundMoney(
        statPay
      ),

    statPremiumPay:
      roundMoney(
        statPremiumPay
      ),

    premiumPay:
      roundMoney(
        premiumPay
      ),

    freezingPremiumPay:
      roundMoney(
        freezingPremiumPay
      ),

    eveningPremiumPay:
      roundMoney(
        eveningPremiumPay
      ),

    trainingPay:
      roundMoney(
        trainingPay
      ),

    vacationPay:
      roundMoney(
        vacationPay
      ),

    bonus:
      roundMoney(
        additionalBonus +
        shiftBonus
      ),

    otherEarnings:
      roundMoney(
        otherEarningsPay
      ),

    grossPay:
      roundMoney(
        grossPay
      ),

    federalTax:
      roundMoney(
        federalTax
      ),

    cpp:
      roundMoney(
        cpp
      ),

    ei:
      roundMoney(
        ei
      ),

    otherDeductions:
      roundMoney(
        otherDeductions
      ),

    totalDeductions:
      roundMoney(
        totalDeductions
      ),

    netPay:
      roundMoney(
        netPay
      )
  };
}

/* =========================================================
   SIMPLE ESTIMATED NET HELPER
========================================================= */

export function estimateNetPay(
  grossPay: number,
  deductionPercent = 0
) {
  const gross =
    safeNumber(
      grossPay
    );

  const percent =
    safeNumber(
      deductionPercent
    );

  return roundMoney(
    gross -
      gross *
        (percent / 100)
  );
}
