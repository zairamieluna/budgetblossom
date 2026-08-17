/**
 * Budget Blossom
 *
 * Income.jsx
 *
 * MAIN INCOME + WORK HOURS + PAYROLL SYSTEM
 *
 * FLOW:
 *
 * Work Hours
 *     ↓
 * Pay Period
 *     ↓
 * Payroll Calculation
 *     ↓
 * Calculated Estimated Pay
 *     ↓
 * User Expected Salary
 *     ↓
 * Actual Paycheck
 *     ↓
 * Budget Pool
 *
 * IMPORTANT:
 *
 * PAY PERIOD AND PAYDAY ARE SEPARATE.
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
 * Existing Supabase structure preserved:
 *
 * user_data.data
 *   jobs
 *   shifts
 *   sent
 *   actualPaychecks
 *   paycheckEstimates
 *   calendarEvents
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

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    breakMinutes: 30,

    province: "Ontario",

    active: true,

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

    freezingPremium: 0,
    eveningPremium: 0,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    breakMinutes: 30,

    province: "Ontario",

    active: true,

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

    /*
     * ENTER THE ACTUAL PREMIUM IN THE JOB EDITOR.
     *
     * These are HOURLY amounts.
     *
     * Example:
     * Freezer premium = $0.70/hr
     */
    freezingPremium: 0,
    eveningPremium: 0,

    payFrequency: "biweekly",

    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",

    breakMinutes: 30,

    province: "Ontario",

    active: true,

    color: 2,
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
  )
    .format(
      numberOrZero(value)
    )
    .replace("CA$", "$");
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

  return dateString(date);
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
  return (
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  );
}


function roundMoney(
  value
) {
  return Math.round(
    (
      numberOrZero(value) +
      Number.EPSILON
    ) *
      100
  ) / 100;
}


/* =========================================================
   CANADIAN / ONTARIO HOLIDAYS
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
    (
      19 * a +
      b -
      d -
      g +
      15
    ) %
    30;

  const i =
    Math.floor(
      c / 4
    );

  const k =
    c % 4;

  const l =
    (
      32 +
      2 * e +
      2 * i -
      h -
      k
    ) %
    7;

  const m =
    Math.floor(
      (
        a +
        11 * h +
        22 * l
      ) /
        451
    );

  const month =
    Math.floor(
      (
        h +
        l -
        7 * m +
        114
      ) /
        31
    );

  const day =
    (
      (
        h +
        l -
        7 * m +
        114
      ) %
        31
    ) + 1;

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
        dateString(date),
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

  add(
    new Date(
      year,
      1,
      16
    ),
    "Family Day (ON)"
  );

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
      4,
      18
    ),
    "Victoria Day"
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
   * Civic Holiday.
   * First Monday in August.
   */
  const civic =
    new Date(
      year,
      7,
      1
    );

  while (
    civic.getDay() !== 1
  ) {
    civic.setDate(
      civic.getDate() + 1
    );
  }

  add(
    civic,
    "Civic Holiday (ON)"
  );

  /*
   * Labour Day.
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
      labour.getDate() + 1
    );
  }

  add(
    labour,
    "Labour Day"
  );

  add(
    new Date(
      year,
      9,
      12
    ),
    "Thanksgiving"
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
  value
) {
  if (!value) {
    return null;
  }

  const year =
    Number(
      value.slice(0, 4)
    );

  return (
    canadaHolidays(
      year
    ).find(
      item =>
        item.date ===
        value
    ) ??
    null
  );
}


/* =========================================================
   PAY PERIOD GENERATION
========================================================= */

/*
 * IMPORTANT:
 *
 * The user defines the anchor:
 *
 * Period start
 * Period end
 * Payday
 *
 * Example:
 *
 * July 20 – August 2
 * Payday August 7
 *
 * Therefore:
 *
 * payday offset = 5 days after period end
 *
 * The next period becomes:
 *
 * August 3 – August 16
 * Payday August 21
 *
 * No universal payday is hard-coded.
 */

function buildPayPeriodsForJob(
  job,
  count = 16
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
      duration + 1;
  } else {
    /*
     * Biweekly:
     *
     * 14-day period
     */
    periodLength =
      duration + 1;
  }

  const paydayOffset =
    daysBetween(
      end,
      payday
    );

  const periods = [];

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

      start:
        periodStart,

      end:
        periodEnd,

      payday:
        periodPayday,

      label:
        `${formatDate(
          periodStart
        )} – ${formatDate(
          periodEnd
        )} · Payday ${formatDate(
          periodPayday
        )}`,
    });
  }

  return periods;
}


/* =========================================================
   INPUT STYLES
========================================================= */

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding:
    "10px 11px",
  border:
    "1px solid #efd8e2",
  borderRadius:
    "10px",
  background:
    "#fff",
  color:
    "#3a2430",
  fontSize:
    "13px",
  outline:
    "none",
};


function Label({
  children,
}) {
  return (
    <label
      style={{
        display:
          "block",
        fontSize:
          "10px",
        fontWeight:
          800,
        color:
          "#9b6b8a",
        textTransform:
          "uppercase",
        letterSpacing:
          ".07em",
        marginBottom:
          5,
      }}
    >
      {children}
    </label>
  );
}


function Button({
  children,
  onClick,
  secondary = false,
  danger = false,
  disabled = false,
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        border:
          secondary
            ? "1px solid #efd8e2"
            : "none",

        background:
          danger
            ? "#fff0f3"
            : secondary
            ? "#fff"
            : "#db2777",

        color:
          danger
            ? "#c94d6a"
            : secondary
            ? "#8f6a7c"
            : "#fff",

        padding:
          "10px 13px",

        borderRadius:
          "10px",

        fontSize:
          "12px",

        fontWeight:
          800,

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

      person:
        "Zai",

      title:
        "",

      employer:
        "",

      rate:
        0,

      otRate:
        0,

      overtimeThreshold:
        44,

      overtimeMultiplier:
        1.5,

      vacationPercent:
        0,

      deductionPercent:
        15,

      ded:
        15,

      statMultiplier:
        1.5,

      freezingPremium:
        0,

      eveningPremium:
        0,

      payFrequency:
        "biweekly",

      payPeriodStart:
        "",

      payPeriodEnd:
        "",

      payday:
        "",

      breakMinutes:
        30,

      province:
        "Ontario",

      active:
        true,

      color:
        0,
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

      active:
        form.active !==
        false,
    });
  }

  return (
    <section
      style={{
        background:
          "#fff",

        border:
          "1px solid #efd8e2",

        borderRadius:
          "14px",

        padding:
          "14px",

        marginBottom:
          "12px",

        boxShadow:
          "0 4px 18px rgba(73,28,54,.06)",
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
            "12px",
        }}
      >
        <strong>
          {job
            ? "Edit Job"
            : "New Job / Employer"}
        </strong>

        <button
          type="button"
          onClick={onClose}
          style={{
            border:
              "none",
            background:
              "transparent",
            fontSize:
              "20px",
            cursor:
              "pointer",
            color:
              "#9b6b8a",
          }}
        >
          ×
        </button>
      </div>


      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap:
            "10px",
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
            placeholder="Equipment Operator"
            style={
              inputStyle
            }
          />
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
            placeholder="Employer name"
            style={
              inputStyle
            }
          />
        </div>


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
            min="0"
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


        <div>
          <Label>
            OT Threshold / Week
          </Label>

          <input
            type="number"
            min="0"
            step="0.1"
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
            Stat Multiplier
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
            Deduction Estimate %
          </Label>

          <input
            type="number"
            min="0"
            step="0.1"
            value={
              form.deductionPercent ??
              form.ded
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


        <div>
          <Label>
            Freezer Premium $ / Hour
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
            placeholder="0.70"
            style={
              inputStyle
            }
          />
        </div>


        <div>
          <Label>
            Evening Premium $ / Hour
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
            placeholder="0.70"
            style={
              inputStyle
            }
          />
        </div>


        <div>
          <Label>
            Default Unpaid Break
          </Label>

          <input
            type="number"
            min="0"
            step="1"
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

            <option value="monthly">
              Monthly
            </option>
          </select>
        </div>
      </div>


      <div
        style={{
          marginTop:
            "14px",

          padding:
            "12px",

          background:
            "#fffaf1",

          border:
            "1px solid #f2dfb5",

          borderRadius:
            "10px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            fontWeight:
              800,

            color:
              "#98701f",

            textTransform:
              "uppercase",

            marginBottom:
              "9px",
          }}
        >
          PAY SCHEDULE
        </div>

        <div
          style={{
            fontSize:
              "11px",

            color:
              "#765f3c",

            marginBottom:
              "10px",
          }}
        >
          Enter the actual relationship between the
          work period and payday. Budget Blossom will
          use this relationship to create future periods.
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1fr 1fr 1fr",

            gap:
              "8px",
          }}
        >
          <div>
            <Label>
              Period Start
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
              Period End
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

          <div>
            <Label>
              Payday
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
        </div>

        <div
          style={{
            marginTop:
              "9px",

            fontSize:
              "10px",

            color:
              "#98701f",
          }}
        >
          Example: Jul 20–Aug 2 → Aug 7.
          The next biweekly period will be Aug 3–Aug
          16 → Aug 21.
        </div>
      </div>


      <div
        style={{
          marginTop:
            "14px",

          display:
            "flex",

          gap:
            "8px",
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
            flex:
              1,
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
    </section>
  );
}


