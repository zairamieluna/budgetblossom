/**
 * Budget Blossom
 * Income.jsx
 *
 * MAIN INCOME SYSTEM
 *
 * Flow:
 * Work Hours
 *      ↓
 * Pay Period
 *      ↓
 * Payroll Calculation
 *      ↓
 * Estimated Pay
 *      ↓
 * Actual Paycheck
 *      ↓
 * Budget Pool
 *
 * Existing Supabase structure preserved:
 * user_data.data.budgetsbloom
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
  calculateShiftHours,
} from "../services/income/incomeCalculator";

/* =========================================================
   CONSTANTS
========================================================= */

const PEOPLE = ["Zai", "Ariel"];

const PAY_FREQUENCIES = [
  "Weekly",
  "Biweekly",
  "Semi-monthly",
  "Monthly",
];

const PAY_TYPES = [
  {
    value: "regular",
    label: "Regular",
    multiplier: 1,
  },
  {
    value: "overtime",
    label: "Overtime",
    multiplier: 1.5,
  },
  {
    value: "stat_1x",
    label: "Stat Holiday 1.0×",
    multiplier: 1,
  },
  {
    value: "stat_1_5x",
    label: "Stat Holiday 1.5×",
    multiplier: 1.5,
  },
  {
    value: "stat_2x",
    label: "Holiday OT 2.0×",
    multiplier: 2,
  },
  {
    value: "training",
    label: "Training",
    multiplier: 1,
  },
];

/* =========================================================
   ONTARIO / CANADIAN HOLIDAYS
========================================================= */

const HOLIDAYS = [
  {
    date: "2026-01-01",
    name: "New Year's Day",
  },
  {
    date: "2026-02-16",
    name: "Family Day",
  },
  {
    date: "2026-04-03",
    name: "Good Friday",
  },
  {
    date: "2026-05-18",
    name: "Victoria Day",
  },
  {
    date: "2026-07-01",
    name: "Canada Day",
  },
  {
    date: "2026-08-03",
    name: "Civic Holiday",
  },
  {
    date: "2026-09-07",
    name: "Labour Day",
  },
  {
    date: "2026-10-12",
    name: "Thanksgiving",
  },
  {
    date: "2026-11-11",
    name: "Remembrance Day",
  },
  {
    date: "2026-12-25",
    name: "Christmas Day",
  },
  {
    date: "2026-12-26",
    name: "Boxing Day",
  },
];

function getHoliday(date) {
  return (
    HOLIDAYS.find(
      holiday => holiday.date === date
    ) ?? null
  );
}

/* =========================================================
   HELPERS
========================================================= */

function todayString() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function money(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  })
    .format(Number(value) || 0)
    .replace("CA$", "$");
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(date) {
  if (!date) return "—";

  const d = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDays(dateStringValue, days) {
  const d = new Date(
    `${dateStringValue}T00:00:00`
  );

  d.setDate(d.getDate() + days);

  return d
    .toISOString()
    .split("T")[0];
}

function daysInMonth(year, month) {
  return new Date(
    year,
    month + 1,
    0
  ).getDate();
}

function makeId(prefix = "bb") {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/* =========================================================
   PAY PERIOD HELPERS
========================================================= */

/**
 * Default pay-period builder.
 *
 * These are defaults only.
 * Jobs can override them with their own
 * custom pay-period settings.
 */
function buildDefaultPeriods(year) {
  const periods = [];

  for (let month = 0; month < 12; month++) {
    const last =
      daysInMonth(year, month);

    periods.push({
      id: `${year}-${month + 1}-a`,
      start: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-01`,
      end: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-15`,
      payday: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-07`,
    });

    periods.push({
      id: `${year}-${month + 1}-b`,
      start: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-16`,
      end: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-${String(
        last
      ).padStart(2, "0")}`,
      payday: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-22`,
    });
  }

  return periods;
}

function getPeriodForDate(
  date,
  job
) {
  if (!date) return null;

  const periods =
    job?.payPeriods ?? [];

  const custom =
    periods.find(
      period =>
        date >= period.start &&
        date <= period.end
    );

  if (custom) {
    return custom;
  }

  const year =
    Number(date.slice(0, 4));

  const defaults =
    buildDefaultPeriods(year);

  return (
    defaults.find(
      period =>
        date >= period.start &&
        date <= period.end
    ) ?? null
  );
}

function getCurrentPeriod(job) {
  const today = todayString();

  return getPeriodForDate(
    today,
    job
  );
}

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
    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,
    vacationPercent: 0,
    payFrequency: "Semi-monthly",
    payPeriods: [],
    province: "Ontario",

    payrollRules: {
      statMultiplier: 1,
      statWorkedMultiplier: 1.5,
      holidayOvertimeMultiplier: 2,
      freezingPremium: 0,
      eveningPremium: 0,
    },

    deductions: {
      federalTax: 0,
      cpp: 0,
      ei: 0,
      other: 0,
    },

    active: true,
  },

  {
    id: "zai-loblaws",
    person: "Zai",
    title: "Loblaws",
    employer: "Loblaws",
    rate: 17.6,
    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,
    vacationPercent: 0,
    payFrequency: "Semi-monthly",
    payPeriods: [],
    province: "Ontario",

    payrollRules: {
      statMultiplier: 1,
      statWorkedMultiplier: 1.5,
      holidayOvertimeMultiplier: 2,
      freezingPremium: 0,
      eveningPremium: 0,
    },

    deductions: {
      federalTax: 0,
      cpp: 0,
      ei: 0,
      other: 0,
    },

    active: true,
  },

  {
    id: "ariel-witron",
    person: "Ariel",
    title: "Equipment Operator",
    employer: "Witron",
    rate: 21,
    overtimeThreshold: 44,
    overtimeMultiplier: 1.5,
    vacationPercent: 0,
    payFrequency: "Biweekly",
    payPeriods: [],
    province: "Ontario",

    payrollRules: {
      statMultiplier: 1,
      statWorkedMultiplier: 1.5,
      holidayOvertimeMultiplier: 2,
      freezingPremium: 0,
      eveningPremium: 0,
    },

    deductions: {
      federalTax: 0,
      cpp: 0,
      ei: 0,
      other: 0,
    },

    active: true,
  },
];

/* =========================================================
   STYLES
========================================================= */

const cardStyle = {
  background:
    "var(--color-bg-card)",
  border:
    "1px solid var(--color-border)",
  borderRadius:
    "var(--radius-xl)",
  boxShadow:
    "var(--shadow-card)",
  padding: 16,
  marginBottom: 14,
};

const inputStyle = {
  width: "100%",
  padding: "10px 11px",
  border:
    "1px solid var(--color-border)",
  borderRadius:
    "var(--radius-md)",
  background:
    "var(--color-bg-card)",
  color:
    "var(--color-text)",
  fontSize: 13,
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".07em",
  color:
    "var(--color-text-soft)",
};

