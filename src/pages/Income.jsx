/**
 * Budget Blossom
 *
 * Income.jsx
 *
 * INCOME + WORK HOURS + PAYROLL
 *
 * IMPORTANT:
 * Work Hours → Pay Period → Payroll → Payday
 *
 * This version fixes:
 * - Open / Opened job buttons
 * - Job expansion
 * - Edit Job
 * - Add Hours
 * - New Job
 * - Delete Job
 * - Pay-period selection
 * - Work-hour persistence
 * - Payroll calculation
 * - Actual paycheck
 *
 * Existing Supabase structure preserved:
 *
 * user_data
 *   └── data
 *       └── budgetsbloom
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
];

/* =========================================================
   HELPERS
========================================================= */

function number(value) {
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
      minimumFractionDigits: 2,
    }
  )
    .format(number(value))
    .replace("CA$", "$");
}

function todayString() {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(
    d.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

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

function makeId(prefix = "id") {
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

function isDateInRange(
  date,
  start,
  end
) {
  if (!date || !start || !end) {
    return false;
  }

  return (
    date >= start &&
    date <= end
  );
}

/* =========================================================
   CANADIAN / ONTARIO HOLIDAYS
========================================================= */

function getEasterSunday(year) {
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
    (19 * a +
      b -
      d -
      g +
      15) %
    30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l =
    (32 +
      2 * e +
      2 * i -
      h -
      k) %
    7;
  const m = Math.floor(
    (a +
      11 * h +
      22 * l) /
      451
  );

  const month = Math.floor(
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

function dateKey(date) {
  const y =
    date.getFullYear();

  const m = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const d = String(
    date.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function canadaHolidays(year) {
  const holidays = [];

  function add(date, name) {
    holidays.push({
      date: dateKey(date),
      name,
    });
  }

  add(
    new Date(year, 0, 1),
    "New Year's Day"
  );

  const easter =
    getEasterSunday(year);

  const goodFriday =
    new Date(easter);

  goodFriday.setDate(
    goodFriday.getDate() - 2
  );

  add(
    goodFriday,
    "Good Friday"
  );

  add(
    new Date(year, 1, 16),
    "Family Day"
  );

  add(
    new Date(year, 4, 18),
    "Victoria Day"
  );

  add(
    new Date(year, 6, 1),
    "Canada Day"
  );

  const civic =
    new Date(year, 7, 1);

  while (
    civic.getDay() !== 1
  ) {
    civic.setDate(
      civic.getDate() + 1
    );
  }

  add(
    civic,
    "Civic Holiday"
  );

  const labour =
    new Date(year, 8, 1);

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
    new Date(year, 10, 11),
    "Remembrance Day"
  );

  const thanksgiving =
    new Date(year, 9, 1);

  while (
    thanksgiving.getDay() !== 1
  ) {
    thanksgiving.setDate(
      thanksgiving.getDate() + 1
    );
  }

  thanksgiving.setDate(
    thanksgiving.getDate() + 7
  );

  add(
    thanksgiving,
    "Thanksgiving"
  );

  add(
    new Date(year, 11, 25),
    "Christmas Day"
  );

  add(
    new Date(year, 11, 26),
    "Boxing Day"
  );

  return holidays;
}

function getHoliday(date) {
  if (!date) {
    return null;
  }

  const year =
    Number(date.slice(0, 4));

  return (
    canadaHolidays(year).find(
      holiday =>
        holiday.date === date
    ) ?? null
  );
}

/* =========================================================
   PAY PERIOD GENERATOR
========================================================= */

function buildPayPeriodsForJob(
  job,
  count = 18
) {
  const periods = [];

  /*
   * If the job has a configured period,
   * use it as the anchor.
   *
   * Otherwise create a useful biweekly
   * schedule around today.
   */

  const configuredStart =
    job?.payPeriodStart;

  const configuredEnd =
    job?.payPeriodEnd;

  const configuredPayday =
    job?.payday;

  if (
    configuredStart &&
    configuredEnd &&
    configuredPayday
  ) {
    const start =
      new Date(
        `${configuredStart}T00:00:00`
      );

    const end =
      new Date(
        `${configuredEnd}T00:00:00`
      );

    const payday =
      new Date(
        `${configuredPayday}T00:00:00`
      );

    const duration =
      Math.max(
        1,
        Math.round(
          (
            end.getTime() -
            start.getTime()
          ) /
            86400000
        ) + 1
      );

    for (
      let i = -count;
      i <= count;
      i++
    ) {
      const s =
        new Date(start);

      const e =
        new Date(end);

      const p =
        new Date(payday);

      s.setDate(
        s.getDate() +
          i * duration
      );

      e.setDate(
        e.getDate() +
          i * duration
      );

      p.setDate(
        p.getDate() +
          i * duration
      );

      periods.push({
        id: `${job.id}-${dateKey(s)}`,
        start: dateKey(s),
        end: dateKey(e),
        payday: dateKey(p),
      });
    }

    return periods.sort(
      (a, b) =>
        a.start.localeCompare(
          b.start
        )
    );
  }

  /*
   * Default:
   * Biweekly periods.
   */

  const today =
    new Date();

  const anchor =
    new Date(today);

  /*
   * Start from the most recent
   * Sunday-ish payroll anchor.
   */
  anchor.setDate(
    anchor.getDate() -
      13
  );

  for (
    let i = -count;
    i <= count;
    i++
  ) {
    const start =
      new Date(anchor);

    start.setDate(
      start.getDate() +
        i * 14
    );

    const end =
      new Date(start);

    end.setDate(
      end.getDate() + 13
    );

    const payday =
      new Date(end);

    payday.setDate(
      payday.getDate() + 5
    );

    periods.push({
      id: `${job.id}-${dateKey(
        start
      )}`,
      start: dateKey(start),
      end: dateKey(end),
      payday: dateKey(payday),
    });
  }

  return periods;
}

/* =========================================================
   STYLES
========================================================= */

const cardStyle = {
  background:
    "var(--color-bg-card, #ffffff)",
  border:
    "1px solid var(--color-border, #efdce5)",
  borderRadius:
    "var(--radius-xl, 16px)",
  boxShadow:
    "var(--shadow-card, 0 4px 18px rgba(70,30,50,.05))",
  padding: 14,
  marginBottom: 12,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border:
    "1px solid var(--color-border, #efdce5)",
  borderRadius: 10,
  background:
    "var(--color-bg-card, #fff)",
  color:
    "var(--color-text, #3a2430)",
  fontSize: 13,
  outline: "none",
};

function Label({
  children,
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 800,
        color:
          "var(--color-text-soft, #9b6b8a)",
        textTransform: "uppercase",
        letterSpacing: ".07em",
        marginBottom: 5,
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: secondary
          ? "1px solid var(--color-border, #efdce5)"
          : "none",

        background: danger
          ? "#fff0f3"
          : secondary
          ? "#fff"
          : "var(--primary, #db2777)",

        color: danger
          ? "#c94d6a"
          : secondary
          ? "var(--color-text-soft, #8f6a7c)"
          : "#fff",

        padding:
          "10px 13px",

        borderRadius: 10,
        fontSize: 12,
        fontWeight: 800,

        cursor: disabled
          ? "not-allowed"
          : "pointer",

        opacity: disabled
          ? 0.5
          : 1,

        touchAction:
          "manipulation",
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
  const initial =
    job ?? {
      id: makeId("job"),
      person: "Zai",
      title: "",
      employer: "",
      rate: "",
      otRate: "",
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
    ...initial,
  });

  function update(
    key,
    value
  ) {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    if (
      !String(
        form.employer ?? ""
      ).trim()
    ) {
      alert(
        "Please enter the employer name."
      );
      return;
    }

    if (
      number(form.rate) <= 0
    ) {
      alert(
        "Please enter a valid hourly rate."
      );
      return;
    }

    const rate =
      number(form.rate);

    const overtimeMultiplier =
      number(
        form.overtimeMultiplier
      ) || 1.5;

    onSave({
      ...form,

      id:
        form.id ??
        makeId("job"),

      person:
        form.person || "Zai",

      title:
        String(
          form.title ?? ""
        ).trim() ||
        String(
          form.employer ?? ""
        ).trim(),

      employer:
        String(
          form.employer ?? ""
        ).trim(),

      rate,

      otRate:
        number(form.otRate) ||
        Number(
          (
            rate *
            overtimeMultiplier
          ).toFixed(2)
        ),

      overtimeThreshold:
        number(
          form.overtimeThreshold
        ) || 44,

      overtimeMultiplier,

      vacationPercent:
        number(
          form.vacationPercent
        ),

      deductionPercent:
        number(
          form.deductionPercent ??
            form.ded
        ),

      ded:
        number(
          form.deductionPercent ??
            form.ded
        ),

      statMultiplier:
        number(
          form.statMultiplier
        ) || 1.5,

      freezingPremium:
        number(
          form.freezingPremium
        ),

      eveningPremium:
        number(
          form.eveningPremium
        ),

      breakMinutes:
        number(
          form.breakMinutes
        ) || 30,

      province:
        form.province ||
        "Ontario",

      active:
        form.active !== false,
    });
  }

  return (
    <div
      onClick={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "rgba(35,15,30,.48)",
        backdropFilter:
          "blur(4px)",
        display: "flex",
        alignItems:
          "flex-end",
        justifyContent:
          "center",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width:
            "min(680px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background:
            "var(--color-bg-card, #fff)",
          borderRadius:
            "20px 20px 0 0",
          padding: 18,
          boxSizing:
            "border-box",
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
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color:
                  "var(--color-text-soft, #9b6b8a)",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".1em",
              }}
            >
              Job Settings
            </div>

            <h2
              style={{
                margin:
                  "4px 0 0",
                fontFamily:
                  "var(--font-display, 'Playfair Display', serif)",
                fontSize: 24,
              }}
            >
              {job
                ? "Edit Job"
                : "New Job"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: "50%",
              background: "#fff5f8",
              color: "#9b6b8a",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <Label>
              Person
            </Label>

            <select
              value={
                form.person ?? "Zai"
              }
              onChange={e =>
                update(
                  "person",
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="Zai">
                Zai
              </option>

              <option value="Ariel">
                Ariel
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </div>

          <div>
            <Label>
              Job Title
            </Label>

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
              placeholder="Equipment Operator"
              style={inputStyle}
            />
          </div>

          <div>
            <Label>
              Employer
            </Label>

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
              placeholder="Witron"
              style={inputStyle}
            />
          </div>

          <div>
            <Label>
              Hourly Rate
            </Label>

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
              placeholder="21.00"
              style={inputStyle}
            />
          </div>

          <div>
            <Label>
              Pay Frequency
            </Label>

            <select
              value={
                form.payFrequency ??
                "biweekly"
              }
              onChange={e =>
                update(
                  "payFrequency",
                  e.target.value
                )
              }
              style={inputStyle}
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

          <div>
            <Label>
              Province
            </Label>

            <select
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
            >
              <option>
                Ontario
              </option>

              <option>
                Alberta
              </option>

              <option>
                British Columbia
              </option>

              <option>
                Manitoba
              </option>

              <option>
                Nova Scotia
              </option>

              <option>
                New Brunswick
              </option>

              <option>
                Saskatchewan
              </option>

              <option>
                Quebec
              </option>
            </select>
          </div>

          <div>
            <Label>
              OT Threshold
            </Label>

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
          </div>

          <div>
            <Label>
              OT Multiplier
            </Label>

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
          </div>

          <div>
            <Label>
              Stat Multiplier
            </Label>

            <input
              type="number"
              step="0.1"
              value={
                form.statMultiplier ??
                1.5
              }
              onChange={e =>
                update(
                  "statMultiplier",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <Label>
              Vacation %
            </Label>

            <input
              type="number"
              step="0.1"
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
          </div>

          <div>
            <Label>
              Estimated Deductions %
            </Label>

            <input
              type="number"
              step="0.1"
              value={
                form.deductionPercent ??
                form.ded ??
                15
              }
              onChange={e =>
                update(
                  "deductionPercent",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <Label>
              Default Break Minutes
            </Label>

            <input
              type="number"
              value={
                form.breakMinutes ??
                30
              }
              onChange={e =>
                update(
                  "breakMinutes",
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            background:
              "#fffaf1",
            border:
              "1px solid #f2dfb5",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#98701f",
              textTransform:
                "uppercase",
              marginBottom: 9,
            }}
          >
            Pay Schedule
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <Label>
                Pay Period Start
              </Label>

              <input
                type="date"
                value={
                  form.payPeriodStart ??
                  ""
                }
                onChange={e =>
                  update(
                    "payPeriodStart",
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <Label>
                Pay Period End
              </Label>

              <input
                type="date"
                value={
                  form.payPeriodEnd ??
                  ""
                }
                onChange={e =>
                  update(
                    "payPeriodEnd",
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div>
              <Label>
                Payday
              </Label>

              <input
                type="date"
                value={
                  form.payday ??
                  ""
                }
                onChange={e =>
                  update(
                    "payday",
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
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

          <button
            type="submit"
            style={{
              flex: 1,
              border: "none",
              background:
                "var(--primary, #db2777)",
              color: "#fff",
              padding: 12,
              borderRadius: 10,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save Job
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   ADD HOURS FORM
========================================================= */

function AddHoursForm({
  job,
  onAdd,
  onClose,
}) {
  const [
    date,
    setDate,
  ] = useState(
    todayString()
  );

  const [
    startTime,
    setStartTime,
  ] = useState(
    "08:00"
  );

  const [
    endTime,
    setEndTime,
  ] = useState(
    "16:00"
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
    payType,
    setPayType,
  ] = useState(
    "regular"
  );

  const [
    freezingPremium,
    setFreezingPremium,
  ] = useState(
    ""
  );

  const [
    eveningPremium,
    setEveningPremium,
  ] = useState(
    ""
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

  const holiday =
    getHoliday(date);

  const preview =
    calculateShift({
      date,
      startTime,
      endTime,
      unpaidBreakMinutes:
        number(
          breakMinutes
        ),
      hourlyRate:
        number(job?.rate),
      overtimeThreshold:
        number(
          job?.overtimeThreshold ??
            44
        ),
      overtimeMultiplier:
        number(
          job?.overtimeMultiplier ??
            1.5
        ),
      isStatHoliday:
        payType !== "regular" &&
        payType !== "overtime",
      statMultiplier:
        payType === "stat_2x"
          ? 2
          : payType ===
            "stat_1_5x"
          ? 1.5
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
        number(
          trainingHours
        ),
      bonus:
        number(bonus),
    });

  function submit(event) {
    event.preventDefault();

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
        "Please enter the start and end time."
      );
      return;
    }

    const stat =
      payType ===
        "stat_1x" ||
      payType ===
        "stat_1_5x" ||
      payType ===
        "stat_2x";

    const statMultiplier =
      payType ===
      "stat_2x"
        ? 2
        : payType ===
          "stat_1_5x"
        ? 1.5
        : 1;

    const shift = {
      id: makeId("shift"),

      jobId: job.id,

      date,

      startTime,

      endTime,

      unpaidBreakMinutes:
        number(
          breakMinutes
        ),

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
        Boolean(
          holiday
        ) || stat,

      statMultiplier:

        stat
          ? statMultiplier
          : number(
              job.statMultiplier ??
                1
            ),

      freezingPremium:
        number(
          freezingPremium
        ),

      eveningPremium:
        number(
          eveningPremium
        ),

      trainingHours:
        number(
          trainingHours
        ),

      bonus:
        number(bonus),

      otherEarnings: 0,

      type: payType,

      hol:
        holiday?.name ??
        null,

      holidayName:
        holiday?.name ??
        null,

      /*
       * Legacy compatibility.
       */
      inT: startTime,
      outT: endTime,
      brk:
        number(
          breakMinutes
        ),
      rate:
        number(job.rate),
    };

    const calculated =
      calculateShift(
        shift
      );

    onAdd({
      ...shift,

      hrs:
        calculated.hours,

      gross:
        calculated.grossPay,

      regularHours:
        calculated.regularHours,

      overtimeHours:
        calculated.overtimeHours,

      statHours:
        calculated.statHours,

      premiumHours:
        calculated.premiumHours,

      trainingHours:
        calculated.trainingHours,
    });
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 13,
        background:
          "#fff7fa",
        border:
          "1px solid #f4dce6",
        borderRadius: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#9b6b8a",
            textTransform:
              "uppercase",
          }}
        >
          Add Work Hours
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background:
              "transparent",
            fontSize: 20,
            color: "#9b6b8a",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      {holiday && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            background:
              "#fff8e8",
            border:
              "1px solid #f0d79e",
            borderRadius: 10,
            color: "#8a681f",
            fontSize: 11,
          }}
        >
          🇨🇦{" "}
          <strong>
            {holiday.name}
          </strong>{" "}
          detected.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 10,
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
            style={inputStyle}
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
            style={inputStyle}
          >
            <option value="regular">
              Regular
            </option>

            <option value="overtime">
              Overtime
            </option>

            <option value="stat_1x">
              Stat 1.0×
            </option>

            <option value="stat_1_5x">
              Stat 1.5×
            </option>

            <option value="stat_2x">
              Holiday OT 2.0×
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
            style={inputStyle}
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
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Unpaid Break
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
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Freezing Premium
          </Label>

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
            placeholder="$/shift"
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Evening Premium
          </Label>

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
            placeholder="$/shift"
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Training Hours
          </Label>

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
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Bonus
          </Label>

          <input
            type="number"
            step="0.01"
            value={bonus}
            onChange={e =>
              setBonus(
                e.target.value
              )
            }
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "#fff",
          borderRadius: 10,
          border:
            "1px solid #f0dce5",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#9b6b8a",
            textTransform:
              "uppercase",
            marginBottom: 8,
          }}
        >
          Shift Preview
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                color: "#9b6b8a",
              }}
            >
              PAID HOURS
            </div>

            <strong>
              {preview.hours.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "#9b6b8a",
              }}
            >
              RATE
            </div>

            <strong>
              {money(
                job.rate
              )}
              /hr
            </strong>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "#9b6b8a",
              }}
            >
              EST. GROSS
            </div>

            <strong>
              {money(
                preview.grossPay
              )}
            </strong>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
        }}
      >
        <Button
          secondary
          onClick={onClose}
        >
          Cancel
        </Button>

        <button
          type="submit"
          onClick={submit}
          style={{
            flex: 1,
            border: "none",
            background:
              "var(--primary, #db2777)",
            color: "#fff",
            padding: 11,
            borderRadius: 10,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          + Add Work Hours
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   JOB CARD
========================================================= */

function JobCard({
  job,
  isOpen,
  onOpen,
  shifts,
  period,
  onAddShift,
  onDeleteShift,
  onEdit,
  onDelete,
  payroll,
}) {
  const [
    showHours,
    setShowHours,
  ] = useState(false);

  const jobShifts =
    shifts.filter(
      shift =>
        period &&
        isDateInRange(
          shift.date,
          period.start,
          period.end
        )
    );

  const totalHours =
    jobShifts.reduce(
      (sum, shift) => {
        const calculation =
          calculateShift({
            ...shift,
            hourlyRate:
              shift.hourlyRate ??
              job.rate,
          });

        return (
          sum +
          number(
            calculation.hours
          )
        );
      },
      0
    );

  return (
    <section
      style={{
        background:
          "var(--color-bg-card, #fff)",
        border:
          isOpen
            ? "2px solid var(--primary, #db2777)"
            : "1px solid var(--color-border, #efdce5)",
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        boxShadow:
          "var(--shadow-card, 0 4px 18px rgba(70,30,50,.05))",
      }}
    >
      {/* JOB HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onOpen}
          style={{
            flex: 1,
            border: "none",
            background:
              "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color:
                "var(--color-text, #241a29)",
            }}
          >
            {job.person} —{" "}
            {job.employer}
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color:
                "var(--color-text-soft, #9b6b8a)",
            }}
          >
            {job.title ||
              job.employer}
            {" · "}
            {money(job.rate)}
            /hr
          </div>
        </button>

        <button
          type="button"
          onClick={onOpen}
          style={{
            minWidth: 96,
            border:
              isOpen
                ? "none"
                : "1px solid #f3dce6",
            background:
              isOpen
                ? "var(--primary, #db2777)"
                : "#fff6fa",
            color:
              isOpen
                ? "#fff"
                : "var(--primary, #db2777)",
            borderRadius: 12,
            padding:
              "11px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {isOpen
            ? "Opened"
            : "Open"}
        </button>
      </div>

      {/* OPEN CONTENT */}

      {isOpen && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop:
              "1px solid #f2dfe7",
          }}
        >
          {/* ACTION BUTTONS */}

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <Button
              onClick={() =>
                setShowHours(
                  current =>
                    !current
                )
              }
            >
              {showHours
                ? "Close Hours"
                : "+ Add Hours"}
            </Button>

            <Button
              secondary
              onClick={onEdit}
            >
              ✏️ Edit Job
            </Button>

            <Button
              danger
              onClick={onDelete}
            >
              Delete Job
            </Button>
          </div>

          {/* ADD HOURS */}

          {showHours && (
            <AddHoursForm
              job={job}
              onClose={() =>
                setShowHours(false)
              }
              onAdd={shift => {
                onAddShift(
                  shift
                );

                setShowHours(
                  false
                );
              }}
            />
          )}

          {/* PAY SCHEDULE */}

          <div
            style={{
              background:
                "#fffaf1",
              border:
                "1px solid #f2dfb5",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#98701f",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".08em",
              }}
            >
              Pay Schedule
            </div>

            {job.payPeriodStart &&
            job.payPeriodEnd &&
            job.payday ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#765f3c",
                  lineHeight: 1.6,
                }}
              >
                Pay period:{" "}
                <strong>
                  {formatDate(
                    job.payPeriodStart
                  )}{" "}
                  –{" "}
                  {formatDate(
                    job.payPeriodEnd
                  )}
                </strong>

                <br />

                Payday:{" "}
                <strong
                  style={{
                    color:
                      "#d23b75",
                  }}
                >
                  {formatDate(
                    job.payday
                  )}
                </strong>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background:
                    "#fff",
                  borderRadius: 9,
                  fontSize: 11,
                  color: "#765f3c",
                }}
              >
                ⚠️ Pay schedule needs
                to be configured.
                Tap{" "}
                <strong>
                  Edit Job
                </strong>{" "}
                and enter the actual
                pay-period dates and
                payday.
              </div>
            )}
          </div>

          {/* CURRENT PERIOD */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background:
                  "#fff7fa",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#9b6b8a",
                }}
              >
                HOURS
              </div>

              <strong>
                {totalHours.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#fff7fa",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#9b6b8a",
                }}
              >
                GROSS
              </div>

              <strong>
                {money(
                  payroll?.grossPay
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#fff7fa",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#9b6b8a",
                }}
              >
                EST. NET
              </div>

              <strong>
                {money(
                  payroll?.netPay
                )}
              </strong>
            </div>
          </div>

          {/* WORK HOURS */}

          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9b6b8a",
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              marginBottom: 7,
            }}
          >
            Work Hours
          </div>

          {jobShifts.length ===
          0 ? (
            <div
              style={{
                padding: 12,
                textAlign: "center",
                background:
                  "#fff8fb",
                borderRadius: 10,
                color: "#9b6b8a",
                fontSize: 11,
              }}
            >
              No work hours entered
              for this pay period yet.
            </div>
          ) : (
            <div>
              {jobShifts.map(
                shift => {
                  const calculated =
                    calculateShift({
                      ...shift,
                      hourlyRate:
                        shift.hourlyRate ??
                        job.rate,
                    });

                  return (
                    <div
                      key={
                        shift.id
                      }
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        padding:
                          "10px 0",
                        borderBottom:
                          "1px solid #f3e2e9",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {formatDate(
                            shift.date
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color:
                              "#9b6b8a",
                          }}
                        >
                          {
                            shift.startTime
                          }{" "}
                          –{" "}
                          {
                            shift.endTime
                          }
                          {" · "}
                          {calculated.hours.toFixed(
                            2
                          )}{" "}
                          paid hrs
                        </div>

                        {shift.holidayName && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              color:
                                "#b77b1d",
                            }}
                          >
                            🇨🇦{" "}
                            {
                              shift.holidayName
                            }
                          </div>
                        )}

                        {shift.type && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              color:
                                "#9b6b8a",
                            }}
                          >
                            Pay type:{" "}
                            {
                              shift.type
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
                            calculated.grossPay
                          )}
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            onDeleteShift(
                              shift.id
                            )
                          }
                          style={{
                            display:
                              "block",
                            marginTop: 5,
                            marginLeft:
                              "auto",
                            border: "none",
                            background:
                              "transparent",
                            color:
                              "#c94d6a",
                            fontSize: 10,
                            cursor:
                              "pointer",
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

          {/* PAYCHECK */}

          <div
            style={{
              marginTop: 13,
              padding: 12,
              background:
                "#f7fbf8",
              border:
                "1px solid #d9eee2",
              borderRadius: 11,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#4c8b65",
                textTransform:
                  "uppercase",
                marginBottom: 8,
              }}
            >
              Paycheck Estimate
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              <span>
                Regular
              </span>

              <strong>
                {payroll?.regularHours?.toFixed(
                  2
                ) ?? "0.00"}{" "}
                hrs ·{" "}
                {money(
                  payroll?.regularPay
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              <span>
                Overtime
              </span>

              <strong>
                {payroll?.overtimeHours?.toFixed(
                  2
                ) ?? "0.00"}{" "}
                hrs ·{" "}
                {money(
                  payroll?.overtimePay
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              <span>
                Holiday
              </span>

              <strong>
                {money(
                  payroll?.statPay
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 11,
                paddingTop: 8,
                marginTop: 6,
                borderTop:
                  "1px solid #d9eee2",
              }}
            >
              <strong>
                Estimated Gross
              </strong>

              <strong>
                {money(
                  payroll?.grossPay
                )}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 13,
                marginTop: 5,
                color: "#3f7656",
              }}
            >
              <strong>
                Estimated Net
              </strong>

              <strong>
                {money(
                  payroll?.netPay
                )}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   MAIN INCOME
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

  /*
   * THIS IS THE IMPORTANT STATE.
   *
   * Only one job is open at a time.
   */
  const [
    openJobId,
    setOpenJobId,
  ] = useState(null);

  const [
    jobEditor,
    setJobEditor,
  ] = useState(null);

  const [
    selectedPeriodIds,
    setSelectedPeriodIds,
  ] = useState({});

  /* =========================================================
     LOAD SUPABASE
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data,
          error:
            loadError,
        } = await supabase
          .from("user_data")
          .select("data")
          .limit(1)
          .single();

        if (loadError) {
          throw loadError;
        }

        let budgetData =
          data?.data
            ?.budgetsbloom ??
          null;

        if (
          typeof budgetData ===
          "string"
        ) {
          try {
            budgetData =
              JSON.parse(
                budgetData
              );
          } catch {
            budgetData = {};
          }
        }

        if (!budgetData) {
          budgetData = {};
        }

        if (
          !cancelled
        ) {
          setRawData(
            budgetData
          );
        }
      } catch (err) {
        console.error(
          "Income load error:",
          err
        );

        if (
          !cancelled
        ) {
          setError(
            err?.message ??
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
      cancelled = true;
    };
  }, []);

  /* =========================================================
     SAVE
  ========================================================= */

  const save =
    useCallback(
      async updated => {
        setSaving(true);
        setToast("");

        try {
          const {
            data: row,
            error:
              rowError,
          } = await supabase
            .from("user_data")
            .select(
              "id,data"
            )
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

          const {
            error:
              updateError,
          } = await supabase
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
            "❌ Could not save. Please check your Supabase connection."
          );
        } finally {
          setSaving(false);
        }
      },
      []
    );

  /* =========================================================
     NORMALIZED DATA
  ========================================================= */

  const jobs =
    useMemo(() => {
      const stored =
        rawData?.jobs;

      if (
        Array.isArray(
          stored
        ) &&
        stored.length
      ) {
        return stored.map(
          job => ({
            ...job,

            active:
              job.active !==
              false,

            payFrequency:
              job.payFrequency ??
              "biweekly",

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

            statMultiplier:
              number(
                job.statMultiplier ??
                  1.5
              ),

            deductionPercent:
              number(
                job.deductionPercent ??
                  job.ded ??
                  15
              ),

            ded:
              number(
                job.ded ??
                  job.deductionPercent ??
                  15
              ),
          })
        );
      }

      return DEFAULT_JOBS;
    }, [
      rawData,
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

  const activeJobs =
    jobs.filter(
      job =>
        job.active !== false
    );

  /* =========================================================
     PEOPLE
  ========================================================= */

  const people =
    Array.from(
      new Set(
        activeJobs.map(
          job =>
            job.person
        )
      )
    );

  /* =========================================================
     PERIODS
  ========================================================= */

  const periodsByJob =
    useMemo(() => {
      const output = {};

      activeJobs.forEach(
        job => {
          output[job.id] =
            buildPayPeriodsForJob(
              job,
              12
            );
        }
      );

      return output;
    }, [
      activeJobs,
    ]);

  /* =========================================================
     SELECT PERIOD
  ========================================================= */

  function getSelectedPeriod(
    job
  ) {
    const periods =
      periodsByJob[
        job.id
      ] ?? [];

    if (
      !periods.length
    ) {
      return null;
    }

    const stored =
      selectedPeriodIds[
        job.id
      ];

    if (stored) {
      const found =
        periods.find(
          period =>
            period.id ===
            stored
        );

      if (found) {
        return found;
      }
    }

    const today =
      todayString();

    return (
      periods.find(
        period =>
          isDateInRange(
            today,
            period.start,
            period.end
          )
      ) ??
      periods[
        periods.length - 1
      ]
    );
  }

  function selectPeriod(
    jobId,
    periodId
  ) {
    setSelectedPeriodIds(
      current => ({
        ...current,
        [jobId]:
          periodId,
      })
    );
  }

  /* =========================================================
     JOB SHIFTS
  ========================================================= */

  function getJobShifts(
    jobId
  ) {
    const result = [];

    Object.entries(
      shifts
    ).forEach(
      ([key, values]) => {
        if (
          !key.startsWith(
            `${jobId}|`
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
              result.push({
                ...shift,
                jobId,
              });
            }
          );
        }
      }
    );

    /*
     * Legacy flat structure.
     */
    if (
      Array.isArray(
        shifts[jobId]
      )
    ) {
      shifts[jobId].forEach(
        shift => {
          result.push({
            ...shift,
            jobId,
          });
        }
      );
    }

    const unique =
      new Map();

    result.forEach(
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
  }

  /* =========================================================
     PAYROLL BY JOB
  ========================================================= */

  function calculateJobPayroll(
    job
  ) {
    const period =
      getSelectedPeriod(
        job
      );

    if (!period) {
      return null;
    }

    const jobShifts =
      getJobShifts(
        job.id
      );

    const periodShifts =
      jobShifts.filter(
        shift =>
          isDateInRange(
            shift.date,
            period.start,
            period.end
          )
      );

    if (
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
            job.rate,

          overtimeThreshold:
            shift.overtimeThreshold ??
            job.overtimeThreshold ??
            44,

          overtimeMultiplier:
            shift.overtimeMultiplier ??
            job.overtimeMultiplier ??
            1.5,

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
        })
      );

    return calculatePaycheck(
      calculatorShifts,
      {
        vacationPercent:
          number(
            job.vacationPercent
          ),

        federalTax: 0,
        cpp: 0,
        ei: 0,
        otherDeductions: 0,

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
  }

  /* =========================================================
     OPEN / CLOSE JOB
  ========================================================= */

  function toggleJob(
    jobId
  ) {
    setOpenJobId(
      current =>
        current === jobId
          ? null
          : jobId
    );
  }

  /* =========================================================
     ADD SHIFT
  ========================================================= */

  function handleAddShift(
    job,
    shift
  ) {
    const period =
      getSelectedPeriod(
        job
      );

    if (!period) {
      setToast(
        "⚠️ Configure the pay schedule first."
      );

      return;
    }

    const key =
      `${job.id}|${period.id}`;

    const current =
      shifts[key] ?? [];

    const next = {
      ...(rawData ?? {}),

      jobs,

      shifts: {
        ...shifts,

        [key]: [
          ...current,
          shift,
        ],
      },
    };

    /*
     * Calendar integration.
     *
     * We keep the same shift ID so
     * Calendar can use the same
     * source-of-truth record.
     */
    const existingCalendar =
      rawData
        ?.calendarEvents ??
      [];

    const holiday =
      getHoliday(
        shift.date
      );

    const calendarEvent = {
      id: shift.id,
      type: "work",
      date: shift.date,
      title: `${job.person} — ${job.employer}`,
      startTime:
        shift.startTime,
      endTime:
        shift.endTime,
      hours:
        shift.hrs ??
        0,
      estimatedEarnings:
        shift.gross ??
        0,
      payType:
        shift.type ??
        "regular",
      holiday:
        holiday?.name ??
        shift.hol ??
        null,
      jobId:
        job.id,
    };

    next.calendarEvents = [
      ...existingCalendar.filter(
        event =>
          event.id !==
          shift.id
      ),
      calendarEvent,
    ];

    save(next);

    setToast(
      "✅ Work hours added and connected to the paycheck."
    );
  }

  /* =========================================================
     DELETE SHIFT
  ========================================================= */

  function handleDeleteShift(
    job,
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
      ([key, values]) => {
        if (
          Array.isArray(
            values
          )
        ) {
          updatedShifts[key] =
            values.filter(
              shift =>
                shift.id !==
                shiftId
            );
        }
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

  /* =========================================================
     SAVE JOB
  ========================================================= */

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
            job,
          ];

    save({
      ...(rawData ?? {}),
      jobs:
        updatedJobs,
    });

    setJobEditor(null);

    /*
     * Automatically open the job
     * that was just created/edited.
     */
    setOpenJobId(
      job.id
    );

    setToast(
      "✅ Job settings saved."
    );
  }

  /* =========================================================
     DELETE JOB
  ========================================================= */

  function handleDeleteJob(
    jobId
  ) {
    if (
      !window.confirm(
        "Remove this job? Historical work hours will remain saved."
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

    if (
      openJobId ===
      jobId
    ) {
      setOpenJobId(
        null
      );
    }

    setToast(
      "🗑 Job removed."
    );
  }

  /* =========================================================
     SUMMARY
  ========================================================= */

  const householdSummary =
    useMemo(() => {
      const result = {
        hours: 0,
        gross: 0,
      };

      activeJobs.forEach(
        job => {
          const period =
            getSelectedPeriod(
              job
            );

          if (!period) {
            return;
          }

          const jobShifts =
            getJobShifts(
              job.id
            ).filter(
              shift =>
                isDateInRange(
                  shift.date,
                  period.start,
                  period.end
                )
            );

          jobShifts.forEach(
            shift => {
              const calculation =
                calculateShift({
                  ...shift,
                  hourlyRate:
                    shift.hourlyRate ??
                    job.rate,
                });

              result.hours +=
                calculation.hours;

              result.gross +=
                calculation.grossPay;
            }
          );
        }
      );

      return result;
    }, [
      activeJobs,
      shifts,
      selectedPeriodIds,
    ]);

  /* =========================================================
     RENDER
  ========================================================= */

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
            "var(--color-bg, #fdf6f8)",
          color:
            "var(--color-text-soft, #9b6b8a)",
          fontFamily:
            "var(--font-body, 'DM Sans', sans-serif)",
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
          "var(--color-bg, #fdf6f8)",
        color:
          "var(--color-text, #3a2430)",
        fontFamily:
          "var(--font-body, 'DM Sans', sans-serif)",
        paddingBottom: 100,
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
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          style={{
            padding:
              "28px 0 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color:
                "var(--color-text-soft, #9b6b8a)",
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
                "5px 0 0",
              fontFamily:
                "var(--font-display, 'Playfair Display', serif)",
              fontSize: 30,
              lineHeight: 1.1,
            }}
          >
            Income & Work Hours
          </h1>

          <p
            style={{
              margin:
                "7px 0 0",
              fontSize: 12,
              lineHeight: 1.5,
              color:
                "var(--color-text-soft, #9b6b8a)",
            }}
          >
            Enter your work once.
            Budget Blossom calculates
            the paycheck and keeps
            expected and actual pay
            separate.
          </p>
        </header>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background:
                "#fdedf1",
              border:
                "1px solid #f4a0b4",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              color: "#c94d6a",
              fontSize: 12,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* =================================================
            HOUSEHOLD SUMMARY
        ================================================= */}

        <section
          style={cardStyle}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color:
                "var(--color-text-soft, #9b6b8a)",
              letterSpacing:
                ".08em",
              textTransform:
                "uppercase",
              marginBottom: 10,
            }}
          >
            Household Income
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 9,
            }}
          >
            <div
              style={{
                background:
                  "#fff7fa",
                borderRadius: 11,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#9b6b8a",
                }}
              >
                HOURS THIS PERIOD
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 3,
                  fontSize: 18,
                }}
              >
                {householdSummary.hours.toFixed(
                  2
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#fff7fa",
                borderRadius: 11,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#9b6b8a",
                }}
              >
                EST. GROSS
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 3,
                  fontSize: 18,
                }}
              >
                {money(
                  householdSummary.gross
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* =================================================
            HOUSEHOLD INCOME SOURCES
        ================================================= */}

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
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color:
                  "var(--color-text-soft, #9b6b8a)",
                letterSpacing:
                  ".08em",
                textTransform:
                  "uppercase",
              }}
            >
              Household Income Sources
            </div>

            <Button
              onClick={() =>
                setJobEditor(
                  "new"
                )
              }
            >
              + New Job
            </Button>
          </div>

          {activeJobs.length ===
          0 ? (
            <div
              style={{
                textAlign:
                  "center",
                padding: 20,
                color:
                  "#9b6b8a",
                fontSize: 12,
              }}
            >
              No income sources
              yet.
              <br />
              <br />

              <Button
                onClick={() =>
                  setJobEditor(
                    "new"
                  )
                }
              >
                + Add Job
              </Button>
            </div>
          ) : (
            activeJobs.map(
              job => {
                const isOpen =
                  openJobId ===
                  job.id;

                return (
                  <JobCard
                    key={
                      job.id
                    }
                    job={job}
                    isOpen={
                      isOpen
                    }
                    onOpen={() =>
                      toggleJob(
                        job.id
                      )
                    }
                    shifts={
                      getJobShifts(
                        job.id
                      )
                    }
                    period={getSelectedPeriod(
                      job
                    )}
                    payroll={calculateJobPayroll(
                      job
                    )}
                    onAddShift={shift =>
                      handleAddShift(
                        job,
                        shift
                      )
                    }
                    onDeleteShift={shiftId =>
                      handleDeleteShift(
                        job,
                        shiftId
                      )
                    }
                    onEdit={() =>
                      setJobEditor(
                        job
                      )
                    }
                    onDelete={() =>
                      handleDeleteJob(
                        job.id
                      )
                    }
                  />
                );
              }
            )
          )}
        </section>

        {/* =================================================
            PAY PERIOD SELECTOR
        ================================================= */}

        {activeJobs.map(
          job => {
            if (
              openJobId !==
              job.id
            ) {
              return null;
            }

            const periods =
              periodsByJob[
                job.id
              ] ?? [];

            const selected =
              getSelectedPeriod(
                job
              );

            return (
              <section
                key={`${job.id}-period`}
                style={cardStyle}
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
                      10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          "#98701f",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Pay Period
                    </div>

                    <div
                      style={{
                        marginTop:
                          3,
                        fontSize: 12,
                        color:
                          "#765f3c",
                      }}
                    >
                      {
                        job.employer
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color:
                        "#9b8050",
                    }}
                  >
                    Payday:{" "}
                    <strong>
                      {formatDate(
                        selected?.payday
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    gap: 7,
                    overflowX:
                      "auto",
                    paddingBottom:
                      4,
                  }}
                >
                  {periods
                    .filter(
                      period =>
                        period.start >=
                          periods[
                            Math.max(
                              0,
                              periods.length -
                                6
                            )
                          ]?.start
                    )
                    .map(
                      period => {
                        const active =
                          period.id ===
                          selected?.id;

                        return (
                          <button
                            key={
                              period.id
                            }
                            type="button"
                            onClick={() =>
                              selectPeriod(
                                job.id,
                                period.id
                              )
                            }
                            style={{
                              minWidth: 120,
                              padding:
                                "9px 8px",
                              border:
                                active
                                  ? "1.5px solid var(--primary, #db2777)"
                                  : "1px solid var(--color-border, #efdce5)",
                              borderRadius:
                                10,
                              background:
                                active
                                  ? "var(--primary-bg, #fce8ee)"
                                  : "#fff",
                              color:
                                active
                                  ? "var(--primary, #db2777)"
                                  : "var(--color-text, #3a2430)",
                              cursor:
                                "pointer",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 10,
                              }}
                            >
                              {formatDate(
                                period.start
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
                                period.end
                              )}
                            </span>

                            <br />

                            <span
                              style={{
                                fontSize: 9,
                                color:
                                  "#d23b75",
                              }}
                            >
                              Pay{" "}
                              {formatDate(
                                period.payday
                              )}
                            </span>
                          </button>
                        );
                      }
                    )}
                </div>
              </section>
            );
          }
        )}

        {/* =================================================
            SAVING INDICATOR
        ================================================= */}

        {saving && (
          <div
            style={{
              position: "fixed",
              right: 15,
              bottom: 90,
              zIndex: 500,
              background:
                "#241a29",
              color: "#fff",
              padding:
                "8px 11px",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            Saving…
          </div>
        )}

        {/* =================================================
            TOAST
        ================================================= */}

        {toast && (
          <div
            onClick={() =>
              setToast("")
            }
            style={{
              position:
                "fixed",
              left: "50%",
              bottom: 85,
              transform:
                "translateX(-50%)",
              zIndex: 1200,
              background:
                "#241a29",
              color: "#fff",
              padding:
                "10px 14px",
              borderRadius: 11,
              fontSize: 11,
              fontWeight: 700,
              maxWidth:
                "90vw",
              textAlign:
                "center",
              boxShadow:
                "0 8px 25px rgba(0,0,0,.2)",
              cursor: "pointer",
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* =================================================
          JOB EDITOR
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
            setJobEditor(null)
          }
        />
      )}
    </div>
  );
}
