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

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const roundHours = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Calculate paid hours for one shift.
 *
 * Supports overnight shifts.
 *
 * Example:
 * 08:00 - 16:00 with 30 minute break
 * = 7.5 paid hours
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  unpaidBreakMinutes = 0
): number {
  const [startHour, startMinute] =
    startTime.split(":").map(Number);

  const [endHour, endMinute] =
    endTime.split(":").map(Number);

  let start =
    startHour * 60 +
    startMinute;

  let end =
    endHour * 60 +
    endMinute;

  // Overnight shift
  if (end < start) {
    end += 24 * 60;
  }

  const totalMinutes = Math.max(
    0,
    end - start
  );

  const paidMinutes = Math.max(
    0,
    totalMinutes -
      Math.max(
        0,
        Number(unpaidBreakMinutes) || 0
      )
  );

  return roundHours(
    paidMinutes / 60
  );
}

/**
 * Calculate one individual work shift.
 *
 * IMPORTANT:
 * Overtime is NOT assigned here.
 *
 * Overtime is calculated cumulatively
 * by calculatePaycheck() based on the
 * employer's configured threshold.
 */
export function calculateShift(
  shift: WorkShift
) {
  const hours =
    calculateShiftHours(
      shift.startTime ??
        shift.inT ??
        "",

      shift.endTime ??
        shift.outT ??
        "",

      shift.unpaidBreakMinutes ??
        shift.brk ??
        0
    );

  const rate = Number(
    shift.hourlyRate ??
      shift.rate ??
      0
  );

  const statMultiplier =
    Number.isFinite(
      Number(
        shift.statMultiplier
      )
    )
      ? Number(
          shift.statMultiplier
        )
      : 1;

  const isStatHoliday =
    Boolean(
      shift.isStatHoliday
    );

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

  const premiumPay =
    Number(
      shift.freezingPremium ??
        0
    ) +
    Number(
      shift.eveningPremium ??
        0
    );

  const trainingHours =
    Math.min(
      hours,
      Math.max(
        0,
        Number(
          shift.trainingHours ??
            0
        )
      )
    );

  const trainingPay =
    trainingHours * rate;

  const bonus =
    Number(
      shift.bonus ??
        0
    );

  const otherEarnings =
    Number(
      shift.otherEarnings ??
        0
    );

  return {
    hours:
      roundHours(hours),

    regularHours:
      roundHours(
        regularHours
      ),

    overtimeHours: 0,

    statHours:
      roundHours(
        statHours
      ),

    trainingHours:
      roundHours(
        trainingHours
      ),

    regularPay:
      roundMoney(
        regularPay
      ),

    overtimePay: 0,

    statPay:
      roundMoney(
        statPay
      ),

    premiumPay:
      roundMoney(
        premiumPay
      ),

    trainingPay:
      roundMoney(
        trainingPay
      ),

    bonus:
      roundMoney(
        bonus
      ),

    otherEarnings:
      roundMoney(
        otherEarnings
      ),

    grossPay:
      roundMoney(
        regularPay +
          statPay +
          premiumPay +
          trainingPay +
          bonus +
          otherEarnings
      ),
  };
}