/* =========================================================
   PAYROLL CALCULATION
========================================================= */

/*
 * We calculate the paycheck here so the premium fields
 * are treated correctly as HOURLY premiums.
 *
 * Example:
 *
 * 8 hours
 * $21 base
 * $0.70 freezer premium
 *
 * = 8 × ($21 + $0.70)
 * = $173.60
 */

function calculatePayroll(
  shifts,
  job
) {
  if (
    !shifts ||
    shifts.length === 0
  ) {
    return null;
  }

  let regularHours = 0;
  let overtimeHours = 0;
  let statHours = 0;
  let premiumHours = 0;
  let trainingHours = 0;

  let regularPay = 0;
  let overtimePay = 0;
  let statPay = 0;

  let freezingPremiumPay = 0;
  let eveningPremiumPay = 0;

  let trainingPay = 0;
  let bonus = 0;
  let otherEarnings = 0;

  const threshold =
    Math.max(
      0,
      numberOrZero(
        job.overtimeThreshold
      ) || 44
    );

  const otMultiplier =
    numberOrZero(
      job.overtimeMultiplier
    ) || 1.5;

  let cumulativeRegular =
    0;

  /*
   * Sort by date so overtime is calculated in
   * chronological order.
   */
  const ordered =
    [...shifts].sort(
      (a, b) =>
        String(
          a.date
        ).localeCompare(
          String(b.date)
        )
    );

  ordered.forEach(
    shift => {
      const start =
        shift.startTime ??
        shift.inT;

      const end =
        shift.endTime ??
        shift.outT;

      const breakMinutes =
        numberOrZero(
          shift.unpaidBreakMinutes ??
          shift.brk
        );

      const rate =
        numberOrZero(
          shift.hourlyRate ??
          shift.rate ??
          job.rate
        );

      /*
       * calculateShift() is used for the paid-hour
       * calculation.
       */
      const calculated =
        calculateShift({
          date:
            shift.date,

          startTime:
            start,

          endTime:
            end,

          unpaidBreakMinutes:
            breakMinutes,

          hourlyRate:
            rate,

          overtimeThreshold:
            threshold,

          overtimeMultiplier:
            otMultiplier,

          isStatHoliday:
            Boolean(
              shift.isStatHoliday
            ),

          statMultiplier:
            numberOrZero(
              shift.statMultiplier
            ) || 1,

          freezingPremium:
            0,

          eveningPremium:
            0,

          trainingHours:
            numberOrZero(
              shift.trainingHours
            ),

          bonus:
            numberOrZero(
              shift.bonus
            ),

          otherEarnings:
            numberOrZero(
              shift.otherEarnings
            ),
        });

      const hours =
        numberOrZero(
          calculated.hours
        );

      const isStat =
        Boolean(
          shift.isStatHoliday
        );

      let shiftRegular =
        0;

      let shiftOT =
        0;

      /*
       * Stat holiday hours are not counted toward
       * the regular-hour overtime threshold here.
       */
      if (isStat) {
        statHours += hours;

        const statMultiplier =
          numberOrZero(
            shift.statMultiplier
          ) || 1;

        statPay +=
          hours *
          rate *
          statMultiplier;
      } else {
        const remaining =
          Math.max(
            0,
            threshold -
              cumulativeRegular
          );

        shiftRegular =
          Math.min(
            hours,
            remaining
          );

        shiftOT =
          Math.max(
            0,
            hours -
              shiftRegular
          );

        regularHours +=
          shiftRegular;

        overtimeHours +=
          shiftOT;

        regularPay +=
          shiftRegular *
          rate;

        overtimePay +=
          shiftOT *
          rate *
          (
            numberOrZero(
              shift.overtimeMultiplier
            ) ||
              otMultiplier
          );

        cumulativeRegular +=
          shiftRegular;
      }

      /*
       * HOURLY PREMIUMS
       */
      const freezer =
        numberOrZero(
          shift.freezingPremium ??
          job.freezingPremium
        );

      const evening =
        numberOrZero(
          shift.eveningPremium ??
          job.eveningPremium
        );

      if (
        freezer > 0
      ) {
        freezingPremiumPay +=
          hours *
          freezer;

        premiumHours +=
          hours;
      }

      if (
        evening > 0
      ) {
        eveningPremiumPay +=
          hours *
          evening;

        if (
          freezer <= 0
        ) {
          premiumHours +=
            hours;
        }
      }

      /*
       * Training
       */
      const training =
        Math.min(
          hours,
          Math.max(
            0,
            numberOrZero(
              shift.trainingHours
            )
          )
        );

      trainingHours +=
        training;

      trainingPay +=
        training *
        rate;

      /*
       * Other earnings
       */
      bonus +=
        numberOrZero(
          shift.bonus
        );

      otherEarnings +=
        numberOrZero(
          shift.otherEarnings
        );
    }
  );

  /*
   * Vacation pay is configured as a percentage.
   */
  const vacationPercent =
    numberOrZero(
      job.vacationPercent
    ) / 100;

  const baseGross =
    regularPay +
    overtimePay +
    statPay +
    freezingPremiumPay +
    eveningPremiumPay +
    trainingPay +
    bonus +
    otherEarnings;

  const vacationPay =
    baseGross *
    vacationPercent;

  const grossPay =
    baseGross +
    vacationPay;

  /*
   * Deductions are ESTIMATES only.
   */
  const deductionPercent =
    numberOrZero(
      job.deductionPercent ??
      job.ded
    ) / 100;

  const estimatedDeductions =
    grossPay *
    deductionPercent;

  const estimatedNet =
    grossPay -
    estimatedDeductions;

  return {
    regularHours:
      regularHours,

    overtimeHours:
      overtimeHours,

    statHours:
      statHours,

    premiumHours:
      premiumHours,

    trainingHours:
      trainingHours,

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

    freezingPremiumPay:
      roundMoney(
        freezingPremiumPay
      ),

    eveningPremiumPay:
      roundMoney(
        eveningPremiumPay
      ),

    premiumPay:
      roundMoney(
        freezingPremiumPay +
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
        bonus
      ),

    otherEarnings:
      roundMoney(
        otherEarnings
      ),

    grossPay:
      roundMoney(
        grossPay
      ),

    estimatedDeductions:
      roundMoney(
        estimatedDeductions
      ),

    estimatedNet:
      roundMoney(
        estimatedNet
      ),
  };
}


