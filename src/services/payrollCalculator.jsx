/**
 * payrollCalculator.js
 *
 * Budget Blossom
 * Income & Payroll Calculation Engine
 */

/* =========================================================
   TYPES / CONSTANTS
========================================================= */

export const EARNING_TYPES = {
  REGULAR: "regular",
  OVERTIME: "overtime",
  STAT_1X: "stat_1x",
  STAT_1_5X: "stat_1_5x",
  STAT_2X: "stat_2x",
  FREEZING_PREMIUM: "freezing_premium",
  EVENING_PREMIUM: "evening_premium",
  TRAINING: "training",
  VACATION: "vacation",
  BONUS: "bonus",
  OTHER: "other",
};

/* =========================================================
   HELPERS
========================================================= */

export function roundMoney(value) {
  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;
}

export function roundHours(value) {
  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;
}

/* =========================================================
   SHIFT HOURS
========================================================= */

export function calculateShiftHours(
  startTime,
  endTime,
  unpaidBreakMinutes = 0
) {
  if (!startTime || !endTime) {
    return 0;
  }

  const startParts = String(startTime)
    .split(":")
    .map(Number);

  const endParts = String(endTime)
    .split(":")
    .map(Number);

  const startHour = startParts[0] || 0;
  const startMinute = startParts[1] || 0;

  const endHour = endParts[0] || 0;
  const endMinute = endParts[1] || 0;

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

  const breakMinutes = Math.max(
    0,
    Number(unpaidBreakMinutes) || 0
  );

  const paidMinutes = Math.max(
    0,
    totalMinutes - breakMinutes
  );

  return roundHours(
    paidMinutes / 60
  );
}

/* =========================================================
   SINGLE SHIFT
========================================================= */

/**
 * Calculates one individual shift.
 *
 * IMPORTANT:
 * Overtime is NOT determined here.
 * Overtime is calculated cumulatively by
 * calculatePaycheck().
 */
export function calculateShift(shift = {}) {
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
      Number(shift.statMultiplier)
    )
      ? Number(shift.statMultiplier)
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

  const freezingPremium =
    Number(
      shift.freezingPremium ?? 0
    );

  const eveningPremium =
    Number(
      shift.eveningPremium ?? 0
    );

  const premiumPay =
    freezingPremium +
    eveningPremium;

  const trainingHours =
    Math.min(
      hours,
      Math.max(
        0,
        Number(
          shift.trainingHours ?? 0
        )
      )
    );

  const trainingPay =
    trainingHours * rate;

  const bonus =
    Number(
      shift.bonus ?? 0
    );

  const otherEarnings =
    Number(
      shift.otherEarnings ?? 0
    );

  return {
    hours: roundHours(hours),

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

/* =========================================================
   COMPLETE PAYCHECK
========================================================= */

export function calculatePaycheck(
  shifts = [],
  options = {}
) {
  if (!Array.isArray(shifts)) {
    throw new Error(
      "Shifts must be an array."
    );
  }

  if (!shifts.length) {
    return {
      payPeriodStart: "",
      payPeriodEnd: "",
      payDate: "",

      regularHours: 0,
      overtimeHours: 0,
      statHours: 0,
      premiumHours: 0,
      trainingHours: 0,

      regularPay: 0,
      overtimePay: 0,
      statPay: 0,
      premiumPay: 0,
      trainingPay: 0,

      vacationPay: 0,
      bonus: 0,
      otherEarnings: 0,

      grossPay: 0,

      federalTax: 0,
      cpp: 0,
      ei: 0,
      otherDeductions: 0,

      totalDeductions: 0,
      netPay: 0,
    };
  }

  /* -------------------------------------------------------
     OVERTIME SETTINGS
  ------------------------------------------------------- */

  const thresholdFromShift =
    shifts.find(
      shift =>
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
        options.overtimeThreshold ??
          thresholdFromShift ??
          44
      )
    );

  const multiplierFromShift =
    shifts.find(
      shift =>
        Number.isFinite(
          Number(
            shift.overtimeMultiplier
          )
        )
    )?.overtimeMultiplier;

  const defaultOvertimeMultiplier =
    Number(
      options.overtimeMultiplier ??
        multiplierFromShift ??
        1.5
    ) || 1.5;

  /* -------------------------------------------------------
     TOTALS
  ------------------------------------------------------- */

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

  let cumulativeRegularHours = 0;

  /* -------------------------------------------------------
     PROCESS SHIFTS
  ------------------------------------------------------- */

  for (const shift of shifts) {
    const result =
      calculateShift(
        shift
      );

    if (
      shift.isStatHoliday
    ) {
      statHours +=
        result.statHours;

      statPay +=
        result.statPay;
    } else {
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

    premiumPay +=
      result.premiumPay;

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

    trainingHours +=
      result.trainingHours;

    trainingPay +=
      result.trainingPay;

    shiftBonus +=
      result.bonus;

    otherEarningsPay +=
      result.otherEarnings;
  }

  /* -------------------------------------------------------
     VACATION PAY
  ------------------------------------------------------- */

  const vacationPercent =
    Number(
      options.vacationPercent ?? 0
    );

  const additionalBonus =
    Number(
      options.bonus ?? 0
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
    baseEarnings *
    vacationPercent;

  const grossPay =
    baseEarnings +
    vacationPay +
    additionalBonus;

  /* -------------------------------------------------------
     DEDUCTIONS
  ------------------------------------------------------- */

  const federalTax =
    Number(
      options.federalTax ?? 0
    );

  const cpp =
    Number(
      options.cpp ?? 0
    );

  const ei =
    Number(
      options.ei ?? 0
    );

  const otherDeductions =
    Number(
      options.otherDeductions ?? 0
    );

  const totalDeductions =
    federalTax +
    cpp +
    ei +
    otherDeductions;

  const netPay =
    grossPay -
    totalDeductions;

  /* -------------------------------------------------------
     RETURN
  ------------------------------------------------------- */

  return {
    payPeriodStart:
      options.payPeriodStart ??
      "",

    payPeriodEnd:
      options.payPeriodEnd ??
      "",

    payDate:
      options.payDate ??
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

/* =========================================================
   ESTIMATE NET PAY
========================================================= */

export function estimateNetPay(
  grossPay,
  deductionPercent = 0
) {
  const gross =
    Number(grossPay) || 0;

  const percentage =
    Number(
      deductionPercent
    ) || 0;

  const deductions =
    gross *
    (percentage / 100);

  return roundMoney(
    gross - deductions
  );
}
