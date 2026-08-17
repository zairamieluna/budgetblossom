/**
 * Income.jsx
 *
 * Budget Blossom
 *
 * MAIN INCOME + WORK HOURS + PAYROLL SYSTEM
 *
 * Flow:
 * Work Hours
 *    ↓
 * Pay Period
 *    ↓
 * Payroll Calculation
 *    ↓
 * Estimated Gross / Deductions / Net
 *    ↓
 * Actual Paycheck
 *    ↓
 * Budget Pool
 *
 * Preserves the existing Supabase user_data.data structure.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

import {
  calculateShift,
  calculatePaycheck,
} from "../services/income/incomeCalculator";

/* =========================================================
   DEFAULT JOBS
========================================================= */

const DEFAULT_JOBS = [
  {
    id: "zai-aw",
    person: "Zai",
    title: "A&W",
    employer: "A&W",

    rate: 18,
    otRate: 27,

    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,

    vacationPercent: 0,

    deductionPercent: 15,

    ded: 15,

    statMultiplier: 1.5,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    color: 0,
  },

  {
    id: "zai-loblaws",
    person: "Zai",
    title: "Loblaws",
    employer: "Loblaws",

    rate: 17.6,
    otRate: 26.4,

    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,

    vacationPercent: 0,

    deductionPercent: 15,

    ded: 15,

    statMultiplier: 1.5,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    color: 1,
  },

  {
    id: "ariel-witron",
    person: "Ariel",
    title: "Equipment Operator",
    employer: "Witron",

    rate: 21,
    otRate: 31.5,

    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,

    vacationPercent: 0,

    deductionPercent: 20,

    ded: 20,

    statMultiplier: 1.5,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    color: 2,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(numberOrZero(value));
}

function dateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDays(dateValue, amount) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

function diffDays(start, end) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);

  return Math.round(
    (b.getTime() - a.getTime()) / 86400000
  );
}

/* =========================================================
   CANADIAN HOLIDAYS
========================================================= */

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(year, month, 1);
  const offset =
    (7 + weekday - first.getDay()) % 7;

  return new Date(
    year,
    month,
    1 + offset + (nth - 1) * 7
  );
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month + 1, 0);

  const offset =
    (7 + last.getDay() - weekday) % 7;

  return new Date(
    year,
    month,
    last.getDate() - offset
  );
}

function holidayDate(date) {
  const d = new Date(`${date}T00:00:00`);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const year = d.getFullYear();

  const holidays = [];

  // New Year's Day
  holidays.push({
    date: `${year}-01-01`,
    name: "New Year's Day",
  });

  // Family Day — Ontario
  holidays.push({
    date: dateString(
      nthWeekdayOfMonth(year, 1, 1, 3)
    ),
    name: "Family Day",
  });

  // Good Friday
  const easter = calculateEaster(year);

  holidays.push({
    date: addDays(dateString(easter), -2),
    name: "Good Friday",
  });

  // Victoria Day
  holidays.push({
    date: dateString(
      lastWeekdayOfMonth(year, 4, 1)
    ),
    name: "Victoria Day",
  });

  // Canada Day
  holidays.push({
    date: `${year}-07-01`,
    name: "Canada Day",
  });

  // Civic Holiday
  holidays.push({
    date: dateString(
      nthWeekdayOfMonth(year, 7, 1, 1)
    ),
    name: "Civic Holiday",
  });

  // Labour Day
  holidays.push({
    date: dateString(
      nthWeekdayOfMonth(year, 8, 1, 1)
    ),
    name: "Labour Day",
  });

  // National Day for Truth and Reconciliation
  holidays.push({
    date: `${year}-09-30`,
    name: "National Day for Truth and Reconciliation",
  });

  // Thanksgiving
  holidays.push({
    date: dateString(
      nthWeekdayOfMonth(year, 9, 1, 2)
    ),
    name: "Thanksgiving",
  });

  // Remembrance Day
  holidays.push({
    date: `${year}-11-11`,
    name: "Remembrance Day",
  });

  // Christmas
  holidays.push({
    date: `${year}-12-25`,
    name: "Christmas Day",
  });

  // Boxing Day
  holidays.push({
    date: `${year}-12-26`,
    name: "Boxing Day",
  });

  return (
    holidays.find(
      holiday => holiday.date === date
    ) ?? null
  );
}

function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h =
    (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l =
    (32 + 2 * e + 2 * i - h - k) % 7;
  const m =
    Math.floor((a + 11 * h + 22 * l) / 451);

  const month =
    Math.floor((h + l - 7 * m + 114) / 31);

  const day =
    ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/* =========================================================
   PAY PERIODS
========================================================= */

function frequencyDays(frequency) {
  switch (frequency) {
    case "weekly":
      return 7;

    case "biweekly":
      return 14;

    case "semi_monthly":
      return 15;

    case "monthly":
      return 30;

    default:
      return 14;
  }
}

function buildPeriodsForJob(job, year, month) {
  const frequency =
    job?.payFrequency ?? "biweekly";

  const configuredStart =
    job?.payPeriodStart;

  /*
   * If the user has configured an actual
   * period start, use it as the anchor.
   */
  if (configuredStart) {
    const anchor =
      new Date(`${configuredStart}T00:00:00`);

    if (!Number.isNaN(anchor.getTime())) {
      const target =
        new Date(year, month, 15);

      let current =
        new Date(anchor);

      const days =
        frequencyDays(frequency);

      let guard = 0;

      while (
        current.getTime() >
          target.getTime() &&
        guard < 500
      ) {
        current.setDate(
          current.getDate() - days
        );
        guard++;
      }

      guard = 0;

      while (guard < 500) {
        const start =
          dateString(current);

        const endDate =
          new Date(current);

        endDate.setDate(
          endDate.getDate() + days - 1
        );

        const end =
          dateString(endDate);

        if (
          end >=
          `${year}-${String(month + 1).padStart(2, "0")}-01`
        ) {
          const payday =
            job.payday ||
            addDays(end, 5);

          return [
            {
              id: `${job.id}|${start}|${end}`,
              k: `${job.id}|${start}|${end}`,
              start,
              end,
              pd: payday,
              lbl: `${formatDate(start)} – ${formatDate(end)}`,
            },
          ];
        }

        current.setDate(
          current.getDate() + days
        );

        guard++;
      }
    }
  }

  /*
   * Default fallback.
   *
   * This preserves the existing Budget Blossom
   * experience while allowing each job to have
   * its own schedule later.
   */
  const first =
    new Date(year, month, 1);

  const periods = [];

  let cursor =
    new Date(first);

  const days =
    frequencyDays(frequency);

  for (let i = 0; i < 4; i++) {
    const start =
      dateString(cursor);

    const endDate =
      new Date(cursor);

    endDate.setDate(
      endDate.getDate() + days - 1
    );

    const end =
      dateString(endDate);

    periods.push({
      id: `${job.id}|${start}|${end}`,
      k: `${job.id}|${start}|${end}`,
      start,
      end,
      pd:
        job.payday ||
        addDays(end, 5),
      lbl:
        `${formatDate(start)} – ${formatDate(end)}`,
    });

    cursor.setDate(
      cursor.getDate() + days
    );
  }

  return periods;
}

/* =========================================================
   COMPONENT STYLES
========================================================= */

const cardStyle = {
  background:
    "var(--color-bg-card, #ffffff)",
  border:
    "1px solid var(--color-border, #f0dce4)",
  borderRadius:
    "var(--radius-lg, 16px)",
  boxShadow:
    "var(--shadow-card, 0 2px 16px rgba(200,80,100,.07))",
  padding: 16,
  marginBottom: 14,
};

const inputStyle = {
  width: "100%",
  minHeight: 42,
  padding: "9px 11px",
  border:
    "1px solid var(--color-border, #f0dce4)",
  borderRadius:
    "var(--radius-md, 12px)",
  background: "#fff",
  color:
    "var(--color-text, #3a2430)",
  outline: "none",
  fontSize: 13,
};

const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontSize: 10,
  fontWeight: 800,
  color:
    "var(--color-text-soft, #7a5868)",
  textTransform: "uppercase",
  letterSpacing: ".05em",
};

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function LoadingSpinner({ message }) {
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: "center",
        padding: 35,
        color:
          "var(--color-text-soft)",
      }}
    >
      <div
        style={{
          fontSize: 26,
          marginBottom: 8,
        }}
      >
        ⏳
      </div>

      {message}
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  small,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid var(--color-border)",
        borderRadius:
          "var(--radius-md)",
        padding: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color:
            "var(--color-text-soft)",
          textTransform:
            "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize:
            small ? 13 : 18,
          fontWeight: 800,
          color:
            "var(--color-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   PAY PERIOD NAVIGATION