/* =========================================================
   SHIFT FORM
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
    start,
    setStart,
  ] = useState(
    "09:00"
  );

  const [
    end,
    setEnd,
  ] = useState(
    "17:00"
  );

  const [
    breakMinutes,
    setBreakMinutes,
  ] = useState(
    String(
      job.breakMinutes ??
      30
    )
  );

  const [
    type,
    setType,
  ] = useState(
    "regular"
  );

  const [
    freezer,
    setFreezer,
  ] = useState(
    String(
      job.freezingPremium ??
      ""
    )
  );

  const [
    evening,
    setEvening,
  ] = useState(
    String(
      job.eveningPremium ??
      ""
    )
  );

  const [
    trainingHours,
    setTrainingHours,
  ] = useState(
    ""
  );

  const [
    bonus,
    setBonus,
  ] = useState(
    ""
  );

  const [
    other,
    setOther,
  ] = useState(
    ""
  );

  const [
    notes,
    setNotes,
  ] = useState(
    ""
  );

  const holiday =
    getHoliday(date);

  const paidHours =
    calculateShift({
      date,
      startTime:
        start,
      endTime:
        end,
      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),
      hourlyRate:
        numberOrZero(
          job.rate
        ),
      isStatHoliday:
        type ===
          "stat_1x" ||
        type ===
          "stat_1_5x" ||
        type ===
          "stat_2x" ||
        type ===
          "holiday_ot_2x",
      statMultiplier:
        type ===
        "stat_2x"
          ? 2
          : type ===
            "stat_1_5x"
          ? 1.5
          : 1,
    }).hours;

  function submit(
    event
  ) {
    event.preventDefault();

    if (
      !date ||
      !start ||
      !end
    ) {
      return;
    }

    let isStatHoliday =
      false;

    let statMultiplier =
      1;

    if (
      type ===
      "stat_1x"
    ) {
      isStatHoliday =
        true;

      statMultiplier =
        1;
    }

    if (
      type ===
      "stat_1_5x"
    ) {
      isStatHoliday =
        true;

      statMultiplier =
        1.5;
    }

    if (
      type ===
      "stat_2x"
    ) {
      isStatHoliday =
        true;

      statMultiplier =
        2;
    }

    if (
      type ===
      "holiday_ot_2x"
    ) {
      isStatHoliday =
        true;

      statMultiplier =
        2;
    }

    onAdd({
      id:
        makeId(
          "shift"
        ),

      date,

      startTime:
        start,

      endTime:
        end,

      unpaidBreakMinutes:
        numberOrZero(
          breakMinutes
        ),

      hourlyRate:
        numberOrZero(
          job.rate
        ),

      type,

      isStatHoliday,

      statMultiplier,

      freezingPremium:
        numberOrZero(
          freezer
        ),

      eveningPremium:
        numberOrZero(
          evening
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
          other
        ),

      notes,
    });

    setNotes("");
    setBonus("");
    setOther("");
    setTrainingHours("");
  }

  return (
    <form
      onSubmit={
        submit
      }
      style={{
        background:
          "#fff",

        border:
          "1px solid #f0dbe4",

        borderRadius:
          "12px",

        padding:
          "12px",

        marginBottom:
          "12px",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",

          fontWeight:
            800,

          color:
            "#9b6b8a",

          textTransform:
            "uppercase",

          letterSpacing:
            ".08em",

          marginBottom:
            "10px",
        }}
      >
        ADD WORK HOURS
      </div>


      {holiday && (
        <div
          style={{
            padding:
              "9px 10px",

            background:
              "#fff8e8",

            border:
              "1px solid #efd58d",

            borderRadius:
              "9px",

            marginBottom:
              "10px",

            fontSize:
              "11px",

            color:
              "#89691b",
          }}
        >
          🎉 Holiday detected:
          {" "}
          <strong>
            {holiday.name}
          </strong>

          <div
            style={{
              marginTop:
                "3px",
            }}
          >
            Select the employer's applicable pay
            treatment below.
          </div>
        </div>
      )}


      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "1fr 1fr 1fr",

          gap:
            "8px",
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

        <div>
          <Label>
            Start
          </Label>

          <input
            type="time"
            value={
              start
            }
            onChange={e =>
              setStart(
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
              end
            }
            onChange={e =>
              setEnd(
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

          gap:
            "8px",

          marginTop:
            "8px",
        }}
      >
        <div>
          <Label>
            Break (minutes)
          </Label>

          <input
            type="number"
            min="0"
            step="1"
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

        <div>
          <Label>
            Pay Type
          </Label>

          <select
            value={
              type
            }
            onChange={e =>
              setType(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="regular">
              Regular
            </option>

            <option value="overtime">
              Overtime
            </option>

            <option value="stat_1x">
              Stat Holiday 1.0×
            </option>

            <option value="stat_1_5x">
              Stat Holiday 1.5×
            </option>

            <option value="stat_2x">
              Stat Holiday 2.0×
            </option>

            <option value="holiday_ot_2x">
              Holiday OT 2.0×
            </option>

            <option value="training">
              Training
            </option>

            <option value="vacation">
              Vacation Pay
            </option>

            <option value="premium">
              Premium
            </option>
          </select>
        </div>
      </div>


      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "1fr 1fr",

          gap:
            "8px",

          marginTop:
            "8px",
        }}
      >
        <div>
          <Label>
            Freezer Premium $ / Hour
          </Label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              freezer
            }
            onChange={e =>
              setFreezer(
                e.target.value
              )
            }
            placeholder={
              String(
                job.freezingPremium ??
                0
              )
            }
            style={
              inputStyle
            }
          />
        </div>

        <div>
          <Label>
            Evening Premium $ / Hour
          </Label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              evening
            }
            onChange={e =>
              setEvening(
                e.target.value
              )
            }
            placeholder={
              String(
                job.eveningPremium ??
                0
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
            "1fr 1fr 1fr",

          gap:
            "8px",

          marginTop:
            "8px",
        }}
      >
        <div>
          <Label>
            Training Hours
          </Label>

          <input
            type="number"
            min="0"
            step="0.01"
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
            Other
          </Label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              other
            }
            onChange={e =>
              setOther(
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
            "8px",
        }}
      >
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


      <div
        style={{
          marginTop:
            "10px",

          padding:
            "9px 10px",

          background:
            "#fff8fb",

          borderRadius:
            "9px",

          fontSize:
            "11px",

          color:
            "#765f3c",
        }}
      >
        Paid hours:
        {" "}
        <strong>
          {paidHours.toFixed(
            2
          )}
        </strong>
      </div>


      <button
        type="submit"
        style={{
          width:
            "100%",

          marginTop:
            "10px",

          padding:
            "11px",

          border:
            "none",

          borderRadius:
            "9px",

          background:
            "#db2777",

          color:
            "#fff",

          fontWeight:
            800,

          cursor:
            "pointer",
        }}
      >
        + Add Work Hours
      </button>
    </form>
  );
}


/* =========================================================
   PAYCHECK CARD
========================================================= */

