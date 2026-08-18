/**
 * Income.jsx
 * Budget Blossom
 *
 * Income + Work Hours + Payroll
 *
 * IMPORTANT FLOW
 *
 * Work Hours
 *     ↓
 * Pay Period
 *     ↓
 * Payroll Calculation
 *     ↓
 * Estimated Net
 *     ↓
 * Actual Paycheck
 *     ↓
 * Budget Pool
 *
 * The "Open" buttons in Household Income Sources select
 * the correct job and open that job's work/pay setup.
 *
 * Supabase structure preserved:
 *
 * user_data
 *   └── data
 *       └── budgetsbloom
 *           ├── jobs
 *           ├── shifts
 *           ├── sent
 *           ├── paychecks
 *           └── calendarEvents
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

    /*
     * Example from the existing Budget Blossom setup:
     * July 20 – August 2 → Payday August 7
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

  const d =
    new Date(
      `${value}T12:00:00`
    );

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;
}

function formatDate(value) {
  const d =
    parseDate(value);

  if (!d) {
    return "—";
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

function addDays(
  value,
  amount
) {
  const d =
    parseDate(value);

  if (!d) {
    return "";
  }

  d.setDate(
    d.getDate() + amount
  );

  return dateString(d);
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
    Math.floor(year / 100);

  const c =
    year % 100;

  const d =
    Math.floor(b / 4);

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
    Math.floor(c / 4);

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

  const add = (
    date,
    name
  ) => {
    holidays.push({
      date:
        dateString(date),
      name,
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

  add(
    new Date(
      year,
      8,
      1
    ),
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
    canadaHolidays(year)
      .find(
        holiday =>
          holiday.date ===
          value
      ) ??
    null
  );
}

/* =========================================================
   PAY PERIODS
========================================================= */