========================================================= */

function PeriodNav({
  periods,
  selected,
  onChange,
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color:
                "var(--color-text-soft)",
              textTransform:
                "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Pay Period
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {selected?.lbl ??
              "No pay period"}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            fontSize: 11,
            color:
              "var(--color-text-soft)",
          }}
        >
          Payday
          <br />
          <strong>
            {selected
              ? formatDate(selected.pd)
              : "—"}
          </strong>
        </div>
      </div>

      <select
        value={
          selected?.k ?? ""
        }
        onChange={e => {
          const next =
            periods.find(
              item =>
                item.k ===
                e.target.value
            );

          if (next) {
            onChange(next);
          }
        }}
        style={inputStyle}
      >
        {periods.map(period => (
          <option
            key={period.k}
            value={period.k}
          >
            {period.lbl} — Payday{" "}
            {formatDate(period.pd)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================================================
   JOB SETTINGS
========================================================= */

function JobSettings({
  job,
  onSave,
}) {
  const [open, setOpen] =
    useState(false);

  const [form, setForm] =
    useState({
      rate:
        job.rate ?? "",
      otRate:
        job.otRate ?? "",
      overtimeThreshold:
        job.overtimeThreshold ?? 44,
      overtimeMultiplier:
        job.overtimeMultiplier ?? 1.5,
      vacationPercent:
        job.vacationPercent ?? 0,
      deductionPercent:
        job.deductionPercent ??
        job.ded ??
        15,
      statMultiplier:
        job.statMultiplier ?? 1.5,
      payFrequency:
        job.payFrequency ??
        "biweekly",
      payPeriodStart:
        job.payPeriodStart ?? "",
      payday:
        job.payday ?? "",
    });

  function update(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  }

  function saveSettings() {
    onSave({
      ...job,

      rate:
        numberOrZero(form.rate),

      otRate:
        numberOrZero(form.otRate),

      overtimeThreshold:
        numberOrZero(
          form.overtimeThreshold
        ),

      overtimeMultiplier:
        numberOrZero(
          form.overtimeMultiplier
        ) || 1.5,

      vacationPercent:
        numberOrZero(
          form.vacationPercent
        ),

      deductionPercent:
        numberOrZero(
          form.deductionPercent
        ),

      ded:
        numberOrZero(
          form.deductionPercent
        ),

      statMultiplier:
        numberOrZero(
          form.statMultiplier
        ) || 1.5,

      payFrequency:
        form.payFrequency,

      payPeriodStart:
        form.payPeriodStart,

      payday:
        form.payday,
    });

    setOpen(false);
  }

  return (
    <div
      style={{
        marginTop: 10,
      }}
    >
      <button
        type="button"
        onClick={() =>
          setOpen(value => !value)
        }
        style={{
          width: "100%",
          padding: 10,
          border:
            "1px solid var(--color-border)",
          borderRadius:
            "var(--radius-md)",
          background: "#fff",
          color:
            "var(--color-text-soft)",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        ⚙ Employer & Payroll Settings{" "}
        {open ? "▲" : "▼"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius:
              "var(--radius-md)",
            background:
              "var(--color-bg-warm, #fff8fa)",
            border:
              "1px solid var(--color-border-soft)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
            }}
          >
            <Field label="Hourly Rate">
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.rate}
                onChange={e =>
                  update(
                    "rate",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="OT Rate">
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.otRate}
                onChange={e =>
                  update(
                    "otRate",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="OT Threshold">
              <input
                style={inputStyle}
                type="number"
                value={
                  form.overtimeThreshold
                }
                onChange={e =>
                  update(
                    "overtimeThreshold",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="OT Multiplier">
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={
                  form.overtimeMultiplier
                }
                onChange={e =>
                  update(
                    "overtimeMultiplier",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Stat Multiplier">
              <select
                style={inputStyle}
                value={
                  form.statMultiplier
                }
                onChange={e =>
                  update(
                    "statMultiplier",
                    e.target.value
                  )
                }
              >
                <option value="1">
                  1×
                </option>
                <option value="1.5">
                  1.5×
                </option>
                <option value="2">
                  2×
                </option>
              </select>
            </Field>

            <Field label="Vacation Pay %">
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={
                  form.vacationPercent
                }
                onChange={e =>
                  update(
                    "vacationPercent",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Est. Deductions %">
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={
                  form.deductionPercent
                }
                onChange={e =>
                  update(
                    "deductionPercent",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Pay Frequency">
              <select
                style={inputStyle}
                value={
                  form.payFrequency
                }
                onChange={e =>
                  update(
                    "payFrequency",
                    e.target.value
                  )
                }
              >
                <option value="weekly">
                  Weekly
                </option>

                <option value="biweekly">
                  Biweekly
                </option>

                <option value="semi_monthly">
                  Semi-monthly
                </option>

                <option value="monthly">
                  Monthly
                </option>
              </select>
            </Field>

            <Field label="Pay Period Anchor">
              <input
                style={inputStyle}
                type="date"
                value={
                  form.payPeriodStart
                }
                onChange={e =>
                  update(
                    "payPeriodStart",
                    e.target.value
                  )
                }
              />
            </Field>

            <Field label="Typical Payday">
              <input
                style={inputStyle}
                type="date"
                value={form.payday}
                onChange={e =>
                  update(
                    "payday",
                    e.target.value
                  )
                }
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 11,
              border: "none",
              borderRadius:
                "var(--radius-md)",
              background:
                "var(--primary, #e8708a)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save Payroll Settings
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   JOB CARD
========================================================= */

function JobCard({
  job,
  shifts,
  period,
  onAddShift,
  onRemoveShift,
  onSendEstimated,
  onSendActual,
  onUpdateJob,
  onRemoveJob,
}) {
  const [date, setDate] =
    useState(dateString());

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("17:00");

  const [breakMinutes, setBreakMinutes] =
    useState("30");

  const [payType, setPayType] =
    useState("regular");

  const [freezingPremium, setFreezingPremium] =
    useState("");

  const [eveningPremium, setEveningPremium] =
    useState("");

  const [trainingHours, setTrainingHours] =
    useState("");

  const [bonus, setBonus] =
    useState("");

  const [otherEarnings, setOtherEarnings] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [actualNet, setActualNet] =
    useState("");

  const [actualGross, setActualGross] =
    useState("");

  const holiday =
    holidayDate(date);

  /*
   * Determine the treatment configured by
   * the employer/job.
   */
  const statMultiplier =
    payType === "stat_2x"
      ? 2
      : payType === "stat_1x"
      ? 1
      : payType === "stat_1_5x"
      ? 1.5
      : numberOrZero(
          job.statMultiplier
        ) || 1.5;

  const isStatHoliday =
    payType === "stat_1x" ||
    payType === "stat_1_5x" ||
    payType === "stat_2x";

  const shiftPreview =
    calculateShift({
      date,

      startTime,

      endTime,

      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),

      hourlyRate:
        numberOrZero(job.rate),

      overtimeThreshold:
        numberOrZero(
          job.overtimeThreshold
        ) || 44,

      overtimeMultiplier:
        numberOrZero(
          job.overtimeMultiplier
        ) || 1.5,

      isStatHoliday,

      statMultiplier,

      freezingPremium:
        numberOrZero(
          freezingPremium
        ),

      eveningPremium:
        numberOrZero(
          eveningPremium
        ),

      trainingHours:
        numberOrZero(
          trainingHours
        ),

      bonus:
        numberOrZero(bonus),

      otherEarnings:
        numberOrZero(
          otherEarnings
        ),
    });

  /*
   * Convert legacy stored shifts into the
   * new calculator format.
   */
  const calculatorShifts =
    shifts.map(shift => ({
      ...shift,

      startTime:
        shift.startTime ??
        shift.inT ??
        "",

      endTime:
        shift.endTime ??
        shift.outT ??
        "",

      unpaidBreakMinutes:
        shift.unpaidBreakMinutes ??
        shift.brk ??
        0,

      hourlyRate:
        shift.hourlyRate ??
        shift.rate ??
        job.rate,

      overtimeThreshold:
        shift.overtimeThreshold ??
        job.overtimeThreshold ??
        44,

      overtimeMultiplier:
        shift.overtimeMultiplier ??
        job.overtimeMultiplier ??
        1.5,

      isStatHoliday:
        Boolean(
          shift.isStatHoliday ??
            shift.type ===
              "stat_1x" ||
            shift.type ===
              "stat_1_5x" ||
            shift.type ===
              "stat_2x" ||
            shift.hol
        ),

      statMultiplier:
        shift.statMultiplier ??
        job.statMultiplier ??
        1.5,

      freezingPremium:
        shift.freezingPremium ??
        0,

      eveningPremium:
        shift.eveningPremium ??
        0,

      trainingHours:
        shift.trainingHours ??
        0,

      bonus:
        shift.bonus ??
        0,

      otherEarnings:
        shift.otherEarnings ??
        0,
    }));

  const payroll =
    calculatorShifts.length
      ? calculatePaycheck(
          calculatorShifts,
          {
            vacationPercent:
              numberOrZero(
                job.vacationPercent
              ),

            overtimeThreshold:
              numberOrZero(
                job.overtimeThreshold
              ) || 44,

            overtimeMultiplier:
              numberOrZero(
                job.overtimeMultiplier
              ) || 1.5,
          }
        )
      : null;

  /*
   * The payroll engine supports individual
   * deductions. For the current app we use
   * the employer-configured estimated
   * deduction percentage.
   *
   * Clearly labeled as ESTIMATED.
   */
  const estimatedGross =
    payroll?.grossPay ?? 0;

  const estimatedDeductions =
    estimatedGross *
    (
      numberOrZero(
        job.deductionPercent ??
          job.ded ??
          0
      ) / 100
    );

  const estimatedNet =
    Math.max(
      0,
      estimatedGross -
        estimatedDeductions
    );

  const totalHours =
    payroll
      ? numberOrZero(
          payroll.regularHours
        ) +
        numberOrZero(
          payroll.overtimeHours
        ) +
        numberOrZero(
          payroll.statHours
        )
      : 0;

  function addShift() {
    if (!date) {
      alert("Please select a work date.");
      return;
    }

    if (!startTime || !endTime) {
      alert(
        "Please enter the start and end time."
      );
      return;
    }

    const shift = {
      id: crypto.randomUUID(),

      date,

      startTime,
      endTime,

      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),

      hourlyRate:
        numberOrZero(job.rate),

      overtimeThreshold:
        numberOrZero(
          job.overtimeThreshold
        ) || 44,

      overtimeMultiplier:
        numberOrZero(
          job.overtimeMultiplier
        ) || 1.5,

      isStatHoliday,

      statMultiplier,

      freezingPremium:
        numberOrZero(
          freezingPremium
        ),

      eveningPremium:
        numberOrZero(
          eveningPremium
        ),

      trainingHours:
        numberOrZero(
          trainingHours
        ),

      bonus:
        numberOrZero(bonus),

      otherEarnings:
        numberOrZero(
          otherEarnings
        ),

      notes,

      /*
       * Legacy fields preserved so existing
       * Budget Blossom data remains usable.
       */
      inT: startTime,
      outT: endTime,
      brk:
        numberOrZero(
          breakMinutes
        ),
      type: payType,
      rate:
        numberOrZero(job.rate),
      hol:
        holiday?.name ?? null,

      hrs:
        shiftPreview.hours,

      gross:
        shiftPreview.grossPay,

      regularHours:
        shiftPreview.regularHours,

      overtimeHours:
        shiftPreview.overtimeHours,

      statHours:
        shiftPreview.statHours,

      premiumHours:
        shiftPreview.hours &&
        (
          numberOrZero(
            freezingPremium
          ) > 0 ||
          numberOrZero(
            eveningPremium
          ) > 0
        )
          ? shiftPreview.hours
          : 0,

      trainingHoursCalculated:
        shiftPreview.trainingHours,
    };

    onAddShift(
      job.id,
      shift
    );

    setStartTime("09:00");
    setEndTime("17:00");
    setBreakMinutes("30");
    setPayType("regular");
    setFreezingPremium("");
    setEveningPremium("");
    setTrainingHours("");
    setBonus("");
    setOtherEarnings("");
    setNotes("");
  }

  function saveActual() {
    const net =
      numberOrZero(actualNet);

    if (net <= 0) {
      alert(
        "Please enter the actual net paycheck."
      );
      return;
    }

    const gross =
      numberOrZero(
        actualGross
      ) || net;

    onSendActual(
      job.id,
      net,
      gross,
      estimatedNet
    );

    setActualNet("");
    setActualGross("");
  }

  const payTypeOptions = [
    {
      value: "regular",
      label:
        `Regular — ${money(job.rate)}/hr`,
    },

    {
      value: "overtime",
      label:
        `Overtime — ${money(
          job.otRate ??
            job.rate * 1.5
        )}/hr`,
    },

    {
      value: "stat_1x",
      label:
        "Stat Holiday — 1×",
    },

    {
      value: "stat_1_5x",
      label:
        "Stat Holiday — 1.5×",
    },

    {
      value: "stat_2x",
      label:
        "Stat Holiday — 2×",
    },
  ];

  return (
    <div style={cardStyle}>
      {/* JOB HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color:
                "var(--color-text-soft)",
              textTransform:
                "uppercase",
              letterSpacing: ".08em",
            }}
          >
            {job.person}
          </div>

          <h2
            style={{
              margin: "3px 0 0",
              fontFamily:
                "var(--font-display, Georgia, serif)",
              fontSize: 20,
            }}
          >
            {job.title}
          </h2>

          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color:
                "var(--color-text-soft)",
            }}
          >
            {job.employer} ·{" "}
            {money(job.rate)}/hr
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onRemoveJob(job.id)
          }
          style={{
            border: "none",
            background: "transparent",
            color:
              "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 16,
          }}
          title="Remove job"
        >
          ✕
        </button>
      </div>

      {/* PAY PERIOD */}

      <div
        style={{
          background:
            "var(--color-bg-warm, #fff8fa)",
          border:
            "1px solid var(--color-border-soft)",
          borderRadius:
            "var(--radius-md)",
          padding: 10,
          marginBottom: 12,
          fontSize: 11,
        }}
      >
        <strong>
          Pay Period
        </strong>

        <div
          style={{
            marginTop: 3,
            color:
              "var(--color-text-soft)",
          }}
        >
          {period?.lbl ??
            "No period"}
        </div>

        <div
          style={{
            marginTop: 2,
            color:
              "var(--color-text-soft)",
          }}
        >
          Payday:{" "}
          <strong>
            {formatDate(
              period?.pd
            )}
          </strong>
        </div>
      </div>

      {/* WORK HOURS */}

      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color:
            "var(--color-text-soft)",
          textTransform:
            "uppercase",
          letterSpacing: ".08em",
          marginBottom: 9,
        }}
      >
        Work Hours
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(130px,1fr))",
          gap: 10,
        }}
      >
        <Field label="Date">
          <input
            style={inputStyle}
            type="date"
            value={date}
            onChange={e =>
              setDate(e.target.value)
            }
          />
        </Field>

        <Field label="Start">
          <input
            style={inputStyle}
            type="time"
            value={startTime}
            onChange={e =>
              setStartTime(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="End">
          <input
            style={inputStyle}
            type="time"
            value={endTime}
            onChange={e =>
              setEndTime(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Break (minutes)">
          <input
            style={inputStyle}
            type="number"
            min="0"
            value={breakMinutes}
            onChange={e =>
              setBreakMinutes(
                e.target.value
              )
            }
          />
        </Field>
      </div>

      {/* PAY TYPE */}

      <div style={{ marginTop: 10 }}>
        <Field label="Pay Type">
          <select
            style={inputStyle}
            value={payType}
            onChange={e =>
              setPayType(
                e.target.value
              )
            }
          >
            {payTypeOptions.map(
              option => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </Field>
      </div>

      {/* HOLIDAY NOTICE */}

      {holiday && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius:
              "var(--radius-md)",
            background:
              "#fff8e7",
            border:
              "1px solid #f0d89a",
            color: "#7c5c16",
            fontSize: 11,
          }}
        >
          🎉 <strong>{holiday.name}</strong>{" "}
          is recognized on this date.
          <br />
          <span
            style={{
              opacity: 0.8,
            }}
          >
            The actual holiday entitlement
            depends on your employer and
            applicable employment rules.
            Budget Blossom uses your configured
            employer treatment.
          </span>
        </div>
      )}

      {/* PREMIUMS */}

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          fontWeight: 800,
          color:
            "var(--color-text-soft)",
          textTransform:
            "uppercase",
          letterSpacing: ".08em",
          marginBottom: 9,
        }}
      >
        Additional Earnings
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(140px,1fr))",
          gap: 10,
        }}
      >
        <Field label="Freezing Premium">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={freezingPremium}
            onChange={e =>
              setFreezingPremium(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Evening Premium">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={eveningPremium}
            onChange={e =>
              setEveningPremium(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Training Hours">
          <input
            style={inputStyle}
            type="number"
            step="0.25"
            placeholder="0"
            value={trainingHours}
            onChange={e =>
              setTrainingHours(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Bonus">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={bonus}
            onChange={e =>
              setBonus(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Other Earnings">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={otherEarnings}
            onChange={e =>
              setOtherEarnings(
                e.target.value
              )
            }
          />
        </Field>

        <Field label="Notes">
          <input
            style={inputStyle}
            placeholder="Optional"
            value={notes}
            onChange={e =>
              setNotes(
                e.target.value
              )
            }
          />
        </Field>
      </div>

      {/* LIVE SHIFT PREVIEW */}

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius:
            "var(--radius-md)",
          background:
            "var(--color-bg-warm, #fff8fa)",
          border:
            "1px solid var(--color-border-soft)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform:
              "uppercase",
            color:
              "var(--color-text-soft)",
            letterSpacing: ".06em",
            marginBottom: 8,
          }}
        >
          Shift Preview
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: 7,
          }}
        >
          <StatCard
            label="Hours"
            value={`${shiftPreview.hours.toFixed(
              2
            )} hrs`}
            small
          />

          <StatCard
            label="Pay"
            value={money(
              shiftPreview.grossPay
            )}
            small
          />

          <StatCard
            label="Type"
            value={
              isStatHoliday
                ? `${statMultiplier}×`
                : payType ===
                  "overtime"
                ? "OT"
                : "Regular"
            }
            small
          />
        </div>
      </div>

      <button
        type="button"
        onClick={addShift}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 12,
          border: "none",
          borderRadius:
            "var(--radius-md)",
          background:
            "var(--primary, #e8708a)",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        + Add Work Hours
      </button>

      {/* SAVED SHIFTS */}

      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          fontWeight: 800,
          color:
            "var(--color-text-soft)",
          textTransform:
            "uppercase",
          letterSpacing: ".08em",
          marginBottom: 8,
        }}
      >
        Work Logged
      </div>

      {shifts.length === 0 ? (
        <div
          style={{
            padding: 12,
            background: "#fff",
            border:
              "1px dashed var(--color-border)",
            borderRadius:
              "var(--radius-md)",
            fontSize: 11,
            color:
              "var(--color-text-soft)",
          }}
        >
          No work hours logged for this
          pay period yet.
        </div>
      ) : (
        shifts.map(shift => (
          <div
            key={shift.id}
            style={{
              display: "flex",
              alignItems:
                "flex-start",
              gap: 10,
              padding: 11,
              marginBottom: 7,
              borderRadius:
                "var(--radius-md)",
              background:
                "#fff8fa",
              border:
                "1px solid var(--color-border-soft)",
            }}
          >
            <div
              style={{
                flex: 1,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                {formatDate(
                  shift.date
                )}

                {shift.hol && (
                  <span
                    style={{
                      marginLeft: 5,
                      color: "#a67c20",
                      fontSize: 10,
                    }}
                  >
                    🎉 {shift.hol}
                  </span>
                )}
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  color:
                    "var(--color-text-soft)",
                }}
              >
                {shift.startTime ??
                  shift.inT}
                {" – "}
                {shift.endTime ??
                  shift.outT}
                {" · "}
                {numberOrZero(
                  shift.hrs
                ).toFixed(2)}
                {" hrs"}
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  color:
                    "var(--color-text-soft)",
                }}
              >
                {shift.type ??
                  "regular"}
                {" · "}
                {money(
                  shift.hourlyRate ??
                    shift.rate ??
                    job.rate
                )}
                /hr
              </div>

              {shift.notes && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 10,
                    color:
                      "var(--color-text-muted)",
                  }}
                >
                  {shift.notes}
                </div>
              )}
            </div>

            <strong
              style={{
                color: "#3a6b4e",
                fontSize: 12,
                whiteSpace:
                  "nowrap",
              }}
            >
              {money(
                shift.gross ?? 0
              )}
            </strong>

            <button
              type="button"
              onClick={() =>
                onRemoveShift(
                  job.id,
                  shift.id
                )
              }
              style={{
                border: "none",
                background:
                  "transparent",
                color:
                  "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}

      {/* PAYROLL SUMMARY */}

      <div
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius:
            "var(--radius-md)",
          background:
            "var(--color-bg-warm)",
          border:
            "1px solid var(--color-border-soft)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color:
              "var(--color-text-soft)",
            textTransform:
              "uppercase",
            letterSpacing: ".08em",
            marginBottom: 9,
          }}
        >
          Paystub-Style Estimate
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2,1fr)",
            gap: 7,
          }}
        >
          <StatCard
            label="Regular"
            value={`${numberOrZero(
              payroll?.regularHours
            ).toFixed(2)} hrs`}
            small
          />

          <StatCard
            label="Overtime"
            value={`${numberOrZero(
              payroll?.overtimeHours
            ).toFixed(2)} hrs`}
            small
          />

          <StatCard
            label="Holiday"
            value={`${numberOrZero(
              payroll?.statHours
            ).toFixed(2)} hrs`}
            small
          />

          <StatCard
            label="Premium"
            value={money(
              payroll?.premiumPay ??
                0
            )}
            small
          />

          <StatCard
            label="Training"
            value={money(
              payroll?.trainingPay ??
                0
            )}
            small
          />

          <StatCard
            label="Vacation"
            value={money(
              payroll?.vacationPay ??
                0
            )}
            small
          />
        </div>

        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop:
              "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: 5,
              fontSize: 12,
            }}
          >
            <span>
              Total Hours
            </span>

            <strong>
              {totalHours.toFixed(2)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: 5,
              fontSize: 12,
            }}
          >
            <span>
              Gross Pay
            </span>

            <strong>
              {money(
                estimatedGross
              )}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: 5,
              fontSize: 12,
              color:
                "var(--color-text-soft)",
            }}
          >
            <span>
              Estimated Deductions
            </span>

            <strong>
              -{money(
                estimatedDeductions
              )}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginTop: 8,
              paddingTop: 8,
              borderTop:
                "1px solid var(--color-border)",
              fontSize: 16,
            }}
          >
            <strong>
              Estimated Net Pay
            </strong>

            <strong
              style={{
                color:
                  "var(--primary, #e8708a)",
              }}
            >
              {money(
                estimatedNet
              )}
            </strong>
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 9,
              color:
                "var(--color-text-muted)",
            }}
          >
            ESTIMATED — actual Canadian
            payroll deductions can vary.
          </div>
        </div>
      </div>

      {/* SEND ESTIMATE */}

      <button
        type="button"
        disabled={!shifts.length}
        onClick={() =>
          onSendEstimated(
            job.id
          )
        }
        style={{
          width: "100%",
          marginTop: 12,
          padding: 12,
          border: "none",
          borderRadius:
            "var(--radius-md)",
          background:
            shifts.length
              ? "#3a6b4e"
              : "#d4b8c4",
          color: "#fff",
          fontWeight: 800,
          cursor:
            shifts.length
              ? "pointer"
              : "not-allowed",
        }}
      >
        ✓ Send Estimated Pay to Budget Pool
      </button>

      {/* ACTUAL PAYCHECK */}

      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop:
            "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color:
              "var(--color-text-soft)",
            textTransform:
              "uppercase",
            letterSpacing: ".08em",
            marginBottom: 8,
          }}
        >
          Actual Paycheck
        </div>

        <div
          style={{
            background: "#f8fbff",
            border:
              "1px solid #d7e6f5",
            borderRadius:
              "var(--radius-md)",
            padding: 11,
            marginBottom: 10,
            fontSize: 11,
            color: "#2860a0",
          }}
        >
          Estimated Net:{" "}
          <strong>
            {money(
              estimatedNet
            )}
          </strong>

          <br />

          Enter the actual amount after
          your paycheck arrives. The
          estimate will remain saved.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2,1fr)",
            gap: 10,
          }}
        >
          <Field label="Actual Net Pay">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={actualNet}
              onChange={e =>
                setActualNet(
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Actual Gross">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="Optional"
              value={actualGross}
              onChange={e =>
                setActualGross(
                  e.target.value
                )
              }
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={saveActual}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 11,
            borderRadius:
              "var(--radius-md)",
            background:
              "#eaf1f9",
            border:
              "1px solid #9cc0e4",
            color: "#2860a0",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ✓ Save Actual Paycheck
        </button>
      </div>

      {/* EMPLOYER SETTINGS */}

      <JobSettings
        job={job}
        onSave={onUpdateJob}
      />
    </div>
  );
}

