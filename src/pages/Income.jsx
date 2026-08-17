/**
 * Income.jsx
 *
 * Budget Blossom
 *
 * Income + Work Hours + Payroll
 *
 * Features:
 * - Pay periods
 * - Multiple employers/jobs
 * - Work-hour tracking
 * - Automatic shift-hour calculation
 * - Overtime
 * - Canadian statutory holiday detection
 * - Employer-selected stat holiday treatment
 * - Freezing premium
 * - Evening premium
 * - Training
 * - Vacation pay
 * - Bonus / other earnings
 * - Estimated deductions
 * - Actual paycheck entry
 * - Budget Pool
 * - Supabase persistence
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
} from "../services/payrollCalculator";

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
    vacationPercent: 0,
    ded: 15,
  },

  {
    id: "zai-loblaws",
    person: "Zai",
    title: "Loblaws",
    employer: "Loblaws",
    rate: 17.6,
    otRate: 26.4,
    overtimeThreshold: 44,
    vacationPercent: 0,
    ded: 15,
  },

  {
    id: "ariel-witron",
    person: "Ariel",
    title: "Equipment Operator",
    employer: "Witron",
    rate: 21,
    otRate: 31.5,
    overtimeThreshold: 44,
    vacationPercent: 0,
    ded: 20,
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

function dateString(date = new Date()) {
  return date
    .toISOString()
    .split("T")[0];
}

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function daysBetween(a, b) {
  const first =
    new Date(
      `${a}T00:00:00`
    );

  const second =
    new Date(
      `${b}T00:00:00`
    );

  return Math.round(
    (
      second.getTime() -
      first.getTime()
    ) /
      86400000
  );
}

/* =========================================================
   CANADIAN HOLIDAYS
========================================================= */

/**
 * These are recognized as common Canadian statutory/public
 * holidays for the Budget Blossom calendar.
 *
 * IMPORTANT:
 * Actual statutory-holiday entitlement/pay treatment depends
 * on province, employer and employment circumstances.
 *
 * Therefore Budget Blossom DETECTS the holiday but lets the
 * user select the applicable employer treatment.
 */

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor(
    (b + 8) / 25
  );
  const g = Math.floor(
    (b - f + 1) / 3
  );

  const h =
    (
      19 * a +
      b -
      d -
      g +
      15
    ) % 30;

  const i = Math.floor(c / 4);
  const k = c % 4;

  const l =
    (
      32 +
      2 * e +
      2 * i -
      h -
      k
    ) % 7;

  const m = Math.floor(
    (a + 11 * h + 22 * l) /
      451
  );

  const month = Math.floor(
    (h + l - 7 * m + 114) /
      31
  );

  const day =
    (
      (h + l - 7 * m + 114) %
        31
    ) + 1;

  return new Date(
    year,
    month - 1,
    day
  );
}

function mondayAfter(
  year,
  month,
  day
) {
  const d = new Date(
    year,
    month - 1,
    day
  );

  while (d.getDay() !== 1) {
    d.setDate(
      d.getDate() + 1
    );
  }

  return d;
}

function firstMonday(
  year,
  month
) {
  const d = new Date(
    year,
    month - 1,
    1
  );

  while (d.getDay() !== 1) {
    d.setDate(
      d.getDate() + 1
    );
  }

  return d;
}

function lastMonday(
  year,
  month
) {
  const d = new Date(
    year,
    month,
    0
  );

  while (d.getDay() !== 1) {
    d.setDate(
      d.getDate() - 1
    );
  }

  return d;
}