function buildConfiguredPeriods(
  job,
  count = 18
) {
  if (
    job?.payPeriodStart &&
    job?.payPeriodEnd &&
    job?.payday
  ) {
    const periods = [];

    let start =
      job.payPeriodStart;

    let end =
      job.payPeriodEnd;

    let payday =
      job.payday;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      periods.push({
        id:
          `${job.id}|${start}|${end}`,
        start,
        end,
        payday,
        label:
          `${formatDate(
            start
          )} – ${formatDate(
            end
          )}`,
      });

      const length =
        Math.max(
          1,
          daysBetween(
            start,
            end
          ) + 1
        );

      start =
        addDays(
          start,
          length
        );

      end =
        addDays(
          end,
          length
        );

      payday =
        addDays(
          payday,
          length
        );
    }

    return periods;
  }

  /*
   * If the job has not been configured yet,
   * create helpful upcoming biweekly periods.
   */
  const today =
    dateString();

  const periods = [];

  let start =
    addDays(
      today,
      -14
    );

  let end =
    addDays(
      start,
      13
    );

  let payday =
    addDays(
      end,
      5
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {
    periods.push({
      id:
        `${job?.id ?? "job"}|${start}|${end}`,
      start,
      end,
      payday,
      label:
        `${formatDate(
          start
        )} – ${formatDate(
          end
        )}`,
    });

    start =
      addDays(
        start,
        14
      );

    end =
      addDays(
        end,
        14
      );

    payday =
      addDays(
        payday,
        14
      );
  }

  return periods;
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

/* =========================================================
   INPUT STYLES
========================================================= */

const inputStyle = {
  width: "100%",
  padding:
    "10px 11px",
  border:
    "1px solid var(--color-border, #efd8e2)",
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

const cardStyle = {
  background:
    "var(--color-bg-card, #fff)",
  border:
    "1px solid var(--color-border, #f0dbe4)",
  borderRadius:
    "14px",
  padding: 14,
  marginBottom: 12,
};

function Label({
  children,
}) {
  return (
    <label
      style={{
        display:
          "block",
        marginBottom:
          5,
        fontSize:
          10,
        fontWeight:
          800,
        color:
          "var(--color-text-soft, #9b6b8a)",
        letterSpacing:
          ".07em",
        textTransform:
          "uppercase",
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
        border:
          danger
            ? "1px solid #f4c6d0"
            : secondary
            ? "1px solid #efd5df"
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

        fontSize:
          12,

        fontWeight:
          700,

        cursor:
          disabled
            ? "not-allowed"
            : "pointer",

        opacity:
          disabled
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
    ...initial,
  });

  function set(
    key,
    value
  ) {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  }

  function submit(
    event
  ) {
    event.preventDefault();

    if (
      !String(
        form.title ?? ""
      ).trim()
    ) {
      alert(
        "Job title is required."
      );
      return;
    }

    if (
      !String(
        form.employer ?? ""
      ).trim()
    ) {
      alert(
        "Employer is required."
      );
      return;
    }

    const rate =
      numberOrZero(
        form.rate
      );

    if (
      rate <= 0
    ) {
      alert(
        "Enter a valid hourly rate."
      );
      return;
    }

    const updated = {
      ...form,

      id:
        form.id ??
        makeId("job"),

      title:
        String(
          form.title
        ).trim(),

      employer:
        String(
          form.employer
        ).trim(),

      rate,

      otRate:
        Number(
          (
            rate *
            numberOrZero(
              form.overtimeMultiplier
            )
          ).toFixed(2)
        ),

      overtimeThreshold:
        numberOrZero(
          form.overtimeThreshold
        ) || 44,

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
        form.active !== false,
    };

    onSave(updated);
  }

  return (
    <div
      onClick={e => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position:
          "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "rgba(26,9,30,.45)",
        backdropFilter:
          "blur(4px)",
        display:
          "flex",
        alignItems:
          "flex-end",
        justifyContent:
          "center",
        padding: 0,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width:
            "100%",
          maxWidth:
            560,
          maxHeight:
            "92vh",
          overflowY:
            "auto",
          background:
            "#fff",
          borderRadius:
            "20px 20px 0 0",
          padding:
            "20px 16px 30px",
          boxShadow:
            "0 -10px 40px rgba(0,0,0,.15)",
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
              Employer Settings
            </div>

            <h2
              style={{
                margin:
                  "3px 0 0",
                fontSize:
                  20,
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
              border:
                "none",
              background:
                "#fdf2f8",
              width:
                34,
              height:
                34,
              borderRadius:
                "50%",
              cursor:
                "pointer",
            }}
          >
            ✕
          </button>
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
              Person
            </Label>

            <select
              value={
                form.person ??
                "Zai"
              }
              onChange={e =>
                set(
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
                form.employer ??
                ""
              }
              onChange={e =>
                set(
                  "employer",
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
              Job Title
            </Label>

            <input
              value={
                form.title ??
                ""
              }
              onChange={e =>
                set(
                  "title",
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
              Hourly Rate
            </Label>

            <input
              type="number"
              step="0.01"
              value={
                form.rate ??
                ""
              }
              onChange={e =>
                set(
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
              Overtime Threshold
            </Label>

            <input
              type="number"
              step="0.01"
              value={
                form.overtimeThreshold ??
                44
              }
              onChange={e =>
                set(
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
              Overtime Multiplier
            </Label>

            <input
              type="number"
              step="0.1"
              value={
                form.overtimeMultiplier ??
                1.5
              }
              onChange={e =>
                set(
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
              Stat Holiday Multiplier
            </Label>

            <select
              value={
                form.statMultiplier ??
                1.5
              }
              onChange={e =>
                set(
                  "statMultiplier",
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="1">
                1.0×
              </option>

              <option value="1.5">
                1.5×
              </option>

              <option value="2">
                2.0×
              </option>
            </select>
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
                set(
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
              Break Minutes
            </Label>

            <input
              type="number"
              value={
                form.breakMinutes ??
                30
              }
              onChange={e =>
                set(
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
              Freezing Premium / Hr
            </Label>

            <input
              type="number"
              step="0.01"
              value={
                form.freezingPremium ??
                0
              }
              onChange={e =>
                set(
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
              Evening Premium / Hr
            </Label>

            <input
              type="number"
              step="0.01"
              value={
                form.eveningPremium ??
                0
              }
              onChange={e =>
                set(
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

        <div
          style={{
            marginTop:
              18,
            padding:
              13,
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
              fontSize:
                10,
              fontWeight:
                800,
              color:
                "#98701f",
              letterSpacing:
                ".08em",
              textTransform:
                "uppercase",
              marginBottom:
                10,
            }}
          >
            Pay Schedule
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
                Pay Frequency
              </Label>

              <select
                value={
                  form.payFrequency ??
                  "biweekly"
                }
                onChange={e =>
                  set(
                    "payFrequency",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="biweekly">
                  Biweekly
                </option>

                <option value="semi-monthly">
                  Semi-monthly
                </option>

                <option value="weekly">
                  Weekly
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
                  set(
                    "province",
                    e.target.value
                  )
                }
                style={
                  inputStyle
                }
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
                  Newfoundland and Labrador
                </option>

                <option>
                  Prince Edward Island
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
                Pay Period Start
              </Label>

              <input
                type="date"
                value={
                  form.payPeriodStart ??
                  ""
                }
                onChange={e =>
                  set(
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
                  form.payPeriodEnd ??
                  ""
                }
                onChange={e =>
                  set(
                    "payPeriodEnd",
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
                gridColumn:
                  "1 / -1",
              }}
            >
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
                  set(
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
                9,
              fontSize:
                11,
              color:
                "#765f3c",
              lineHeight:
                1.5,
            }}
          >
            Example: July 20 –
            August 2 → Payday
            August 7. The app
            does not guess your
            actual payday.
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
            onClick={onClose}
          >
            Cancel
          </Button>

          <button
            type="submit"
            style={{
              flex: 1,
              border:
                "none",
              background:
                "#db2777",
              color:
                "#fff",
              padding:
                "11px 14px",
              borderRadius:
                10,
              fontWeight:
                800,
              cursor:
                "pointer",
            }}
          >
            ✓ Save Job
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   WORK HOURS EDITOR
========================================================= */

function WorkHoursForm({
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
      job.breakMinutes ??
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
    String(
      job.freezingPremium ??
        0
    )
  );

  const [
    eveningPremium,
    setEveningPremium,
  ] = useState(
    String(
      job.eveningPremium ??
        0
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
    otherEarnings,
    setOtherEarnings,
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

  const previewShift =
    useMemo(() => {
      let isStatHoliday =
        Boolean(holiday);

      let statMultiplier =
        numberOrZero(
          job.statMultiplier
        ) || 1.5;

      if (
        payType ===
        "regular"
      ) {
        isStatHoliday =
          false;

        statMultiplier = 1;
      }

      if (
        payType ===
        "stat_1x"
      ) {
        isStatHoliday =
          true;

        statMultiplier = 1;
      }

      if (
        payType ===
        "stat_1_5x"
      ) {
        isStatHoliday =
          true;

        statMultiplier = 1.5;
      }

      if (
        payType ===
        "stat_2x"
      ) {
        isStatHoliday =
          true;

        statMultiplier = 2;
      }

      return {
        date,
        startTime,
        endTime,

        unpaidBreakMinutes:
          numberOrZero(
            breakMinutes
          ),

        hourlyRate:
          numberOrZero(
            job.rate
          ),

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
          numberOrZero(
            bonus
          ),

        otherEarnings:
          numberOrZero(
            otherEarnings
          ),

        notes,
      };
    }, [
      date,
      startTime,
      endTime,
      breakMinutes,
      job,
      payType,
      freezingPremium,
      eveningPremium,
      trainingHours,
      bonus,
      otherEarnings,
      notes,
      holiday,
    ]);

  const calculation =
    useMemo(
      () =>
        calculateShift(
          previewShift
        ),
      [previewShift]
    );

  function submit(
    event
  ) {
    event.preventDefault();

    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      alert(
        "Enter the date, start time and end time."
      );

      return;
    }

    onAdd({
      ...previewShift,

      id: makeId("shift"),

      /*
       * Legacy compatibility
       */
      inT:
        startTime,

      outT:
        endTime,

      brk:
        numberOrZero(
          breakMinutes
        ),

      type:
        payType,

      rate:
        numberOrZero(
          job.rate
        ),

      hol:
        holiday?.name ??
        null,

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
          numberOrZero(
            freezingPremium
          ) > 0 ||
          numberOrZero(
            eveningPremium
          ) > 0
        )
          ? calculation.hours
          : 0,

      trainingHours:
        calculation.trainingHours,
    });

    setStartTime(
      "09:00"
    );

    setEndTime(
      "17:00"
    );

    setNotes("");
    setBonus("");
    setOtherEarnings("");
    setTrainingHours("");
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background:
          "#fff7fa",
        border:
          "1px solid #f7dce7",
        borderRadius:
          12,
        padding:
          13,
        marginTop:
          10,
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
          letterSpacing:
            ".08em",
          textTransform:
            "uppercase",
          marginBottom:
            10,
        }}
      >
        Add Work Hours
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
            Work Date
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
            Pay Treatment
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
            Start
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
            End
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
            Unpaid Break
          </Label>

          <input
            type="number"
            value={breakMinutes}
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
            Training Hours
          </Label>

          <input
            type="number"
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
            style={
              inputStyle
            }
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
            step="0.01"
            value={bonus}
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

        <div
          style={{
            gridColumn:
              "1 / -1",
          }}
        >
          <Label>
            Notes
          </Label>

          <input
            value={notes}
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
      </div>

      {holiday && (
        <div
          style={{
            marginTop:
              10,
            padding:
              "9px 10px",
            borderRadius:
              9,
            background:
              "#fffaf1",
            border:
              "1px solid #f2dfb5",
            color:
              "#765f3c",
            fontSize:
              11,
          }}
        >
          🎉 {holiday.name}
          {" — "}
          choose the applicable
          employer pay treatment.
        </div>
      )}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr 1fr",
          gap: 8,
          marginTop:
            10,
          padding:
            10,
          background:
            "#fff",
          borderRadius:
            10,
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
            {calculation.hours.toFixed(
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
            RATE
          </div>

          <strong>
            {money(
              job.rate
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
              calculation.grossPay
            )}
          </strong>
        </div>
      </div>

      <button
        type="submit"
        style={{
          width:
            "100%",
          marginTop:
            10,
          padding:
            11,
          border:
            "none",
          borderRadius:
            10,
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
   HOUSEHOLD INCOME SOURCE CARD
========================================================= */

function IncomeSourceCard({
  job,
  selected,
  onOpen,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap: 10,
        padding:
          "14px 0",
        borderBottom:
          "1px solid #f3dfe7",
      }}
    >
      <div
        style={{
          minWidth:
            0,
        }}
      >
        <div
          style={{
            fontSize:
              15,
            fontWeight:
              800,
            color:
              "#1a0f1e",
          }}
        >
          {job.person}
          {" — "}
          {job.employer}
        </div>

        <div
          style={{
            marginTop:
              4,
            fontSize:
              12,
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
          onOpen(job.id)
        }
        style={{
          flexShrink:
            0,
          border:
            "none",
          background:
            selected
              ? "#db2777"
              : "#fff5f9",
          color:
            selected
              ? "#fff"
              : "#db2777",
          borderRadius:
            12,
          padding:
            "10px 18px",
          fontWeight:
            800,
          fontSize:
            12,
          cursor:
            "pointer",
          touchAction:
            "manipulation",
        }}
      >
        {selected
          ? "Opened"
          : "Open"}
      </button>
    </div>
  );
}

/* =========================================================
   JOB DETAILS
========================================================= */

function JobDetails({
  job,
  period,
  shifts,
  payroll,
  estimatedNet,
  onEdit,
  onDelete,
  onAddShift,
  onDeleteShift,
  onSendEstimated,
  onSaveActual,
}) {
  const [
    showHours,
    setShowHours,
  ] = useState(false);

  const actual =
    null;

  return (
    <>
      {/* PAY SCHEDULE */}

      <section
        style={{
          ...cardStyle,
          background:
            "#fffaf1",
          border:
            "1px solid #f2dfb5",
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
            gap: 10,
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
                  "#98701f",
                textTransform:
                  "uppercase",
                letterSpacing:
                  ".08em",
              }}
            >
              PAY SCHEDULE
            </div>

            <h2
              style={{
                margin:
                  "4px 0 0",
                fontSize:
                  19,
              }}
            >
              {job.person}
              {" — "}
              {job.employer}
            </h2>
          </div>

          <Button
            secondary
            onClick={onEdit}
          >
            ✏️ Edit Job
          </Button>
        </div>

        {job.payPeriodStart &&
        job.payPeriodEnd &&
        job.payday ? (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr",
              gap: 8,
              marginTop:
                12,
            }}
          >
            <div
              style={{
                background:
                  "#fff",
                borderRadius:
                  9,
                padding:
                  9,
              }}
            >
              <div
                style={{
                  fontSize:
                    8,
                  color:
                    "#9b8050",
                }}
              >
                PAY PERIOD START
              </div>

              <strong
                style={{
                  fontSize:
                    11,
                }}
              >
                {formatDate(
                  job.payPeriodStart
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#fff",
                borderRadius:
                  9,
                padding:
                  9,
              }}
            >
              <div
                style={{
                  fontSize:
                    8,
                  color:
                    "#9b8050",
                }}
              >
                PAY PERIOD END
              </div>

              <strong
                style={{
                  fontSize:
                    11,
                }}
              >
                {formatDate(
                  job.payPeriodEnd
                )}
              </strong>
            </div>

            <div
              style={{
                background:
                  "#fff",
                borderRadius:
                  9,
                padding:
                  9,
              }}
            >
              <div
                style={{
                  fontSize:
                    8,
                  color:
                    "#9b8050",
                }}
              >
                PAYDAY
              </div>

              <strong
                style={{
                  fontSize:
                    11,
                  color:
                    "#d32770",
                }}
              >
                {formatDate(
                  job.payday
                )}
              </strong>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop:
                10,
              padding:
                11,
              background:
                "#fff",
              borderRadius:
                9,
              color:
                "#765f3c",
              fontSize:
                11,
              lineHeight:
                1.5,
            }}
          >
            ⚠️ Pay schedule needs
            to be configured.
            Tap <strong>Edit Job</strong>
            and enter the actual
            pay-period start, end,
            and payday.
          </div>
        )}
      </section>

      {/* WORK HOURS */}

      <section
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
              WORK HOURS
            </div>

            <div
              style={{
                marginTop:
                  3,
                fontSize:
                  12,
                color:
                  "#9b6b8a",
              }}
            >
              {shifts.length} shift
              {shifts.length ===
              1
                ? ""
                : "s"}{" "}
              entered
            </div>
          </div>

          <Button
            onClick={() =>
              setShowHours(
                value =>
                  !value
              )
            }
          >
            {showHours
              ? "Close"
              : "+ Add Hours"}
          </Button>
        </div>

        {showHours && (
          <WorkHoursForm
            job={job}
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

        {shifts.length >
        0 && (
          <div
            style={{
              marginTop:
                12,
            }}
          >
            {shifts.map(
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
                    alignItems:
                      "center",
                    gap: 8,
                    padding:
                      "10px 0",
                    borderTop:
                      "1px solid #f3dfe7",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        fontSize:
                          12,
                      }}
                    >
                      {formatDate(
                        shift.date
                      )}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          2,
                        fontSize:
                          10,
                        color:
                          "#9b6b8a",
                      }}
                    >
                      {shift.startTime}
                      {" – "}
                      {shift.endTime}
                      {" · "}
                      {numberOrZero(
                        shift.hrs
                      ).toFixed(2)}
                      {" hrs"}
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                    }}
                  >
                    <strong
                      style={{
                        color:
                          "#3a9080",
                        fontSize:
                          12,
                      }}
                    >
                      {money(
                        shift.gross
                      )}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        onDeleteShift(
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
          </div>
        )}
      </section>

      {/* PAYCHECK */}

      <section
        style={cardStyle}
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
          PAYCHECK
        </div>

        <div
          style={{
            marginTop:
              6,
            fontSize:
              12,
            color:
              "#9b6b8a",
          }}
        >
          Pay period
          {" "}
          <strong>
            {period
              ? `${formatDate(
                  period.start
                )} – ${formatDate(
                  period.end
                )}`
              : "—"}
          </strong>
        </div>

        <div
          style={{
            marginTop:
              3,
            fontSize:
              12,
            color:
              "#9b6b8a",
          }}
        >
          Payday
          {" "}
          <strong
            style={{
              color:
                "#db2777",
            }}
          >
            {period
              ? formatDate(
                  period.payday
                )
              : "—"}
          </strong>
        </div>

        {!payroll ? (
          <div
            style={{
              marginTop:
                12,
              padding:
                14,
              background:
                "#fff8fb",
              borderRadius:
                10,
              color:
                "#9b6b8a",
              fontSize:
                12,
            }}
          >
            Add work hours to
            calculate this paycheck.
          </div>
        ) : (
          <>
            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 8,
                marginTop:
                  12,
              }}
            >
              <div
                style={{
                  background:
                    "#fdf2f8",
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
                  REGULAR
                </div>

                <strong>
                  {numberOrZero(
                    payroll.regularHours
                  ).toFixed(2)}
                  {" hrs"}
                </strong>
              </div>

              <div
                style={{
                  background:
                    "#fdf2f8",
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
                  OVERTIME
                </div>

                <strong>
                  {numberOrZero(
                    payroll.overtimeHours
                  ).toFixed(2)}
                  {" hrs"}
                </strong>
              </div>

              <div
                style={{
                  background:
                    "#fdf2f8",
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
                  STAT
                </div>

                <strong>
                  {numberOrZero(
                    payroll.statHours
                  ).toFixed(2)}
                  {" hrs"}
                </strong>
              </div>

              <div
                style={{
                  background:
                    "#fdf2f8",
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
                  PREMIUM
                </div>

                <strong>
                  {money(
                    payroll.premiumPay
                  )}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop:
                  12,
                paddingTop:
                  12,
                borderTop:
                  "1px solid #f0dbe4",
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
                  Gross Pay
                </span>

                <strong>
                  {money(
                    payroll.grossPay
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
                    5,
                  color:
                    "#9b6b8a",
                }}
              >
                <span>
                  Estimated Deductions
                </span>

                <span>
                  {money(
                    numberOrZero(
                      payroll.grossPay
                    ) -
                      numberOrZero(
                        estimatedNet
                      )
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
                    8,
                  fontSize:
                    17,
                }}
              >
                <strong>
                  Estimated Net
                </strong>

                <strong
                  style={{
                    color:
                      "#db2777",
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
              onClick={
                onSendEstimated
              }
              style={{
                width:
                  "100%",
                marginTop:
                  12,
                padding:
                  11,
                border:
                  "none",
                borderRadius:
                  10,
                background:
                  "#3a9080",
                color:
                  "#fff",
                fontWeight:
                  800,
                cursor:
                  "pointer",
              }}
            >
              💰 Send Estimated Net
              to Budget Pool
            </button>
          </>
        )}

        {/* ACTUAL PAYCHECK */}

        <form
          onSubmit={
            onSaveActual
          }
          style={{
            marginTop:
              14,
            paddingTop:
              14,
            borderTop:
              "1px solid #f0dbe4",
          }}
        >
          <div
            style={{
              fontSize:
                10,
              fontWeight:
                800,
              color:
                "#3a9080",
              textTransform:
                "uppercase",
              letterSpacing:
                ".08em",
              marginBottom:
                9,
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
              gap: 8,
            }}
          >
            <div>
              <Label>
                Actual Net
              </Label>

              <input
                name="actualNet"
                type="number"
                step="0.01"
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
                name="actualGross"
                type="number"
                step="0.01"
                placeholder="Optional"
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              width:
                "100%",
              marginTop:
                9,
              padding:
                10,
              border:
                "1px solid #b9ddcf",
              borderRadius:
                10,
              background:
                "#eef8f4",
              color:
                "#3a806d",
              fontWeight:
                800,
              cursor:
                "pointer",
            }}
          >
            ✓ Save Actual Paycheck
          </button>
        </form>
      </section>

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "flex-end",
        }}
      >
        <Button
          danger
          onClick={onDelete}
        >
          Remove Job
        </Button>
      </div>
    </>
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

  /*
   * THIS IS THE IMPORTANT FIX.
   *
   * Clicking "Open" calls:
   *
   * setSelectedJobId(jobId)
   *
   * which controls the entire opened job.
   */
  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState("");

  const [
    selectedPeriodId,
    setSelectedPeriodId,
  ] = useState("");

  const [
    jobEditor,
    setJobEditor,
  ] = useState(null);

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let dead =
      false;

    async function load() {
      setLoading(true);
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
            .limit(1)
            .single();

        if (
          loadError
        ) {
          throw loadError;
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

        /*
         * Some older versions store
         * the Budget Blossom object inside
         * data.budgetsbloom.
         */
        if (
          data?.budgetsbloom
        ) {
          const blob =
            data.budgetsbloom;

          if (
            typeof blob ===
            "string"
          ) {
            try {
              data =
                JSON.parse(
                  blob
                );
            } catch {
              data = {};
            }
          } else {
            data =
              blob;
          }
        }

        if (!dead) {
          setRawData(
            data ?? {}
          );
        }
      } catch (
        err
      ) {
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
        setSaving(true);

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
              .limit(1)
              .single();

          if (
            rowError
          ) {
            throw rowError;
          }

          /*
           * Preserve the existing
           * user_data.data.budgetsbloom
           * structure.
           */
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
        } catch (
          err
        ) {
          console.error(
            "Income save error:",
            err
          );

          setToast(
            "❌ Save failed"
          );
        } finally {
          setSaving(false);
        }
      },
      []
    );

  /* =======================================================
     NORMALIZED DATA
  ======================================================= */

  const jobs =
    useMemo(() => {
      const stored =
        rawData?.jobs;

      if (
        !Array.isArray(
          stored
        ) ||
        stored.length ===
          0
      ) {
        return DEFAULT_JOBS;
      }

      return stored.map(
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

          overtimeThreshold:
            numberOrZero(
              job.overtimeThreshold ??
                44
            ) || 44,

          overtimeMultiplier:
            numberOrZero(
              job.overtimeMultiplier ??
                1.5
            ) || 1.5,

          statMultiplier:
            numberOrZero(
              job.statMultiplier ??
                1.5
            ) || 1.5,

          deductionPercent:
            numberOrZero(
              job.deductionPercent ??
                job.ded ??
                15
            ),

          ded:
            numberOrZero(
              job.ded ??
                job.deductionPercent ??
                15
            ),

          freezingPremium:
            numberOrZero(
              job.freezingPremium
            ),

          eveningPremium:
            numberOrZero(
              job.eveningPremium
            ),

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

  const paychecks =
    rawData?.paychecks ??
    {};

  /* =======================================================
     SELECTED JOB
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

  /*
   * If a job was removed,
   * automatically select another one.
   */
  useEffect(() => {
    if (
      selectedJobId &&
      !jobs.some(
        job =>
          job.id ===
          selectedJobId
      )
    ) {
      setSelectedJobId(
        jobs[0]?.id ??
          ""
      );
    }
  }, [
    jobs,
    selectedJobId,
  ]);

  /* =======================================================
     PAY PERIODS
  ======================================================= */

  const periods =
    useMemo(
      () =>
        selectedJob
          ? buildConfiguredPeriods(
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
          periods[0].id
      );
    }
  }, [
    periods,
    selectedPeriodId,
  ]);

  /*
   * When the user opens another job,
   * reset the period selection so we
   * don't accidentally show the previous
   * job's pay period.
   */
  useEffect(() => {
    setSelectedPeriodId("");
  }, [
    selectedJobId,
  ]);

  const selectedPeriod =
    periods.find(
      period =>
        period.id ===
        selectedPeriodId
    ) ??
    periods.find(
      period =>
        isDateInRange(
          dateString(),
          period.start,
          period.end
        )
    ) ??
    periods[0] ??
    null;

  /* =======================================================
     SHIFTS FOR SELECTED JOB / PERIOD
  ======================================================= */

  const selectedShiftKey =
    selectedJob &&
    selectedPeriod
      ? `${selectedJob.id}|${selectedPeriod.start}|${selectedPeriod.end}`
      : "";

  const periodShifts =
    selectedShiftKey
      ? Array.isArray(
          shifts[
            selectedShiftKey
          ]
        )
        ? shifts[
            selectedShiftKey
          ]
        : []
      : [];

  /* =======================================================
     PAYROLL
  ======================================================= */

  const payroll =
    useMemo(() => {
      if (
        !selectedJob ||
        !periodShifts.length
      ) {
        return null;
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

      try {
        return calculatePaycheck(
          calculatorShifts,
          {
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

            federalTax: 0,
            cpp: 0,
            ei: 0,
            otherDeductions: 0,
          }
        );
      } catch (
        err
      ) {
        console.error(
          "Payroll calculation error:",
          err
        );

        return null;
      }
    }, [
      selectedJob,
      periodShifts,
    ]);

  const estimatedNet =
    payroll
      ? Math.max(
          0,
          numberOrZero(
            payroll.grossPay
          ) *
            (
              1 -
              numberOrZero(
                selectedJob?.ded ??
                  selectedJob?.deductionPercent ??
                  0
              ) /
                100
            )
        )
      : 0;

  /* =======================================================
     OPEN JOB
  ======================================================= */

  function handleOpenJob(
    jobId
  ) {
    /*
     * THIS IS THE FIX.
     *
     * The Open button now:
     *
     * 1. selects the job
     * 2. clears the previous period
     * 3. scrolls to the opened job
     */
    setSelectedJobId(
      jobId
    );

    setSelectedPeriodId(
      ""
    );

    setTimeout(() => {
      document
        .getElementById(
          "income-job-details"
        )
        ?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        });
    }, 50);
  }

  /* =======================================================
     SAVE JOB
  ======================================================= */

  function handleSaveJob(
    job
  ) {
    const existing =
      jobs.some(
        item =>
          item.id ===
          job.id
      );

    const updatedJobs =
      existing
        ? jobs.map(
            item =>
              item.id ===
              job.id
                ? {
                    ...item,
                    ...job,
                  }
                : item
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

    const updated = {
      ...(rawData ?? {}),
      jobs:
        updatedJobs,
    };

    save(updated);

    setSelectedJobId(
      job.id
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

    setSelectedPeriodId(
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

    const period =
      periods.find(
        item =>
          isDateInRange(
            shift.date,
            item.start,
            item.end
          )
      );

    if (
      !period
    ) {
      alert(
        "This work date does not fall inside one of the configured pay periods."
      );

      return;
    }

    const key =
      `${selectedJob.id}|${period.start}|${period.end}`;

    const current =
      Array.isArray(
        shifts[key]
      )
        ? shifts[key]
        : [];

    const next = {
      ...(rawData ?? {}),

      shifts: {
        ...shifts,

        [key]: [
          ...current,
          shift,
        ],
      },
    };

    /*
     * Also create a calendar event
     * so Calendar can use the same shift.
     */
    const calendarEvents =
      Array.isArray(
        rawData?.calendarEvents
      )
        ? [
            ...rawData.calendarEvents,
          ]
        : [];

    calendarEvents.push({
      id:
        shift.id,

      type:
        "work",

      title:
        `${selectedJob.person} — ${selectedJob.employer}`,

      date:
        shift.date,

      startTime:
        shift.startTime,

      endTime:
        shift.endTime,

      jobId:
        selectedJob.id,

      notes:
        shift.notes ?? "",
    });

    next.calendarEvents =
      calendarEvents;

    save(next);

    setSelectedPeriodId(
      period.id
    );

    setToast(
      `✅ Work shift added to ${formatDate(
        period.start
      )} – ${formatDate(
        period.end
      )}`
    );
  }

  /* =======================================================
     DELETE SHIFT
  ======================================================= */

  function handleDeleteShift(
    shift
  ) {
    if (
      !selectedShiftKey
    ) {
      return;
    }

    if (
      !window.confirm(
        "Delete this work shift?"
      )
    ) {
      return;
    }

    const updated =
      Array.isArray(
        shifts[
          selectedShiftKey
        ]
      )
        ? shifts[
            selectedShiftKey
          ].filter(
            item =>
              item.id !==
              shift.id
          )
        : [];

    const calendarEvents =
      (
        rawData?.calendarEvents ??
        []
      ).filter(
        event =>
          event.id !==
          shift.id
      );

    save({
      ...(rawData ?? {}),

      shifts: {
        ...shifts,

        [selectedShiftKey]:
          updated,
      },

      calendarEvents,
    });

    setToast(
      "🗑 Work hours removed"
    );
  }

  /* =======================================================
     SEND ESTIMATED PAY
  ======================================================= */

  function handleSendEstimated() {
    if (
      !selectedJob ||
      !selectedPeriod ||
      !payroll
    ) {
      alert(
        "Add work hours first."
      );

      return;
    }

    const key =
      `${selectedJob.id}|${selectedPeriod.start}|${selectedPeriod.end}`;

    const entry = {
      id:
        makeId("income"),

      src:
        `${selectedJob.person} — ${selectedJob.employer}`,

      person:
        selectedJob.person,

      employer:
        selectedJob.employer,

      jobId:
        selectedJob.id,

      amount:
        estimatedNet,

      amt:
        estimatedNet,

      gross:
        payroll.grossPay,

      estimatedNet,

      actualNet:
        null,

      actualGross:
        null,

      actualDifference:
        null,

      date:
        selectedPeriod.payday,

      payPeriodStart:
        selectedPeriod.start,

      payPeriodEnd:
        selectedPeriod.end,

      isActual:
        false,

      createdAt:
        new Date().toISOString(),
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

      paychecks: {
        ...paychecks,

        [key]: {
          ...(paychecks[key] ?? {}),
          estimated:
            entry,

          calculation:
            payroll,
        },
      },
    });

    setToast(
      `💰 ${money(
        estimatedNet
      )} estimated pay added to Budget Pool.`
    );
  }

  /* =======================================================
     SAVE ACTUAL PAYCHECK
  ======================================================= */

  function handleSaveActual(
    event
  ) {
    event.preventDefault();

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

    const actualNet =
      numberOrZero(
        form.get(
          "actualNet"
        )
      );

    const actualGross =
      numberOrZero(
        form.get(
          "actualGross"
        )
      ) ||
      numberOrZero(
        payroll?.grossPay
      );

    if (
      actualNet <= 0
    ) {
      alert(
        "Enter the actual net paycheck."
      );

      return;
    }

    const key =
      `${selectedJob.id}|${selectedPeriod.start}|${selectedPeriod.end}`;

    const estimated =
      numberOrZero(
        estimatedNet
      );

    const difference =
      actualNet -
      estimated;

    const entry = {
      id:
        makeId("actual"),

      src:
        `${selectedJob.person} — ${selectedJob.employer} — Actual Paycheck`,

      person:
        selectedJob.person,

      employer:
        selectedJob.employer,

      jobId:
        selectedJob.id,

      amount:
        actualNet,

      amt:
        actualNet,

      gross:
        actualGross,

      actualNet,

      actualGross,

      estimatedNet:
        estimated,

      actualDifference:
        difference,

      date:
        selectedPeriod.payday,

      payPeriodStart:
        selectedPeriod.start,

      payPeriodEnd:
        selectedPeriod.end,

      isActual:
        true,

      createdAt:
        new Date().toISOString(),
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

      paychecks: {
        ...paychecks,

        [key]: {
          ...(paychecks[key] ?? {}),
          actual:
            entry,
        },
      },
    });

    event.currentTarget.reset();

    setToast(
      `✅ Actual paycheck saved. Difference: ${money(
        difference
      )}`
    );
  }

  /* =======================================================
     POOLED INCOME FOR CURRENT PERIOD
  ======================================================= */

  const currentPoolEntries =
    selectedPeriod
      ? Object.entries(
          sent
        )
          .filter(
            ([key]) =>
              key.endsWith(
                `|${selectedPeriod.start}|${selectedPeriod.end}`
              )
          )
          .flatMap(
            ([, entries]) =>
              Array.isArray(
                entries
              )
                ? entries
                : []
          )
      : [];

  const totalPool =
    currentPoolEntries.reduce(
      (
        total,
        entry
      ) =>
        total +
        numberOrZero(
          entry.amt ??
            entry.amount
        ),
      0
    );

  /* =======================================================
     RENDER
  ======================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "grid",
          placeItems:
            "center",
          background:
            "var(--color-bg, #fdf6f8)",
          color:
            "var(--color-text-soft, #9b6b8a)",
        }}
      >
        Loading salary data…
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
        paddingBottom:
          100,
      }}
    >
      <div
        style={{
          maxWidth:
            680,
          margin:
            "0 auto",
          padding:
            "14px",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="fade-up"
          style={{
            padding:
              "28px 0 15px",
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
              lineHeight:
                1.5,
            }}
          >
            Enter work once.
            Budget Blossom
            calculates the
            paycheck and keeps
            expected and actual
            pay separate.
          </p>
        </header>

        {/* ERROR */}

        {error && (
          <div
            style={{
              padding:
                12,
              marginBottom:
                12,
              borderRadius:
                12,
              background:
                "#fdedf1",
              border:
                "1px solid #f4a0b4",
              color:
                "#c94d6a",
              fontSize:
                12,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* =================================================
            HOUSEHOLD INCOME SOURCES
        ================================================= */}

        <section
          style={{
            ...cardStyle,
            padding:
              "14px 14px 4px",
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
            HOUSEHOLD INCOME SOURCES
          </div>

          {jobs.map(
            job => (
              <IncomeSourceCard
                key={
                  job.id
                }
                job={
                  job
                }
                selected={
                  selectedJobId ===
                  job.id
                }
                onOpen={
                  handleOpenJob
                }
              />
            )
          )}
        </section>

        {/* =================================================
            ADD NEW JOB
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            setJobEditor(
              "new"
            )
          }
          style={{
            width:
              "100%",
            marginBottom:
              12,
            padding:
              12,
            border:
              "1px solid #f0dce4",
            borderRadius:
              12,
            background:
              "#fff",
            color:
              "#db2777",
            fontWeight:
              800,
            cursor:
              "pointer",
          }}
        >
          + New Job / Employer
        </button>

        {/* =================================================
            OPENED JOB
        ================================================= */}

        {selectedJob && (
          <div
            id="income-job-details"
          >
            <JobDetails
              job={
                selectedJob
              }

              period={
                selectedPeriod
              }

              shifts={
                periodShifts
              }

              payroll={
                payroll
              }

              estimatedNet={
                estimatedNet
              }

              onEdit={() =>
                setJobEditor(
                  selectedJob
                )
              }

              onDelete={() =>
                handleDeleteJob(
                  selectedJob.id
                )
              }

              onAddShift={
                handleAddShift
              }

              onDeleteShift={
                handleDeleteShift
              }

              onSendEstimated={
                handleSendEstimated
              }

              onSaveActual={
                handleSaveActual
              }
            />
          </div>
        )}

        {/* =================================================
            PERIOD NAVIGATION
        ================================================= */}

        {selectedJob &&
          periods.length >
            0 && (
            <section
              style={
                cardStyle
              }
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <Button
                  secondary
                  disabled={
                    periods.findIndex(
                      p =>
                        p.id ===
                        selectedPeriod?.id
                    ) <= 0
                  }
                  onClick={() => {
                    const index =
                      periods.findIndex(
                        p =>
                          p.id ===
                          selectedPeriod?.id
                      );

                    if (
                      index >
                      0
                    ) {
                      setSelectedPeriodId(
                        periods[
                          index -
                            1
                        ].id
                      );
                    }
                  }}
                >
                  ‹
                </Button>

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
                      800,
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
                        {
                          period.label
                        }
                        {" → "}
                        {
                          formatDate(
                            period.payday
                          )
                        }
                      </option>
                    )
                  )}
                </select>

                <Button
                  secondary
                  disabled={
                    periods.findIndex(
                      p =>
                        p.id ===
                        selectedPeriod?.id
                    ) >=
                    periods.length -
                      1
                  }
                  onClick={() => {
                    const index =
                      periods.findIndex(
                        p =>
                          p.id ===
                          selectedPeriod?.id
                      );

                    if (
                      index >=
                      0 &&
                      index <
                        periods.length -
                          1
                    ) {
                      setSelectedPeriodId(
                        periods[
                          index +
                            1
                        ].id
                      );
                    }
                  }}
                >
                  ›
                </Button>
              </div>
            </section>
          )}

        {/* =================================================
            BUDGET POOL
        ================================================= */}

        <section
          style={{
            ...cardStyle,
            background:
              "#f5faf8",
            border:
              "1px solid #cde7dc",
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
                    "#3a806d",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    ".08em",
                }}
              >
                BUDGET POOL
              </div>

              <div
                style={{
                  marginTop:
                    3,
                  fontSize:
                    11,
                  color:
                    "#6d8f83",
                }}
              >
                Income assigned to
                this paycheck
              </div>
            </div>

            <strong
              style={{
                fontSize:
                  20,
                color:
                  "#3a9080",
              }}
            >
              {money(
                totalPool
              )}
            </strong>
          </div>

          {currentPoolEntries.length >
          0 && (
            <div
              style={{
                marginTop:
                  12,
              }}
            >
              {currentPoolEntries.map(
                entry => (
                  <div
                    key={
                      entry.id ??
                      `${entry.date}-${entry.amt}`
                    }
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      padding:
                        "8px 0",
                      borderTop:
                        "1px solid #dceee7",
                      fontSize:
                        11,
                    }}
                  >
                    <span>
                      {entry.src ??
                        "Income"}
                    </span>

                    <strong>
                      {money(
                        entry.amt ??
                          entry.amount
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>
          )}

          {currentPoolEntries.length ===
            0 && (
            <div
              style={{
                marginTop:
                  10,
                fontSize:
                  11,
                color:
                  "#7b988f",
              }}
            >
              No income has been
              sent to the Budget
              Pool for this
              paycheck yet.
            </div>
          )}
        </section>
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

      {/* =================================================
          SAVING / TOAST
      ================================================= */}

      {saving && (
        <div
          style={{
            position:
              "fixed",
            left:
              "50%",
            bottom:
              86,
            transform:
              "translateX(-50%)",
            background:
              "#241a29",
            color:
              "#fff",
            padding:
              "8px 14px",
            borderRadius:
              99,
            fontSize:
              11,
            fontWeight:
              700,
            zIndex:
              1200,
          }}
        >
          Saving…
        </div>
      )}

      {toast && (
        <div
          onClick={() =>
            setToast("")
          }
          style={{
            position:
              "fixed",
            left:
              "50%",
            bottom:
              86,
            transform:
              "translateX(-50%)",
            background:
              "#241a29",
            color:
              "#fff",
            padding:
              "10px 15px",
            borderRadius:
              99,
            fontSize:
              11,
            fontWeight:
              700,
            zIndex:
              1300,
            maxWidth:
              "90vw",
            textAlign:
              "center",
            cursor:
              "pointer",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
