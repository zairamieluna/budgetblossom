/**
 * Budget Blossom
 *
 * Income.jsx
 *
 * MAIN INCOME + WORK HOURS + PAYROLL SYSTEM
 *
 * IMPORTANT PAYROLL MODEL:
 *
 * Work Date
 *     ↓
 * Pay Period
 *     ↓
 * Payroll Calculation
 *     ↓
 * Payday
 *
 * PAY PERIOD AND PAYDAY ARE ALWAYS SEPARATE.
 *
 * Example:
 *
 * Pay Period:
 * July 20 – August 2
 *
 * Payday:
 * August 7
 *
 * The paycheck contains work from July 20–August 2,
 * but the money arrives August 7.
 *
 * Existing Supabase structure is preserved:
 *
 * user_data.data
 *   jobs
 *   shifts
 *   sent
 *   actualPaychecks
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
  estimateNetPay,
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

    freezingPremium: 0,
    eveningPremium: 0,

    payFrequency: "biweekly",

    /*
     * IMPORTANT:
     * These are independent.
     */
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    breakMinutes: 30,

    province: "Ontario",

    active: true,
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

    freezingPremium: 0,
    eveningPremium: 0,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    breakMinutes: 30,

    province: "Ontario",

    active: true,
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

    /*
     * Put Ariel's actual freezer premium here
     * when you know the amount.
     *
     * Example:
     * 1.50 = $1.50/hour
     */
    freezingPremium: 0,
    eveningPremium: 0,

    payFrequency: "biweekly",

    /*
     * Your actual example:
     *
     * July 20 – August 2
     * Payday August 7
     *
     * These are NOT mathematically derived.
     */
    payPeriodStart: "2026-07-20",
    payPeriodEnd: "2026-08-02",
    payday: "2026-08-07",

    breakMinutes: 30,

    province: "Ontario",

    active: true,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function numberOrZero(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function money(value) {
  return new Intl.NumberFormat(
    "en-CA",
    {
      style: "currency",
      currency: "CAD",
    }
  ).format(
    numberOrZero(value)
  );
}

function dateString(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    parseDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function addDays(
  value,
  amount
) {
  const date =
    parseDate(value);

  if (!date) {
    return "";
  }

  date.setDate(
    date.getDate() +
      amount
  );

  return dateString(
    date
  );
}

function isDateInRange(
  date,
  start,
  end
) {
  if (
    !date ||
    !start ||
    !end
  ) {
    return false;
  }

  return (
    date >= start &&
    date <= end
  );
}

function daysBetween(
  start,
  end
) {
  const a =
    parseDate(start);

  const b =
    parseDate(end);

  if (!a || !b) {
    return 0;
  }

  return Math.round(
    (
      b.getTime() -
      a.getTime()
    ) /
      86400000
  );
}

function makeId(
  prefix = "id"
) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* =========================================================
   PAY PERIOD GENERATION
========================================================= */

/*
 * This is NOT the old semi-monthly system.
 *
 * The user defines:
 *
 * Period Start
 * Period End
 * Payday
 *
 * For biweekly schedules, future periods are generated
 * from the user's configured period.
 *
 * Payday is also generated from the user's actual
 * payday relationship to the period.
 */

function buildPayPeriodsForJob(
  job,
  count = 12
) {
  const start =
    job?.payPeriodStart;

  const end =
    job?.payPeriodEnd;

  const payday =
    job?.payday;

  if (
    !start ||
    !end ||
    !payday
  ) {
    return [];
  }

  const duration =
    daysBetween(
      start,
      end
    );

  if (
    duration < 0
  ) {
    return [];
  }

  const frequency =
    job?.payFrequency ??
    "biweekly";

  let periodLength;

  if (
    frequency ===
    "weekly"
  ) {
    periodLength = 7;
  } else if (
    frequency ===
    "monthly"
  ) {
    periodLength =
      Math.max(
        1,
        duration + 1
      );
  } else {
    /*
     * Biweekly is the main household payroll pattern.
     */
    periodLength =
      Math.max(
        1,
        duration + 1
      );
  }

  const paydayOffset =
    daysBetween(
      end,
      payday
    );

  const periods = [];

  /*
   * Generate periods before and after the anchor.
   */
  for (
    let index = -6;
    index <= count;
    index++
  ) {
    const periodStart =
      addDays(
        start,
        index *
          periodLength
      );

    const periodEnd =
      addDays(
        end,
        index *
          periodLength
      );

    const periodPayday =
      addDays(
        periodEnd,
        paydayOffset
      );

    if (
      !periodStart ||
      !periodEnd ||
      !periodPayday
    ) {
      continue;
    }

    periods.push({
      id:
        `${job.id}|${periodStart}|${periodEnd}`,

      jobId:
        job.id,

      person:
        job.person,

      employer:
        job.employer,

      title:
        job.title,

      start:
        periodStart,

      end:
        periodEnd,

      payday:
        periodPayday,

      frequency,
    });
  }

  return periods.sort(
    (a, b) =>
      a.start.localeCompare(
        b.start
      )
  );
}

/* =========================================================
   FIND PERIOD FOR SHIFT
========================================================= */

function findPayPeriodForDate(
  job,
  date
) {
  const periods =
    buildPayPeriodsForJob(
      job,
      24
    );

  return (
    periods.find(
      period =>
        isDateInRange(
          date,
          period.start,
          period.end
        )
    ) ??
    null
  );
}

/* =========================================================
   CANADIAN HOLIDAYS
========================================================= */

function getEasterSunday(
  year
) {
  const a =
    year % 19;

  const b =
    Math.floor(
      year / 100
    );

  const c =
    year % 100;

  const d =
    Math.floor(
      b / 4
    );

  const e =
    b % 4;

  const f =
    Math.floor(
      (b + 8) / 25
    );

  const g =
    Math.floor(
      (b - f + 1) / 3
    );

  const h =
    (19 * a +
      b -
      d -
      g +
      15) %
    30;

  const i =
    Math.floor(
      c / 4
    );

  const k =
    c % 4;

  const l =
    (32 +
      2 * e +
      2 * i -
      h -
      k) %
    7;

  const m =
    Math.floor(
      (a +
        11 * h +
        22 * l) /
        451
    );

  const month =
    Math.floor(
      (h +
        l -
        7 * m +
        114) /
        31
    );

  const day =
    ((h +
      l -
      7 * m +
      114) %
      31) +
    1;

  return new Date(
    year,
    month - 1,
    day
  );
}

function canadaHolidays(
  year
) {
  const holidays = [];

  function add(
    date,
    name
  ) {
    holidays.push({
      date:
        dateString(
          date
        ),
      name,
    });
  }

  add(
    new Date(
      year,
      0,
      1
    ),
    "New Year's Day"
  );

  /*
   * Good Friday
   */
  const easter =
    getEasterSunday(
      year
    );

  const goodFriday =
    new Date(
      easter
    );

  goodFriday.setDate(
    goodFriday.getDate() -
      2
  );

  add(
    goodFriday,
    "Good Friday"
  );

  add(
    new Date(
      year,
      6,
      1
    ),
    "Canada Day"
  );

  /*
   * Labour Day
   */
  const labour =
    new Date(
      year,
      8,
      1
    );

  while (
    labour.getDay() !== 1
  ) {
    labour.setDate(
      labour.getDate() +
        1
    );
  }

  add(
    labour,
    "Labour Day"
  );

  add(
    new Date(
      year,
      10,
      11
    ),
    "Remembrance Day"
  );

  add(
    new Date(
      year,
      11,
      25
    ),
    "Christmas Day"
  );

  add(
    new Date(
      year,
      11,
      26
    ),
    "Boxing Day"
  );

  return holidays;
}

function getHoliday(
  date
) {
  if (!date) {
    return null;
  }

  const year =
    Number(
      date.slice(0, 4)
    );

  return (
    canadaHolidays(
      year
    ).find(
      holiday =>
        holiday.date ===
        date
    ) ??
    null
  );
}

/* =========================================================
   INPUT COMPONENTS
========================================================= */

function Label({
  children,
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 700,
        color:
          "var(--color-text-soft, #9b6b8a)",
        textTransform:
          "uppercase",
        letterSpacing:
          "0.07em",
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding:
    "10px 11px",
  border:
    "1px solid var(--color-border, #f1d8e2)",
  borderRadius:
    "10px",
  background:
    "var(--color-bg-card, #fff)",
  color:
    "var(--color-text, #3a2430)",
  fontSize: 13,
  outline: "none",
  boxSizing:
    "border-box",
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
        border:
          secondary
            ? "1px solid var(--color-border, #efd5df)"
            : "none",

        background:
          danger
            ? "#fff0f3"
            : secondary
            ? "#fff"
            : "var(--primary, #db2777)",

        color:
          danger
            ? "#c94d6a"
            : secondary
            ? "var(--color-text-soft, #8f6a7c)"
            : "#fff",

        padding:
          "10px 13px",

        borderRadius:
          "10px",

        fontSize: 12,
        fontWeight: 700,
        cursor:
          disabled
            ? "not-allowed"
            : "pointer",

        opacity:
          disabled
            ? 0.5
            : 1,
      }}
    >
      {children}
    </button>
  );
}