/**
 * Calculate a complete paycheck
 * from all shifts in a pay period.
 *
 * Default overtime rule:
 *
 * First 44 non-stat hours
 * = regular pay
 *
 * Hours above threshold
 * = overtime at 1.5x
 *
 * Both threshold and multiplier
 * are configurable.
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

  let shiftBonus = 0;
  let otherEarningsPay = 0;

  /*
   * Get overtime threshold.
   *
   * Priority:
   *
   * 1. Paycheck options
   * 2. Shift configuration
   * 3. Default 44 hours
   */
  const thresholdFromShift =
    shifts.find(
      (shift) =>
        Number.isFinite(
          Number(
            shift.overtimeThreshold
          )
        )
    )?.overtimeThreshold;

  const overtimeThreshold =
    Math.max(
      0,
      Number(
        options?.overtimeThreshold ??
          thresholdFromShift ??
          44
      )
    );

  /*
   * Get overtime multiplier.
   *
   * Priority:
   *
   * 1. Paycheck options
   * 2. Shift configuration
   * 3. Default 1.5x
   */
  const multiplierFromShift =
    shifts.find(
      (shift) =>
        Number.isFinite(
          Number(
            shift.overtimeMultiplier
          )
        )
    )?.overtimeMultiplier;

  const defaultOvertimeMultiplier =
    Number(
      options?.overtimeMultiplier ??
        multiplierFromShift ??
        1.5
    ) || 1.5;

  let cumulativeRegularHours = 0;

  /*
   * Process each shift.
   */
  for (const shift of shifts) {
    const result =
      calculateShift(
        shift
      );

    /*
     * Stat holiday shifts
     * are kept separate from
     * regular/overtime hours.
     */
    if (
      shift.isStatHoliday
    ) {
      statHours +=
        result.statHours;

      statPay +=
        result.statPay;
    } else {
      /*
       * Determine how many
       * regular hours remain
       * before overtime begins.
       */
      const remainingRegular =
        Math.max(
          0,
          overtimeThreshold -
            cumulativeRegularHours
        );

      const shiftRegularHours =
        Math.min(
          result.hours,
          remainingRegular
        );

      const shiftOvertimeHours =
        Math.max(
          0,
          result.hours -
            shiftRegularHours
        );

      const rate =
        Number(
          shift.hourlyRate ??
            shift.rate ??
            0
        );

      const multiplier =
        Number(
          shift.overtimeMultiplier
        ) ||
        defaultOvertimeMultiplier;

      regularHours +=
        shiftRegularHours;

      overtimeHours +=
        shiftOvertimeHours;

      regularPay +=
        shiftRegularHours *
        rate;

      overtimePay +=
        shiftOvertimeHours *
        rate *
        multiplier;

      cumulativeRegularHours +=
        shiftRegularHours;
    }

    /*
     * Premiums
     */
    premiumPay +=
      result.premiumPay;

    /*
     * Track premium hours.
     */
    const hasPremium =
      Number(
        shift.freezingPremium ??
          0
      ) > 0 ||
      Number(
        shift.eveningPremium ??
          0
      ) > 0;

    if (hasPremium) {
      premiumHours +=
        result.hours;
    }

    /*
     * Training
     */
    trainingHours +=
      result.trainingHours;

    trainingPay +=
      result.trainingPay;

    /*
     * Bonuses
     */
    shiftBonus +=
      result.bonus;

    /*
     * Other earnings
     */
    otherEarningsPay +=
      result.otherEarnings;
  }

  /*
   * Vacation pay.
   *
   * Example:
   * 4% = 0.04
   */
  const vacationPercent =
    Number(
      options?.vacationPercent ??
        0
    );

  /*
   * Additional paycheck-level bonus.
   */
  const additionalBonus =
    Number(
      options?.bonus ??
        0
    );

  /*
   * Earnings before vacation
   * and paycheck-level bonus.
   */
  const baseEarnings =
    regularPay +
    overtimePay +
    statPay +
    premiumPay +
    trainingPay +
    shiftBonus +
    otherEarningsPay;

  /*
   * Vacation pay is calculated
   * from base earnings.
   */
  const vacationPay =
    baseEarnings *
    vacationPercent;

  /*
   * Total gross pay.
   */
  const grossPay =
    baseEarnings +
    vacationPay +
    additionalBonus;

  /*
   * Deductions.
   *
   * These are passed in by
   * the Income page based on
   * the person's configured
   * deductions.
   */
  const federalTax =
    Number(
      options?.federalTax ??
        0
    );

  const cpp =
    Number(
      options?.cpp ??
        0
    );

  const ei =
    Number(
      options?.ei ??
        0
    );

  const otherDeductions =
    Number(
      options?.otherDeductions ??
        0
    );

  /*
   * Total deductions.
   */
  const totalDeductions =
    federalTax +
    cpp +
    ei +
    otherDeductions;

  /*
   * Estimated net pay.
   */
  const netPay =
    grossPay -
    totalDeductions;

  return {
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",

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

    premiumPay:
      roundMoney(
        premiumPay
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
      ),
  };
}