/* =========================================================
   POOLED INCOME
========================================================= */

function PooledIncomeCard({
  entries,
  total,
  period,
  onRemove,
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color:
                "var(--color-text-soft)",
              textTransform:
                "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Paycheck Pool
          </div>

          <div
            style={{
              fontFamily:
                "var(--font-display, Georgia, serif)",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {period?.lbl}
          </div>
        </div>

        <strong
          style={{
            color: "#3a6b4e",
            fontSize: 18,
          }}
        >
          {money(total)}
        </strong>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 12,
            border:
              "1px dashed var(--color-border)",
            borderRadius:
              "var(--radius-md)",
            fontSize: 11,
            color:
              "var(--color-text-soft)",
          }}
        >
          No paycheck has been added to
          the Budget Pool yet.
        </div>
      ) : (
        <>
          {entries.map(
            (entry, index) => (
              <div
                key={
                  `${entry.date}-${index}`
                }
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  padding:
                    "9px 0",
                  borderBottom:
                    "1px solid var(--color-border-soft)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {entry.src}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 9,
                      color:
                        "var(--color-text-soft)",
                    }}
                  >
                    {entry.isActual
                      ? "ACTUAL PAY"
                      : "ESTIMATED PAY"}
                  </div>

                  {entry.estimatedNet !=
                    null &&
                    entry.isActual && (
                      <div
                        style={{
                          fontSize: 9,
                          color:
                            "var(--color-text-soft)",
                        }}
                      >
                        Estimated:{" "}
                        {money(
                          entry.estimatedNet
                        )}
                        {" · "}
                        Difference:{" "}
                        {money(
                          entry.actualDifference
                        )}
                      </div>
                    )}
                </div>

                <strong
                  style={{
                    color: "#3a6b4e",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {money(
                    entry.amt
                  )}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(index)
                  }
                  style={{
                    border: "none",
                    background:
                      "transparent",
                    color:
                      "var(--color-text-muted)",
                    cursor:
                      "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            )
          )}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              paddingTop: 11,
              fontWeight: 800,
            }}
          >
            <span>
              Total Pool
            </span>

            <span
              style={{
                color: "#3a6b4e",
              }}
            >
              {money(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   ADD JOB MODAL
========================================================= */

function AddJobModal({
  open,
  onClose,
  onAdd,
}) {
  const [person, setPerson] =
    useState("Zai");

  const [title, setTitle] =
    useState("");

  const [employer, setEmployer] =
    useState("");

  const [rate, setRate] =
    useState("");

  const [otRate, setOtRate] =
    useState("");

  const [frequency, setFrequency] =
    useState("biweekly");

  if (!open) return null;

  function add() {
    if (!title.trim()) {
      alert("Enter a job title.");
      return;
    }

    if (!employer.trim()) {
      alert("Enter the employer.");
      return;
    }

    const hourly =
      numberOrZero(rate);

    if (hourly <= 0) {
      alert("Enter a valid hourly rate.");
      return;
    }

    const job = {
      id: crypto.randomUUID(),

      person,

      title:
        title.trim(),

      employer:
        employer.trim(),

      rate: hourly,

      otRate:
        numberOrZero(
          otRate
        ) ||
        hourly * 1.5,

      overtimeThreshold: 44,

      overtimeMultiplier: 1.5,

      vacationPercent: 0,

      deductionPercent: 15,

      ded: 15,

      statMultiplier: 1.5,

      payFrequency:
        frequency,

      payPeriodStart: "",

      payday: "",

      color: 0,
    };

    onAdd(job);

    setPerson("Zai");
    setTitle("");
    setEmployer("");
    setRate("");
    setOtRate("");
    setFrequency("biweekly");

    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(30,15,25,.45)",
        zIndex: 1000,
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding: 18,
      }}
      onMouseDown={e => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          maxHeight:
            "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius:
            "var(--radius-xl)",
          padding: 18,
          boxShadow:
            "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily:
                "var(--font-display, Georgia, serif)",
            }}
          >
            Add Job / Employer
          </h2>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background:
                "transparent",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 11,
          }}
        >
          <Field label="Person">
            <select
              style={inputStyle}
              value={person}
              onChange={e =>
                setPerson(
                  e.target.value
                )
              }
            >
              <option value="Zai">
                Me — Zai
              </option>

              <option value="Ariel">
                Husband — Ariel
              </option>
            </select>
          </Field>

          <Field label="Job Title">
            <input
              style={inputStyle}
              placeholder="e.g. Equipment Operator"
              value={title}
              onChange={e =>
                setTitle(
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Employer">
            <input
              style={inputStyle}
              placeholder="e.g. Witron"
              value={employer}
              onChange={e =>
                setEmployer(
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Hourly Rate">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="21.00"
              value={rate}
              onChange={e =>
                setRate(
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Overtime Rate">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="31.50"
              value={otRate}
              onChange={e =>
                setOtRate(
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Pay Frequency">
            <select
              style={inputStyle}
              value={frequency}
              onChange={e =>
                setFrequency(
                  e.target.value
                )
              }
            >
              <option value="weekly">
                Weekly
              </option>

              <option value="biweekly">
                Biweekly
              </option>

              <option value="semi_monthly">
                Semi-monthly
              </option>

              <option value="monthly">
                Monthly
              </option>
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={add}
          style={{
            width: "100%",
            marginTop: 15,
            padding: 12,
            border: "none",
            borderRadius:
              "var(--radius-md)",
            background:
              "var(--primary, #e8708a)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Add Employer
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Income() {
  const [rawData, setRawData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [addJobOpen, setAddJobOpen] =
    useState(false);

  const [selectedPeriodKey, setSelectedPeriodKey] =
    useState("");

  /* -------------------------------------------------------
     LOAD
  ------------------------------------------------------- */

  useEffect(() => {
    let dead = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: row,
          error: rowError,
        } = await supabase
          .from("user_data")
          .select("data")
          .limit(1)
          .single();

        if (rowError) {
          throw rowError;
        }

        let data =
          row?.data ?? {};

        if (
          typeof data ===
          "string"
        ) {
          try {
            data =
              JSON.parse(data);
          } catch {
            data = {};
          }
        }

        /*
         * Older Budget Blossom versions
         * stored the app inside:
         *
         * data.budgetsbloom
         *
         * Newer versions store the fields
         * directly inside data.
         *
         * Support both.
         */
        if (
          data?.budgetsbloom
        ) {
          let legacy =
            data.budgetsbloom;

          if (
            typeof legacy ===
            "string"
          ) {
            try {
              legacy =
                JSON.parse(
                  legacy
                );
            } catch {
              legacy = {};
            }
          }

          data = {
            ...data,
            ...legacy,
          };
        }

        if (!dead) {
          setRawData(data);
        }
      } catch (err) {
        console.error(
          "Income load error:",
          err
        );

        if (!dead) {
          setError(
            err?.message ??
              "Unable to load income data."
          );
        }
      } finally {
        if (!dead) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      dead = true;
    };
  }, []);

  /* -------------------------------------------------------
     SAVE
  ------------------------------------------------------- */

  const save =
    useCallback(
      async updated => {
        setSaving(true);

        try {
          const {
            data: row,
            error: rowError,
          } = await supabase
            .from("user_data")
            .select("id, data")
            .limit(1)
            .single();

          if (rowError) {
            throw rowError;
          }

          let existing =
            row?.data ?? {};

          if (
            typeof existing ===
            "string"
          ) {
            try {
              existing =
                JSON.parse(
                  existing
                );
            } catch {
              existing = {};
            }
          }

          /*
           * Preserve all existing data.
           * Only replace the income-related
           * fields.
           */
          const merged = {
            ...existing,
            ...updated,
          };

          const {
            error: updateError,
          } = await supabase
            .from("user_data")
            .update({
              data: merged,
            })
            .eq(
              "id",
              row.id
            );

          if (updateError) {
            throw updateError;
          }

          setRawData(
            merged
          );
        } catch (err) {
          console.error(
            "Income save error:",
            err
          );

          setToast(
            "❌ Save failed. Your data was not changed."
          );
        } finally {
          setSaving(false);
        }
      },
      []
    );

  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const jobs =
    rawData?.jobs ??
    DEFAULT_JOBS;

  const shifts =
    rawData?.shifts ??
    {};

  const sent =
    rawData?.sent ??
    {};

  /*
   * Build periods for all jobs.
   */
  const allPeriods =
    useMemo(() => {
      const now =
        new Date();

      const result = [];

      jobs.forEach(job => {
        const periods =
          buildPeriodsForJob(
            job,
            now.getFullYear(),
            now.getMonth()
          );

        periods.forEach(period => {
          result.push({
            ...period,
            jobId: job.id,
            jobName:
              `${job.person} — ${job.employer}`,
          });
        });
      });

      return result;
    }, [jobs]);

  /*
   * Select first period automatically.
   */
  useEffect(() => {
    if (
      !selectedPeriodKey &&
      allPeriods.length
    ) {
      setSelectedPeriodKey(
        allPeriods[0].k
      );
    }
  }, [
    allPeriods,
    selectedPeriodKey,
  ]);

  const selectedPeriod =
    allPeriods.find(
      period =>
        period.k ===
        selectedPeriodKey
    ) ??
    allPeriods[0] ??
    null;

  /*
   * Current job for selected period.
   */
  const selectedJob =
    jobs.find(
      job =>
        job.id ===
        selectedPeriod?.jobId
    ) ??
    jobs[0] ??
    null;

  const periodKey =
    selectedPeriod?.k ??
    "";

  const periodSent =
    sent[periodKey] ??
    [];

  const totalPool =
    periodSent.reduce(
      (sum, entry) =>
        sum +
        numberOrZero(
          entry.amt
        ),
      0
    );

  /* -------------------------------------------------------
     SHIFT FUNCTIONS
  ------------------------------------------------------- */

  function handleAddShift(
    jobId,
    shift
  ) {
    /*
     * The shift is assigned to the
     * period selected at the time it
     * is entered.
     */
    const jobPeriod =
      allPeriods.find(
        period =>
          period.jobId ===
            jobId &&
          shift.date >=
            period.start &&
          shift.date <=
            period.end
      );

    const targetPeriod =
      jobPeriod ??
      selectedPeriod;

    const key =
      targetPeriod?.k ??
      `${jobId}|${shift.date}`;

    const current =
      shifts[key] ??
      [];

    save({
      ...(rawData ?? {}),

      shifts: {
        ...shifts,

        [key]: [
          ...current,
          shift,
        ],
      },
    });

    setToast(
      "✅ Work hours added!"
    );
  }

  function handleRemoveShift(
    jobId,
    shiftId
  ) {
    const possibleKeys =
      Object.keys(shifts).filter(
        key =>
          key.startsWith(
            `${jobId}|`
          )
      );

    let nextShifts = {
      ...shifts,
    };

    possibleKeys.forEach(key => {
      nextShifts[key] =
        (
          nextShifts[key] ??
          []
        ).filter(
          shift =>
            shift.id !==
            shiftId
        );
    });

    save({
      ...(rawData ?? {}),

      shifts:
        nextShifts,
    });

    setToast(
      "🗑 Work hours removed"
    );
  }

  /* -------------------------------------------------------
     ESTIMATED PAY
  ------------------------------------------------------- */

  function handleSendEstimated(
    jobId
  ) {
    const job =
      jobs.find(
        item =>
          item.id ===
          jobId
      );

    if (!job) return;

    /*
     * Find the actual period
     * belonging to this job.
     */
    const jobPeriod =
      allPeriods.find(
        period =>
          period.k ===
          periodKey &&
          period.jobId ===
            jobId
      ) ??
      allPeriods.find(
        period =>
          period.jobId ===
          jobId
      );

    if (!jobPeriod) {
      setToast(
        "❌ No pay period found."
      );
      return;
    }

    const key =
      jobPeriod.k;

    const periodShifts =
      shifts[key] ??
      [];

    if (!periodShifts.length) {
      setToast(
        "Add work hours before sending estimated pay."
      );
      return;
    }

    const calculatorShifts =
      periodShifts.map(
        shift => ({
          ...shift,

          startTime:
            shift.startTime ??
            shift.inT,

          endTime:
            shift.endTime ??
            shift.outT,

          unpaidBreakMinutes:
            shift.unpaidBreakMinutes ??
            shift.brk ??
            0,

          hourlyRate:
            shift.hourlyRate ??
            shift.rate ??
            job.rate,

          overtimeThreshold:
            shift.overtimeThreshold ??
            job.overtimeThreshold ??
            44,

          overtimeMultiplier:
            shift.overtimeMultiplier ??
            job.overtimeMultiplier ??
            1.5,
        })
      );

    const paycheck =
      calculatePaycheck(
        calculatorShifts,
        {
          vacationPercent:
            numberOrZero(
              job.vacationPercent
            ),

          overtimeThreshold:
            numberOrZero(
              job.overtimeThreshold
            ) || 44,

          overtimeMultiplier:
            numberOrZero(
              job.overtimeMultiplier
            ) || 1.5,
        }
      );

    const estimatedGross =
      numberOrZero(
        paycheck.grossPay
      );

    const deductionRate =
      numberOrZero(
        job.deductionPercent ??
          job.ded
      ) / 100;

    const estimatedDeductions =
      estimatedGross *
      deductionRate;

    const estimatedNet =
      Math.max(
        0,
        estimatedGross -
          estimatedDeductions
      );

    const entry = {
      id: crypto.randomUUID(),

      src:
        `${job.person} — ${job.title}`,

      amt:
        Number(
          estimatedNet.toFixed(2)
        ),

      gross:
        Number(
          estimatedGross.toFixed(2)
        ),

      estimatedGross:
        Number(
          estimatedGross.toFixed(2)
        ),

      estimatedDeductions:
        Number(
          estimatedDeductions.toFixed(2)
        ),

      estimatedNet:
        Number(
          estimatedNet.toFixed(2)
        ),

      date:
        jobPeriod.pd ||
        dateString(),

      payDate:
        jobPeriod.pd,

      payPeriodStart:
        jobPeriod.start,

      payPeriodEnd:
        jobPeriod.end,

      person:
        job.person,

      employer:
        job.employer,

      isActual:
        false,

      regularHours:
        paycheck.regularHours,

      overtimeHours:
        paycheck.overtimeHours,

      statHours:
        paycheck.statHours,

      premiumHours:
        paycheck.premiumHours,

      trainingHours:
        paycheck.trainingHours,

      vacationPay:
        paycheck.vacationPay,

      bonus:
        paycheck.bonus,

      otherEarnings:
        paycheck.otherEarnings,

      federalTax:
        paycheck.federalTax,

      cpp:
        paycheck.cpp,

      ei:
        paycheck.ei,

      totalDeductions:
        Number(
          estimatedDeductions.toFixed(2)
        ),
    };

    save({
      ...(rawData ?? {}),

      sent: {
        ...sent,

        [key]: [
          ...(sent[key] ?? []),
          entry,
        ],
      },
    });

    setToast(
      `✅ ${money(
        estimatedNet
      )} estimated pay saved!`
    );
  }

  /* -------------------------------------------------------
     ACTUAL PAY
  ------------------------------------------------------- */

  function handleSendActual(
    jobId,
    actualNet,
    actualGross,
    estimatedNet
  ) {
    const job =
      jobs.find(
        item =>
          item.id ===
          jobId
      );

    if (!job) return;

    const net =
      numberOrZero(
        actualNet
      );

    const gross =
      numberOrZero(
        actualGross
      ) || net;

    const estimate =
      numberOrZero(
        estimatedNet
      );

    const difference =
      net - estimate;

    const entry = {
      id: crypto.randomUUID(),

      src:
        `${job.person} — ${job.title}`,

      amt:
        Number(
          net.toFixed(2)
        ),

      gross:
        Number(
          gross.toFixed(2)
        ),

      estimatedNet:
        Number(
          estimate.toFixed(2)
        ),

      actualNet:
        Number(
          net.toFixed(2)
        ),

      actualGross:
        Number(
          gross.toFixed(2)
        ),

      actualDifference:
        Number(
          difference.toFixed(2)
        ),

      date:
        selectedPeriod?.pd ??
        dateString(),

      payDate:
        selectedPeriod?.pd,

      payPeriodStart:
        selectedPeriod?.start,

      payPeriodEnd:
        selectedPeriod?.end,

      person:
        job.person,

      employer:
        job.employer,

      isActual:
        true,
    };

    save({
      ...(rawData ?? {}),

      sent: {
        ...sent,

        [periodKey]: [
          ...(sent[
            periodKey
          ] ?? []),
          entry,
        ],
      },
    });

    setToast(
      `✅ ${money(
        net
      )} actual paycheck saved!`
    );
  }

  /* -------------------------------------------------------
     JOB MANAGEMENT
  ------------------------------------------------------- */

  function handleAddJob(job) {
    save({
      ...(rawData ?? {}),

      jobs: [
        ...jobs,
        job,
      ],
    });

    setToast(
      "✅ Employer/job added!"
    );
  }

  function handleUpdateJob(
    updatedJob
  ) {
    const updatedJobs =
      jobs.map(job =>
        job.id ===
        updatedJob.id
          ? updatedJob
          : job
      );

    save({
      ...(rawData ?? {}),

      jobs:
        updatedJobs,
    });

    setToast(
      "✅ Payroll settings updated!"
    );
  }

  function handleRemoveJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job? Existing saved payroll records will remain."
      )
    ) {
      return;
    }

    save({
      ...(rawData ?? {}),

      jobs:
        jobs.filter(
          job =>
            job.id !==
            jobId
        ),
    });

    setToast(
      "🗑 Job removed"
    );
  }

  function handleRemoveSent(
    index
  ) {
    if (
      !window.confirm(
        "Remove this paycheck from the Budget Pool?"
      )
    ) {
      return;
    }

    const updated =
      (
        sent[
          periodKey
        ] ?? []
      ).filter(
        (_, i) =>
          i !== index
      );

    save({
      ...(rawData ?? {}),

      sent: {
        ...sent,

        [periodKey]:
          updated,
      },
    });

    setToast(
      "🗑 Paycheck removed"
    );
  }

  /* -------------------------------------------------------
     SELECTED PERIOD DATA
  ------------------------------------------------------- */

  const selectedJobShifts =
    selectedJob
      ? shifts[
          `${selectedJob.id}|${selectedPeriod?.start}|${selectedPeriod?.end}`
        ] ??
        shifts[
          `${selectedJob.id}|${selectedPeriod?.k}`
        ] ??
        []
      : [];

  /*
   * Because old versions used:
   *
   * jobId|periodKey
   *
   * and the new period key also uses
   * that pattern, find the selected
   * job's exact key.
   */
  const selectedShiftKey =
    selectedJob &&
    selectedPeriod
      ? selectedPeriod.k
      : "";

  const displayShifts =
    selectedShiftKey &&
    shifts[selectedShiftKey]
      ? shifts[
          selectedShiftKey
        ]
      : selectedJobShifts;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "var(--color-bg, #fdf6f8)",
        color:
          "var(--color-text, #3a2430)",
        fontFamily:
          "var(--font-body, 'DM Sans', sans-serif)",
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: 14,
        }}
      >
        {/* HEADER */}

        <header
          className="fade-up"
          style={{
            padding:
              "28px 0 15px",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color:
                  "var(--color-text-soft)",
                letterSpacing:
                  ".12em",
                textTransform:
                  "uppercase",
                marginBottom: 4,
              }}
            >
              Salary
            </div>

            <h1
              style={{
                margin: 0,
                fontFamily:
                  "var(--font-display, 'Playfair Display', Georgia, serif)",
                fontSize: 28,
                lineHeight: 1.1,
              }}
            >
              Income & Work Hours
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                fontSize: 11,
                color:
                  "var(--color-text-soft)",
                lineHeight: 1.5,
              }}
            >
              Enter work once. Budget
              Blossom calculates the
              paycheck.
            </p>
          </div>

          {saving && (
            <span
              style={{
                fontSize: 10,
                color:
                  "var(--color-text-soft)",
              }}
            >
              Saving…
            </span>
          )}
        </header>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background:
                "var(--color-rose-pale, #fdedf1)",
              border:
                "1px solid var(--color-pink-light)",
              borderRadius:
                "var(--radius-md)",
              padding: 13,
              marginBottom: 12,
              color:
                "var(--color-pink-deep)",
              fontSize: 12,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {loading && (
          <LoadingSpinner
            message="Loading income data…"
          />
        )}

        {!loading &&
          !error && (
            <>
              {/* PERSON / JOB SELECTOR */}

              <div style={cardStyle}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color:
                      "var(--color-text-soft)",
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                    marginBottom: 8,
                  }}
                >
                  Income Source
                </div>

                <select
                  style={inputStyle}
                  value={
                    selectedPeriod?.k ??
                    ""
                  }
                  onChange={e =>
                    setSelectedPeriodKey(
                      e.target.value
                    )
                  }
                >
                  {allPeriods.map(
                    period => (
                      <option
                        key={period.k}
                        value={period.k}
                      >
                        {period.jobName} ·{" "}
                        {period.lbl} · Payday{" "}
                        {formatDate(
                          period.pd
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* SELECTED JOB */}

              {selectedJob && (
                <JobCard
                  key={
                    selectedJob.id
                  }
                  job={
                    selectedJob
                  }
                  shifts={
                    displayShifts
                  }
                  period={
                    selectedPeriod
                  }
                  onAddShift={
                    handleAddShift
                  }
                  onRemoveShift={
                    handleRemoveShift
                  }
                  onSendEstimated={
                    handleSendEstimated
                  }
                  onSendActual={
                    handleSendActual
                  }
                  onUpdateJob={
                    handleUpdateJob
                  }
                  onRemoveJob={
                    handleRemoveJob
                  }
                />
              )}

              {/* BUDGET POOL */}

              <PooledIncomeCard
                entries={
                  periodSent
                }
                total={
                  totalPool
                }
                period={
                  selectedPeriod
                }
                onRemove={
                  handleRemoveSent
                }
              />

              {/* ADD JOB */}

              <button
                type="button"
                onClick={() =>
                  setAddJobOpen(
                    true
                  )
                }
                style={{
                  width: "100%",
                  padding: 13,
                  border:
                    "1.5px solid var(--color-border)",
                  borderRadius:
                    "var(--radius-lg)",
                  background: "#fff",
                  color:
                    "var(--color-text-soft)",
                  fontWeight: 800,
                  cursor:
                    "pointer",
                  marginBottom: 14,
                }}
              >
                + Add Another Job / Employer
              </button>

              {/* EXPLANATION */}

              <div
                style={{
                  ...cardStyle,
                  background:
                    "var(--color-bg-warm)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  💡 How Budget Blossom
                  connects Income
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      "var(--color-text-soft)",
                    lineHeight: 1.6,
                  }}
                >
                  Work hours entered here
                  become the source of truth
                  for payroll. The selected
                  employer determines the
                  hourly rate, overtime rule,
                  holiday multiplier,
                  vacation percentage,
                  estimated deductions and
                  pay schedule.
                  <br />
                  <br />
                  Later, these same shifts can
                  automatically feed Calendar,
                  Paychecks, Expenses and the
                  Dashboard.
                </div>
              </div>
            </>
          )}
      </div>

      {/* ADD JOB MODAL */}

      <AddJobModal
        open={addJobOpen}
        onClose={() =>
          setAddJobOpen(false)
        }
        onAdd={
          handleAddJob
        }
      />

      {/* TOAST */}

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 78,
            transform:
              "translateX(-50%)",
            zIndex: 1200,
            background:
              "#1a0f1e",
            color: "#fff",
            padding:
              "10px 14px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            boxShadow:
              "0 8px 30px rgba(0,0,0,.18)",
            maxWidth:
              "calc(100% - 30px)",
            textAlign:
              "center",
          }}
          onClick={() =>
            setToast("")
          }
        >
          {toast}
        </div>
      )}
    </div>
  );
}