function Button({
  children,
  onClick,
  secondary = false,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: secondary
          ? "1px solid var(--color-border)"
          : "none",

        background: danger
          ? "#fff0f2"
          : secondary
          ? "var(--color-bg-card)"
          : "var(--primary, var(--color-pink))",

        color: danger
          ? "#c94d6a"
          : secondary
          ? "var(--color-text-soft)"
          : "#fff",

        padding:
          "9px 12px",

        borderRadius:
          "var(--radius-md)",

        fontSize: 12,
        fontWeight: 800,
        cursor: disabled
          ? "not-allowed"
          : "pointer",

        opacity: disabled
          ? 0.5
          : 1,
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label
        style={labelStyle}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  subtitle,
}) {
  return (
    <div
      style={{
        background:
          "var(--color-bg-card)",
        border:
          "1px solid var(--color-border)",
        borderRadius:
          "var(--radius-lg)",
        padding: 13,
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform:
            "uppercase",
          letterSpacing:
            ".08em",
          color:
            "var(--color-text-muted)",
          fontWeight: 800,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          marginTop: 3,
        }}
      >
        {value}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 10,
            marginTop: 3,
            color:
              "var(--color-text-soft)",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   JOB SETTINGS
========================================================= */

function JobEditor({
  job,
  onSave,
  onCancel,
}) {
  const [form, setForm] =
    useState({
      ...job,
      payrollRules: {
        ...(job.payrollRules ?? {}),
      },
      deductions: {
        ...(job.deductions ?? {}),
      },
    });

  function update(key, value) {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  }

  function updateNested(
    parent,
    key,
    value
  ) {
    setForm(current => ({
      ...current,
      [parent]: {
        ...(current[parent] ?? {}),
        [key]: value,
      },
    }));
  }

  function submit(event) {
    event.preventDefault();

    onSave({
      ...form,
      rate: number(form.rate),
      overtimeThreshold:
        number(
          form.overtimeThreshold
        ),
      overtimeMultiplier:
        number(
          form.overtimeMultiplier
        ) || 1.5,
      vacationPercent:
        number(
          form.vacationPercent
        ),
      payrollRules: {
        ...form.payrollRules,
        statMultiplier:
          number(
            form.payrollRules
              ?.statMultiplier
          ),
        statWorkedMultiplier:
          number(
            form.payrollRules
              ?.statWorkedMultiplier
          ),
        holidayOvertimeMultiplier:
          number(
            form.payrollRules
              ?.holidayOvertimeMultiplier
          ),
      },
      deductions: {
        federalTax:
          number(
            form.deductions
              ?.federalTax
          ),
        cpp:
          number(
            form.deductions?.cpp
          ),
        ei:
          number(
            form.deductions?.ei
          ),
        other:
          number(
            form.deductions?.other
          ),
      },
    });
  }

  return (
    <form
      onSubmit={submit}
      style={cardStyle}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          marginBottom: 14,
        }}
      >
        ⚙️ Employer & Payroll Rules
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 10,
        }}
      >
        <Field label="Person">
          <select
            value={form.person}
            onChange={e =>
              update(
                "person",
                e.target.value
              )
            }
            style={inputStyle}
          >
            {PEOPLE.map(person => (
              <option
                key={person}
                value={person}
              >
                {person}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Employer">
          <input
            value={
              form.employer ?? ""
            }
            onChange={e =>
              update(
                "employer",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="Job Title">
          <input
            value={
              form.title ?? ""
            }
            onChange={e =>
              update(
                "title",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="Hourly Rate">
          <input
            type="number"
            step="0.01"
            value={
              form.rate ?? ""
            }
            onChange={e =>
              update(
                "rate",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="Pay Frequency">
          <select
            value={
              form.payFrequency ??
              "Biweekly"
            }
            onChange={e =>
              update(
                "payFrequency",
                e.target.value
              )
            }
            style={inputStyle}
          >
            {PAY_FREQUENCIES.map(
              frequency => (
                <option
                  key={frequency}
                  value={frequency}
                >
                  {frequency}
                </option>
              )
            )}
          </select>
        </Field>

        <Field label="Province">
          <input
            value={
              form.province ??
              "Ontario"
            }
            onChange={e =>
              update(
                "province",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="OT Threshold">
          <input
            type="number"
            step="0.01"
            value={
              form.overtimeThreshold ??
              44
            }
            onChange={e =>
              update(
                "overtimeThreshold",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>

        <Field label="OT Multiplier">
          <input
            type="number"
            step="0.1"
            value={
              form.overtimeMultiplier ??
              1.5
            }
            onChange={e =>
              update(
                "overtimeMultiplier",
                e.target.value
              )
            }
            style={inputStyle}
          />
        </Field>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop:
            "1px solid var(--color-border-soft)",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          Stat Holiday Rules
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          <Field label="Stat Pay">
            <input
              type="number"
              step="0.1"
              value={
                form.payrollRules
                  ?.statMultiplier ??
                1
              }
              onChange={e =>
                updateNested(
                  "payrollRules",
                  "statMultiplier",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Worked Stat">
            <input
              type="number"
              step="0.1"
              value={
                form.payrollRules
                  ?.statWorkedMultiplier ??
                1.5
              }
              onChange={e =>
                updateNested(
                  "payrollRules",
                  "statWorkedMultiplier",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Holiday OT">
            <input
              type="number"
              step="0.1"
              value={
                form.payrollRules
                  ?.holidayOvertimeMultiplier ??
                2
              }
              onChange={e =>
                updateNested(
                  "payrollRules",
                  "holidayOvertimeMultiplier",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop:
            "1px solid var(--color-border-soft)",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          Vacation & Estimated Deductions
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          <Field label="Vacation %">
            <input
              type="number"
              step="0.01"
              value={
                form.vacationPercent ??
                0
              }
              onChange={e =>
                update(
                  "vacationPercent",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Federal Tax">
            <input
              type="number"
              step="0.01"
              value={
                form.deductions
                  ?.federalTax ??
                0
              }
              onChange={e =>
                updateNested(
                  "deductions",
                  "federalTax",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="CPP">
            <input
              type="number"
              step="0.01"
              value={
                form.deductions?.cpp ??
                0
              }
              onChange={e =>
                updateNested(
                  "deductions",
                  "cpp",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="EI">
            <input
              type="number"
              step="0.01"
              value={
                form.deductions?.ei ??
                0
              }
              onChange={e =>
                updateNested(
                  "deductions",
                  "ei",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
        }}
      >
        <Button type="submit">
          Save Employer Rules
        </Button>

        <Button
          secondary
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
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
  onEditJob,
  onRemoveJob,
}) {
  const [date, setDate] =
    useState(
      period?.start ??
        todayString()
    );

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("17:00");

  const [breakMinutes, setBreakMinutes] =
    useState("30");

  const [payType, setPayType] =
    useState("regular");

  const [
    freezingPremium,
    setFreezingPremium,
  ] = useState("");

  const [
    eveningPremium,
    setEveningPremium,
  ] = useState("");

  const [
    trainingHours,
    setTrainingHours,
  ] = useState("");

  const [bonus, setBonus] =
    useState("");

  const [
    otherEarnings,
    setOtherEarnings,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    actualNet,
    setActualNet,
  ] = useState("");

  const [
    actualGross,
    setActualGross,
  ] = useState("");

  const holiday =
    getHoliday(date);

  const shiftHours =
    calculateShiftHours(
      startTime,
      endTime,
      number(breakMinutes)
    );

  const selectedPayType =
    PAY_TYPES.find(
      item =>
        item.value ===
        payType
    );

  const calculatedMultiplier =
    selectedPayType?.multiplier ??
    1;

  const previewShift = {
    date,
    startTime,
    endTime,
    unpaidBreakMinutes:
      number(breakMinutes),

    hourlyRate:
      number(job.rate),

    overtimeThreshold:
      number(
        job.overtimeThreshold ??
          44
      ),

    overtimeMultiplier:
      number(
        job.overtimeMultiplier ??
          1.5
      ),

    isStatHoliday:
      payType.startsWith("stat_"),

    statMultiplier:
      calculatedMultiplier,

    freezingPremium:
      number(
        freezingPremium
      ),

    eveningPremium:
      number(
        eveningPremium
      ),

    trainingHours:
      number(trainingHours),

    bonus:
      number(bonus),

    otherEarnings:
      number(otherEarnings),

    type: payType,
  };

  const preview =
    shiftHours > 0
      ? calculateShift(
          previewShift
        )
      : null;

  const paycheck =
    shifts.length
      ? calculatePaycheck(
          shifts,
          {
            vacationPercent:
              number(
                job.vacationPercent
              ),
            federalTax:
              number(
                job.deductions
                  ?.federalTax
              ),
            cpp:
              number(
                job.deductions?.cpp
              ),
            ei:
              number(
                job.deductions?.ei
              ),
            otherDeductions:
              number(
                job.deductions?.other
              ),
            overtimeThreshold:
              number(
                job.overtimeThreshold ??
                  44
              ),
            overtimeMultiplier:
              number(
                job.overtimeMultiplier ??
                  1.5
              ),
          }
        )
      : null;

  const estimatedNet =
    paycheck?.netPay ?? 0;

  function addShift() {
    if (!date) {
      alert(
        "Please select a work date."
      );
      return;
    }

    if (
      !startTime ||
      !endTime
    ) {
      alert(
        "Please enter start and end time."
      );
      return;
    }

    const isStat =
      payType.startsWith(
        "stat_"
      );

    const multiplier =
      selectedPayType
        ?.multiplier ?? 1;

    const shift = {
      id: makeId("shift"),

      date,

      startTime,

      endTime,

      unpaidBreakMinutes:
        number(breakMinutes),

      hourlyRate:
        number(job.rate),

      overtimeThreshold:
        number(
          job.overtimeThreshold ??
            44
        ),

      overtimeMultiplier:
        number(
          job.overtimeMultiplier ??
            1.5
        ),

      isStatHoliday:
        isStat,

      statMultiplier:
        isStat
          ? multiplier
          : 1,

      freezingPremium:
        number(
          freezingPremium
        ),

      eveningPremium:
        number(
          eveningPremium
        ),

      trainingHours:
        number(trainingHours),

      bonus:
        number(bonus),

      otherEarnings:
        number(otherEarnings),

      notes,

      type: payType,

      rate:
        number(job.rate),

      inT: startTime,

      outT: endTime,

      brk:
        number(breakMinutes),

      hol:
        holiday?.name ?? null,
    };

    const calculation =
      calculateShift(
        shift
      );

    onAddShift({
      ...shift,

      hrs:
        calculation.hours,

      gross:
        calculation.grossPay,

      regularHours:
        calculation.regularHours,

      overtimeHours:
        calculation.overtimeHours,

      statHours:
        calculation.statHours,

      premiumHours:
        calculation.premiumHours,

      trainingHours:
        calculation.trainingHours,
    });

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
      number(actualNet);

    if (net <= 0) {
      alert(
        "Enter the actual net paycheck amount."
      );
      return;
    }

    const gross =
      number(actualGross) ||
      paycheck?.grossPay ||
      net;

    onSendActual({
      jobId: job.id,
      net,
      gross,
      estimatedNet,
    });

    setActualNet("");
    setActualGross("");
  }

  return (
    <section
      style={{
        ...cardStyle,
        borderTop:
          "3px solid var(--primary, var(--color-pink))",
      }}
    >
      {/* JOB HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
          alignItems:
            "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              color:
                "var(--color-text-muted)",
              fontWeight: 800,
            }}
          >
            {job.person}
          </div>

          <div
            style={{
              fontSize: 19,
              fontWeight: 800,
            }}
          >
            {job.employer}
          </div>

          <div
            style={{
              fontSize: 11,
              color:
                "var(--color-text-soft)",
            }}
          >
            {job.title} ·{" "}
            {money(job.rate)}
            /hr
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
          }}
        >
          <Button
            secondary
            onClick={() =>
              onEditJob(job)
            }
          >
            Edit
          </Button>

          <Button
            danger
            onClick={() =>
              onRemoveJob(job.id)
            }
          >
            Delete
          </Button>
        </div>
      </div>

      {/* PAY PERIOD */}

      <div
        style={{
          marginTop: 12,
          padding: 10,
          borderRadius:
            "var(--radius-md)",
          background:
            "var(--primary-bg, #fce8ee)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform:
              "uppercase",
          }}
        >
          Pay Period
        </div>

        <div
          style={{
            fontWeight: 800,
            marginTop: 2,
          }}
        >
          {formatDate(
            period?.start
          )}{" "}
          –{" "}
          {formatDate(
            period?.end
          )}
        </div>

        <div
          style={{
            fontSize: 11,
            color:
              "var(--color-text-soft)",
            marginTop: 2,
          }}
        >
          Payday:{" "}
          {formatDate(
            period?.payday
          )}
        </div>
      </div>

      {/* ADD SHIFT */}

      <div
        style={{
          marginTop: 15,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform:
              "uppercase",
            letterSpacing:
              ".08em",
            color:
              "var(--color-text-soft)",
            marginBottom: 9,
          }}
        >
          WORK HOURS
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 9,
          }}
        >
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={e =>
                setDate(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Pay Type">
            <select
              value={payType}
              onChange={e =>
                setPayType(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              {PAY_TYPES.map(
                item => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Start">
            <input
              type="time"
              value={
                startTime
              }
              onChange={e =>
                setStartTime(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="End">
            <input
              type="time"
              value={
                endTime
              }
              onChange={e =>
                setEndTime(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Unpaid Break">
            <input
              type="number"
              min="0"
              value={
                breakMinutes
              }
              onChange={e =>
                setBreakMinutes(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Hourly Rate">
            <input
              type="number"
              step="0.01"
              value={
                job.rate
              }
              readOnly
              style={{
                ...inputStyle,
                background:
                  "var(--color-bg-warm)",
              }}
            />
          </Field>
        </div>

        {/* HOLIDAY */}

        {holiday && (
          <div
            style={{
              marginTop: 9,
              padding: 10,
              borderRadius:
                "var(--radius-md)",
              background:
                "#fff7e5",
              border:
                "1px solid #f4c870",
              color:
                "#8a5b00",
              fontSize: 11,
            }}
          >
            🇨🇦{" "}
            <strong>
              {holiday.name}
            </strong>{" "}
            detected for this date.
            <br />
            Your employer's configured
            holiday rule is used.
          </div>
        )}

        {/* PREMIUMS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 9,
            marginTop: 9,
          }}
        >
          <Field label="Freezing Premium">
            <input
              type="number"
              step="0.01"
              value={
                freezingPremium
              }
              onChange={e =>
                setFreezingPremium(
                  e.target.value
                )
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>

          <Field label="Evening Premium">
            <input
              type="number"
              step="0.01"
              value={
                eveningPremium
              }
              onChange={e =>
                setEveningPremium(
                  e.target.value
                )
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>

          <Field label="Training Hours">
            <input
              type="number"
              step="0.01"
              value={
                trainingHours
              }
              onChange={e =>
                setTrainingHours(
                  e.target.value
                )
              }
              placeholder="0"
              style={inputStyle}
            />
          </Field>

          <Field label="Bonus">
            <input
              type="number"
              step="0.01"
              value={bonus}
              onChange={e =>
                setBonus(
                  e.target.value
                )
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>

          <Field label="Other Earnings">
            <input
              type="number"
              step="0.01"
              value={
                otherEarnings
              }
              onChange={e =>
                setOtherEarnings(
                  e.target.value
                )
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>

          <Field label="Notes">
            <input
              value={notes}
              onChange={e =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Optional"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* SHIFT PREVIEW */}

        <div
          style={{
            marginTop: 10,
            padding: 11,
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
              display: "flex",
              justifyContent:
                "space-between",
            }}
          >
            <span>
              Paid Hours
            </span>

            <strong>
              {shiftHours.toFixed(
                2
              )}
            </strong>
          </div>

          {preview && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginTop: 5,
                }}
              >
                <span>
                  Estimated Shift Pay
                </span>

                <strong>
                  {money(
                    preview.grossPay
                  )}
                </strong>
              </div>

              <div
                style={{
                  fontSize: 10,
                  color:
                    "var(--color-text-soft)",
                  marginTop: 6,
                }}
              >
                {shiftHours.toFixed(
                  2
                )}{" "}
                hrs ×{" "}
                {money(
                  job.rate
                )}{" "}
                ×{" "}
                {calculatedMultiplier.toFixed(
                  1
                )}
                ×
                <br />
                plus configured
                premiums / training /
                bonuses.
              </div>
            </>
          )}
        </div>

        <Button
          onClick={addShift}
        >
          + Add Work Shift
        </Button>
      </div>

      {/* SHIFT LIST */}

      {shifts.length > 0 && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              color:
                "var(--color-text-soft)",
              marginBottom: 8,
            }}
          >
            Shifts in This Pay Period
          </div>

          {shifts.map(
            (shift, index) => {
              const calculation =
                calculateShift(
                  shift
                );

              return (
                <div
                  key={
                    shift.id ??
                    index
                  }
                  style={{
                    padding:
                      "10px 0",
                    borderBottom:
                      "1px solid var(--color-border-soft)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <strong>
                        {formatDate(
                          shift.date
                        )}
                      </strong>

                      <div
                        style={{
                          fontSize: 11,
                          color:
                            "var(--color-text-soft)",
                        }}
                      >
                        {
                          shift.startTime
                        }{" "}
                        –{" "}
                        {
                          shift.endTime
                        }{" "}
                        ·{" "}
                        {
                          calculation.hours
                        }{" "}
                        paid hrs
                      </div>

                      {shift.hol && (
                        <div
                          style={{
                            fontSize: 10,
                            color:
                              "#9a6800",
                          }}
                        >
                          🇨🇦{" "}
                          {
                            shift.hol
                          }
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      <strong>
                        {money(
                          calculation.grossPay
                        )}
                      </strong>

                      <div
                        style={{
                          fontSize: 10,
                          color:
                            "var(--color-text-soft)",
                        }}
                      >
                        {
                          shift.type ??
                          "regular"
                        }
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginTop: 6,
                      fontSize: 10,
                    }}
                  >
                    <span>
                      Regular:{" "}
                      {
                        calculation.regularHours
                      }{" "}
                      hrs
                    </span>

                    <span>
                      OT:{" "}
                      {
                        calculation.overtimeHours
                      }{" "}
                      hrs
                    </span>

                    <span>
                      Holiday:{" "}
                      {
                        calculation.statHours
                      }{" "}
                      hrs
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveShift(
                          shift.id ??
                            index
                        )
                      }
                      style={{
                        border:
                          "none",
                        background:
                          "none",
                        color:
                          "#c94d6a",
                        cursor:
                          "pointer",
                        fontWeight:
                          700,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* PAYROLL */}

      {paycheck && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 15,
            borderTop:
              "1px solid var(--color-border-soft)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              color:
                "var(--color-text-soft)",
              marginBottom: 10,
            }}
          >
            PAYSTUB-STYLE ESTIMATE
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >
            <SummaryCard
              title="Regular"
              value={money(
                paycheck.regularPay
              )}
              subtitle={`${paycheck.regularHours} hrs`}
            />

            <SummaryCard
              title="Overtime"
              value={money(
                paycheck.overtimePay
              )}
              subtitle={`${paycheck.overtimeHours} hrs`}
            />

            <SummaryCard
              title="Holiday"
              value={money(
                paycheck.statPay
              )}
              subtitle={`${paycheck.statHours} hrs`}
            />

            <SummaryCard
              title="Premium"
              value={money(
                paycheck.premiumPay
              )}
              subtitle={`${paycheck.premiumHours} hrs`}
            />
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 13,
              borderRadius:
                "var(--radius-lg)",
              background:
                "var(--color-bg-warm)",
            }}
          >
            <PayrollRow
              label="Regular Pay"
              value={
                paycheck.regularPay
              }
            />

            <PayrollRow
              label="Overtime"
              value={
                paycheck.overtimePay
              }
            />

            <PayrollRow
              label="Stat Holiday"
              value={
                paycheck.statPay
              }
            />

            <PayrollRow
              label="Premiums"
              value={
                paycheck.premiumPay
              }
            />

            <PayrollRow
              label="Training"
              value={
                paycheck.trainingPay
              }
            />

            <PayrollRow
              label="Vacation Pay"
              value={
                paycheck.vacationPay
              }
            />

            <PayrollRow
              label="Bonus"
              value={
                paycheck.bonus
              }
            />

            <PayrollRow
              label="Other"
              value={
                paycheck.otherEarnings
              }
            />

            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop:
                  "1px solid var(--color-border)",
              }}
            >
              <PayrollRow
                label="Gross Pay"
                value={
                  paycheck.grossPay
                }
                strong
              />
            </div>

            <div
              style={{
                marginTop: 8,
              }}
            >
              <PayrollRow
                label="Federal Tax (EST.)"
                value={
                  paycheck.federalTax
                }
              />

              <PayrollRow
                label="CPP (EST.)"
                value={
                  paycheck.cpp
                }
              />

              <PayrollRow
                label="EI (EST.)"
                value={
                  paycheck.ei
                }
              />

              <PayrollRow
                label="Other Deductions"
                value={
                  paycheck.otherDeductions
                }
              />

              <PayrollRow
                label="Total Deductions"
                value={
                  paycheck.totalDeductions
                }
                strong
              />
            </div>

            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop:
                  "2px solid var(--color-border)",
              }}
            >
              <PayrollRow
                label="Estimated Net Pay"
                value={
                  estimatedNet
                }
                strong
                accent
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onSendEstimated(
                job.id
              )
            }
            style={{
              width: "100%",
              marginTop: 10,
              padding: 11,
              border: "none",
              borderRadius:
                "var(--radius-md)",
              background:
                "#3a9080",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            💰 Send Estimated Net to
            Budget Pool
          </button>
        </div>
      )}

      {/* ACTUAL PAY */}

      <div
        style={{
          marginTop: 16,
          paddingTop: 15,
          borderTop:
            "1px solid var(--color-border-soft)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform:
              "uppercase",
            letterSpacing:
              ".08em",
            marginBottom: 9,
          }}
        >
          ACTUAL PAYCHECK
        </div>

        <div
          style={{
            padding: 10,
            borderRadius:
              "var(--radius-md)",
            background:
              "#f8fbff",
            border:
              "1px solid #d7e6f5",
            marginBottom: 9,
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
          Enter the real paycheck
          after you receive it.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >
          <input
            type="number"
            step="0.01"
            placeholder="Actual Net"
            value={actualNet}
            onChange={e =>
              setActualNet(
                e.target.value
              )
            }
            style={inputStyle}
          />

          <input
            type="number"
            step="0.01"
            placeholder="Actual Gross"
            value={actualGross}
            onChange={e =>
              setActualGross(
                e.target.value
              )
            }
            style={inputStyle}
          />
        </div>

        <Button
          secondary
          onClick={saveActual}
        >
          ✓ Save Actual Paycheck
        </Button>
      </div>
    </section>
  );
}

function PayrollRow({
  label,
  value,
  strong = false,
  accent = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: 10,
        marginTop: 5,
        fontWeight:
          strong ? 800 : 500,
        fontSize:
          strong ? 13 : 11,
        color: accent
          ? "var(--primary, #e8708a)"
          : "var(--color-text)",
      }}
    >
      <span>{label}</span>
      <span>
        {money(value)}
      </span>
    </div>
  );
}

/* =========================================================
   POOLED INCOME
========================================================= */

function PooledIncomeCard({
  entries,
  onRemove,
}) {
  const total = entries.reduce(
    (sum, entry) =>
      sum + number(entry.amt),
    0
  );

  return (
    <section
      style={cardStyle}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          marginBottom: 10,
        }}
      >
        💰 Budget Pool
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 15,
            textAlign: "center",
            color:
              "var(--color-text-muted)",
            fontSize: 12,
          }}
        >
          No income has been
          allocated yet.
        </div>
      ) : (
        <>
          {entries.map(
            (entry, index) => (
              <div
                key={
                  entry.id ??
                  index
                }
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  padding:
                    "10px 0",
                  borderBottom:
                    "1px solid var(--color-border-soft)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {entry.src ??
                      "Income"}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color:
                        "var(--color-text-soft)",
                    }}
                  >
                    {entry.isActual
                      ? "ACTUAL"
                      : "ESTIMATE"}
                  </div>

                  {entry.actualDifference !=
                    null && (
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          entry.actualDifference >=
                          0
                            ? "#3a6b4e"
                            : "#c94d6a",
                      }}
                    >
                      Actual vs estimate:{" "}
                      {money(
                        entry.actualDifference
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 8,
                  }}
                >
                  <strong>
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
                      border:
                        "none",
                      background:
                        "none",
                      color:
                        "#c94d6a",
                      cursor:
                        "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          )}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              paddingTop: 12,
              fontWeight: 800,
            }}
          >
            <span>
              Total Pool
            </span>

            <span
              style={{
                color:
                  "#3a9080",
              }}
            >
              {money(total)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

/* =========================================================
   MAIN INCOME PAGE
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

  const [selectedPerson, setSelectedPerson] =
    useState("Zai");

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [selectedPeriod, setSelectedPeriod] =
    useState(null);

  const [editingJob, setEditingJob] =
    useState(null);

  const [addingJob, setAddingJob] =
    useState(false);

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let dead = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data,
          error: loadError,
        } = await supabase
          .from("user_data")
          .select("data")
          .limit(1)
          .single();

        if (loadError) {
          throw loadError;
        }

        if (dead) return;

        const blob =
          data?.data?.budgetsbloom;

        let parsed = null;

        if (
          typeof blob ===
          "string"
        ) {
          try {
            parsed =
              JSON.parse(blob);
          } catch {
            parsed = null;
          }
        } else {
          parsed =
            blob ?? null;
        }

        setRawData(
          parsed ?? {}
        );
      } catch (err) {
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

  /* =======================================================
     SAVE
  ======================================================= */

  const save =
    useCallback(
      async updated => {
        setSaving(true);
        setToast("");

        try {
          const {
            data: row,
            error: rowError,
          } = await supabase
            .from("user_data")
            .select("id,data")
            .limit(1)
            .single();

          if (rowError) {
            throw rowError;
          }

          const existing =
            row?.data ?? {};

          const {
            error:
              updateError,
          } =
            await supabase
              .from("user_data")
              .update({
                data: {
                  ...existing,
                  budgetsbloom:
                    JSON.stringify(
                      updated
                    ),
                },
              })
              .eq(
                "id",
                row.id
              );

          if (updateError) {
            throw updateError;
          }

          setRawData(
            updated
          );
        } catch (err) {
          console.error(
            "Income save error:",
            err
          );

          setToast(
            "❌ Could not save. Please check your Supabase connection."
          );
        } finally {
          setSaving(false);
        }
      },
      []
    );

  /* =======================================================
     DATA
  ======================================================= */

  const jobs = useMemo(
    () => {
      const saved =
        rawData?.jobs;

      if (
        Array.isArray(saved) &&
        saved.length
      ) {
        return saved;
      }

      return DEFAULT_JOBS;
    },
    [rawData]
  );

  const shifts =
    rawData?.shifts ?? {};

  const sent =
    rawData?.sent ?? {};

  const paychecks =
    rawData?.paychecks ?? {};

  /* =======================================================
     SELECTED JOB
  ======================================================= */

  const personJobs =
    jobs.filter(
      job =>
        job.person ===
        selectedPerson &&
        job.active !== false
    );

  const activeJob =
    personJobs.find(
      job =>
        job.id ===
        selectedJobId
    ) ??
    personJobs[0] ??
    null;

  /* =======================================================
     SELECTED PERIOD
  ======================================================= */

  const today =
    todayString();

  const period =
    selectedPeriod ??
    getCurrentPeriod(
      activeJob
    );

  const periodKey =
    activeJob && period
      ? `${activeJob.id}|${period.id}`
      : "";

  const currentShifts =
    periodKey
      ? shifts[periodKey] ??
        []
      : [];

  const periodSent =
    periodKey
      ? sent[periodKey] ??
        []
      : [];

  /* =======================================================
     PAYCHECK PREVIEW
  ======================================================= */

  const paycheck =
    activeJob &&
    currentShifts.length
      ? calculatePaycheck(
          currentShifts,
          {
            vacationPercent:
              number(
                activeJob.vacationPercent
              ),

            federalTax:
              number(
                activeJob
                  .deductions
                  ?.federalTax
              ),

            cpp:
              number(
                activeJob
                  .deductions
                  ?.cpp
              ),

            ei:
              number(
                activeJob
                  .deductions
                  ?.ei
              ),

            otherDeductions:
              number(
                activeJob
                  .deductions
                  ?.other
              ),

            overtimeThreshold:
              number(
                activeJob
                  .overtimeThreshold ??
                  44
              ),

            overtimeMultiplier:
              number(
                activeJob
                  .overtimeMultiplier ??
                  1.5
              ),
          }
        )
      : null;

  /* =======================================================
     PERIOD SUMMARY
  ======================================================= */

  const periodSummary =
    useMemo(() => {
      const result = {
        hours: 0,
        regularHours: 0,
        overtimeHours: 0,
        statHours: 0,
        premiumHours: 0,
        gross: 0,
      };

      for (
        const shift of currentShifts
      ) {
        const calculation =
          calculateShift(
            shift
          );

        result.hours +=
          calculation.hours;

        result.regularHours +=
          calculation.regularHours;

        result.overtimeHours +=
          calculation.overtimeHours;

        result.statHours +=
          calculation.statHours;

        result.premiumHours +=
          calculation.premiumHours;

        result.gross +=
          calculation.grossPay;
      }

      return result;
    }, [currentShifts]);

  /* =======================================================
     PERSON TOTALS
  ======================================================= */

  const personTotals =
    useMemo(() => {
      const result = {
        gross: 0,
        hours: 0,
        regular: 0,
        overtime: 0,
        holiday: 0,
      };

      for (
        const job of personJobs
      ) {
        Object.entries(
          shifts
        ).forEach(
          ([key, jobShifts]) => {
            if (
              !key.startsWith(
                `${job.id}|`
              )
            ) {
              return;
            }

            for (
              const shift of
                jobShifts
            ) {
              const calculation =
                calculateShift(
                  shift
                );

              result.gross +=
                calculation.grossPay;

              result.hours +=
                calculation.hours;

              result.regular +=
                calculation.regularHours;

              result.overtime +=
                calculation.overtimeHours;

              result.holiday +=
                calculation.statHours;
            }
          }
        );
      }

      return result;
    }, [personJobs, shifts]);

  /* =======================================================
     HANDLERS
  ======================================================= */

  function handleAddShift(
    shift
  ) {
    if (!activeJob) return;

    const targetPeriod =
      getPeriodForDate(
        shift.date,
        activeJob
      );

    if (!targetPeriod) {
      alert(
        "This work date could not be assigned to a pay period."
      );
      return;
    }

    const key = `${activeJob.id}|${targetPeriod.id}`;

    const next = {
      ...(rawData ?? {}),

      jobs,

      shifts: {
        ...shifts,

        [key]: [
          ...(shifts[key] ??
            []),
          shift,
        ],
      },

      calendarEvents: [
        ...(rawData
          ?.calendarEvents ??
          []),
        {
          id:
            shift.id ??
            makeId("calendar"),

          type: "work",

          date: shift.date,

          title: `${activeJob.employer} — ${activeJob.person}`,

          startTime:
            shift.startTime,

          endTime:
            shift.endTime,

          jobId:
            activeJob.id,

          person:
            activeJob.person,

          employer:
            activeJob.employer,

          paidHours:
            shift.hrs ?? 0,

          payType:
            shift.type ??
            "regular",

          holiday:
            shift.hol ?? null,

          estimatedEarnings:
            shift.gross ?? 0,
        },
      ],
    };

    save(next);

    setToast(
      "✅ Work shift added and connected to the pay period."
    );
  }

  function handleRemoveShift(
    shiftId
  ) {
    if (
      !window.confirm(
        "Delete this work shift?"
      )
    ) {
      return;
    }

    const updatedShifts =
      {};

    Object.entries(
      shifts
    ).forEach(
      ([key, value]) => {
        updatedShifts[key] =
          value.filter(
            shift =>
              shift.id !==
              shiftId
          );
      }
    );

    const calendarEvents =
      (
        rawData
          ?.calendarEvents ??
        []
      ).filter(
        event =>
          event.id !==
          shiftId
      );

    save({
      ...(rawData ?? {}),
      jobs,
      shifts:
        updatedShifts,
      calendarEvents,
    });

    setToast(
      "🗑 Work shift deleted."
    );
  }

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

    const key =
      `${jobId}|${period?.id}`;

    const jobShifts =
      shifts[key] ?? [];

    if (
      jobShifts.length ===
      0
    ) {
      alert(
        "Add work hours first."
      );
      return;
    }

    const calculation =
      calculatePaycheck(
        jobShifts,
        {
          vacationPercent:
            number(
              job.vacationPercent
            ),

          federalTax:
            number(
              job.deductions
                ?.federalTax
            ),

          cpp:
            number(
              job.deductions?.cpp
            ),

          ei:
            number(
              job.deductions?.ei
            ),

          otherDeductions:
            number(
              job.deductions?.other
            ),

          overtimeThreshold:
            number(
              job.overtimeThreshold ??
                44
            ),

          overtimeMultiplier:
            number(
              job.overtimeMultiplier ??
                1.5
            ),
        }
      );

    const entry = {
      id: makeId("income"),

      src: `${job.person} — ${job.employer}`,

      person:
        job.person,

      employer:
        job.employer,

      jobId:
        job.id,

      amount:
        calculation.netPay,

      amt:
        calculation.netPay,

      gross:
        calculation.grossPay,

      estimatedNet:
        calculation.netPay,

      actualNet:
        null,

      actualGross:
        null,

      actualDifference:
        null,

      date:
        period?.payday ??
        today,

      payPeriodStart:
        period?.start ??
        "",

      payPeriodEnd:
        period?.end ??
        "",

      isActual:
        false,

      createdAt:
        new Date().toISOString(),
    };

    save({
      ...(rawData ?? {}),
      jobs,

      sent: {
        ...sent,

        [key]: [
          ...(sent[key] ??
            []),
          entry,
        ],
      },

      paychecks: {
        ...paychecks,

        [key]: {
          ...(paychecks[key] ??
            {}),
          estimated:
            entry,
          calculation,
        },
      },
    });

    setToast(
      "💰 Estimated paycheck added to Budget Pool."
    );
  }

  function handleSendActual({
    jobId,
    net,
    gross,
    estimatedNet,
  }) {
    const key =
      `${jobId}|${period?.id}`;

    const existing =
      sent[key] ?? [];

    const difference =
      net -
      number(
        estimatedNet
      );

    const actualEntry = {
      id: makeId("actual"),

      src: `${
        jobs.find(
          job =>
            job.id ===
            jobId
        )?.person ??
        ""
      } — Actual Paycheck`,

      person:
        jobs.find(
          job =>
            job.id ===
            jobId
        )?.person,

      jobId,

      amt: net,

      amount: net,

      gross,

      actualNet:
        net,

      actualGross:
        gross,

      estimatedNet:
        estimatedNet,

      actualDifference:
        difference,

      date:
        period?.payday ??
        today,

      payPeriodStart:
        period?.start ??
        "",

      payPeriodEnd:
        period?.end ??
        "",

      isActual:
        true,

      createdAt:
        new Date().toISOString(),
    };

    save({
      ...(rawData ?? {}),
      jobs,

      sent: {
        ...sent,

        [key]: [
          ...(sent[key] ??
            []),
          actualEntry,
        ],
      },

      paychecks: {
        ...paychecks,

        [key]: {
          ...(paychecks[key] ??
            {}),
          actual:
            actualEntry,
        },
      },
    });

    setToast(
      `✅ Actual paycheck saved. Difference: ${money(
        difference
      )}`
    );
  }

  function handleRemovePoolEntry(
    index
  ) {
    if (
      !window.confirm(
        "Remove this income entry?"
      )
    ) {
      return;
    }

    const updated =
      (
        sent[periodKey] ??
        []
      ).filter(
        (_, i) =>
          i !== index
      );

    save({
      ...(rawData ?? {}),
      jobs,

      sent: {
        ...sent,

        [periodKey]:
          updated,
      },
    });
  }

  function handleSaveJob(
    job
  ) {
    const updatedJobs =
      jobs.some(
        existing =>
          existing.id ===
          job.id
      )
        ? jobs.map(
            existing =>
              existing.id ===
              job.id
                ? job
                : existing
          )
        : [
            ...jobs,
            {
              ...job,
              id:
                job.id ??
                makeId("job"),
            },
          ];

    save({
      ...(rawData ?? {}),
      jobs: updatedJobs,
    });

    setEditingJob(null);
    setAddingJob(false);

    setSelectedPerson(
      job.person
    );

    setSelectedJobId(
      job.id
    );

    setToast(
      "✅ Employer settings saved."
    );
  }

  function handleRemoveJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job? Existing historical shifts will remain saved."
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

    if (
      selectedJobId ===
      jobId
    ) {
      setSelectedJobId(
        null
      );
    }

    setToast(
      "🗑 Job removed."
    );
  }

  /* =======================================================
     PERIODS FOR CURRENT JOB
  ======================================================= */

  const visiblePeriods =
    useMemo(() => {
      const year =
        Number(
          today.slice(0, 4)
        );

      return buildDefaultPeriods(
        year
      );
    }, [today]);

  /* =======================================================
     RENDER
  ======================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display: "grid",
          placeItems:
            "center",
          background:
            "var(--color-bg)",
          color:
            "var(--color-text-soft)",
        }}
      >
        Loading income…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "var(--color-bg)",
        color:
          "var(--color-text)",
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin:
            "0 auto",
          padding:
            "18px 14px",
        }}
      >
        {/* HEADER */}

        <header
          className="fade-up"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".12em",
                color:
                  "var(--color-text-muted)",
                fontWeight: 800,
              }}
            >
              Salary
            </div>

            <h1
              style={{
                margin: 0,
                fontFamily:
                  "var(--font-display)",
                fontSize: 30,
              }}
            >
              Income & Work Hours
            </h1>

            <p
              style={{
                margin:
                  "5px 0 0",
                fontSize: 12,
                color:
                  "var(--color-text-soft)",
              }}
            >
              Your work hours automatically
              generate your estimated income.
            </p>
          </div>

          {saving && (
            <span
              style={{
                fontSize: 10,
                color:
                  "var(--color-text-muted)",
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
              ...cardStyle,
              background:
                "#fff0f2",
              border:
                "1px solid #f4a0b4",
              color:
                "#c94d6a",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* TOAST */}

        {toast && (
          <div
            style={{
              ...cardStyle,
              background:
                "#eef9f5",
              border:
                "1px solid #a7d9ca",
              color:
                "#28755f",
            }}
          >
            {toast}
          </div>
        )}

        {/* PERSON SWITCHER */}

        <section
          style={cardStyle}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              color:
                "var(--color-text-soft)",
              marginBottom: 9,
            }}
          >
            INCOME FOR
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >
            {PEOPLE.map(
              person => (
                <button
                  type="button"
                  key={person}
                  onClick={() => {
                    setSelectedPerson(
                      person
                    );
                    setSelectedJobId(
                      null
                    );
                    setSelectedPeriod(
                      null
                    );
                  }}
                  style={{
                    padding: 13,
                    borderRadius:
                      "var(--radius-lg)",
                    border:
                      selectedPerson ===
                      person
                        ? "2px solid var(--primary, #e8708a)"
                        : "1px solid var(--color-border)",
                    background:
                      selectedPerson ===
                      person
                        ? "var(--primary-bg, #fce8ee)"
                        : "#fff",
                    color:
                      "var(--color-text)",
                    fontWeight: 800,
                    cursor:
                      "pointer",
                  }}
                >
                  {person ===
                  "Zai"
                    ? "👩🏻 "
                    : "👨🏻 "}
                  {person}
                </button>
              )
            )}
          </div>
        </section>

        {/* PERSON SUMMARY */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <SummaryCard
            title="Hours"
            value={`${personTotals.hours.toFixed(
              1
            )} hrs`}
          />

          <SummaryCard
            title="Regular"
            value={`${personTotals.regular.toFixed(
              1
            )} hrs`}
          />

          <SummaryCard
            title="OT"
            value={`${personTotals.overtime.toFixed(
              1
            )} hrs`}
          />

          <SummaryCard
            title="Gross"
            value={money(
              personTotals.gross
            )}
          />
        </div>

        {/* JOB SELECTOR */}

        {personJobs.length >
          0 && (
          <section
            style={cardStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom: 9,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    ".08em",
                }}
              >
                JOB / EMPLOYER
              </div>

              <Button
                secondary
                onClick={() =>
                  setAddingJob(true)
                }
              >
                + Add Job
              </Button>
            </div>

            <select
              value={
                activeJob?.id ??
                ""
              }
              onChange={e =>
                setSelectedJobId(
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                fontWeight: 700,
              }}
            >
              {personJobs.map(
                job => (
                  <option
                    key={
                      job.id
                    }
                    value={
                      job.id
                    }
                  >
                    {job.employer} —{" "}
                    {money(
                      job.rate
                    )}
                    /hr
                  </option>
                )
              )}
            </select>
          </section>
        )}

        {/* JOB EDITOR */}

        {addingJob && (
          <JobEditor
            job={{
              id: makeId(
                "job"
              ),
              person:
                selectedPerson,
              title: "",
              employer: "",
              rate: 0,
              overtimeThreshold: 44,
              overtimeMultiplier: 1.5,
              vacationPercent: 0,
              payFrequency:
                "Biweekly",
              payPeriods: [],
              province:
                "Ontario",
              payrollRules: {
                statMultiplier: 1,
                statWorkedMultiplier:
                  1.5,
                holidayOvertimeMultiplier:
                  2,
              },
              deductions: {
                federalTax: 0,
                cpp: 0,
                ei: 0,
                other: 0,
              },
              active: true,
            }}
            onSave={
              handleSaveJob
            }
            onCancel={() =>
              setAddingJob(false)
            }
          />
        )}

        {editingJob && (
          <JobEditor
            job={editingJob}
            onSave={
              handleSaveJob
            }
            onCancel={() =>
              setEditingJob(null)
            }
          />
        )}

        {/* PAY PERIOD SELECTOR */}

        {activeJob && (
          <section
            style={cardStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom: 9,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                  }}
                >
                  PAY PERIOD
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color:
                      "var(--color-text-soft)",
                    marginTop: 2,
                  }}
                >
                  {activeJob.payFrequency ??
                    "Custom"}{" "}
                  ·{" "}
                  {activeJob.employer}
                </div>
              </div>

              <div
                style={{
                  fontSize: 10,
                  color:
                    "var(--color-text-muted)",
                }}
              >
                Current:{" "}
                {formatDate(
                  period?.payday
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 7,
                overflowX:
                  "auto",
                paddingBottom: 3,
              }}
            >
              {visiblePeriods
                .slice(
                  Math.max(
                    0,
                    visiblePeriods.findIndex(
                      item =>
                        item.id ===
                        period?.id
                    ) - 2
                  ),
                  Math.min(
                    visiblePeriods.length,
                    visiblePeriods.findIndex(
                      item =>
                        item.id ===
                        period?.id
                    ) + 4
                  )
                )
                .map(item => {
                  const active =
                    item.id ===
                    period?.id;

                  return (
                    <button
                      type="button"
                      key={
                        item.id
                      }
                      onClick={() =>
                        setSelectedPeriod(
                          item
                        )
                      }
                      style={{
                        minWidth: 105,
                        padding:
                          "9px 7px",
                        borderRadius:
                          "var(--radius-md)",
                        border:
                          active
                            ? "1.5px solid var(--primary, #e8708a)"
                            : "1px solid var(--color-border)",
                        background:
                          active
                            ? "var(--primary-bg, #fce8ee)"
                            : "#fff",
                        cursor:
                          "pointer",
                        color:
                          "var(--color-text)",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 10,
                        }}
                      >
                        {formatDate(
                          item.start
                        )}
                      </strong>

                      <br />

                      <span
                        style={{
                          fontSize: 9,
                        }}
                      >
                        to{" "}
                        {formatDate(
                          item.end
                        )}
                      </span>

                      <br />

                      <span
                        style={{
                          fontSize: 9,
                          color:
                            "var(--color-text-soft)",
                        }}
                      >
                        Pay{" "}
                        {formatDate(
                          item.payday
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        )}

        {/* ACTIVE JOB */}

        {activeJob && (
          <JobCard
            key={
              activeJob.id
            }
            job={activeJob}
            shifts={
              currentShifts
            }
            period={period}
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
            onEditJob={
              setEditingJob
            }
            onRemoveJob={
              handleRemoveJob
            }
          />
        )}

        {/* PAYCHECK SUMMARY */}

        {paycheck && (
          <section
            style={cardStyle}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".08em",
                marginBottom: 10,
              }}
            >
              PAYCHECK PROGRESS
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 9,
              }}
            >
              <SummaryCard
                title="Estimated Gross"
                value={money(
                  paycheck.grossPay
                )}
              />

              <SummaryCard
                title="Estimated Net"
                value={money(
                  paycheck.netPay
                )}
              />

              <SummaryCard
                title="Regular Hours"
                value={`${paycheck.regularHours.toFixed(
                  2
                )} hrs`}
              />

              <SummaryCard
                title="Holiday Hours"
                value={`${paycheck.statHours.toFixed(
                  2
                )} hrs`}
              />
            </div>
          </section>
        )}

        {/* BUDGET POOL */}

        <PooledIncomeCard
          entries={
            periodSent
          }
          onRemove={
            handleRemovePoolEntry
          }
        />

        {/* EMPTY STATE */}

        {!activeJob && (
          <section
            style={{
              ...cardStyle,
              textAlign:
                "center",
              padding: 30,
            }}
          >
            <div
              style={{
                fontSize: 35,
              }}
            >
              💰
            </div>

            <h2
              style={{
                fontFamily:
                  "var(--font-display)",
                margin:
                  "8px 0 5px",
              }}
            >
              No job yet
            </h2>

            <p
              style={{
                fontSize: 12,
                color:
                  "var(--color-text-soft)",
              }}
            >
              Add your employer so
              your work hours can
              automatically become
              income.
            </p>

            <Button
              onClick={() =>
                setAddingJob(true)
              }
            >
              + Add Employer
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