/* =========================================================
   JOB EDITOR
========================================================= */

function JobEditor({
  job,
  onSave,
  onClose,
}) {
  const existing =
    job ?? {
      id: makeId(
        "job"
      ),
      person: "Zai",
      title: "",
      employer: "",
      rate: 0,
      otRate: 0,
      overtimeThreshold: 44,
      overtimeMultiplier: 1.5,
      vacationPercent: 0,
      deductionPercent: 15,
      ded: 15,
      statMultiplier: 1.5,
      freezingPremium: 0,
      eveningPremium: 0,
      payFrequency: "biweekly",
      payPeriodStart: "",
      payPeriodEnd: "",
      payday: "",
      breakMinutes: 30,
      province: "Ontario",
      active: true,
    };

  const [
    form,
    setForm,
  ] = useState({
    ...existing,
  });

  function update(
    key,
    value
  ) {
    setForm(
      current => ({
        ...current,
        [key]:
          value,
      })
    );
  }

  function saveJob() {
    const rate =
      numberOrZero(
        form.rate
      );

    const otMultiplier =
      numberOrZero(
        form.overtimeMultiplier
      ) || 1.5;

    onSave({
      ...form,

      rate,

      otRate:
        numberOrZero(
          form.otRate
        ) ||
        rate *
          otMultiplier,

      overtimeThreshold:
        numberOrZero(
          form.overtimeThreshold
        ) || 44,

      overtimeMultiplier:
        otMultiplier,

      vacationPercent:
        numberOrZero(
          form.vacationPercent
        ),

      deductionPercent:
        numberOrZero(
          form.deductionPercent ??
            form.ded
        ),

      ded:
        numberOrZero(
          form.deductionPercent ??
            form.ded
        ),

      statMultiplier:
        numberOrZero(
          form.statMultiplier
        ) || 1,

      freezingPremium:
        numberOrZero(
          form.freezingPremium
        ),

      eveningPremium:
        numberOrZero(
          form.eveningPremium
        ),

      breakMinutes:
        numberOrZero(
          form.breakMinutes
        ),
    });
  }

  return (
    <div
      style={{
        position:
          "fixed",
        inset: 0,
        background:
          "rgba(40,20,30,.35)",
        zIndex: 1000,
        display:
          "flex",
        alignItems:
          "flex-end",
        justifyContent:
          "center",
        padding: 10,
      }}
    >
      <div
        style={{
          width:
            "min(680px, 100%)",
          maxHeight:
            "92vh",
          overflowY:
            "auto",
          background:
            "#fff",
          borderRadius:
            "18px",
          padding:
            "18px",
          boxShadow:
            "0 20px 60px rgba(40,20,30,.2)",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#9b6b8a",
                letterSpacing:
                  ".1em",
                textTransform:
                  "uppercase",
              }}
            >
              Job / Employer
            </div>

            <h2
              style={{
                margin:
                  "3px 0 0",
                fontSize:
                  21,
              }}
            >
              {job
                ? "Edit Job"
                : "Add New Job"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background:
                "transparent",
              fontSize:
                22,
              cursor:
                "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* PERSON */}

        <div
          style={{
            display:
              "grid",
            gap: 12,
          }}
        >
          <div>
            <Label>
              Person
            </Label>

            <select
              value={
                form.person
              }
              onChange={e =>
                update(
                  "person",
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              <option>
                Zai
              </option>

              <option>
                Ariel
              </option>
            </select>
          </div>

          <div>
            <Label>
              Employer
            </Label>

            <input
              value={
                form.employer
              }
              onChange={e =>
                update(
                  "employer",
                  e.target.value
                )
              }
              placeholder="Employer"
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Job Title
            </Label>

            <input
              value={
                form.title
              }
              onChange={e =>
                update(
                  "title",
                  e.target.value
                )
              }
              placeholder="Job title"
              style={
                inputStyle
              }
            />
          </div>

          {/* PAY */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <Label>
                Hourly Rate
              </Label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.rate
                }
                onChange={e =>
                  update(
                    "rate",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <Label>
                OT Multiplier
              </Label>

              <input
                type="number"
                min="1"
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
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <Label>
                OT Threshold (hours)
              </Label>

              <input
                type="number"
                min="0"
                value={
                  form.overtimeThreshold
                }
                onChange={e =>
                  update(
                    "overtimeThreshold",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <Label>
                Default Break (minutes)
              </Label>

              <input
                type="number"
                min="0"
                value={
                  form.breakMinutes
                }
                onChange={e =>
                  update(
                    "breakMinutes",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          {/* PREMIUMS */}

          <div
            style={{
              padding:
                "13px",
              background:
                "#fff7fa",
              border:
                "1px solid #f7dce7",
              borderRadius:
                12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color:
                  "#9b6b8a",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".07em",
                marginBottom:
                  10,
              }}
            >
              Hourly Premiums
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <Label>
                  Freezing / Cold Premium ($/hr)
                </Label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.freezingPremium
                  }
                  onChange={e =>
                    update(
                      "freezingPremium",
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <Label>
                  Evening Premium ($/hr)
                </Label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.eveningPremium
                  }
                  onChange={e =>
                    update(
                      "eveningPremium",
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <p
              style={{
                margin:
                  "8px 0 0",
                fontSize:
                  10,
                color:
                  "#9b6b8a",
              }}
            >
              Example: $1.50/hr freezing premium ×
              8 paid hours = $12.00.
            </p>
          </div>

          {/* STAT */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <Label>
                Stat Holiday Multiplier
              </Label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={
                  form.statMultiplier
                }
                onChange={e =>
                  update(
                    "statMultiplier",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <Label>
                Vacation Pay %
              </Label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.vacationPercent
                }
                onChange={e =>
                  update(
                    "vacationPercent",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          {/* DEDUCTIONS */}

          <div>
            <Label>
              Estimated Deduction %
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.deductionPercent
              }
              onChange={e =>
                update(
                  "deductionPercent",
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          {/* PAY SCHEDULE */}

          <div
            style={{
              padding:
                "14px",
              background:
                "#fffaf1",
              border:
                "1px solid #f2dfb5",
              borderRadius:
                12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color:
                  "#98701f",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".07em",
                marginBottom:
                  5,
              }}
            >
              Pay Schedule
            </div>

            <p
              style={{
                margin:
                  "0 0 12px",
                fontSize:
                  10,
                color:
                  "#8f7650",
              }}
            >
              Pay period and payday are entered separately.
              The payday is NOT automatically assumed to be
              the end of the pay period.
            </p>

            <div>
              <Label>
                Pay Frequency
              </Label>

              <select
                value={
                  form.payFrequency
                }
                onChange={e =>
                  update(
                    "payFrequency",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="weekly">
                  Weekly
                </option>

                <option value="biweekly">
                  Biweekly
                </option>

                <option value="semi-monthly">
                  Semi-monthly
                </option>

                <option value="monthly">
                  Monthly
                </option>
              </select>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 10,
                marginTop:
                  10,
              }}
            >
              <div>
                <Label>
                  Pay Period Start
                </Label>

                <input
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
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <Label>
                  Pay Period End
                </Label>

                <input
                  type="date"
                  value={
                    form.payPeriodEnd
                  }
                  onChange={e =>
                    update(
                      "payPeriodEnd",
                      e.target.value
                    )
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <div
              style={{
                marginTop:
                  10,
              }}
            >
              <Label>
                Actual Payday
              </Label>

              <input
                type="date"
                value={
                  form.payday
                }
                onChange={e =>
                  update(
                    "payday",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            {form.payPeriodStart &&
              form.payPeriodEnd &&
              form.payday && (
                <div
                  style={{
                    marginTop:
                      12,
                    padding:
                      "10px",
                    background:
                      "#fff",
                    borderRadius:
                      9,
                    fontSize:
                      11,
                  }}
                >
                  <strong>
                    Example:
                  </strong>{" "}
                  Work from{" "}
                  {formatDate(
                    form.payPeriodStart
                  )}{" "}
                  to{" "}
                  {formatDate(
                    form.payPeriodEnd
                  )}
                  {" → "}
                  paid on{" "}
                  {formatDate(
                    form.payday
                  )}
                </div>
              )}
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap: 8,
            marginTop:
              16,
          }}
        >
          <Button
            secondary
            onClick={
              onClose
            }
          >
            Cancel
          </Button>

          <div
            style={{
              flex: 1,
            }}
          >
            <Button
              onClick={
                saveJob
              }
            >
              Save Job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   WORK SHIFT FORM
========================================================= */

function ShiftForm({
  job,
  onAdd,
}) {
  const [
    date,
    setDate,
  ] = useState(
    dateString()
  );

  const [
    startTime,
    setStartTime,
  ] = useState(
    "09:00"
  );

  const [
    endTime,
    setEndTime,
  ] = useState(
    "17:00"
  );

  const [
    breakMinutes,
    setBreakMinutes,
  ] = useState(
    String(
      job?.breakMinutes ??
        30
    )
  );

  const [
    rate,
    setRate,
  ] = useState(
    String(
      job?.rate ??
        0
    )
  );

  const [
    freezingPremium,
    setFreezingPremium,
  ] = useState(
    String(
      job?.freezingPremium ??
        0
    )
  );

  const [
    eveningPremium,
    setEveningPremium,
  ] = useState(
    String(
      job?.eveningPremium ??
        0
    )
  );

  const [
    trainingHours,
    setTrainingHours,
  ] = useState(
    "0"
  );

  const [
    bonus,
    setBonus,
  ] = useState(
    "0"
  );

  const [
    otherEarnings,
    setOtherEarnings,
  ] = useState(
    "0"
  );

  const [
    notes,
    setNotes,
  ] = useState(
    ""
  );

  const [
    statOverride,
    setStatOverride,
  ] = useState(
    "auto"
  );

  const [
    statMultiplier,
    setStatMultiplier,
  ] = useState(
    String(
      job?.statMultiplier ??
        1.5
    )
  );

  const holiday =
    getHoliday(
      date
    );

  const paidHours =
    calculateShift({
      date,
      startTime,
      endTime,
      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),
      hourlyRate:
        numberOrZero(
          rate
        ),
      isStatHoliday:
        statOverride ===
        "yes" ||
        (
          statOverride ===
            "auto" &&
          Boolean(
            holiday
          )
        ),
      statMultiplier:
        numberOrZero(
          statMultiplier
        ),
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
        numberOrZero(
          bonus
        ),
      otherEarnings:
        numberOrZero(
          otherEarnings
        ),
    });

  function submit() {
    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      return;
    }

    const isStatHoliday =
      statOverride ===
        "yes" ||
      (
        statOverride ===
          "auto" &&
        Boolean(
          holiday
        )
      );

    const shift = {
      id:
        makeId(
          "shift"
        ),

      date,

      startTime,

      endTime,

      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),

      hourlyRate:
        numberOrZero(
          rate
        ),

      overtimeThreshold:
        numberOrZero(
          job?.overtimeThreshold ??
            44
        ),

      overtimeMultiplier:
        numberOrZero(
          job?.overtimeMultiplier ??
            1.5
        ),

      isStatHoliday,

      holidayName:
        holiday?.name ??
        "",

      statMultiplier:
        numberOrZero(
          statMultiplier
        ),

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
        numberOrZero(
          bonus
        ),

      otherEarnings:
        numberOrZero(
          otherEarnings
        ),

      notes,
    };

    onAdd(
      shift
    );
  }

  return (
    <div
      style={{
        background:
          "#fff",
        border:
          "1px solid #f0dbe4",
        borderRadius:
          14,
        padding:
          14,
        marginTop:
          10,
      }}
    >
      <div
        style={{
          fontSize:
            11,
          fontWeight:
            800,
          color:
            "#9b6b8a",
          textTransform:
            "uppercase",
          letterSpacing:
            ".07em",
          marginBottom:
            12,
        }}
      >
        Add Work Hours
      </div>

      <div
        style={{
          display:
            "grid",
          gap: 10,
        }}
      >
        <div>
          <Label>
            Date
          </Label>

          <input
            type="date"
            value={
              date
            }
            onChange={e =>
              setDate(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          />
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <Label>
              Start
            </Label>

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
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              End
            </Label>

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
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Break
            </Label>

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
              style={
                inputStyle
              }
            />
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <Label>
              Hourly Rate
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                rate
              }
              onChange={e =>
                setRate(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Holiday
            </Label>

            <select
              value={
                statOverride
              }
              onChange={e =>
                setStatOverride(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="auto">
                Auto
              </option>

              <option value="yes">
                Stat Holiday
              </option>

              <option value="no">
                Regular Day
              </option>
            </select>
          </div>
        </div>

        {holiday && (
          <div
            style={{
              padding:
                "9px 10px",
              background:
                "#fff7e6",
              border:
                "1px solid #f3d99b",
              borderRadius:
                9,
              fontSize:
                11,
              color:
                "#8a6b29",
            }}
          >
            🇨🇦 {holiday.name} detected.
            Employer rules determine the actual
            statutory treatment.
          </div>
        )}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <Label>
              Freezing Premium ($/hr)
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                freezingPremium
              }
              onChange={e =>
                setFreezingPremium(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Evening Premium ($/hr)
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                eveningPremium
              }
              onChange={e =>
                setEveningPremium(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <Label>
              Stat Multiplier
            </Label>

            <input
              type="number"
              min="0"
              step="0.1"
              value={
                statMultiplier
              }
              onChange={e =>
                setStatMultiplier(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Training Hours
            </Label>

            <input
              type="number"
              min="0"
              step="0.25"
              value={
                trainingHours
              }
              onChange={e =>
                setTrainingHours(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <Label>
              Bonus
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                bonus
              }
              onChange={e =>
                setBonus(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Other Earnings
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                otherEarnings
              }
              onChange={e =>
                setOtherEarnings(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </div>
        </div>

        <div>
          <Label>
            Notes
          </Label>

          <input
            value={
              notes
            }
            onChange={e =>
              setNotes(
                e.target.value
              )
            }
            placeholder="Optional"
            style={
              inputStyle
            }
          />
        </div>

        {/* PREVIEW */}

        <div
          style={{
            background:
              "#fff7fa",
            border:
              "1px solid #f7dce7",
            borderRadius:
              11,
            padding:
              12,
          }}
        >
          <div
            style={{
              fontSize:
                10,
              fontWeight:
                800,
              color:
                "#9b6b8a",
              textTransform:
                "uppercase",
              marginBottom:
                8,
            }}
          >
            Shift Preview
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    9,
                  color:
                    "#9b6b8a",
                }}
              >
                PAID HOURS
              </div>

              <strong>
                {paidHours.hours.toFixed(
                  2
                )}
              </strong>
            </div>

            <div>
              <div
                style={{
                  fontSize:
                    9,
                  color:
                    "#9b6b8a",
                }}
              >
                PREMIUM
              </div>

              <strong>
                {money(
                  paidHours.premiumPay
                )}
              </strong>
            </div>

            <div>
              <div
                style={{
                  fontSize:
                    9,
                  color:
                    "#9b6b8a",
                }}
              >
                SHIFT GROSS
              </div>

              <strong>
                {money(
                  paidHours.grossPay
                )}
              </strong>
            </div>
          </div>
        </div>

        <Button
          onClick={
            submit
          }
        >
          + Add Work Hours
        </Button>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Income() {
  const [
    rawData,
    setRawData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState("");

  const [
    jobEditor,
    setJobEditor,
  ] = useState(null);

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState("");

  const [
    selectedPeriodId,
    setSelectedPeriodId,
  ] = useState("");

  /* =======================================================
     LOAD SUPABASE
  ======================================================= */

  useEffect(() => {
    let dead = false;

    async function load() {
      setLoading(
        true
      );

      try {
        const {
          data: row,
          error: rowError,
        } =
          await supabase
            .from(
              "user_data"
            )
            .select(
              "data"
            )
            .limit(1)
            .single();

        if (rowError) {
          throw rowError;
        }

        let data =
          row?.data ??
          {};

        if (
          typeof data ===
          "string"
        ) {
          try {
            data =
              JSON.parse(
                data
              );
          } catch {
            data = {};
          }
        }

        if (!dead) {
          setRawData(
            data
          );
        }
      } catch (err) {
        console.error(
          err
        );

        if (!dead) {
          setError(
            "Unable to load income data."
          );
        }
      } finally {
        if (!dead) {
          setLoading(
            false
          );
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
        setSaving(
          true
        );

        try {
          const {
            data: row,
            error: rowError,
          } =
            await supabase
              .from(
                "user_data"
              )
              .select(
                "id"
              )
              .limit(1)
              .single();

          if (rowError) {
            throw rowError;
          }

          const {
            error:
              updateError,
          } =
            await supabase
              .from(
                "user_data"
              )
              .update({
                data:
                  updated,
              })
              .eq(
                "id",
                row.id
              );

          if (
            updateError
          ) {
            throw updateError;
          }

          setRawData(
            updated
          );
        } catch (err) {
          console.error(
            err
          );

          setToast(
            "❌ Save failed"
          );
        } finally {
          setSaving(
            false
          );
        }
      },
      []
    );

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const jobs =
    useMemo(() => {
      const existing =
        rawData?.jobs;

      if (
        !Array.isArray(
          existing
        ) ||
        existing.length ===
          0
      ) {
        return DEFAULT_JOBS;
      }

      /*
       * Add the new payroll fields without destroying
       * existing job data.
       */
      return existing.map(
        job => ({
          ...job,

          payFrequency:
            job.payFrequency ??
            "biweekly",

          payPeriodStart:
            job.payPeriodStart ??
            "",

          payPeriodEnd:
            job.payPeriodEnd ??
            "",

          payday:
            job.payday ??
            "",

          breakMinutes:
            numberOrZero(
              job.breakMinutes ??
                30
            ),

          overtimeMultiplier:
            numberOrZero(
              job.overtimeMultiplier ??
                1.5
            ) ||
            1.5,

          freezingPremium:
            numberOrZero(
              job.freezingPremium
            ),

          eveningPremium:
            numberOrZero(
              job.eveningPremium
            ),

          statMultiplier:
            numberOrZero(
              job.statMultiplier ??
                1.5
            ) ||
            1.5,

          active:
            job.active !==
            false,
        })
      );
    }, [
      rawData?.jobs,
    ]);

  const shifts =
    rawData?.shifts ??
    {};

  const sent =
    rawData?.sent ??
    {};

  const actualPaychecks =
    rawData?.actualPaychecks ??
    {};

  /* =======================================================
     SELECT DEFAULT JOB
  ======================================================= */

  useEffect(() => {
    if (
      !selectedJobId &&
      jobs.length
    ) {
      setSelectedJobId(
        jobs[0].id
      );
    }
  }, [
    jobs,
    selectedJobId,
  ]);

  const selectedJob =
    jobs.find(
      job =>
        job.id ===
        selectedJobId
    ) ??
    jobs[0] ??
    null;

  /* =======================================================
     PAY PERIODS FOR SELECTED JOB
  ======================================================= */

  const periods =
    useMemo(
      () =>
        selectedJob
          ? buildPayPeriodsForJob(
              selectedJob,
              18
            )
          : [],
      [
        selectedJob,
      ]
    );

  useEffect(() => {
    if (
      !selectedPeriodId &&
      periods.length
    ) {
      /*
       * Prefer the period containing today.
       */
      const today =
        dateString();

      const current =
        periods.find(
          period =>
            isDateInRange(
              today,
              period.start,
              period.end
            )
        );

      setSelectedPeriodId(
        current?.id ??
          periods[
            periods.length -
              1
          ].id
      );
    }
  }, [
    periods,
    selectedPeriodId,
  ]);

  const selectedPeriod =
    periods.find(
      period =>
        period.id ===
        selectedPeriodId
    ) ??
    periods.find(
      period =>
        selectedJob &&
        isDateInRange(
          dateString(),
          period.start,
          period.end
        )
    ) ??
    periods[periods.length - 1] ??
    null;

  /* =======================================================
     ALL SHIFTS FOR JOB
  ======================================================= */

  const allJobShifts =
    useMemo(() => {
      const output = [];

      Object.entries(
        shifts
      ).forEach(
        ([
          key,
          values,
        ]) => {
          if (
            !key.startsWith(
              `${selectedJobId}|`
            )
          ) {
            return;
          }

          if (
            Array.isArray(
              values
            )
          ) {
            values.forEach(
              shift => {
                output.push({
                  ...shift,
                  jobId:
                    selectedJobId,
                });
              }
            );
          }
        }
      );

      /*
       * Also support an older flat structure if it exists.
       */
      const flat =
        shifts[
          selectedJobId
        ];

      if (
        Array.isArray(
          flat
        )
      ) {
        flat.forEach(
          shift =>
            output.push({
              ...shift,
              jobId:
                selectedJobId,
            })
        );
      }

      const unique =
        new Map();

      output.forEach(
        shift => {
          const id =
            shift.id ??
            `${shift.date}|${shift.startTime}|${shift.endTime}`;

          unique.set(
            String(id),
            shift
          );
        }
      );

      return Array.from(
        unique.values()
      ).sort(
        (a, b) =>
          String(
            a.date
          ).localeCompare(
            String(
              b.date
            )
          )
      );
    }, [
      shifts,
      selectedJobId,
    ]);

  /* =======================================================
     SHIFTS IN SELECTED PAY PERIOD
  ======================================================= */

  const periodShifts =
    useMemo(() => {
      if (
        !selectedPeriod
      ) {
        return [];
      }

      return allJobShifts.filter(
        shift =>
          isDateInRange(
            shift.date,
            selectedPeriod.start,
            selectedPeriod.end
          )
      );
    }, [
      allJobShifts,
      selectedPeriod,
    ]);

  /* =======================================================
     PAYROLL
  ======================================================= */

  const payroll =
    useMemo(() => {
      if (
        !selectedJob ||
        !selectedPeriod ||
        !periodShifts.length
      ) {
        return null;
      }

      const calculatorShifts =
        periodShifts.map(
          shift => ({
            ...shift,

            hourlyRate:
              shift.hourlyRate ??
              shift.rate ??
              selectedJob.rate,

            overtimeThreshold:
              shift.overtimeThreshold ??
              selectedJob.overtimeThreshold ??
              44,

            overtimeMultiplier:
              shift.overtimeMultiplier ??
              selectedJob.overtimeMultiplier ??
              1.5,

            statMultiplier:
              shift.statMultiplier ??
              selectedJob.statMultiplier ??
              1.5,

            freezingPremium:
              shift.freezingPremium ??
              selectedJob.freezingPremium ??
              0,

            eveningPremium:
              shift.eveningPremium ??
              selectedJob.eveningPremium ??
              0,
          })
        );

      return calculatePaycheck(
        calculatorShifts,
        {
          payPeriodStart:
            selectedPeriod.start,

          payPeriodEnd:
            selectedPeriod.end,

          payDate:
            selectedPeriod.payday,

          vacationPercent:
            numberOrZero(
              selectedJob.vacationPercent
            ),

          overtimeThreshold:
            numberOrZero(
              selectedJob.overtimeThreshold ??
                44
            ),

          overtimeMultiplier:
            numberOrZero(
              selectedJob.overtimeMultiplier ??
                1.5
            ),
        }
      );
    }, [
      selectedJob,
      selectedPeriod,
      periodShifts,
    ]);

  const estimatedGross =
    payroll?.grossPay ??
    0;

  const estimatedDeduction =
    estimateNetPay(
      estimatedGross,
      numberOrZero(
        selectedJob?.deductionPercent ??
          selectedJob?.ded ??
          0
      )
    );

  const estimatedNet =
    payroll
      ? estimatedDeduction
      : 0;

  const estimatedDeductions =
    payroll
      ? estimatedGross -
        estimatedNet
      : 0;

  /* =======================================================
     ACTUAL PAY
  ======================================================= */

  const actualKey =
    selectedPeriod &&
    selectedJob
      ? `${selectedJob.id}|${selectedPeriod.start}|${selectedPeriod.end}`
      : "";

  const actual =
    actualPaychecks[
      actualKey
    ] ??
    null;

  const actualNet =
    numberOrZero(
      actual?.netPay ??
        actual?.actualNet ??
        actual?.amt
    );

  const difference =
    actual
      ? actualNet -
        estimatedNet
      : null;

  /* =======================================================
     SAVE JOB
  ======================================================= */

  function handleSaveJob(
    updatedJob
  ) {
    const exists =
      jobs.some(
        job =>
          job.id ===
          updatedJob.id
      );

    const updatedJobs =
      exists
        ? jobs.map(
            job =>
              job.id ===
              updatedJob.id
                ? updatedJob
                : job
          )
        : [
            ...jobs,
            updatedJob,
          ];

    save({
      ...(rawData ?? {}),
      jobs:
        updatedJobs,
    });

    setSelectedJobId(
      updatedJob.id
    );

    setJobEditor(
      null
    );

    setToast(
      "✅ Job saved"
    );
  }

  /* =======================================================
     DELETE JOB
  ======================================================= */

  function handleDeleteJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job? Existing work-hour records will be kept."
      )
    ) {
      return;
    }

    const updatedJobs =
      jobs.filter(
        job =>
          job.id !==
          jobId
      );

    save({
      ...(rawData ?? {}),
      jobs:
        updatedJobs,
    });

    setSelectedJobId(
      updatedJobs[0]?.id ??
        ""
    );

    setToast(
      "🗑 Job removed"
    );
  }

  /* =======================================================
     ADD SHIFT
  ======================================================= */

  function handleAddShift(
    shift
  ) {
    if (
      !selectedJob
    ) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * We store the shift using the pay period that it
     * belongs to TODAY, based on its date.
     *
     * This means if the user enters Aug 17,
     * it will NOT be placed inside the Aug 1–14
     * paycheck.
     */
    const period =
      findPayPeriodForDate(
        selectedJob,
        shift.date
      );

    if (
      !period
    ) {
      setToast(
        "⚠️ This date does not fall inside a configured pay period. Check the job's pay schedule."
      );

      return;
    }

    const key =
      `${selectedJob.id}|${period.start}|${period.end}`;

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

    /*
     * Automatically navigate to the paycheck
     * that owns the shift.
     */
    setSelectedPeriodId(
      period.id
    );

    setToast(
      `✅ Shift added to ${formatDate(
        period.start
      )} – ${formatDate(
        period.end
      )} paycheck`
    );
  }

  /* =======================================================
     DELETE SHIFT
  ======================================================= */

  function handleDeleteShift(
    shift
  ) {
    const period =
      findPayPeriodForDate(
        selectedJob,
        shift.date
      );

    if (
      !period
    ) {
      return;
    }

    const key =
      `${selectedJob.id}|${period.start}|${period.end}`;

    const current =
      (
        shifts[key] ??
        []
      ).filter(
        item =>
          item.id !==
          shift.id
      );

    save({
      ...(rawData ?? {}),

      shifts: {
        ...shifts,

        [key]:
          current,
      },
    });

    setToast(
      "🗑 Work hours removed"
    );
  }

  /* =======================================================
     SAVE ACTUAL PAY
  ======================================================= */

  function handleSaveActualPay(
    event
  ) {
    if (
      !selectedJob ||
      !selectedPeriod
    ) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget
      );

    const netPay =
      numberOrZero(
        form.get(
          "actualNet"
        )
      );

    const grossPay =
      numberOrZero(
        form.get(
          "actualGross"
        )
      );

    const federalTax =
      numberOrZero(
        form.get(
          "federalTax"
        )
      );

    const cpp =
      numberOrZero(
        form.get(
          "cpp"
        )
      );

    const ei =
      numberOrZero(
        form.get(
          "ei"
        )
      );

    const otherDeductions =
      numberOrZero(
        form.get(
          "otherDeductions"
        )
      );

    const updatedActual = {
      payPeriodStart:
        selectedPeriod.start,

      payPeriodEnd:
        selectedPeriod.end,

      payday:
        selectedPeriod.payday,

      person:
        selectedJob.person,

      employer:
        selectedJob.employer,

      jobId:
        selectedJob.id,

      actualGross:
        grossPay,

      federalTax,

      cpp,

      ei,

      otherDeductions,

      netPay,

      enteredAt:
        new Date().toISOString(),
    };

    save({
      ...(rawData ?? {}),

      actualPaychecks: {
        ...actualPaychecks,

        [actualKey]:
          updatedActual,
      },
    });

    setToast(
      "✅ Actual paycheck saved"
    );
  }

  /* =======================================================
     PAY PERIOD DISPLAY
  ======================================================= */

  function selectPreviousPeriod() {
    if (
      !selectedPeriod
    ) {
      return;
    }

    const index =
      periods.findIndex(
        period =>
          period.id ===
          selectedPeriod.id
      );

    if (
      index > 0
    ) {
      setSelectedPeriodId(
        periods[
          index - 1
        ].id
      );
    }
  }

  function selectNextPeriod() {
    if (
      !selectedPeriod
    ) {
      return;
    }

    const index =
      periods.findIndex(
        period =>
          period.id ===
          selectedPeriod.id
      );

    if (
      index >= 0 &&
      index <
        periods.length - 1
    ) {
      setSelectedPeriodId(
        periods[
          index + 1
        ].id
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          background:
            "#fdf6f8",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          color:
            "#9b6b8a",
          fontFamily:
            "'DM Sans', sans-serif",
        }}
      >
        Loading income…
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "var(--color-bg, #fdf6f8)",

        color:
          "var(--color-text, #3a2430)",

        fontFamily:
          "var(--font-body, 'DM Sans', sans-serif)",

        paddingBottom:
          100,
      }}
    >
      <div
        style={{
          maxWidth:
            700,
          margin:
            "0 auto",
          padding:
            14,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          style={{
            padding:
              "28px 0 15px",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
          }}
        >
          <div>
            <div
              style={{
                fontSize:
                  10,
                fontWeight:
                  800,
                color:
                  "#9b6b8a",
                letterSpacing:
                  ".12em",
                textTransform:
                  "uppercase",
              }}
            >
              Salary
            </div>

            <h1
              style={{
                margin:
                  "4px 0 0",
                fontFamily:
                  "var(--font-display, 'Playfair Display', serif)",
                fontSize:
                  28,
                lineHeight:
                  1.1,
              }}
            >
              Income & Work Hours
            </h1>

            <p
              style={{
                margin:
                  "6px 0 0",
                fontSize:
                  11,
                color:
                  "#9b6b8a",
              }}
            >
              Enter work once. Budget Blossom assigns
              it to the correct paycheck.
            </p>
          </div>

          {saving && (
            <span
              style={{
                fontSize:
                  10,
                color:
                  "#9b6b8a",
              }}
            >
              Saving…
            </span>
          )}
        </header>

        {error && (
          <div
            style={{
              padding:
                12,
              marginBottom:
                12,
              borderRadius:
                10,
              background:
                "#fff0f2",
              color:
                "#b63d5b",
              fontSize:
                12,
            }}
          >
            {error}
          </div>
        )}

        {/* =================================================
            JOB SELECTOR
        ================================================= */}

        <section
          style={{
            background:
              "#fff",
            border:
              "1px solid #f0dbe4",
            borderRadius:
              14,
            padding:
              14,
            marginBottom:
              12,
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                8,
            }}
          >
            <div
              style={{
                fontSize:
                  10,
                fontWeight:
                  800,
                color:
                  "#9b6b8a",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".08em",
              }}
            >
              Income Source / Job
            </div>

            <Button
              secondary
              onClick={() =>
                setJobEditor(
                  "new"
                )
              }
            >
              + New Job
            </Button>
          </div>

          <select
            value={
              selectedJobId
            }
            onChange={e => {
              setSelectedJobId(
                e.target.value
              );

              setSelectedPeriodId(
                ""
              );
            }}
            style={{
              ...inputStyle,
              fontWeight:
                700,
            }}
          >
            {jobs.map(
              job => (
                <option
                  key={
                    job.id
                  }
                  value={
                    job.id
                  }
                >
                  {job.person} —{" "}
                  {job.employer}{" "}
                  ·{" "}
                  {money(
                    job.rate
                  )}
                  /hr
                </option>
              )
            )}
          </select>

          {selectedJob && (
            <div
              style={{
                marginTop:
                  10,
                display:
                  "flex",
                gap: 7,
                flexWrap:
                  "wrap",
              }}
            >
              <Button
                secondary
                onClick={() =>
                  setJobEditor(
                    selectedJob
                  )
                }
              >
                ✏️ Edit Job
              </Button>

              <Button
                danger
                onClick={() =>
                  handleDeleteJob(
                    selectedJob.id
                  )
                }
              >
                Remove Job
              </Button>
            </div>
          )}
        </section>

        {/* =================================================
            PAY SCHEDULE
        ================================================= */}

        {selectedJob && (
          <section
            style={{
              background:
                "#fffaf1",
              border:
                "1px solid #f2dfb5",
              borderRadius:
                14,
              padding:
                14,
              marginBottom:
                12,
            }}
          >
            <div
              style={{
                fontSize:
                  10,
                fontWeight:
                  800,
                color:
                  "#98701f",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".08em",
              }}
            >
              PAY SCHEDULE
            </div>

            {selectedJob.payPeriodStart &&
            selectedJob.payPeriodEnd &&
            selectedJob.payday ? (
              <>
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr 1fr",
                    gap: 8,
                    marginTop:
                      10,
                  }}
                >
                  <div
                    style={{
                      background:
                        "#fff",
                      padding:
                        10,
                      borderRadius:
                        9,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          9,
                        color:
                          "#9b8050",
                      }}
                    >
                      PAY PERIOD START
                    </div>

                    <strong
                      style={{
                        fontSize:
                          12,
                      }}
                    >
                      {formatDate(
                        selectedJob.payPeriodStart
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      background:
                        "#fff",
                      padding:
                        10,
                      borderRadius:
                        9,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          9,
                        color:
                          "#9b8050",
                      }}
                    >
                      PAY PERIOD END
                    </div>

                    <strong
                      style={{
                        fontSize:
                          12,
                      }}
                    >
                      {formatDate(
                        selectedJob.payPeriodEnd
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      background:
                        "#fff",
                      padding:
                        10,
                      borderRadius:
                        9,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          9,
                        color:
                          "#9b8050",
                      }}
                    >
                      PAYDAY
                    </div>

                    <strong
                      style={{
                        fontSize:
                          12,
                        color:
                          "#d23b75",
                      }}
                    >
                      {formatDate(
                        selectedJob.payday
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop:
                      10,
                    padding:
                      "10px 11px",
                    background:
                      "#fff",
                    borderRadius:
                      9,
                    fontSize:
                      11,
                    color:
                      "#765f3c",
                  }}
                >
                  💡 The work period and payday are
                  separate. Work performed during the
                  period is included in the paycheck,
                  and the money arrives on the payday.
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop:
                    10,
                  padding:
                    12,
                  background:
                    "#fff",
                  borderRadius:
                    9,
                  fontSize:
                    11,
                  color:
                    "#765f3c",
                }}
              >
                ⚠️ Set this job's pay period and actual
                payday first. Budget Blossom will not
                guess the payday.
              </div>
            )}
          </section>
        )}

        {/* =================================================
            PAYCHECK NAVIGATION
        ================================================= */}

        {selectedJob &&
          periods.length > 0 && (
            <section
              style={{
                background:
                  "#fff",
                border:
                  "1px solid #f0dbe4",
                borderRadius:
                  14,
                padding:
                  12,
                marginBottom:
                  12,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                  alignItems:
                    "center",
                }}
              >
                <button
                  type="button"
                  onClick={
                    selectPreviousPeriod
                  }
                  style={{
                    width:
                      38,
                    height:
                      38,
                    border:
                      "1px solid #efdbe4",
                    borderRadius:
                      10,
                    background:
                      "#fff",
                    cursor:
                      "pointer",
                  }}
                >
                  ‹
                </button>

                <select
                  value={
                    selectedPeriod?.id ??
                    ""
                  }
                  onChange={e =>
                    setSelectedPeriodId(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    flex: 1,
                    textAlign:
                      "center",
                    fontWeight:
                      700,
                  }}
                >
                  {periods.map(
                    period => (
                      <option
                        key={
                          period.id
                        }
                        value={
                          period.id
                        }
                      >
                        {formatDate(
                          period.start
                        )}{" "}
                        –{" "}
                        {formatDate(
                          period.end
                        )}{" "}
                        · Payday{" "}
                        {formatDate(
                          period.payday
                        )}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={
                    selectNextPeriod
                  }
                  style={{
                    width:
                      38,
                    height:
                      38,
                    border:
                      "1px solid #efdbe4",
                    borderRadius:
                      10,
                    background:
                      "#fff",
                    cursor:
                      "pointer",
                  }}
                >
                  ›
                </button>
              </div>
            </section>
          )}

        {/* =================================================
            WORK HOURS
        ================================================= */}

        {selectedJob && (
          <section
            style={{
              background:
                "#fff",
              border:
                "1px solid #f0dbe4",
              borderRadius:
                14,
              padding:
                14,
              marginBottom:
                12,
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      10,
                    fontWeight:
                      800,
                    color:
                      "#9b6b8a",
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                  }}
                >
                  Work Hours
                </div>

                <div
                  style={{
                    fontSize:
                      11,
                    color:
                      "#9b6b8a",
                    marginTop:
                      3,
                  }}
                >
                  {selectedPeriod
                    ? `${formatDate(
                        selectedPeriod.start
                      )} – ${formatDate(
                        selectedPeriod.end
                      )}`
                    : "Configure your pay schedule"}
                </div>
              </div>
            </div>

            <ShiftForm
              job={
                selectedJob
              }
              onAdd={
                handleAddShift
              }
            />

            <div
              style={{
                marginTop:
                  14,
              }}
            >
              {periodShifts.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      15,
                    background:
                      "#fff8fb",
                    borderRadius:
                      10,
                    textAlign:
                      "center",
                    fontSize:
                      11,
                    color:
                      "#9b6b8a",
                  }}
                >
                  No work hours entered for this
                  pay period yet.
                </div>
              ) : (
                periodShifts.map(
                  shift => {
                    const calculated =
                      calculateShift({
                        ...shift,
                        hourlyRate:
                          shift.hourlyRate ??
                          selectedJob.rate,
                      });

                    return (
                      <div
                        key={
                          shift.id
                        }
                        style={{
                          padding:
                            11,
                          borderTop:
                            "1px solid #f3e1e8",
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight:
                                700,
                              fontSize:
                                12,
                            }}
                          >
                            {formatDate(
                              shift.date
                            )}
                          </div>

                          <div
                            style={{
                              fontSize:
                                11,
                              color:
                                "#9b6b8a",
                            }}
                          >
                            {shift.startTime} –{" "}
                            {shift.endTime}
                            {" · "}
                            {calculated.hours.toFixed(
                              2
                            )}{" "}
                            paid hrs
                          </div>

                          {shift.isStatHoliday && (
                            <div
                              style={{
                                fontSize:
                                  10,
                                color:
                                  "#b77b1d",
                                marginTop:
                                  3,
                              }}
                            >
                              🇨🇦{" "}
                              {shift.holidayName ||
                                "Stat Holiday"}
                            </div>
                          )}

                          {numberOrZero(
                            shift.freezingPremium
                          ) >
                            0 && (
                            <div
                              style={{
                                fontSize:
                                  10,
                                color:
                                  "#71849a",
                                marginTop:
                                  3,
                              }}
                            >
                              ❄️ Freezing premium{" "}
                              {money(
                                shift.freezingPremium
                              )}
                              /hr
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            textAlign:
                              "right",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            {money(
                              calculated.grossPay
                            )}
                          </strong>

                          <div
                            style={{
                              marginTop:
                                5,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteShift(
                                  shift
                                )
                              }
                              style={{
                                border:
                                  "none",
                                background:
                                  "transparent",
                                color:
                                  "#c94d6a",
                                fontSize:
                                  10,
                                cursor:
                                  "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </section>
        )}

        {/* =================================================
            PAYCHECK SUMMARY
        ================================================= */}

        {selectedJob &&
          selectedPeriod && (
            <section
              style={{
                background:
                  "#fff",
                border:
                  "1px solid #f0dbe4",
                borderRadius:
                  14,
                padding:
                  14,
                marginBottom:
                  12,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  marginBottom:
                    12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        10,
                      fontWeight:
                        800,
                      color:
                        "#9b6b8a",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        ".08em",
                    }}
                  >
                    Paycheck
                  </div>

                  <h2
                    style={{
                      margin:
                        "3px 0 0",
                      fontSize:
                        20,
                    }}
                  >
                    {selectedJob.person} —{" "}
                    {selectedJob.employer}
                  </h2>

                  <div
                    style={{
                      fontSize:
                        11,
                      color:
                        "#9b6b8a",
                      marginTop:
                        4,
                    }}
                  >
                    Pay Period:{" "}
                    <strong>
                      {formatDate(
                        selectedPeriod.start
                      )}{" "}
                      –{" "}
                      {formatDate(
                        selectedPeriod.end
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      fontSize:
                        11,
                      color:
                        "#9b6b8a",
                      marginTop:
                        2,
                    }}
                  >
                    Payday:{" "}
                    <strong
                      style={{
                        color:
                          "#d32770",
                      }}
                    >
                      {formatDate(
                        selectedPeriod.payday
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {!payroll ? (
                <div
                  style={{
                    padding:
                      15,
                    background:
                      "#fff8fb",
                    borderRadius:
                      10,
                    fontSize:
                      11,
                    color:
                      "#9b6b8a",
                  }}
                >
                  Add work hours to calculate this
                  paycheck.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap:
                        8,
                      marginBottom:
                        12,
                    }}
                  >
                    {[
                      [
                        "Regular Hours",
                        `${payroll.regularHours.toFixed(
                          2
                        )} hrs`,
                      ],

                      [
                        "Overtime",
                        `${payroll.overtimeHours.toFixed(
                          2
                        )} hrs`,
                      ],

                      [
                        "Holiday Hours",
                        `${payroll.statHours.toFixed(
                          2
                        )} hrs`,
                      ],

                      [
                        "Premium Hours",
                        `${payroll.premiumHours.toFixed(
                          2
                        )} hrs`,
                      ],

                      [
                        "Freezing Premium",
                        money(
                          payroll.freezingPremiumPay
                        ),
                      ],

                      [
                        "Evening Premium",
                        money(
                          payroll.eveningPremiumPay
                        ),
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={
                            label
                          }
                          style={{
                            background:
                              "#fff8fb",
                            padding:
                              10,
                            borderRadius:
                              9,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                9,
                              color:
                                "#9b6b8a",
                            }}
                          >
                            {label}
                          </div>

                          <strong
                            style={{
                              fontSize:
                                13,
                            }}
                          >
                            {value}
                          </strong>
                        </div>
                      )
                    )}
                  </div>

                  {/* PAYSTUB */}

                  <div
                    style={{
                      borderTop:
                        "1px solid #f0dbe4",
                      paddingTop:
                        12,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          10,
                        fontWeight:
                          800,
                        color:
                          "#9b6b8a",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".08em",
                        marginBottom:
                          8,
                      }}
                    >
                      Earnings
                    </div>

                    {[
                      [
                        "Regular",
                        payroll.regularPay,
                      ],

                      [
                        "Overtime",
                        payroll.overtimePay,
                      ],

                      [
                        "Stat Holiday",
                        payroll.statPay,
                      ],

                      [
                        "Freezing Premium",
                        payroll.freezingPremiumPay,
                      ],

                      [
                        "Evening Premium",
                        payroll.eveningPremiumPay,
                      ],

                      [
                        "Training",
                        payroll.trainingPay,
                      ],

                      [
                        "Vacation Pay",
                        payroll.vacationPay,
                      ],

                      [
                        "Bonus",
                        payroll.bonus,
                      ],

                      [
                        "Other",
                        payroll.otherEarnings,
                      ],
                    ]
                      .filter(
                        ([
                          ,
                          value,
                        ]) =>
                          numberOrZero(
                            value
                          ) !== 0
                      )
                      .map(
                        ([
                          label,
                          value,
                        ]) => (
                          <div
                            key={
                              label
                            }
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              padding:
                                "5px 0",
                              fontSize:
                                12,
                            }}
                          >
                            <span>
                              {label}
                            </span>

                            <strong>
                              {money(
                                value
                              )}
                            </strong>
                          </div>
                        )
                      )}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        paddingTop:
                          9,
                        marginTop:
                          4,
                        borderTop:
                          "1px solid #f0dbe4",
                        fontWeight:
                          800,
                      }}
                    >
                      <span>
                        GROSS PAY
                      </span>

                      <span>
                        {money(
                          estimatedGross
                        )}
                      </span>
                    </div>
                  </div>

                  {/* DEDUCTIONS */}

                  <div
                    style={{
                      borderTop:
                        "1px solid #f0dbe4",
                      marginTop:
                        12,
                      paddingTop:
                        12,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          10,
                        fontWeight:
                          800,
                        color:
                          "#9b6b8a",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".08em",
                        marginBottom:
                          8,
                      }}
                    >
                      Estimated Deductions
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontSize:
                          12,
                      }}
                    >
                      <span>
                        Estimated deductions (
                        {numberOrZero(
                          selectedJob.deductionPercent ??
                            selectedJob.ded ??
                            0
                        )}
                        %)
                      </span>

                      <strong>
                        −
                        {money(
                          estimatedDeductions
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        paddingTop:
                          10,
                        marginTop:
                          7,
                        borderTop:
                          "1px solid #f0dbe4",
                        fontWeight:
                          800,
                      }}
                    >
                      <span>
                        ESTIMATED NET PAY
                      </span>

                      <span
                        style={{
                          fontSize:
                            18,
                          color:
                            "#d32770",
                        }}
                      >
                        {money(
                          estimatedNet
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ACTUAL */}

                  <div
                    style={{
                      marginTop:
                        14,
                      padding:
                        13,
                      background:
                        "#f7fbf9",
                      border:
                        "1px solid #d9eee2",
                      borderRadius:
                        11,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          10,
                        fontWeight:
                          800,
                        color:
                          "#5a876b",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".08em",
                        marginBottom:
                          8,
                      }}
                    >
                      Actual Paycheck
                    </div>

                    <form
                      onSubmit={
                        handleSaveActualPay
                      }
                    >
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap:
                            8,
                        }}
                      >
                        <div>
                          <Label>
                            Actual Gross
                          </Label>

                          <input
                            name="actualGross"
                            type="number"
                            step="0.01"
                            defaultValue={
                              actual?.actualGross ??
                              ""
                            }
                            placeholder="0.00"
                            style={
                              inputStyle
                            }
                          />
                        </div>

                        <div>
                          <Label>
                            Actual Net Pay
                          </Label>

                          <input
                            name="actualNet"
                            type="number"
                            step="0.01"
                            defaultValue={
                              actual?.netPay ??
                              ""
                            }
                            placeholder="0.00"
                            style={
                              inputStyle
                            }
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1fr 1fr 1fr 1fr",
                          gap:
                            6,
                          marginTop:
                            8,
                        }}
                      >
                        <input
                          name="federalTax"
                          type="number"
                          step="0.01"
                          placeholder="Federal"
                          defaultValue={
                            actual?.federalTax ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        />

                        <input
                          name="cpp"
                          type="number"
                          step="0.01"
                          placeholder="CPP"
                          defaultValue={
                            actual?.cpp ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        />

                        <input
                          name="ei"
                          type="number"
                          step="0.01"
                          placeholder="EI"
                          defaultValue={
                            actual?.ei ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        />

                        <input
                          name="otherDeductions"
                          type="number"
                          step="0.01"
                          placeholder="Other"
                          defaultValue={
                            actual?.otherDeductions ??
                            ""
                          }
                          style={
                            inputStyle
                          }
                        />
                      </div>

                      <div
                        style={{
                          marginTop:
                            9,
                        }}
                      >
                        <Button>
                          Save Actual Paycheck
                        </Button>
                      </div>
                    </form>

                    {actual && (
                      <div
                        style={{
                          marginTop:
                            12,
                          paddingTop:
                            10,
                          borderTop:
                            "1px solid #d9eee2",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            fontSize:
                              12,
                          }}
                        >
                          <span>
                            Estimated Net
                          </span>

                          <strong>
                            {money(
                              estimatedNet
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            fontSize:
                              12,
                            marginTop:
                              4,
                          }}
                        >
                          <span>
                            Actual Net
                          </span>

                          <strong>
                            {money(
                              actualNet
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            marginTop:
                              8,
                            paddingTop:
                              8,
                            borderTop:
                              "1px solid #d9eee2",
                            fontWeight:
                              800,
                          }}
                        >
                          <span>
                            Difference
                          </span>

                          <span
                            style={{
                              color:
                                difference ===
                                0
                                  ? "#4c8b65"
                                  : "#c27635",
                            }}
                          >
                            {difference >=
                            0
                              ? "+"
                              : ""}
                            {money(
                              difference
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

        {/* =================================================
            TOAST
        ================================================= */}

        {toast && (
          <div
            style={{
              position:
                "fixed",
              left:
                "50%",
              bottom:
                85,
              transform:
                "translateX(-50%)",
              background:
                "#241a29",
              color:
                "#fff",
              padding:
                "10px 14px",
              borderRadius:
                10,
              fontSize:
                11,
              zIndex:
                1200,
              boxShadow:
                "0 8px 25px rgba(0,0,0,.2)",
              maxWidth:
                "90vw",
              textAlign:
                "center",
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* =================================================
          JOB EDITOR MODAL
      ================================================= */}

      {jobEditor && (
        <JobEditor
          job={
            jobEditor ===
            "new"
              ? null
              : jobEditor
          }
          onSave={
            handleSaveJob
          }
          onClose={() =>
            setJobEditor(
              null
            )
          }
        />
      )}
    </div>
  );
}