function canadaHolidays(year) {
  const holidays = [];

  const add = (
    date,
    name
  ) => {
    holidays.push({
      date: dateString(date),
      n: name,
    });
  };

  add(
    new Date(
      year,
      0,
      1
    ),
    "New Year's Day"
  );

  /*
   * Family Day — Ontario:
   * third Monday of February
   */
  const febFirstMonday =
    firstMonday(
      year,
      2
    );

  const familyDay =
    new Date(
      febFirstMonday
    );

  familyDay.setDate(
    familyDay.getDate() +
      14
  );

  add(
    familyDay,
    "Family Day"
  );

  /*
   * Good Friday
   */
  const easter =
    easterSunday(year);

  const goodFriday =
    new Date(easter);

  goodFriday.setDate(
    goodFriday.getDate() -
      2
  );

  add(
    goodFriday,
    "Good Friday"
  );

  /*
   * Victoria Day:
   * Monday before May 25
   */
  const victoria =
    new Date(
      year,
      4,
      24
    );

  while (
    victoria.getDay() !== 1
  ) {
    victoria.setDate(
      victoria.getDate() -
        1
    );
  }

  add(
    victoria,
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
   * Civic Holiday:
   * first Monday in August
   */
  add(
    firstMonday(
      year,
      8
    ),
    "Civic Holiday"
  );

  add(
    new Date(
      year,
      8,
      30
    ),
    "National Day for Truth and Reconciliation"
  );

  /*
   * Labour Day
   */
  add(
    firstMonday(
      year,
      9
    ),
    "Labour Day"
  );

  /*
   * Thanksgiving:
   * second Monday in October
   */
  const thanksgiving =
    firstMonday(
      year,
      10
    );

  thanksgiving.setDate(
    thanksgiving.getDate() +
      7
  );

  add(
    thanksgiving,
    "Thanksgiving Day"
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

function getHoliday(date) {
  if (!date) {
    return null;
  }

  const year =
    Number(
      String(date).slice(0, 4)
    );

  return (
    canadaHolidays(
      year
    ).find(
      holiday =>
        holiday.date ===
        date
    ) ?? null
  );
}

/* =========================================================
   PAY PERIODS
========================================================= */

/**
 * Budget Blossom uses semi-monthly periods:
 *
 * 1st–15th  → 15th payday
 * 16th–end  → last day payday
 *
 * If your employer uses different payroll dates,
 * the structure can be changed here without touching
 * the payroll calculation engine.
 */

function buildPeriods(
  year,
  month
) {
  const days =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  return [
    {
      k: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-01_15`,

      start:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-01`,

      end:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-15`,

      pd:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-15`,

      lbl: "1st–15th",
    },

    {
      k: `${year}-${String(
        month + 1
      ).padStart(2, "0")}-16_${days}`,

      start:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-16`,

      end:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          days
        ).padStart(2, "0")}`,

      pd:
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          days
        ).padStart(2, "0")}`,

      lbl: `16th–${days}th`,
    },
  ];
}

function getCurrentPeriod() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  const day =
    today.getDate();

  const periods =
    buildPeriods(
      year,
      month
    );

  return day <= 15
    ? 0
    : 1;
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
        fontSize: "10px",
        fontWeight: 700,
        color:
          "var(--color-text-soft)",
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
  padding: "9px 10px",
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
      disabled={disabled}
      onClick={onClick}
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
        fontWeight: 700,
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

/* =========================================================
   PERIOD NAV
========================================================= */

function PeriodNav({
  period,
  pidx,
  onChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
      }}
    >
      {[-1, 0, 1].map(
        offset => {
          const today =
            new Date();

          today.setMonth(
            today.getMonth() +
              offset
          );

          const periods =
            buildPeriods(
              today.getFullYear(),
              today.getMonth()
            );

          return periods.map(
            (item, index) => {
              const active =
                item.k ===
                period?.k;

              return (
                <button
                  key={
                    `${offset}-${index}`
                  }
                  type="button"
                  onClick={() =>
                    onChange({
                      period:
                        item,
                      index:
                        index,
                    })
                  }
                  style={{
                    flex: 1,
                    padding:
                      "8px 5px",
                    border: active
                      ? "1.5px solid var(--primary, #e8708a)"
                      : "1px solid var(--color-border)",
                    borderRadius:
                      "var(--radius-md)",
                    background:
                      active
                        ? "var(--primary-bg, #fce8ee)"
                        : "#fff",
                    color:
                      active
                        ? "var(--primary, #e8708a)"
                        : "var(--color-text-soft)",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor:
                      "pointer",
                  }}
                >
                  {item.lbl}
                  <br />
                  <span
                    style={{
                      fontSize:
                        9,
                      opacity:
                        0.7,
                    }}
                  >
                    {formatDate(
                      item.pd
                    )}
                  </span>
                </button>
              );
            }
          );
        }
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
  onAddShift,
  onRemoveShift,
  onSendEstimated,
  onSendActual,
  onRemoveJob,
  period,
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
    "30"
  );

  const [
    payType,
    setPayType,
  ] = useState(
    "regular"
  );

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

  const [
    bonus,
    setBonus,
  ] = useState("");

  const [
    otherEarnings,
    setOtherEarnings,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

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

  const shiftPreview =
    calculateShift({
      date,
      startTime,
      endTime,
      unpaidBreakMinutes:
        Number(
          breakMinutes
        ) || 0,

      hourlyRate:
        Number(job.rate),

      overtimeThreshold:
        Number(
          job.overtimeThreshold ??
            44
        ),

      overtimeMultiplier:
        1.5,

      isStatHoliday:
        payType !==
          "regular" &&
        payType !==
          "overtime",

      statMultiplier:
        payType ===
        "stat_2x"
          ? 2
          : payType ===
            "stat_1x"
          ? 1
          : 1.5,

      freezingPremium:
        Number(
          freezingPremium
        ) || 0,

      eveningPremium:
        Number(
          eveningPremium
        ) || 0,

      trainingHours:
        Number(
          trainingHours
        ) || 0,

      bonus:
        Number(bonus) || 0,

      otherEarnings:
        Number(
          otherEarnings
        ) || 0,
    });

  const calculatorShifts =
    shifts.map(
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
          1.5,

        isStatHoliday:
          Boolean(
            shift.isStatHoliday
          ),

        statMultiplier:
          shift.statMultiplier ??
          1.5,
      })
    );

  const paycheck =
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
                job.overtimeThreshold ??
                  44
              ),
          }
        )
      : null;

  const estimatedNet =
    paycheck
      ? estimateNetPay(
          paycheck.grossPay,
          job.ded
        )
      : 0;

  function addShift() {
    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      alert(
        "Please enter the date, start time and end time."
      );

      return;
    }

    let isStatHoliday =
      false;

    let statMultiplier =
      1;

    if (
      payType ===
        "stat_1x" ||
      payType ===
        "stat_1_5x" ||
      payType ===
        "stat_2x"
    ) {
      isStatHoliday =
        true;

      statMultiplier =
        payType ===
        "stat_2x"
          ? 2
          : payType ===
            "stat_1x"
          ? 1
          : 1.5;
    }

    const shift = {
      id:
        crypto.randomUUID(),

      date,

      startTime,

      endTime,

      unpaidBreakMinutes:
        Number(
          breakMinutes
        ) || 0,

      hourlyRate:
        Number(job.rate) || 0,

      overtimeThreshold:
        Number(
          job.overtimeThreshold ??
            44
        ),

      overtimeMultiplier:
        1.5,

      isStatHoliday,

      statMultiplier,

      freezingPremium:
        Number(
          freezingPremium
        ) || 0,

      eveningPremium:
        Number(
          eveningPremium
        ) || 0,

      trainingHours:
        Number(
          trainingHours
        ) || 0,

      bonus:
        Number(bonus) || 0,

      otherEarnings:
        Number(
          otherEarnings
        ) || 0,

      notes,

      /*
       * Legacy compatibility
       */
      inT: startTime,
      outT: endTime,
      brk:
        Number(
          breakMinutes
        ) || 0,

      type:
        payType,

      rate:
        Number(job.rate) || 0,

      hol:
        holiday?.n ??
        null,
    };

    const calculation =
      calculateShift(
        shift
      );

    onAddShift(
      job.id,
      {
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
          (
            Number(
              shift.freezingPremium
            ) > 0 ||
            Number(
              shift.eveningPremium
            ) > 0
          )
            ? calculation.hours
            : 0,

        trainingHours:
          calculation.trainingHours,
      }
    );

    setStartTime(
      "09:00"
    );

    setEndTime(
      "17:00"
    );

    setBreakMinutes(
      "30"
    );

    setPayType(
      "regular"
    );

    setFreezingPremium(
      ""
    );

    setEveningPremium(
      ""
    );

    setTrainingHours(
      ""
    );

    setBonus("");

    setOtherEarnings("");

    setNotes("");
  }

  function sendActual() {
    const net =
      Number(actualNet);

    if (
      !Number.isFinite(
        net
      ) ||
      net <= 0
    ) {
      alert(
        "Enter the actual net paycheck amount."
      );

      return;
    }

    const gross =
      Number(actualGross) ||
      paycheck?.grossPay ||
      net;

    onSendActual(
      job.id,
      net,
      gross,
      estimatedNet
    );

    setActualNet("");
    setActualGross("");
  }

  return (
    <section
      style={{
        background:
          "var(--color-bg-card)",
        border:
          "1px solid var(--color-border)",
        borderRadius:
          "var(--radius-xl)",
        boxShadow:
          "var(--shadow-card)",
        padding: 15,
        marginBottom: 14,
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 7,
              flexWrap:
                "wrap",
            }}
          >
            <span
              style={{
                background:
                  "var(--primary, #e8708a)",
                color: "#fff",
                borderRadius:
                  6,
                padding:
                  "2px 7px",
                fontSize: 9,
                fontWeight: 800,
              }}
            >
              {job.person}
            </span>

            <strong
              style={{
                fontFamily:
                  "var(--font-display)",
                fontSize: 16,
              }}
            >
              {job.title}
            </strong>
          </div>

          <div
            style={{
              marginTop: 3,
              color:
                "var(--color-text-soft)",
              fontSize: 11,
            }}
          >
            {money(job.rate)}
            /hr · OT{" "}
            {money(
              job.otRate ??
                job.rate *
                  1.5
            )}
            /hr ·{" "}
            {job.employer}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onRemoveJob(
              job.id
            )
          }
          style={{
            border: "none",
            background:
              "transparent",
            color:
              "var(--color-text-faint)",
            cursor:
              "pointer",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* HOLIDAY */}

      {holiday && (
        <div
          style={{
            background:
              "#fff8e8",
            border:
              "1px solid #ead69a",
            borderRadius:
              10,
            padding:
              "9px 11px",
            marginBottom:
              12,
            color:
              "#805c18",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          🎉 {holiday.n}
          <div
            style={{
              marginTop: 3,
              fontWeight: 500,
            }}
          >
            Choose the pay treatment
            that applies to your
            employer.
          </div>
        </div>
      )}

      {/* WORK FORM */}

      <div
        style={{
          borderTop:
            "1px solid var(--color-border-soft)",
          paddingTop: 12,
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
            letterSpacing:
              ".08em",
            marginBottom: 9,
          }}
        >
          Log Work Hours
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 9,
          }}
        >
          <div>
            <Label>
              Date
            </Label>

            <input
              type="date"
              value={date}
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
              Pay Type
            </Label>

            <select
              value={payType}
              onChange={e =>
                setPayType(
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
                Stat Holiday — 1×
              </option>

              <option value="stat_1_5x">
                Stat Holiday — 1.5×
              </option>

              <option value="stat_2x">
                Stat Holiday — 2×
              </option>
            </select>
          </div>

          <div>
            <Label>
              Start Time
            </Label>

            <input
              type="time"
              value={startTime}
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
              End Time
            </Label>

            <input
              type="time"
              value={endTime}
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
              Break Minutes
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

          <div>
            <Label>
              Freezing Premium $
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
              placeholder="0.00"
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Evening Premium $
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
              placeholder="0.00"
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
              placeholder="0"
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Bonus $
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={bonus}
              onChange={e =>
                setBonus(
                  e.target.value
                )
              }
              placeholder="0.00"
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <Label>
              Other Earnings $
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
              placeholder="0.00"
              style={
                inputStyle
              }
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 9,
          }}
        >
          <Label>
            Notes
          </Label>

          <textarea
            value={notes}
            onChange={e =>
              setNotes(
                e.target.value
              )
            }
            placeholder="Optional notes..."
            rows={2}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </div>

        {/* PREVIEW */}

        <div
          style={{
            marginTop: 10,
            padding: 10,
            background:
              "var(--color-bg-warm)",
            borderRadius: 10,
            display:
              "flex",
            justifyContent:
              "space-between",
            gap: 10,
            fontSize: 11,
          }}
        >
          <span>
            <strong>
              {shiftPreview.hours}
            </strong>{" "}
            hrs
          </span>

          <span>
            Estimated shift:
          </span>

          <strong>
            {money(
              shiftPreview.grossPay
            )}
          </strong>
        </div>

        <button
          type="button"
          onClick={addShift}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 11,
            border: "none",
            borderRadius:
              "var(--radius-md)",
            background:
              "var(--primary, #e8708a)",
            color: "#fff",
            fontWeight: 800,
            cursor:
              "pointer",
          }}
        >
          + Add Work Hours
        </button>
      </div>

      {/* SAVED SHIFTS */}

      {shifts.length > 0 && (
        <div
          style={{
            marginTop: 15,
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
              letterSpacing:
                ".08em",
              marginBottom: 7,
            }}
          >
            Saved Hours
          </div>

          {shifts.map(
            shift => (
              <div
                key={
                  shift.id
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 8,
                  padding:
                    "8px 0",
                  borderBottom:
                    "1px solid var(--color-border-soft)",
                  fontSize: 11,
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
                      color:
                        "var(--color-text-soft)",
                    }}
                  >
                    {shift.startTime ??
                      shift.inT}{" "}
                    –
                    {shift.endTime ??
                      shift.outT}
                    {" · "}
                    {shift.hrs ??
                      0}{" "}
                    hrs
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 7,
                  }}
                >
                  <strong>
                    {money(
                      shift.gross ??
                        0
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
                    ✕
                  </button>
                </div>
              </div>
            )
          )}

          {/* PAY ESTIMATE */}

          {paycheck && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background:
                  "#fdf2f8",
                border:
                  "1px solid #f9c3d7",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <div>
                  Regular
                  <strong
                    style={{
                      display:
                        "block",
                      fontSize: 14,
                    }}
                  >
                    {
                      paycheck.regularHours
                    }{" "}
                    hrs
                  </strong>
                </div>

                <div>
                  Overtime
                  <strong
                    style={{
                      display:
                        "block",
                      fontSize: 14,
                    }}
                  >
                    {
                      paycheck.overtimeHours
                    }{" "}
                    hrs
                  </strong>
                </div>

                <div>
                  Stat
                  <strong
                    style={{
                      display:
                        "block",
                      fontSize: 14,
                    }}
                  >
                    {
                      paycheck.statHours
                    }{" "}
                    hrs
                  </strong>
                </div>

                <div>
                  Premium
                  <strong
                    style={{
                      display:
                        "block",
                      fontSize: 14,
                    }}
                  >
                    {money(
                      paycheck.premiumPay
                    )}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #f9c3d7",
                  marginTop: 10,
                  paddingTop: 10,
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
                    Gross
                  </span>

                  <strong>
                    {money(
                      paycheck.grossPay
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 4,
                    color:
                      "var(--color-text-soft)",
                  }}
                >
                  <span>
                    Est. deductions
                  </span>

                  <span>
                    {money(
                      paycheck.grossPay -
                        estimatedNet
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 7,
                    fontSize: 16,
                  }}
                >
                  <strong>
                    Estimated Net
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
                  padding: 10,
                  border: "none",
                  borderRadius:
                    "var(--radius-md)",
                  background:
                    "#3a9080",
                  color: "#fff",
                  fontWeight: 800,
                  cursor:
                    "pointer",
                }}
              >
                💰 Send Estimated Net
                to Budget Pool
              </button>
            </div>
          )}

          {/* ACTUAL PAYCHECK */}

          <div
            style={{
              marginTop: 12,
              borderTop:
                "1px solid var(--color-border-soft)",
              paddingTop: 12,
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
                letterSpacing:
                  ".08em",
                marginBottom: 8,
              }}
            >
              Actual Paycheck
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
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Actual net $"
                value={
                  actualNet
                }
                onChange={e =>
                  setActualNet(
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Actual gross $"
                value={
                  actualGross
                }
                onChange={e =>
                  setActualGross(
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <button
              type="button"
              onClick={
                sendActual
              }
              style={{
                width: "100%",
                marginTop: 8,
                padding: 10,
                border:
                  "1px solid var(--color-border)",
                borderRadius:
                  "var(--radius-md)",
                background:
                  "#fff",
                color:
                  "var(--color-text)",
                fontWeight: 800,
                cursor:
                  "pointer",
              }}
            >
              ✓ Save Actual Paycheck
            </button>
          </div>
        </div>
      )}
    </section>
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
    <section
      style={{
        background:
          "var(--color-bg-card)",
        border:
          "1px solid var(--color-border)",
        borderRadius:
          "var(--radius-xl)",
        boxShadow:
          "var(--shadow-card)",
        padding: 15,
        marginBottom: 14,
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
              letterSpacing:
                ".08em",
            }}
          >
            Budget Pool
          </div>

          <div
            style={{
              fontFamily:
                "var(--font-display)",
              fontSize: 21,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {money(total)}
          </div>
        </div>

        <span
          style={{
            background:
              "#e8f7f4",
            color:
              "#3a9080",
            padding:
              "4px 8px",
            borderRadius: 99,
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          {period?.lbl}
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background:
              "var(--color-bg-warm)",
            color:
              "var(--color-text-soft)",
            fontSize: 11,
            textAlign:
              "center",
          }}
        >
          No income has been sent
          to the Budget Pool yet.
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
                gap: 8,
                padding:
                  "9px 0",
                borderBottom:
                  "1px solid var(--color-border-soft)",
              }}
            >
              <div>
                <strong
                  style={{
                    fontSize: 12,
                  }}
                >
                  {entry.src}
                </strong>

                <div
                  style={{
                    fontSize: 10,
                    color:
                      "var(--color-text-soft)",
                    marginTop: 2,
                  }}
                >
                  {formatDate(
                    entry.date
                  )}

                  {entry.isActual
                    ? " · Actual"
                    : " · Estimated"}
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 7,
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
                  ✕
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
   ADD JOB MODAL
========================================================= */

function AddJobModal({
  open,
  onClose,
  onAdd,
}) {
  const [
    person,
    setPerson,
  ] = useState(
    "Zai"
  );

  const [
    employer,
    setEmployer,
  ] = useState("");

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    rate,
    setRate,
  ] = useState("");

  const [
    threshold,
    setThreshold,
  ] = useState(
    "44"
  );

  const [
    deduction,
    setDeduction,
  ] = useState(
    "15"
  );

  const [
    vacation,
    setVacation,
  ] = useState(
    "0"
  );

  if (!open) {
    return null;
  }

  function add() {
    if (
      !employer.trim() ||
      !title.trim() ||
      !Number(rate)
    ) {
      alert(
        "Enter employer, job title and hourly rate."
      );

      return;
    }

    const hourlyRate =
      Number(rate);

    onAdd({
      id:
        crypto.randomUUID(),

      person,

      employer:
        employer.trim(),

      title:
        title.trim(),

      rate:
        hourlyRate,

      otRate:
        hourlyRate * 1.5,

      overtimeThreshold:
        Number(
          threshold
        ) || 44,

      vacationPercent:
        Number(
          vacation
        ) || 0,

      ded:
        Number(
          deduction
        ) || 0,
    });

    setEmployer("");
    setTitle("");
    setRate("");

    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "rgba(30,15,25,.45)",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width:
            "min(100%, 500px)",
          maxHeight:
            "90vh",
          overflow:
            "auto",
          background:
            "var(--color-bg-card)",
          borderRadius:
            "var(--radius-xl)",
          padding: 18,
          boxShadow:
            "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            marginBottom: 15,
          }}
        >
          <h2
            style={{
              fontFamily:
                "var(--font-display)",
              fontSize: 21,
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
              cursor:
                "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
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
              Person
            </Label>

            <select
              value={person}
              onChange={e =>
                setPerson(
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
              value={employer}
              onChange={e =>
                setEmployer(
                  e.target.value
                )
              }
              placeholder="Company name"
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
              value={title}
              onChange={e =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Job title"
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
              value={rate}
              onChange={e =>
                setRate(
                  e.target.value
                )
              }
              placeholder="21.00"
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
                "1fr 1fr",
              gap: 9,
            }}
          >
            <div>
              <Label>
                OT Threshold
              </Label>

              <input
                type="number"
                min="0"
                value={
                  threshold
                }
                onChange={e =>
                  setThreshold(
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
                Deduction %
              </Label>

              <input
                type="number"
                min="0"
                value={
                  deduction
                }
                onChange={e =>
                  setDeduction(
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
              Vacation Pay %
            </Label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                vacation
              }
              onChange={e =>
                setVacation(
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
              "flex",
            gap: 8,
            marginTop: 16,
          }}
        >
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>

          <div
            style={{
              flex: 1,
            }}
          >
            <Button
              onClick={add}
            >
              Add Employer
            </Button>
          </div>
        </div>
      </div>
    </div>
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
    addJobOpen,
    setAddJobOpen,
  ] = useState(false);

  const [
    pidx,
    setPidx,
  ] = useState(
    getCurrentPeriod()
  );

  /* -------------------------------------------------------
     CURRENT PERIOD
  ------------------------------------------------------- */

  const periods =
    useMemo(() => {
      const now =
        new Date();

      return buildPeriods(
        now.getFullYear(),
        now.getMonth()
      );
    }, []);

  const period =
    periods[pidx] ??
    periods[0];

  const periodKey =
    period?.k ?? "";

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
          row?.data ?? {};

        /*
         * Older versions stored budgetsbloom as JSON text.
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

        if (!dead) {
          setRawData(
            data
          );
        }
      } catch (err) {
        console.error(
          "Income load error:",
          err
        );

        if (!dead) {
          setError(
            "Unable to load salary data."
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
          } =
            await supabase
              .from(
                "user_data"
              )
              .select(
                "id, data"
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
                data: {
                  ...updated,
                },
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
            "Income save error:",
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

  const periodSent =
    sent[
      periodKey
    ] ?? [];

  const totalPool =
    periodSent.reduce(
      (
        sum,
        entry
      ) =>
        sum +
        numberOrZero(
          entry.amt
        ),
      0
    );

  /* -------------------------------------------------------
     ADD SHIFT
  ------------------------------------------------------- */

  function handleAddShift(
    jobId,
    shift
  ) {
    const key =
      `${jobId}|${periodKey}`;

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

  /* -------------------------------------------------------
     REMOVE SHIFT
  ------------------------------------------------------- */

  function handleRemoveShift(
    jobId,
    shiftId
  ) {
    const key =
      `${jobId}|${periodKey}`;

    const current =
      (
        shifts[key] ??
        []
      ).filter(
        shift =>
          shift.id !==
          shiftId
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

  /* -------------------------------------------------------
     SEND ESTIMATED PAY
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

    if (!job) {
      return;
    }

    const key =
      `${jobId}|${periodKey}`;

    const jobShifts =
      shifts[key] ??
      [];

    if (
      !jobShifts.length
    ) {
      setToast(
        "⚠️ No work hours to send"
      );

      return;
    }

    const calculatorShifts =
      jobShifts.map(
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
              job.overtimeThreshold ??
                44
            ),
        }
      );

    const estimatedGross =
      paycheck.grossPay;

    const estimatedNet =
      estimateNetPay(
        estimatedGross,
        job.ded
      );

    const entry = {
      src:
        `${job.person} — ${job.title}`,

      amt:
        Number(
          estimatedNet.toFixed(
            2
          )
        ),

      gross:
        Number(
          estimatedGross.toFixed(
            2
          )
        ),

      estimatedNet:
        Number(
          estimatedNet.toFixed(
            2
          )
        ),

      date:
        dateString(),

      person:
        job.person,

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
    };

    save({
      ...(rawData ?? {}),

      shifts: {
        ...shifts,

        [key]: [],
      },

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
        estimatedNet
      )} estimated pay → Budget Pool!`
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

    if (!job) {
      return;
    }

    const difference =
      actualNet -
      numberOrZero(
        estimatedNet
      );

    const entry = {
      src:
        `${job.person} — ${job.title}`,

      amt:
        Number(
          actualNet.toFixed(
            2
          )
        ),

      gross:
        Number(
          actualGross.toFixed(
            2
          )
        ),

      estimatedNet:
        numberOrZero(
          estimatedNet
        ),

      actualDifference:
        Number(
          difference.toFixed(
            2
          )
        ),

      date:
        dateString(),

      person:
        job.person,

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
        actualNet
      )} actual paycheck saved!`
    );
  }

  /* -------------------------------------------------------
     ADD JOB
  ------------------------------------------------------- */

  function handleAddJob(
    job
  ) {
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

  /* -------------------------------------------------------
     REMOVE JOB
  ------------------------------------------------------- */

  function handleRemoveJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job?"
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

  /* -------------------------------------------------------
     REMOVE POOL ENTRY
  ------------------------------------------------------- */

  function handleRemoveSent(
    index
  ) {
    if (
      !window.confirm(
        "Remove this entry from the pool?"
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
      "🗑 Entry removed from pool"
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

        paddingBottom: 90,
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin:
            "0 auto",
          padding:
            "14px",
        }}
      >
        {/* HEADER */}

        <header
          className="fade-up"
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
                  "var(--font-display, 'Playfair Display', serif)",
                fontSize: 28,
                lineHeight: 1.1,
              }}
            >
              Income & Work Hours
            </h1>

            <p
              style={{
                margin:
                  "6px 0 0",
                fontSize: 11,
                color:
                  "var(--color-text-soft)",
              }}
            >
              Log your hours and let
              Budget Blossom estimate
              your paycheck.
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
              padding: 12,
              marginBottom: 12,
              borderRadius: 12,
              background:
                "#fdedf1",
              border:
                "1px solid #f4a0b4",
              color:
                "#c94d6a",
              fontSize: 12,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign:
                "center",
              color:
                "var(--color-text-soft)",
            }}
          >
            Loading salary data…
          </div>
        ) : (
          <>
            {/* PERIODS */}

            <PeriodNav
              period={period}
              pidx={pidx}
              onChange={value => {
                if (
                  value?.period
                ) {
                  const index =
                    periods.findIndex(
                      item =>
                        item.k ===
                        value
                          .period
                          .k
                    );

                  if (
                    index >= 0
                  ) {
                    setPidx(
                      index
                    );
                  }
                }
              }}
            />

            {/* PERIOD SUMMARY */}

            <div
              style={{
                background:
                  "var(--primary-bg, #fdf2f8)",
                border:
                  "1px solid #f9c3d7",
                borderRadius: 12,
                padding:
                  "10px 12px",
                marginBottom: 13,
                fontSize: 11,
                color:
                  "var(--primary, #db2777)",
              }}
            >
              💰{" "}
              <strong>
                {formatDate(
                  period.start
                )}
              </strong>

              {" – "}

              <strong>
                {formatDate(
                  period.end
                )}
              </strong>

              {" · Payday "}

              <strong>
                {formatDate(
                  period.pd
                )}
              </strong>
            </div>

            {/* JOBS */}

            {jobs.map(
              job => (
                <JobCard
                  key={
                    job.id
                  }
                  job={job}
                  shifts={
                    shifts[
                      `${job.id}|${periodKey}`
                    ] ??
                    []
                  }
                  period={
                    period
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
                  onRemoveJob={
                    handleRemoveJob
                  }
                />
              )
            )}

            {/* POOL */}

            <PooledIncomeCard
              entries={
                periodSent
              }
              total={
                totalPool
              }
              period={
                period
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
                padding: 12,
                border:
                  "1.5px solid var(--color-border)",
                borderRadius:
                  "var(--radius-lg)",
                background:
                  "#fff",
                color:
                  "var(--color-text-soft)",
                fontWeight: 800,
                cursor:
                  "pointer",
              }}
            >
              + Add Another Job / Employer
            </button>
          </>
        )}
      </div>

      {/* ADD JOB */}

      <AddJobModal
        open={
          addJobOpen
        }
        onClose={() =>
          setAddJobOpen(
            false
          )
        }
        onAdd={
          handleAddJob
        }
      />

      {/* TOAST */}

      {toast && (
        <div
          style={{
            position:
              "fixed",
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