function PaycheckCard({
  job,
  period,
  shifts,
  payroll,
  expectedSalary,
  setExpectedSalary,
  actual,
  onSaveExpected,
  onSaveActual,
  onSendToPool,
}) {
  const calculatedNet =
    payroll?.estimatedNet ??
    0;

  const expected =
    numberOrZero(
      expectedSalary
    );

  const expectedDifference =
    expectedSalary === ""
      ? null
      : roundMoney(
          expected -
            calculatedNet
        );

  const actualNet =
    numberOrZero(
      actual?.actualNet
    );

  const actualDifference =
    actual?.actualNet !=
    null
      ? roundMoney(
          actualNet -
            calculatedNet
        )
      : null;

  return (
    <section
      style={{
        background:
          "#fff",

        border:
          "1px solid #efd8e2",

        borderRadius:
          "14px",

        padding:
          "14px",

        marginBottom:
          "12px",

        boxShadow:
          "0 4px 18px rgba(73,28,54,.05)",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap:
            "10px",

          alignItems:
            "flex-start",

          marginBottom:
            "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize:
                "10px",

              color:
                "#9b6b8a",

              fontWeight:
                800,

              textTransform:
                "uppercase",
            }}
          >
            PAYCHECK
          </div>

          <div
            style={{
              fontSize:
                "17px",

              fontWeight:
                800,

              marginTop:
                "3px",
            }}
          >
            {job.person}
            {" — "}
            {job.title}
          </div>

          <div
            style={{
              fontSize:
                "11px",

              color:
                "#9b6b8a",

              marginTop:
                "3px",
            }}
          >
            {formatDate(
              period.start
            )}
            {" – "}
            {formatDate(
              period.end
            )}
          </div>
        </div>

        <div
          style={{
            textAlign:
              "right",
          }}
        >
          <div
            style={{
              fontSize:
                "9px",

              color:
                "#9b6b8a",

              fontWeight:
                800,

              textTransform:
                "uppercase",
            }}
          >
            PAYDAY
          </div>

          <strong
            style={{
              color:
                "#db2777",
            }}
          >
            {formatDate(
              period.payday
            )}
          </strong>
        </div>
      </div>


      {/* HOURS */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "1fr 1fr",

          gap:
            "8px",

          marginBottom:
            "12px",
        }}
      >
        {[
          [
            "Regular Hours",
            `${(
              payroll?.regularHours ??
              0
            ).toFixed(
              2
            )} hrs`,
          ],

          [
            "Overtime",
            `${(
              payroll?.overtimeHours ??
              0
            ).toFixed(
              2
            )} hrs`,
          ],

          [
            "Holiday Hours",
            `${(
              payroll?.statHours ??
              0
            ).toFixed(
              2
            )} hrs`,
          ],

          [
            "Premium Hours",
            `${(
              payroll?.premiumHours ??
              0
            ).toFixed(
              2
            )} hrs`,
          ],
        ].map(
          ([label, value]) => (
            <div
              key={
                label
              }
              style={{
                background:
                  "#fff8fb",

                borderRadius:
                  "9px",

                padding:
                  "9px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "9px",

                  color:
                    "#9b6b8a",
                }}
              >
                {label}
              </div>

              <strong>
                {value}
              </strong>
            </div>
          )
        )}
      </div>


      {/* PAYSTUB */}

      <div
        style={{
          background:
            "#fffafc",

          border:
            "1px solid #f6dce7",

          borderRadius:
            "11px",

          padding:
            "12px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            color:
              "#9b6b8a",

            fontWeight:
              800,

            textTransform:
              "uppercase",

            marginBottom:
              "9px",
          }}
        >
          PAYSTUB-STYLE BREAKDOWN
        </div>


        {[
          [
            "Regular",
            payroll?.regularPay,
          ],

          [
            "Overtime",
            payroll?.overtimePay,
          ],

          [
            "Stat Holiday",
            payroll?.statPay,
          ],

          [
            "Freezer Premium",
            payroll?.freezingPremiumPay,
          ],

          [
            "Evening Premium",
            payroll?.eveningPremiumPay,
          ],

          [
            "Training",
            payroll?.trainingPay,
          ],

          [
            "Vacation Pay",
            payroll?.vacationPay,
          ],

          [
            "Bonus",
            payroll?.bonus,
          ],

          [
            "Other",
            payroll?.otherEarnings,
          ],
        ].map(
          ([label, value]) => (
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
                  "4px 0",

                fontSize:
                  "12px",
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
            borderTop:
              "1px solid #efd8e2",

            marginTop:
              "7px",

            paddingTop:
              "8px",

            display:
              "flex",

            justifyContent:
              "space-between",

            fontSize:
              "13px",
          }}
        >
          <strong>
            Gross Pay
          </strong>

          <strong>
            {money(
              payroll?.grossPay
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
              "5px",

            fontSize:
              "12px",

            color:
              "#9b6b8a",
          }}
        >
          <span>
            Estimated Deductions
          </span>

          <span>
            −
            {money(
              payroll?.estimatedDeductions
            )}
          </span>
        </div>


        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            marginTop:
              "8px",

            paddingTop:
              "8px",

            borderTop:
              "1px solid #efd8e2",

            fontSize:
              "17px",
          }}
        >
          <strong>
            Calculated Estimated Net
          </strong>

          <strong
            style={{
              color:
                "#db2777",
            }}
          >
            {money(
              calculatedNet
            )}
          </strong>
        </div>
      </div>


      {/* EXPECTED SALARY */}

      <div
        style={{
          marginTop:
            "12px",

          padding:
            "12px",

          background:
            "#fffaf1",

          border:
            "1px solid #f2dfb5",

          borderRadius:
            "11px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            fontWeight:
              800,

            color:
              "#98701f",

            textTransform:
              "uppercase",

            marginBottom:
              "5px",
          }}
        >
          YOUR EXPECTED SALARY
        </div>

        <div
          style={{
            fontSize:
              "11px",

            color:
              "#765f3c",

            marginBottom:
              "8px",
          }}
        >
          Enter the amount you actually expect to receive
          on payday. This does not replace the calculated
          estimate.
        </div>

        <input
          type="number"
          min="0"
          step="0.01"
          value={
            expectedSalary
          }
          onChange={e =>
            setExpectedSalary(
              e.target.value
            )
          }
          placeholder="e.g. 1350.00"
          style={
            inputStyle
          }
        />

        {expectedSalary !== "" && (
          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "12px",

              display:
                "flex",

              justifyContent:
                "space-between",
            }}
          >
            <span>
              Expected vs calculated
            </span>

            <strong
              style={{
                color:
                  expectedDifference >=
                  0
                    ? "#3a6b4e"
                    : "#c94d6a",
              }}
            >
              {expectedDifference >=
              0
                ? "+"
                : ""}
              {money(
                expectedDifference
              )}
            </strong>
          </div>
        )}

        <button
          type="button"
          onClick={
            onSaveExpected
          }
          style={{
            width:
              "100%",

            marginTop:
              "9px",

            padding:
              "10px",

            border:
              "none",

            borderRadius:
              "9px",

            background:
              "#98701f",

            color:
              "#fff",

            fontWeight:
              800,

            cursor:
              "pointer",
          }}
        >
          Save Expected Salary
        </button>
      </div>


      {/* ACTUAL PAY */}

      <div
        style={{
          marginTop:
            "12px",

          padding:
            "12px",

          background:
            "#f8fbff",

          border:
            "1px solid #d7e6f5",

          borderRadius:
            "11px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            fontWeight:
              800,

            color:
              "#2860a0",

            textTransform:
              "uppercase",

            marginBottom:
              "8px",
          }}
        >
          ACTUAL PAYCHECK
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1fr 1fr",

            gap:
              "8px",
          }}
        >
          <div>
            <Label>
              Actual Net
            </Label>

            <input
              id={
                `actual-net-${job.id}`
              }
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                actual?.actualNet ??
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
              Actual Gross
            </Label>

            <input
              id={
                `actual-gross-${job.id}`
              }
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                actual?.actualGross ??
                ""
              }
              placeholder="Optional"
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
              "6px",

            marginTop:
              "8px",
          }}
        >
          {[
            [
              "Federal Tax",
              "federalTax",
            ],

            [
              "CPP",
              "cpp",
            ],

            [
              "EI",
              "ei",
            ],

            [
              "Other",
              "otherDeductions",
            ],
          ].map(
            ([label, name]) => (
              <div
                key={
                  name
                }
              >
                <input
                  id={
                    `${name}-${job.id}`
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    actual?.[
                      name
                    ] ??
                    ""
                  }
                  placeholder={
                    label
                  }
                  style={{
                    ...inputStyle,
                    fontSize:
                      "11px",
                  }}
                />
              </div>
            )
          )}
        </div>


        <button
          type="button"
          onClick={() => {
            const actualNet =
              numberOrZero(
                document.getElementById(
                  `actual-net-${job.id}`
                )?.value
              );

            const actualGross =
              numberOrZero(
                document.getElementById(
                  `actual-gross-${job.id}`
                )?.value
              );

            const federalTax =
              numberOrZero(
                document.getElementById(
                  `federalTax-${job.id}`
                )?.value
              );

            const cpp =
              numberOrZero(
                document.getElementById(
                  `cpp-${job.id}`
                )?.value
              );

            const ei =
              numberOrZero(
                document.getElementById(
                  `ei-${job.id}`
                )?.value
              );

            const otherDeductions =
              numberOrZero(
                document.getElementById(
                  `otherDeductions-${job.id}`
                )?.value
              );

            onSaveActual({
              actualNet,
              actualGross,

              federalTax,
              cpp,
              ei,
              otherDeductions,
            });
          }}
          style={{
            width:
              "100%",

            marginTop:
              "10px",

            padding:
              "10px",

            borderRadius:
              "9px",

            background:
              "#eaf1f9",

            border:
              "1px solid #9cc0e4",

            color:
              "#2860a0",

            fontWeight:
              800,

            cursor:
              "pointer",
          }}
        >
          Save Actual Paycheck
        </button>


        {actual?.actualNet !=
          null && (
          <div
            style={{
              marginTop:
                "10px",

              borderTop:
                "1px solid #d7e6f5",

              paddingTop:
                "9px",

              fontSize:
                "12px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",
              }}
            >
              <span>
                Calculated Estimate
              </span>

              <strong>
                {money(
                  calculatedNet
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
                  "4px",
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
                  "7px",

                fontWeight:
                  800,

                color:
                  actualDifference >=
                  0
                    ? "#3a6b4e"
                    : "#c94d6a",
              }}
            >
              <span>
                Actual vs Calculated
              </span>

              <span>
                {actualDifference >=
                0
                  ? "+"
                  : ""}
                {money(
                  actualDifference
                )}
              </span>
            </div>
          </div>
        )}
      </div>


      {/* SEND TO BUDGET */}

      <button
        type="button"
        onClick={
          onSendToPool
        }
        disabled={
          shifts.length ===
          0
        }
        style={{
          width:
            "100%",

          marginTop:
            "12px",

          padding:
            "11px",

          border:
            "none",

          borderRadius:
            "9px",

          background:
            shifts.length
              ? "#3a9080"
              : "#d4b8c4",

          color:
            "#fff",

          fontWeight:
            800,

          cursor:
            shifts.length
              ? "pointer"
              : "not-allowed",
        }}
      >
        💰 Send Expected Pay to Budget Pool
      </button>
    </section>
  );
}


/* =========================================================
   JOB CARD
========================================================= */

function JobCard({
  job,
  period,
  shifts,
  payroll,
  expectedSalary,
  onExpectedSalaryChange,
  actual,
  onAddShift,
  onRemoveShift,
  onSaveExpected,
  onSaveActual,
  onSendToPool,
  onEditJob,
  onRemoveJob,
}) {
  return (
    <section
      style={{
        marginBottom:
          "14px",
      }}
    >
      {/* JOB HEADER */}

      <div
        style={{
          background:
            "#fff",

          border:
            "1px solid #efd8e2",

          borderRadius:
            "14px",

          padding:
            "14px",

          marginBottom:
            "10px",
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

            gap:
              "8px",
          }}
        >
          <div>
            <div
              style={{
                fontSize:
                  "10px",

                color:
                  "#9b6b8a",

                fontWeight:
                  800,

                textTransform:
                  "uppercase",
              }}
            >
              INCOME SOURCE / JOB
            </div>

            <div
              style={{
                fontSize:
                  "16px",

                fontWeight:
                  800,

                marginTop:
                  "3px",
              }}
            >
              {job.person}
              {" — "}
              {job.employer ||
                job.title}
            </div>

            <div
              style={{
                fontSize:
                  "11px",

                color:
                  "#9b6b8a",

                marginTop:
                  "3px",
              }}
            >
              {job.title}
              {" · "}
              {money(
                job.rate
              )}
              /hr
            </div>
          </div>

          <div
            style={{
              display:
                "flex",

              gap:
                "6px",
            }}
          >
            <Button
              secondary
              onClick={
                onEditJob
              }
            >
              Edit Job
            </Button>

            <Button
              danger
              onClick={
                onRemoveJob
              }
            >
              Remove
            </Button>
          </div>
        </div>
      </div>


      {/* PAY SCHEDULE */}

      <div
        style={{
          background:
            "#fffaf1",

          border:
            "1px solid #f2dfb5",

          borderRadius:
            "14px",

          padding:
            "14px",

          marginBottom:
            "10px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            fontWeight:
              800,

            color:
              "#98701f",

            textTransform:
              "uppercase",
          }}
        >
          PAY SCHEDULE
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "1fr 1fr 1fr",

            gap:
              "8px",

            marginTop:
              "9px",
          }}
        >
          <div
            style={{
              background:
                "#fff",

              padding:
                "9px",

              borderRadius:
                "9px",
            }}
          >
            <div
              style={{
                fontSize:
                  "9px",

                color:
                  "#9b8050",
              }}
            >
              PERIOD START
            </div>

            <strong
              style={{
                fontSize:
                  "11px",
              }}
            >
              {formatDate(
                period.start
              )}
            </strong>
          </div>

          <div
            style={{
              background:
                "#fff",

              padding:
                "9px",

              borderRadius:
                "9px",
            }}
          >
            <div
              style={{
                fontSize:
                  "9px",

                color:
                  "#9b8050",
              }}
            >
              PERIOD END
            </div>

            <strong
              style={{
                fontSize:
                  "11px",
              }}
            >
              {formatDate(
                period.end
              )}
            </strong>
          </div>

          <div
            style={{
              background:
                "#fff",

              padding:
                "9px",

              borderRadius:
                "9px",
            }}
          >
            <div
              style={{
                fontSize:
                  "9px",

                color:
                  "#9b8050",
              }}
            >
              PAYDAY
            </div>

            <strong
              style={{
                fontSize:
                  "11px",

                color:
                  "#d23b75",
              }}
            >
              {formatDate(
                period.payday
              )}
            </strong>
          </div>
        </div>

        <div
          style={{
            marginTop:
              "9px",

            padding:
              "9px 10px",

            background:
              "#fff",

            borderRadius:
              "9px",

            fontSize:
              "10px",

            color:
              "#765f3c",
          }}
        >
          💡 Work performed during the pay period is
          included in this paycheck. The money arrives on
          the separate payday.
        </div>
      </div>


      {/* WORK HOURS */}

      <div
        style={{
          background:
            "#fff",

          border:
            "1px solid #efd8e2",

          borderRadius:
            "14px",

          padding:
            "14px",

          marginBottom:
            "10px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",

            fontWeight:
              800,

            color:
              "#9b6b8a",

            textTransform:
              "uppercase",

            marginBottom:
              "9px",
          }}
        >
          WORK HOURS
        </div>

        <ShiftForm
          job={
            job
          }
          onAdd={
            onAddShift
          }
        />


        {shifts.length ===
        0 ? (
          <div
            style={{
              padding:
                "12px",

              background:
                "#fff8fb",

              borderRadius:
                "9px",

              fontSize:
                "11px",

              color:
                "#9b6b8a",

              textAlign:
                "center",
            }}
          >
            No work hours entered for this pay period.
          </div>
        ) : (
          shifts.map(
            shift => (
              <div
                key={
                  shift.id
                }
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "8px",

                  alignItems:
                    "flex-start",

                  padding:
                    "10px 0",

                  borderBottom:
                    "1px solid #f3e2e9",
                }}
              >
                <div
                  style={{
                    flex:
                      1,
                  }}
                >
                  <strong
                    style={{
                      fontSize:
                        "12px",
                    }}
                  >
                    {formatDate(
                      shift.date
                    )}
                  </strong>

                  {shift.hol && (
                    <span
                      style={{
                        marginLeft:
                          "6px",

                        fontSize:
                          "10px",

                        color:
                          "#98701f",
                      }}
                    >
                      🎉{" "}
                      {shift.hol}
                    </span>
                  )}

                  <div
                    style={{
                      fontSize:
                        "10px",

                      color:
                        "#9b6b8a",

                      marginTop:
                        "3px",
                    }}
                  >
                    {shift.startTime}
                    {" – "}
                    {shift.endTime}
                    {" · "}
                    {numberOrZero(
                      shift.paidHours
                    ).toFixed(
                      2
                    )}
                    {" paid hrs"}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "10px",

                      color:
                        "#9b6b8a",

                      marginTop:
                        "2px",
                    }}
                  >
                    {shift.type}
                    {" · "}
                    {money(
                      shift.hourlyRate ??
                      job.rate
                    )}
                    /hr
                  </div>

                  {(numberOrZero(
                    shift.freezingPremium
                  ) > 0 ||
                    numberOrZero(
                      shift.eveningPremium
                    ) > 0) && (
                    <div
                      style={{
                        fontSize:
                          "10px",

                        color:
                          "#98701f",

                        marginTop:
                          "2px",
                      }}
                    >
                      Premium:
                      {" "}
                      {numberOrZero(
                        shift.freezingPremium
                      ) > 0 &&
                        `${money(
                          shift.freezingPremium
                        )}/hr freezer `}
                      {numberOrZero(
                        shift.eveningPremium
                      ) > 0 &&
                        `${money(
                          shift.eveningPremium
                        )}/hr evening`}
                    </div>
                  )}

                  {shift.notes && (
                    <div
                      style={{
                        fontSize:
                          "10px",

                        color:
                          "#9b6b8a",

                        marginTop:
                          "2px",
                      }}
                    >
                      {shift.notes}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRemoveShift(
                      shift.id
                    )
                  }
                  style={{
                    border:
                      "none",

                    background:
                      "transparent",

                    color:
                      "#c94d6a",

                    cursor:
                      "pointer",

                    fontSize:
                      "16px",
                  }}
                >
                  ×
                </button>
              </div>
            )
          )
        )}
      </div>


      {/* PAYCHECK */}

      <PaycheckCard
        job={
          job
        }
        period={
          period
        }
        shifts={
          shifts
        }
        payroll={
          payroll
        }
        expectedSalary={
          expectedSalary
        }
        setExpectedSalary={
          onExpectedSalaryChange
        }
        actual={
          actual
        }
        onSaveExpected={
          onSaveExpected
        }
        onSaveActual={
          onSaveActual
        }
        onSendToPool={
          onSendToPool
        }
      />
    </section>
  );
}


/* =========================================================
   POOLED INCOME
========================================================= */

function PooledIncomeCard({
  entries,
  total,
  onRemove,
}) {
  return (
    <section
      style={{
        background:
          "#fff",

        border:
          "1px solid #efd8e2",

        borderRadius:
          "14px",

        padding:
          "14px",

        marginTop:
          "12px",
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
            "10px",
        }}
      >
        <div>
          <div
            style={{
              fontSize:
                "10px",

              color:
                "#9b6b8a",

              fontWeight:
                800,

              textTransform:
                "uppercase",
            }}
          >
            BUDGET POOL
          </div>

          <strong
            style={{
              fontSize:
                "20px",
            }}
          >
            {money(
              total
            )}
          </strong>
        </div>
      </div>

      {entries.length ===
      0 ? (
        <div
          style={{
            padding:
              "12px",

            background:
              "#fff8fb",

            borderRadius:
              "9px",

            fontSize:
              "11px",

            color:
              "#9b6b8a",

            textAlign:
              "center",
          }}
        >
          No salary has been sent to the Budget Pool
          for this period yet.
        </div>
      ) : (
        entries.map(
          (entry, index) => (
            <div
              key={
                `${entry.date}-${index}`
              }
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap:
                  "8px",

                padding:
                  "9px 0",

                borderBottom:
                  "1px solid #f3e2e9",
              }}
            >
              <div>
                <strong
                  style={{
                    fontSize:
                      "12px",
                  }}
                >
                  {entry.src}
                </strong>

                <div
                  style={{
                    fontSize:
                      "10px",

                    color:
                      "#9b6b8a",

                    marginTop:
                      "2px",
                  }}
                >
                  {entry.isActual
                    ? "ACTUAL"
                    : "EXPECTED / ESTIMATED"}

                  {" · "}

                  {formatDate(
                    entry.date
                  )}
                </div>

                {entry.expectedSalary !=
                  null && (
                  <div
                    style={{
                      fontSize:
                        "10px",

                      color:
                        "#98701f",
                    }}
                  >
                    Expected:
                    {" "}
                    {money(
                      entry.expectedSalary
                    )}
                  </div>
                )}

                {entry.actualDifference !=
                  null && (
                  <div
                    style={{
                      fontSize:
                        "10px",

                      color:
                        entry.actualDifference >=
                        0
                          ? "#3a6b4e"
                          : "#c94d6a",
                    }}
                  >
                    Actual vs calculated:
                    {" "}
                    {entry.actualDifference >=
                    0
                      ? "+"
                      : ""}
                    {money(
                      entry.actualDifference
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "8px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#3a9080",
                  }}
                >
                  {money(
                    entry.amt
                  )}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(
                      index
                    )
                  }
                  style={{
                    border:
                      "none",

                    background:
                      "transparent",

                    color:
                      "#c94d6a",

                    cursor:
                      "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )
        )
      )}
    </section>
  );
}


/* =========================================================
   MAIN INCOME PAGE
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
    editingJob,
    setEditingJob,
  ] = useState(null);

  const [
    addJobOpen,
    setAddJobOpen,
  ] = useState(false);

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState("");

  const [
    selectedPeriodId,
    setSelectedPeriodId,
  ] = useState("");


  /* =======================================================
     LOAD SUPABASE DATA
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(
        true
      );

      setError("");

      try {
        const {
          data: row,
          error:
            loadError,
        } =
          await supabase
            .from(
              "user_data"
            )
            .select(
              "data"
            )
            .limit(
              1
            )
            .single();

        if (
          loadError
        ) {
          throw loadError;
        }

        let data =
          row?.data ??
          {};

        /*
         * Older versions may have stored the
         * Budget Blossom data as a string.
         */
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

        if (
          !cancelled
        ) {
          setRawData(
            data
          );
        }
      } catch (
        loadError
      ) {
        console.error(
          "Income load error:",
          loadError
        );

        if (
          !cancelled
        ) {
          setError(
            loadError?.message ??
              "Unable to load income data."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
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
            error:
              rowError,
          } =
            await supabase
              .from(
                "user_data"
              )
              .select(
                "id"
              )
              .limit(
                1
              )
              .single();

          if (
            rowError
          ) {
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
        } catch (
          saveError
        ) {
          console.error(
            "Income save error:",
            saveError
          );

          setToast(
            "❌ Save failed. Check Supabase connection."
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
     DATA
  ======================================================= */

  const jobs =
    rawData?.jobs ??
    DEFAULT_JOBS;

  const shifts =
    rawData?.shifts ??
    {};

  const sent =
    rawData?.sent ??
    {};

  const actualPaychecks =
    rawData?.actualPaychecks ??
    {};

  const paycheckEstimates =
    rawData?.paycheckEstimates ??
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
     PERIODS FOR SELECTED JOB
  ======================================================= */

  const periods =
    useMemo(
      () =>
        selectedJob
          ? buildPayPeriodsForJob(
              selectedJob
            )
          : [],
      [
        selectedJob,
      ]
    );


  useEffect(() => {
    if (
      !periods.length
    ) {
      setSelectedPeriodId(
        ""
      );

      return;
    }

    const exists =
      periods.some(
        period =>
          period.id ===
          selectedPeriodId
      );

    if (
      !exists
    ) {
      const today =
        dateString();

      const current =
        periods.find(
          period =>
            today >=
              period.start &&
            today <=
              period.end
        );

      setSelectedPeriodId(
        (
          current ??
          periods[6] ??
          periods[0]
        ).id
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
    periods[0] ??
    null;


  /* =======================================================
     CURRENT SHIFTS
  ======================================================= */

  const shiftKey =
    selectedJob &&
    selectedPeriod
      ? `${selectedJob.id}|${selectedPeriod.start}|${selectedPeriod.end}`
      : "";

  const currentShifts =
    shifts[
      shiftKey
    ] ??
    [];


  /* =======================================================
     NORMALIZE OLD SHIFTS
  ======================================================= */

  const normalizedShifts =
    currentShifts.map(
      shift => ({
        ...shift,

        startTime:
          shift.startTime ??
          shift.inT ??
          "09:00",

        endTime:
          shift.endTime ??
          shift.outT ??
          "17:00",

        unpaidBreakMinutes:
          shift.unpaidBreakMinutes ??
          shift.brk ??
          0,

        hourlyRate:
          shift.hourlyRate ??
          shift.rate ??
          selectedJob?.rate ??
          0,

        paidHours:
          shift.paidHours ??
          calculateShift({
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
              selectedJob?.rate ??
              0,

            isStatHoliday:
              Boolean(
                shift.isStatHoliday
              ),

            statMultiplier:
              numberOrZero(
                shift.statMultiplier
              ) || 1,
          }).hours,
      })
    );


  /* =======================================================
     PAYROLL
  ======================================================= */

  const payroll =
    selectedJob &&
    selectedPeriod
      ? calculatePayroll(
          normalizedShifts,
          selectedJob
        )
      : null;


  /* =======================================================
     EXPECTED SALARY
  ======================================================= */

  const estimateKey =
    selectedJob &&
    selectedPeriod
      ? `${selectedJob.id}|${selectedPeriod.id}`
      : "";

  const savedEstimate =
    paycheckEstimates[
      estimateKey
    ];


  const expectedSalary =
    savedEstimate?.expectedSalary ??
    "";


  /* =======================================================
     ACTUAL PAYCHECK
  ======================================================= */

  const actual =
    selectedJob &&
    selectedPeriod
      ? actualPaychecks[
          estimateKey
        ]
      : null;


  /* =======================================================
     PERIOD SENT
  ======================================================= */

  const periodSent =
    selectedJob &&
    selectedPeriod
      ? sent[
          estimateKey
        ] ??
        []
      : [];


  const totalPool =
    periodSent.reduce(
      (
        total,
        entry
      ) =>
        total +
        numberOrZero(
          entry.amt
        ),
      0
    );


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
      ...(rawData ??
        {}),

      jobs:
        updatedJobs,
    });

    setSelectedJobId(
      updatedJob.id
    );

    setEditingJob(
      null
    );

    setAddJobOpen(
      false
    );

    setToast(
      "✅ Job saved"
    );
  }


  /* =======================================================
     REMOVE JOB
  ======================================================= */

  function handleRemoveJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job? Existing shifts and saved pay data will remain in the database."
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
      ...(rawData ??
        {}),

      jobs:
        updatedJobs,
    });

    if (
      selectedJobId ===
      jobId
    ) {
      setSelectedJobId(
        updatedJobs[0]
          ?.id ??
          ""
      );
    }

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
      !selectedJob ||
      !selectedPeriod
    ) {
      return;
    }

    /*
     * Prevent a shift from being entered into
     * the wrong pay period.
     */
    if (
      shift.date <
        selectedPeriod.start ||
      shift.date >
        selectedPeriod.end
    ) {
      setToast(
        `⚠️ This shift is outside the selected pay period (${formatDate(
          selectedPeriod.start
        )} – ${formatDate(
          selectedPeriod.end
        )}).`
      );

      return;
    }

    const holiday =
      getHoliday(
        shift.date
      );

    const normalized =
      {
        ...shift,

        hol:
          holiday?.name ??
          null,

        paidHours:
          calculateShift({
            startTime:
              shift.startTime,

            endTime:
              shift.endTime,

            unpaidBreakMinutes:
              shift.unpaidBreakMinutes,

            hourlyRate:
              shift.hourlyRate,

            isStatHoliday:
              shift.isStatHoliday,

            statMultiplier:
              shift.statMultiplier,
          }).hours,
      };

    const updatedShifts = {
      ...(rawData?.shifts ??
        {}),

      [shiftKey]: [
        ...(shifts[
          shiftKey
        ] ??
          []),

        normalized,
      ],
    };

    save({
      ...(rawData ??
        {}),

      shifts:
        updatedShifts,
    });

    /*
     * Calendar integration.
     *
     * The calendar can consume these events without
     * requiring the user to enter the shift twice.
     */
    const existingCalendar =
      rawData?.calendarEvents ??
      [];

    const calendarEvent =
      {
        id:
          `work-${selectedJob.id}-${shift.id}`,

        type:
          "work_shift",

        date:
          shift.date,

        title:
          `${selectedJob.person} — ${selectedJob.title}`,

        startTime:
          shift.startTime,

        endTime:
          shift.endTime,

        jobId:
          selectedJob.id,

        employer:
          selectedJob.employer,

        source:
          "income",

        notes:
          shift.notes ??
          "",
      };

    const withoutOld =
      existingCalendar.filter(
        event =>
          event.id !==
          calendarEvent.id
      );

    save({
      ...(rawData ??
        {}),

      shifts:
        updatedShifts,

      calendarEvents: [
        ...withoutOld,
        calendarEvent,
      ],
    });

    setToast(
      "✅ Work hours added"
    );
  }


  /* =======================================================
     REMOVE SHIFT
  ======================================================= */

  function handleRemoveShift(
    shiftId
  ) {
    const updated =
      (
        shifts[
          shiftKey
        ] ??
        []
      ).filter(
        shift =>
          shift.id !==
          shiftId
      );

    const existingCalendar =
      rawData?.calendarEvents ??
      [];

    const updatedCalendar =
      existingCalendar.filter(
        event =>
          event.id !==
          `work-${selectedJob.id}-${shiftId}`
      );

    save({
      ...(rawData ??
        {}),

      shifts: {
        ...shifts,

        [shiftKey]:
          updated,
      },

      calendarEvents:
        updatedCalendar,
    });

    setToast(
      "🗑 Work hours removed"
    );
  }


  /* =======================================================
     SAVE EXPECTED SALARY
  ======================================================= */

  function handleSaveExpected() {
    if (
      !selectedJob ||
      !selectedPeriod
    ) {
      return;
    }

    const key =
      estimateKey;

    const existing =
      paycheckEstimates[
        key
      ] ??
      {};

    const updatedEstimates =
      {
        ...paycheckEstimates,

        [key]: {
          ...existing,

          jobId:
            selectedJob.id,

          person:
            selectedJob.person,

          employer:
            selectedJob.employer,

          payPeriodStart:
            selectedPeriod.start,

          payPeriodEnd:
            selectedPeriod.end,

          payday:
            selectedPeriod.payday,

          calculatedGross:
            payroll?.grossPay ??
            0,

          calculatedDeductions:
            payroll?.estimatedDeductions ??
            0,

          calculatedNet:
            payroll?.estimatedNet ??
            0,

          expectedSalary:
            numberOrZero(
              expectedSalary
            ),

          expectedDifference:
            roundMoney(
              numberOrZero(
                expectedSalary
              ) -
                numberOrZero(
                  payroll?.estimatedNet
                )
            ),

          updatedAt:
            new Date().toISOString(),
        },
      };


    const existingCalendar =
      rawData?.calendarEvents ??
      [];

    const paydayEvent =
      {
        id:
          `payday-${selectedJob.id}-${selectedPeriod.id}`,

        type:
          "payday",

        date:
          selectedPeriod.payday,

        title:
          `${selectedJob.person} Payday — ${selectedJob.employer}`,

        jobId:
          selectedJob.id,

        employer:
          selectedJob.employer,

        person:
          selectedJob.person,

        amount:
          numberOrZero(
            expectedSalary
          ),

        source:
          "income",
      };

    const periodEvent =
      {
        id:
          `payperiod-${selectedJob.id}-${selectedPeriod.id}`,

        type:
          "pay_period",

        date:
          selectedPeriod.start,

        title:
          `${selectedJob.person} Pay Period`,

        startDate:
          selectedPeriod.start,

        endDate:
          selectedPeriod.end,

        payday:
          selectedPeriod.payday,

        jobId:
          selectedJob.id,

        employer:
          selectedJob.employer,

        source:
          "income",
      };

    const filtered =
      existingCalendar.filter(
        event =>
          event.id !==
            paydayEvent.id &&
          event.id !==
            periodEvent.id
      );

    save({
      ...(rawData ??
        {}),

      paycheckEstimates:
        updatedEstimates,

      calendarEvents: [
        ...filtered,

        paydayEvent,
        periodEvent,
      ],
    });

    setToast(
      "✅ Expected salary saved"
    );
  }


  /* =======================================================
     SAVE ACTUAL PAYCHECK
  ======================================================= */

  function handleSaveActual(
    values
  ) {
    if (
      !selectedJob ||
      !selectedPeriod
    ) {
      return;
    }

    const key =
      estimateKey;

    const calculatedNet =
      numberOrZero(
        payroll?.estimatedNet
      );

    const actualDifference =
      roundMoney(
        numberOrZero(
          values.actualNet
        ) -
          calculatedNet
      );

    const updatedActuals =
      {
        ...actualPaychecks,

        [key]: {
          ...values,

          jobId:
            selectedJob.id,

          person:
            selectedJob.person,

          employer:
            selectedJob.employer,

          payPeriodStart:
            selectedPeriod.start,

          payPeriodEnd:
            selectedPeriod.end,

          payday:
            selectedPeriod.payday,

          calculatedNet,

          expectedSalary:
            numberOrZero(
              expectedSalary
            ),

          actualDifference,

          savedAt:
            new Date().toISOString(),
        },
      };


    save({
      ...(rawData ??
        {}),

      actualPaychecks:
        updatedActuals,
    });

    setToast(
      "✅ Actual paycheck saved"
    );
  }


  /* =======================================================
     SEND EXPECTED PAY TO BUDGET
  ======================================================= */

  function handleSendToPool() {
    if (
      !selectedJob ||
      !selectedPeriod ||
      !payroll
    ) {
      return;
    }

    const key =
      estimateKey;

    const amount =
      expectedSalary !==
      ""
        ? numberOrZero(
            expectedSalary
          )
        : numberOrZero(
            payroll.estimatedNet
          );

    const existingEntries =
      sent[
        key
      ] ??
      [];

    /*
     * Replace an existing estimate for the same
     * paycheck instead of creating duplicates.
     */
    const filtered =
      existingEntries.filter(
        entry =>
          !(
            entry.type ===
              "expected_pay" &&
            entry.jobId ===
              selectedJob.id
          )
      );

    const entry =
      {
        id:
          makeId(
            "income"
          ),

        type:
          "expected_pay",

        src:
          `${selectedJob.person} — ${selectedJob.employer}`,

        amt:
          amount,

        gross:
          payroll.grossPay,

        calculatedNet:
          payroll.estimatedNet,

        estimatedNet:
          payroll.estimatedNet,

        expectedSalary:
          amount,

        payday:
          selectedPeriod.payday,

        payPeriodStart:
          selectedPeriod.start,

        payPeriodEnd:
          selectedPeriod.end,

        person:
          selectedJob.person,

        jobId:
          selectedJob.id,

        date:
          selectedPeriod.payday,

        isActual:
          false,
      };


    save({
      ...(rawData ??
        {}),

      sent: {
        ...sent,

        [key]: [
          ...filtered,
          entry,
        ],
      },
    });

    setToast(
      `✅ ${money(
        amount
      )} expected pay added to Budget Pool`
    );
  }


  /* =======================================================
     REMOVE POOL ENTRY
  ======================================================= */

  function handleRemovePoolEntry(
    index
  ) {
    if (
      !window.confirm(
        "Remove this income entry from the Budget Pool?"
      )
    ) {
      return;
    }

    const updated =
      (
        sent[
          estimateKey
        ] ??
        []
      ).filter(
        (_, i) =>
          i !== index
      );

    save({
      ...(rawData ??
        {}),

      sent: {
        ...sent,

        [estimateKey]:
          updated,
      },
    });
  }


  /* =======================================================
     PERIOD NAVIGATION
  ======================================================= */

  function previousPeriod() {
    if (
      !periods.length
    ) {
      return;
    }

    const index =
      periods.findIndex(
        period =>
          period.id ===
          selectedPeriod?.id
      );

    const nextIndex =
      Math.max(
        0,
        index - 1
      );

    setSelectedPeriodId(
      periods[
        nextIndex
      ]?.id ??
        ""
    );
  }


  function nextPeriod() {
    if (
      !periods.length
    ) {
      return;
    }

    const index =
      periods.findIndex(
        period =>
          period.id ===
          selectedPeriod?.id
      );

    const nextIndex =
      Math.min(
        periods.length - 1,
        index + 1
      );

    setSelectedPeriodId(
      periods[
        nextIndex
      ]?.id ??
        ""
    );
  }


  /* =======================================================
     JOB SELECT
  ======================================================= */

  function handleJobChange(
    event
  ) {
    setSelectedJobId(
      event.target.value
    );

    setSelectedPeriodId(
      ""
    );
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
     ERROR
  ======================================================= */

  if (
    error
  ) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          background:
            "#fdf6f8",

          padding:
            "30px",

          fontFamily:
            "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth:
              "640px",

            margin:
              "0 auto",

            background:
              "#fff",

            border:
              "1px solid #f4a0b4",

            borderRadius:
              "14px",

            padding:
              "18px",

            color:
              "#c94d6a",
          }}
        >
          <strong>
            Unable to load income data
          </strong>

          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "12px",
            }}
          >
            {error}
          </div>
        </div>
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
          "#fdf6f8",

        color:
          "#1a0f1e",

        fontFamily:
          "'DM Sans', sans-serif",

        paddingBottom:
          "90px",
      }}
    >
      <div
        style={{
          maxWidth:
            "700px",

          margin:
            "0 auto",

          padding:
            "14px",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            padding:
              "26px 0 14px",

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
                  "11px",

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
              SALARY
            </div>

            <h1
              style={{
                margin:
                  "4px 0 0",

                fontSize:
                  "28px",

                lineHeight:
                  "1.1",
              }}
            >
              Income & Work Hours
            </h1>

            <div
              style={{
                fontSize:
                  "11px",

                color:
                  "#9b6b8a",

                marginTop:
                  "5px",
              }}
            >
              Enter work once. Budget Blossom calculates
              the paycheck and keeps expected and actual
              pay separate.
            </div>
          </div>

          {saving && (
            <span
              style={{
                fontSize:
                  "11px",

                color:
                  "#9b6b8a",
              }}
            >
              Saving…
            </span>
          )}
        </div>


        {/* JOB SELECTOR */}

        <section
          style={{
            background:
              "#fff",

            border:
              "1px solid #efd8e2",

            borderRadius:
              "14px",

            padding:
              "14px",

            marginBottom:
              "12px",
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

              gap:
                "8px",
            }}
          >
            <div
              style={{
                flex:
                  1,
              }}
            >
              <Label>
                Income Source / Job
              </Label>

              <select
                value={
                  selectedJob?.id ??
                  ""
                }
                onChange={
                  handleJobChange
                }
                style={
                  inputStyle
                }
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
                      {job.person}
                      {" — "}
                      {job.employer ||
                        job.title}
                      {" · "}
                      {money(
                        job.rate
                      )}
                      /hr
                    </option>
                  )
                )}
              </select>
            </div>

            <Button
              onClick={() =>
                setAddJobOpen(
                  true
                )
              }
            >
              + New Job
            </Button>
          </div>
        </section>


        {/* EDITOR */}

        {(editingJob ||
          addJobOpen) && (
          <JobEditor
            job={
              editingJob
            }
            onSave={
              handleSaveJob
            }
            onClose={() => {
              setEditingJob(
                null
              );

              setAddJobOpen(
                false
              );
            }}
          />
        )}


        {/* PAY PERIOD SETUP MESSAGE */}

        {selectedJob &&
          (!selectedJob.payPeriodStart ||
            !selectedJob.payPeriodEnd ||
            !selectedJob.payday) && (
            <section
              style={{
                background:
                  "#fffaf1",

                border:
                  "1px solid #f2dfb5",

                borderRadius:
                  "14px",

                padding:
                  "14px",

                marginBottom:
                  "12px",

                color:
                  "#765f3c",
              }}
            >
              <strong>
                Pay schedule needs to be configured.
              </strong>

              <div
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "11px",
                }}
              >
                Click Edit Job and enter the actual
                pay-period start, pay-period end, and
                payday. Budget Blossom will not guess
                your payday.
              </div>

              <div
                style={{
                  marginTop:
                    "9px",

                  fontSize:
                    "11px",
                }}
              >
                Example:
                {" "}
                <strong>
                  July 20–August 2
                </strong>
                {" "}
                → Payday
                {" "}
                <strong>
                  August 7
                </strong>
              </div>
            </section>
          )}


        {/* PERIOD NAV */}

        {selectedJob &&
          periods.length > 0 && (
          <section
            style={{
              background:
                "#fff",

              border:
                "1px solid #efd8e2",

              borderRadius:
                "14px",

              padding:
                "12px",

              marginBottom:
                "12px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                gap:
                  "8px",

                alignItems:
                  "center",
              }}
            >
              <button
                type="button"
                onClick={
                  previousPeriod
                }
                style={{
                  width:
                    "38px",

                  height:
                    "38px",

                  border:
                    "1px solid #efd8e2",

                  borderRadius:
                    "10px",

                  background:
                    "#fff",

                  cursor:
                    "pointer",

                  fontSize:
                    "18px",
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

                  textAlign:
                    "center",

                  fontWeight:
                    800,

                  flex:
                    1,
                }}
              >
                {periods.map(
                  periodItem => (
                    <option
                      key={
                        periodItem.id
                      }
                      value={
                        periodItem.id
                      }
                    >
                      {
                        periodItem.label
                      }
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={
                  nextPeriod
                }
                style={{
                  width:
                    "38px",

                  height:
                    "38px",

                  border:
                    "1px solid #efd8e2",

                  borderRadius:
                    "10px",

                  background:
                    "#fff",

                  cursor:
                    "pointer",

                  fontSize:
                    "18px",
                }}
              >
                ›
              </button>
            </div>

            {selectedPeriod && (
              <div
                style={{
                  marginTop:
                    "9px",

                  padding:
                    "9px 10px",

                  background:
                    "#fdf2f8",

                  borderRadius:
                    "9px",

                  fontSize:
                    "11px",

                  color:
                    "#db2777",
                }}
              >
                <strong>
                  Work period:
                </strong>
                {" "}
                {formatDate(
                  selectedPeriod.start
                )}
                {" – "}
                {formatDate(
                  selectedPeriod.end
                )}

                {" · "}

                <strong>
                  Payday:
                </strong>
                {" "}
                {formatDate(
                  selectedPeriod.payday
                )}
              </div>
            )}
          </section>
        )}


        {/* CURRENT JOB */}

        {selectedJob &&
          selectedPeriod && (
          <JobCard
            job={
              selectedJob
            }

            period={
              selectedPeriod
            }

            shifts={
              normalizedShifts
            }

            payroll={
              payroll
            }

            expectedSalary={
              expectedSalary
            }

            onExpectedSalaryChange={
              value => {
                /*
                 * This is intentionally kept local to the
                 * current render through the saved estimate.
                 *
                 * Save the value immediately into a temporary
                 * local state below.
                 */
              }
            }

            actual={
              actual
            }

            onAddShift={
              handleAddShift
            }

            onRemoveShift={
              handleRemoveShift
            }

            onSaveExpected={
              handleSaveExpected
            }

            onSaveActual={
              handleSaveActual
            }

            onSendToPool={
              handleSendToPool
            }

            onEditJob={() =>
              setEditingJob(
                selectedJob
              )
            }

            onRemoveJob={() =>
              handleRemoveJob(
                selectedJob.id
              )
            }
          />
        )}


        {/* BUDGET POOL */}

        {selectedPeriod && (
          <PooledIncomeCard
            entries={
              periodSent
            }

            total={
              totalPool
            }

            onRemove={
              handleRemovePoolEntry
            }
          />
        )}


        {/* ALL JOBS SUMMARY */}

        <section
          style={{
            marginTop:
              "12px",

            background:
              "#fff",

            border:
              "1px solid #efd8e2",

            borderRadius:
              "14px",

            padding:
              "14px",
          }}
        >
          <div
            style={{
              fontSize:
                "10px",

              fontWeight:
                800,

              color:
                "#9b6b8a",

              textTransform:
                "uppercase",

              marginBottom:
                "10px",
            }}
          >
            HOUSEHOLD INCOME SOURCES
          </div>

          {jobs.map(
            job => (
              <div
                key={
                  job.id
                }
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  padding:
                    "8px 0",

                  borderBottom:
                    "1px solid #f3e2e9",
                }}
              >
                <div>
                  <strong
                    style={{
                      fontSize:
                        "12px",
                    }}
                  >
                    {job.person}
                    {" — "}
                    {job.employer ||
                      job.title}
                  </strong>

                  <div
                    style={{
                      fontSize:
                        "10px",

                      color:
                        "#9b6b8a",
                    }}
                  >
                    {money(
                      job.rate
                    )}
                    /hr
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedJobId(
                      job.id
                    )
                  }
                  style={{
                    border:
                      "none",

                    background:
                      "#fff8fb",

                    color:
                      "#db2777",

                    borderRadius:
                      "8px",

                    padding:
                      "6px 9px",

                    cursor:
                      "pointer",

                    fontWeight:
                      700,

                    fontSize:
                      "10px",
                  }}
                >
                  Open
                </button>
              </div>
            )
          )}
        </section>


        {/* TOAST */}

        {toast && (
          <div
            style={{
              position:
                "fixed",

              left:
                "50%",

              bottom:
                "82px",

              transform:
                "translateX(-50%)",

              zIndex:
                1200,

              background:
                "#1a0f1e",

              color:
                "#fff",

              padding:
                "10px 14px",

              borderRadius:
                "12px",

              fontSize:
                "12px",

              fontWeight:
                700,

              boxShadow:
                "0 8px 30px rgba(0,0,0,.18)",

              maxWidth:
                "calc(100% - 30px)",

              textAlign:
                "center",

              cursor:
                "pointer",
            }}

            onClick={() =>
              setToast(
                ""
              )
            }
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
