/**
 * Budget Blossom
 *
 * Calendar.jsx
 *
 * FINANCIAL CALENDAR
 *
 * Automatically combines:
 * - Work shifts from Income
 * - Pay periods
 * - Paydays
 * - Estimated income
 * - Actual paychecks
 * - Expenses / bills
 * - Debt/installments
 * - Subscriptions
 * - Canadian stat holidays
 * - Moods
 * - Personal events
 * - Reminders
 *
 * IMPORTANT:
 * Pay period and payday are separate.
 *
 * Example:
 * July 20 – August 2
 * Payday: August 7
 *
 * The paycheck belongs to the July 20–August 2
 * work period, but the money arrives on August 7.
 */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabaseClient";

import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";

import {
  colors,
  typography,
  radii,
  transitions,
} from "../ui/designTokens";

import {
  calculateShift,
  calculatePaycheck,
  estimateNetPay,
} from "../services/income/incomeCalculator";

/* =========================================================
   CONSTANTS
========================================================= */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const TYPE_META = {
  income: {
    color: colors.gold,
    bg: "#fef6e4",
    border: "#c0781040",
    label: "Income",
    emoji: "💰",
  },

  work: {
    color: "#8d6a2f",
    bg: "#fff8e8",
    border: "#d7b56d66",
    label: "Work",
    emoji: "🕘",
  },

  payperiod: {
    color: "#a66a8c",
    bg: "#fff5fa",
    border: "#dca9c866",
    label: "Pay Period",
    emoji: "📆",
  },

  debt: {
    color: colors.rose,
    bg: "#fdedf1",
    border: "#f0608040",
    label: "Debt",
    emoji: "💳",
  },

  bill: {
    color: colors.pink,
    bg: colors.pinkPale,
    border: "#e8708a40",
    label: "Bill",
    emoji: "📄",
  },

  subscription: {
    color: colors.mauve,
    bg: colors.mauvePale,
    border: "#c890b840",
    label: "Subscription",
    emoji: "🔄",
  },

  holiday: {
    color: colors.textMuted,
    bg: colors.bgDeep,
    border: colors.border,
    label: "Holiday",
    emoji: "🍁",
  },

  event: {
    color: "#993356",
    bg: "#fdedf1",
    border: "#f0608040",
    label: "Event",
    emoji: "📅",
  },

  reminder: {
    color: "#185FA5",
    bg: "#E6F1FB",
    border: "#378ADD40",
    label: "Reminder",
    emoji: "🔔",
  },
};

const MOOD_EMOJI = {
  happy: "😊",
  okay: "😐",
  sad: "😔",
  stressed: "😤",
  meh: "🥲",
};

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

function dateString(date = new Date()) {
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

  const d = new Date(
    `${value}T12:00:00`
  );

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;
}

function addDays(value, amount) {
  const d = parseDate(value);

  if (!d) {
    return "";
  }

  d.setDate(
    d.getDate() + amount
  );

  return dateString(d);
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);

  if (!a || !b) {
    return 0;
  }

  return Math.round(
    (
      b.getTime() -
      a.getTime()
    ) / 86400000
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

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const d = parseDate(value);

  if (!d) {
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

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  const d = parseDate(value);

  if (!d) {
    return value;
  }

  return d.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function daysUntil(date) {
  const today =
    parseDate(
      dateString()
    );

  const target =
    parseDate(date);

  if (!today || !target) {
    return 0;
  }

  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) / 86400000
  );
}

/* =========================================================
   PAY PERIOD GENERATION
========================================================= */

function buildPayPeriodsForJob(
  job,
  count = 24
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

  if (duration < 0) {
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
  } else {
    periodLength =
      Math.max(
        1,
        duration + 1
      );
  }

  /*
   * IMPORTANT:
   *
   * Payday is NOT calculated as a fixed date such as
   * the 7th or 22nd.
   *
   * We calculate the difference between the configured
   * pay period end and the configured payday.
   *
   * Example:
   *
   * Period end = Aug 2
   * Payday = Aug 7
   *
   * Difference = 5 days.
   *
   * Therefore:
   *
   * Aug 3–Aug 16
   * Payday = Aug 21.
   */

  const paydayOffset =
    daysBetween(
      end,
      payday
    );

  const periods = [];

  for (
    let index = -12;
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
   CANADIAN HOLIDAYS
========================================================= */

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);

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

  const m =
    Math.floor(
      (
        a +
        11 * h +
        22 * l
      ) / 451
    );

  const month =
    Math.floor(
      (
        h +
        l -
        7 * m +
        114
      ) / 31
    );

  const day =
    (
      (
        h +
        l -
        7 * m +
        114
      ) % 31
    ) + 1;

  return new Date(
    year,
    month - 1,
    day
  );
}

function canadaHolidays(year) {
  const holidays = [];

  function add(date, name) {
    holidays.push({
      date: dateString(date),
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
      6,
      1
    ),
    "Canada Day"
  );

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
      date.slice(0, 4)
    );

  return (
    canadaHolidays(year)
      .find(
        holiday =>
          holiday.date ===
          date
      ) ??
    null
  );
}

/* =========================================================
   CALCULATE ESTIMATED PAYCHECK
========================================================= */

function calculateEstimatedPaycheck(
  job,
  period,
  periodShifts
) {
  if (
    !job ||
    !period
  ) {
    return {
      gross: 0,
      net: 0,
      hasWork: false,
    };
  }

  const shifts =
    Array.isArray(
      periodShifts
    )
      ? periodShifts
      : [];

  if (
    shifts.length === 0
  ) {
    return {
      gross: 0,
      net: 0,
      hasWork: false,
    };
  }

  try {
    const calculatorShifts =
      shifts.map(
        shift => ({
          ...shift,

          hourlyRate:
            shift.hourlyRate ??
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
            job.freezingPremium ??
            0,

          eveningPremium:
            shift.eveningPremium ??
            job.eveningPremium ??
            0,
        })
      );

    const payroll =
      calculatePaycheck(
        calculatorShifts,
        {
          payPeriodStart:
            period.start,

          payPeriodEnd:
            period.end,

          payDate:
            period.payday,

          vacationPercent:
            numberOrZero(
              job.vacationPercent
            ),

          overtimeThreshold:
            numberOrZero(
              job.overtimeThreshold ??
              44
            ),

          overtimeMultiplier:
            numberOrZero(
              job.overtimeMultiplier ??
              1.5
            ),
        }
      );

    const gross =
      numberOrZero(
        payroll?.grossPay
      );

    const net =
      estimateNetPay(
        gross,
        numberOrZero(
          job.deductionPercent ??
          job.ded ??
          0
        )
      );

    return {
      gross,
      net,
      hasWork: true,
      payroll,
    };
  } catch (error) {
    console.error(
      "Calendar payroll calculation failed:",
      error
    );

    /*
     * Fallback calculation so the calendar still
     * shows an estimated amount.
     */
    let gross = 0;

    for (const shift of shifts) {
      try {
        const calculated =
          calculateShift({
            ...shift,
            hourlyRate:
              shift.hourlyRate ??
              job.rate,
          });

        gross +=
          numberOrZero(
            calculated?.grossPay
          );
      } catch {
        /*
         * Ignore individual bad shifts.
         */
      }
    }

    const net =
      estimateNetPay(
        gross,
        numberOrZero(
          job.deductionPercent ??
          job.ded ??
          0
        )
      );

    return {
      gross,
      net,
      hasWork: gross > 0,
    };
  }
}

/* =========================================================
   BUILD INCOME EVENTS
========================================================= */

function buildIncomeEvents(raw) {
  const jobs =
    Array.isArray(
      raw?.jobs
    )
      ? raw.jobs
      : [];

  const shiftsByPeriod =
    raw?.shifts &&
    typeof raw.shifts ===
      "object"
      ? raw.shifts
      : {};

  const actualPaychecks =
    raw?.actualPaychecks &&
    typeof raw.actualPaychecks ===
      "object"
      ? raw.actualPaychecks
      : {};

  const events = [];

  for (const job of jobs) {
    if (
      !job ||
      job.active === false
    ) {
      continue;
    }

    const periods =
      buildPayPeriodsForJob(
        job,
        30
      );

    for (const period of periods) {
      const key =
        `${job.id}|${period.start}|${period.end}`;

      const shifts =
        Array.isArray(
          shiftsByPeriod[key]
        )
          ? shiftsByPeriod[key]
          : [];

      const estimated =
        calculateEstimatedPaycheck(
          job,
          period,
          shifts
        );

      const actual =
        actualPaychecks[key] ??
        null;

      const actualNet =
        numberOrZero(
          actual?.netPay ??
          actual?.actualNet ??
          actual?.amt
        );

      /*
       * =====================================================
       * PAYDAY EVENT
       * =====================================================
       *
       * This is where incoming money appears.
       *
       * It is placed on the PAYDAY,
       * not on the final workday.
       */

      events.push({
        id:
          `payday-${key}`,

        type:
          "income",

        date:
          period.payday,

        title:
          actualNet > 0
            ? `${job.person} — ${job.employer} · Actual Pay`
            : `${job.person} — ${job.employer} · Estimated Pay`,

        amount:
          actualNet > 0
            ? actualNet
            : estimated.net,

        gross:
          actualNet > 0
            ? numberOrZero(
                actual.actualGross
              )
            : estimated.gross,

        estimated:
          actualNet <= 0,

        actual:
          actualNet > 0,

        person:
          job.person,

        employer:
          job.employer,

        jobId:
          job.id,

        payPeriodStart:
          period.start,

        payPeriodEnd:
          period.end,

        payday:
          period.payday,
      });

      /*
       * =====================================================
       * PAY PERIOD EVENT
       * =====================================================
       *
       * We show this on the first day of the period.
       * It does NOT count as income.
       */

      events.push({
        id:
          `payperiod-${key}`,

        type:
          "payperiod",

        date:
          period.start,

        title:
          `${job.person} — ${job.employer} · Pay Period`,

        amount:
          0,

        person:
          job.person,

        employer:
          job.employer,

        jobId:
          job.id,

        payPeriodStart:
          period.start,

        payPeriodEnd:
          period.end,

        payday:
          period.payday,
      });

      /*
       * =====================================================
       * WORK SHIFT EVENTS
       * =====================================================
       */

      for (
        const shift of shifts
      ) {
        if (
          !shift?.date
        ) {
          continue;
        }

        let calculated = null;

        try {
          calculated =
            calculateShift({
              ...shift,
              hourlyRate:
                shift.hourlyRate ??
                job.rate,
            });
        } catch {
          calculated = null;
        }

        events.push({
          id:
            `shift-${job.id}-${shift.id ?? `${shift.date}-${Math.random()}`}`,

          type:
            "work",

          date:
            shift.date,

          title:
            `${job.person} — ${job.employer}`,

          amount:
            numberOrZero(
              calculated?.grossPay
            ),

          person:
            job.person,

          employer:
            job.employer,

          jobId:
            job.id,

          startTime:
            shift.startTime,

          endTime:
            shift.endTime,

          payPeriodStart:
            period.start,

          payPeriodEnd:
            period.end,

          payday:
            period.payday,

          isStatHoliday:
            shift.isStatHoliday,

          holidayName:
            shift.holidayName,

          freezingPremium:
            shift.freezingPremium,

          eveningPremium:
            shift.eveningPremium,
        });
      }
    }
  }

  /*
   * Keep backwards compatibility with older `sent`
   * paycheck records.
   */

  const sent =
    raw?.sent &&
    typeof raw.sent ===
      "object"
      ? raw.sent
      : {};

  for (
    const [
      periodKey,
      entries,
    ] of Object.entries(sent)
  ) {
    if (
      !Array.isArray(entries)
    ) {
      continue;
    }

    for (
      const entry of entries
    ) {
      if (
        !entry?.date
      ) {
        continue;
      }

      events.push({
        id:
          `sent-${periodKey}-${entry.date}-${entry.src ?? "income"}`,

        type:
          "income",

        date:
          entry.date,

        title:
          entry.src ??
          "Income",

        amount:
          numberOrZero(
            entry.amt
          ),

        actual:
          true,

        estimated:
          false,
      });
    }
  }

  return events;
}

/* =========================================================
   EXPENSE / BILL EVENTS
========================================================= */

function buildExpenseEvents(
  raw,
  viewYear,
  viewMonth
) {
  const events = [];

  const expenses =
    Array.isArray(
      raw?.expenses
    )
      ? raw.expenses
      : [];

  const installments =
    Array.isArray(
      raw?.installments
    )
      ? raw.installments
      : [];

  const monthStart =
    dateString(
      new Date(
        viewYear,
        viewMonth,
        1
      )
    );

  const monthEnd =
    dateString(
      new Date(
        viewYear,
        viewMonth + 1,
        0
      )
    );

  for (
    const expense of expenses
  ) {
    if (!expense) {
      continue;
    }

    let date =
      expense.dueDate ??
      expense.due ??
      expense.date ??
      null;

    /*
     * Recurring monthly expense.
     */
    if (
      !date &&
      expense.dueDay
    ) {
      const day =
        Math.min(
          Number(
            expense.dueDay
          ),
          new Date(
            viewYear,
            viewMonth + 1,
            0
          ).getDate()
        );

      date =
        dateString(
          new Date(
            viewYear,
            viewMonth,
            day
          )
        );
    }

    /*
     * If the expense has only a day number,
     * create this month's occurrence.
     */
    if (
      !expense.dueDate &&
      !expense.due &&
      !expense.date &&
      expense.dueDay
    ) {
      date =
        dateString(
          new Date(
            viewYear,
            viewMonth,
            Math.min(
              Number(
                expense.dueDay
              ),
              new Date(
                viewYear,
                viewMonth + 1,
                0
              ).getDate()
            )
          )
        );
    }

    if (
      !date ||
      date < monthStart ||
      date > monthEnd
    ) {
      continue;
    }

    events.push({
      id:
        `expense-${expense.id ?? `${date}-${expense.label ?? expense.name}`}`,

      type:
        expense.type ===
        "subscription"
          ? "subscription"
          : "bill",

      date,

      title:
        expense.label ??
        expense.name ??
        "Bill",

      amount:
        numberOrZero(
          expense.amount ??
          expense.amt
        ),

      recurring:
        expense.recurring ??
        false,
    });
  }

  for (
    const installment of installments
  ) {
    if (!installment) {
      continue;
    }

    const date =
      installment.startDate ??
      installment.start ??
      null;

    if (!date) {
      continue;
    }

    events.push({
      id:
        `installment-${installment.id ?? date}`,

      type:
        "debt",

      date,

      title:
        installment.label ??
        "Debt Payment",

      amount:
        numberOrZero(
          installment.monthly ??
          installment.amt
        ),

      recurring:
        true,
    });
  }

  return events;
}

/* =========================================================
   EVENT PILL
========================================================= */

function EventPill({
  event,
  compact = false,
}) {
  const meta =
    TYPE_META[
      event.type
    ] ??
    TYPE_META.bill;

  let title =
    event.title;

  if (
    event.type ===
    "income"
  ) {
    title =
      event.actual
        ? `${event.person ?? ""} Actual`
        : `${event.person ?? ""} Est. Pay`;
  }

  if (
    event.type ===
    "payperiod"
  ) {
    title =
      `${event.person ?? ""} Period`;
  }

  return (
    <div
      title={
        `${event.title}` +
        (
          event.amount
            ? ` — ${money(event.amount)}`
            : ""
        )
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: "3px",
        padding:
          compact
            ? "2px 5px"
            : "4px 7px",
        borderRadius: "5px",
        backgroundColor:
          meta.bg,
        border:
          `1px solid ${meta.border}`,
        fontSize:
          compact
            ? "9px"
            : "11px",
        color:
          meta.color,
        fontWeight: 600,
        whiteSpace:
          "nowrap",
        overflow:
          "hidden",
        textOverflow:
          "ellipsis",
        maxWidth:
          "100%",
        lineHeight:
          1.3,
      }}
    >
      <span
        style={{
          flexShrink: 0,
        }}
      >
        {meta.emoji}
      </span>

      <span
        style={{
          overflow:
            "hidden",
          textOverflow:
            "ellipsis",
        }}
      >
        {compact
          ? title
          : event.title}
      </span>
    </div>
  );
}

/* =========================================================
   DAY CELL
========================================================= */

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  isSelected,
  onSelect,
  moodEmoji,
}) {
  const dateStr =
    dateString(date);

  const hasEvents =
    events.length > 0;

  const visible =
    events.slice(
      0,
      3
    );

  const overflow =
    events.length -
    visible.length;

  return (
    <div
      onClick={() =>
        onSelect(dateStr)
      }
      style={{
        minHeight: "88px",
        padding: "6px",
        borderRadius:
          radii.lg,

        backgroundColor:
          isSelected
            ? "#fff0f4"
            : isToday
              ? "#fff4f7"
              : isCurrentMonth
                ? colors.bgCard
                : "#faf4f6",

        border:
          `1.5px solid ${
            isSelected
              ? colors.pink
              : isToday
                ? colors.pinkLight
                : colors.borderSoft
          }`,

        cursor:
          hasEvents ||
          moodEmoji
            ? "pointer"
            : "pointer",

        opacity:
          isCurrentMonth
            ? 1
            : 0.4,

        transition:
          `all ${transitions.base}`,

        display: "flex",
        flexDirection:
          "column",
        gap: "3px",

        boxShadow:
          isToday
            ? `0 0 0 2px ${colors.pinkPale}`
            : isSelected
              ? "0 2px 12px rgba(232,112,138,0.15)"
              : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight:
              isToday
                ? 700
                : 400,

            color:
              isToday
                ? colors.pinkDeep
                : isCurrentMonth
                  ? colors.textSoft
                  : colors.textFaint,
          }}
        >
          {date.getDate()}
        </span>

        {moodEmoji &&
          isCurrentMonth && (
            <span
              style={{
                fontSize: "12px",
              }}
            >
              {moodEmoji}
            </span>
          )}
      </div>

      {visible.map(
        event => (
          <EventPill
            key={
              event.id
            }
            event={
              event
            }
            compact
          />
        )
      )}

      {overflow > 0 && (
        <span
          style={{
            fontSize: "9px",
            color:
              colors.textMuted,
            paddingLeft:
              "4px",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/* =========================================================
   ADD EVENT / REMINDER
========================================================= */

function AddEntrySection({
  entries,
  onAdd,
  onDelete,
  today,
}) {
  const [
    type,
    setType,
  ] = useState(
    "event"
  );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(
    dateString(today)
  );

  const [
    time,
    setTime,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const inputStyle = {
    width: "100%",
    padding:
      "8px 10px",
    borderRadius:
      radii.md,

    border:
      `1px solid ${colors.border}`,

    backgroundColor:
      colors.bgWarm,

    color:
      colors.text,

    fontSize: "13px",
    fontFamily:
      "inherit",
    outline: "none",
    boxSizing:
      "border-box",
  };

  function handleAdd() {
    if (
      !title.trim() ||
      !date
    ) {
      return;
    }

    onAdd({
      id:
        `custom-${Date.now()}`,

      type,

      title:
        title.trim(),

      date,

      time,

      amount:
        amount
          ? numberOrZero(
              amount
            )
          : 0,
    });

    setTitle("");
    setTime("");
    setAmount("");
  }

  return (
    <SoftCard
      variant="base"
      style={{
        marginBottom:
          "16px",
      }}
      noAnimate
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color:
            colors.textMuted,
          letterSpacing:
            "0.12em",
          textTransform:
            "uppercase",
          marginBottom:
            "12px",

          display: "flex",
          alignItems:
            "center",
          gap: "8px",
        }}
      >
        Add to calendar

        <span
          style={{
            flex: 1,
            height: "1px",
            backgroundColor:
              colors.borderSoft,
          }}
        />
      </p>

      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom:
            "14px",
        }}
      >
        {[
          "event",
          "reminder",
        ].map(item => {
          const active =
            type === item;

          const isEvent =
            item ===
            "event";

          return (
            <button
              key={item}
              type="button"
              onClick={() =>
                setType(item)
              }
              style={{
                flex: 1,
                padding:
                  "7px 0",
                borderRadius:
                  radii.md,
                cursor:
                  "pointer",

                border:
                  `1.5px solid ${
                    active
                      ? isEvent
                        ? "#f06080"
                        : "#378ADD"
                      : colors.border
                  }`,

                backgroundColor:
                  active
                    ? isEvent
                      ? "#fdedf1"
                      : "#E6F1FB"
                    : colors.bgCard,

                color:
                  active
                    ? isEvent
                      ? "#993356"
                      : "#0C447C"
                    : colors.textMuted,

                fontWeight:
                  600,

                fontSize:
                  "13px",
              }}
            >
              {isEvent
                ? "📅"
                : "🔔"}{" "}
              {item
                .charAt(0)
                .toUpperCase() +
                item.slice(1)}
            </button>
          );
        })}
      </div>

      <input
        value={title}
        onChange={e =>
          setTitle(
            e.target.value
          )
        }
        placeholder={
          type === "event"
            ? "Event title"
            : "Reminder"
        }
        style={
          inputStyle
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "10px",
          marginTop:
            "10px",
        }}
      >
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

        <input
          type="time"
          value={time}
          onChange={e =>
            setTime(
              e.target.value
            )
          }
          style={
            inputStyle
          }
        />
      </div>

      {type ===
        "event" && (
        <input
          value={amount}
          onChange={e =>
            setAmount(
              e.target.value
            )
          }
          placeholder="Amount (optional)"
          type="number"
          step="0.01"
          style={{
            ...inputStyle,
            marginTop:
              "10px",
          }}
        />
      )}

      <button
        type="button"
        onClick={
          handleAdd
        }
        style={{
          width: "100%",
          marginTop:
            "10px",
          padding: "9px",
          borderRadius:
            radii.md,
          cursor:
            "pointer",
          border:
            `1.5px solid ${colors.border}`,
          backgroundColor:
            colors.bgWarm,
          color:
            colors.textSoft,
          fontSize:
            "13px",
          fontWeight:
            600,
        }}
      >
        + Add{" "}
        {type}
      </button>

      {entries.length >
        0 && (
        <div
          style={{
            marginTop:
              "14px",
            display:
              "flex",
            flexDirection:
              "column",
            gap: "7px",
            paddingTop:
              "12px",
            borderTop:
              `1px solid ${colors.borderSoft}`,
          }}
        >
          {entries.map(
            entry => {
              const meta =
                TYPE_META[
                  entry.type
                ] ??
                TYPE_META.event;

              return (
                <div
                  key={
                    entry.id
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    padding:
                      "9px 12px",
                    borderRadius:
                      radii.md,
                    backgroundColor:
                      meta.bg,
                    border:
                      `1px solid ${meta.border}`,
                  }}
                >
                  <span>
                    {
                      meta.emoji
                    }
                  </span>

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "13px",
                        fontWeight:
                          600,
                      }}
                    >
                      {
                        entry.title
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          "11px",
                        color:
                          meta.color,
                      }}
                    >
                      {formatShortDate(
                        entry.date
                      )}

                      {entry.time
                        ? ` · ${entry.time}`
                        : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(
                        entry.id
                      )
                    }
                    style={{
                      border:
                        "none",
                      background:
                        "none",
                      cursor:
                        "pointer",
                      fontSize:
                        "18px",
                      color:
                        colors.textMuted,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}
    </SoftCard>
  );
}

/* =========================================================
   MAIN CALENDAR
========================================================= */

export default function Calendar() {
  const today =
    new Date();

  const [
    viewYear,
    setViewYear,
  ] = useState(
    today.getFullYear()
  );

  const [
    viewMonth,
    setViewMonth,
  ] = useState(
    today.getMonth()
  );

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    rawData,
    setRawData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    customEntries,
    setCustomEntries,
  ] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          "budgetblossom_calendar_entries"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    } catch {
      return [];
    }
  });

  /* =======================================================
     LOAD SUPABASE DATA
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data,
          error: supabaseError,
        } =
          await supabase
            .from("user_data")
            .select("data")
            .limit(1)
            .single();

        if (
          supabaseError
        ) {
          throw supabaseError;
        }

        if (
          cancelled
        ) {
          return;
        }

        const blob =
          data?.data
            ?.budgetsbloom;

        const parsed =
          typeof blob ===
          "string"
            ? JSON.parse(
                blob
              )
            : blob ??
              null;

        setRawData(
          parsed
        );
      } catch (
        err
      ) {
        if (
          !cancelled
        ) {
          setError(
            err?.message ??
              "Unable to load calendar data."
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
     SAVE PERSONAL CALENDAR ENTRIES
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        "budgetblossom_calendar_entries",
        JSON.stringify(
          customEntries
        )
      );
    } catch {
      /*
       * localStorage may be unavailable.
       */
    }
  }, [
    customEntries,
  ]);

  /* =======================================================
     MOODS
  ======================================================= */

  const moods =
    useMemo(
      () =>
        rawData?.moods ??
        {},
      [rawData]
    );

  /* =======================================================
     AUTOMATIC INCOME
  ======================================================= */

  const incomeEvents =
    useMemo(
      () =>
        buildIncomeEvents(
          rawData
        ),
      [rawData]
    );

  /* =======================================================
     EXPENSES
  ======================================================= */

  const expenseEvents =
    useMemo(
      () =>
        buildExpenseEvents(
          rawData,
          viewYear,
          viewMonth
        ),
      [
        rawData,
        viewYear,
        viewMonth,
      ]
    );

  /* =======================================================
     HOLIDAYS
  ======================================================= */

  const holidayEvents =
    useMemo(() => {
      return [
        ...canadaHolidays(
          viewYear
        ),
        ...canadaHolidays(
          viewYear - 1
        ),
        ...canadaHolidays(
          viewYear + 1
        ),
      ].map(
        holiday => ({
          id:
            `holiday-${holiday.date}`,

          type:
            "holiday",

          date:
            holiday.date,

          title:
            holiday.name,

          amount: 0,
        })
      );
    }, [
      viewYear,
    ]);

  /* =======================================================
     ALL AUTOMATIC EVENTS
  ======================================================= */

  const allAutomaticEvents =
    useMemo(
      () => [
        ...incomeEvents,
        ...expenseEvents,
        ...holidayEvents,
      ],
      [
        incomeEvents,
        expenseEvents,
        holidayEvents,
      ]
    );

  /* =======================================================
     DATE MAP
  ======================================================= */

  const eventsByDate =
    useMemo(() => {
      const map = {};

      for (
        const event of
          allAutomaticEvents
      ) {
        if (
          !event?.date
        ) {
          continue;
        }

        if (
          !map[
            event.date
          ]
        ) {
          map[
            event.date
          ] = [];
        }

        map[
          event.date
        ].push(event);
      }

      for (
        const event of
          customEntries
      ) {
        if (
          !event?.date
        ) {
          continue;
        }

        if (
          !map[
            event.date
          ]
        ) {
          map[
            event.date
          ] = [];
        }

        map[
          event.date
        ].push(event);
      }

      /*
       * Put income first,
       * then work,
       * then bills.
       */

      for (
        const date of
          Object.keys(
            map
          )
      ) {
        map[
          date
        ].sort(
          (
            a,
            b
          ) => {
            const order = {
              income: 1,
              work: 2,
              payperiod: 3,
              bill: 4,
              debt: 5,
              subscription: 6,
              event: 7,
              reminder: 8,
              holiday: 9,
            };

            return (
              (
                order[
                  a.type
                ] ?? 99
              ) -
              (
                order[
                  b.type
                ] ?? 99
              )
            );
          }
        );
      }

      return map;
    }, [
      allAutomaticEvents,
      customEntries,
    ]);

  /* =======================================================
     CALENDAR GRID
  ======================================================= */

  const gridDays =
    useMemo(() => {
      const first =
        new Date(
          viewYear,
          viewMonth,
          1
        );

      const start =
        new Date(
          first
        );

      start.setDate(
        1 -
          first.getDay()
      );

      const days = [];

      const cursor =
        new Date(
          start
        );

      for (
        let i = 0;
        i < 42;
        i++
      ) {
        days.push(
          new Date(
            cursor
          )
        );

        cursor.setDate(
          cursor.getDate() +
            1
        );
      }

      return days;
    }, [
      viewYear,
      viewMonth,
    ]);

  /* =======================================================
     SELECTED DATE
  ======================================================= */

  const todayStr =
    dateString(today);

  const selectedEvents =
    selected
      ? (
          eventsByDate[
            selected
          ] ?? []
        )
      : [];

  const selectedMood =
    selected
      ? moods[
          selected
        ]
      : null;

  /* =======================================================
     UPCOMING INCOME
  ======================================================= */

  const upcomingIncome =
    useMemo(() => {
      return incomeEvents
        .filter(
          event =>
            event.type ===
              "income" &&
            event.date >=
              todayStr
        )
        .sort(
          (
            a,
            b
          ) =>
            a.date.localeCompare(
              b.date
            )
        )
        .slice(
          0,
          8
        );
    }, [
      incomeEvents,
      todayStr,
    ]);

  /* =======================================================
     UPCOMING EVENTS
  ======================================================= */

  const upcoming =
    useMemo(() => {
      return [
        ...allAutomaticEvents,
        ...customEntries,
      ]
        .filter(
          event =>
            event.date >=
              todayStr &&
            event.type !==
              "holiday"
        )
        .sort(
          (
            a,
            b
          ) =>
            a.date.localeCompare(
              b.date
            )
        )
        .slice(
          0,
          12
        );
    }, [
      allAutomaticEvents,
      customEntries,
      todayStr,
    ]);

  /* =======================================================
     MONTHLY INCOME TOTAL
  ======================================================= */

  const monthlyIncome =
    useMemo(() => {
      const prefix =
        `${viewYear}-${String(
          viewMonth + 1
        ).padStart(
          2,
          "0"
        )}`;

      return incomeEvents
        .filter(
          event =>
            event.type ===
              "income" &&
            event.date.startsWith(
              prefix
            )
        )
        .reduce(
          (
            total,
            event
          ) =>
            total +
            numberOrZero(
              event.amount
            ),
          0
        );
    }, [
      incomeEvents,
      viewYear,
      viewMonth,
    ]);

  /* =======================================================
     MONTHLY EXPENSE TOTAL
  ======================================================= */

  const monthlyExpenses =
    useMemo(() => {
      return expenseEvents
        .filter(
          event =>
            event.type !==
            "income"
        )
        .reduce(
          (
            total,
            event
          ) =>
            total +
            numberOrZero(
              event.amount
            ),
          0
        );
    }, [
      expenseEvents,
    ]);

  /* =======================================================
     MOOD COUNT
  ======================================================= */

  const moodCountThisMonth =
    useMemo(() => {
      const prefix =
        `${viewYear}-${String(
          viewMonth + 1
        ).padStart(
          2,
          "0"
        )}`;

      return Object.keys(
        moods
      ).filter(
        key =>
          key.startsWith(
            prefix
          )
      ).length;
    }, [
      moods,
      viewYear,
      viewMonth,
    ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function prevMonth() {
    if (
      viewMonth ===
      0
    ) {
      setViewYear(
        year =>
          year - 1
      );

      setViewMonth(
        11
      );
    } else {
      setViewMonth(
        month =>
          month - 1
      );
    }

    setSelected(
      null
    );
  }

  function nextMonth() {
    if (
      viewMonth ===
      11
    ) {
      setViewYear(
        year =>
          year + 1
      );

      setViewMonth(
        0
      );
    } else {
      setViewMonth(
        month =>
          month + 1
      );
    }

    setSelected(
      null
    );
  }

  function handleAddEntry(
    entry
  ) {
    setCustomEntries(
      previous => [
        ...previous,
        entry,
      ]
    );
  }

  function handleDeleteEntry(
    id
  ) {
    setCustomEntries(
      previous =>
        previous.filter(
          entry =>
            entry.id !==
            id
        )
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

        backgroundColor:
          colors.bg,

        fontFamily:
          typography.fontBody,

        color:
          colors.text,

        paddingBottom:
          "100px",
      }}
    >
      <div
        style={{
          maxWidth:
            "700px",

          margin:
            "0 auto",

          padding:
            "0 16px",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            padding:
              "40px 0 20px",
          }}
        >
          <p
            style={{
              fontSize:
                "11px",
              fontWeight:
                700,
              color:
                colors.textMuted,
              letterSpacing:
                "0.12em",
              textTransform:
                "uppercase",
              marginBottom:
                "4px",
            }}
          >
            Financial
          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-end",
              gap: "10px",
            }}
          >
            <div>
              <h1
                style={{
                  margin:
                    0,
                  fontFamily:
                    typography.fontDisplay,
                  fontSize:
                    "30px",
                  fontWeight:
                    700,
                  color:
                    colors.text,
                }}
              >
                Calendar
              </h1>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize:
                    "12px",
                  color:
                    colors.textMuted,
                }}
              >
                Your income, work,
                bills & reminders
                in one place.
              </p>
            </div>

            {moodCountThisMonth >
              0 && (
              <span
                style={{
                  fontSize:
                    "11px",
                  color:
                    colors.textMuted,
                  background:
                    colors.pinkPale,
                  border:
                    `1px solid ${colors.border}`,
                  borderRadius:
                    "99px",
                  padding:
                    "4px 9px",
                  fontWeight:
                    600,
                  whiteSpace:
                    "nowrap",
                }}
              >
                {moodCountThisMonth}{" "}
                mood
                {moodCountThisMonth !==
                1
                  ? "s"
                  : ""}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <LoadingSpinner
            message="Loading calendar…"
          />
        )}

        {error && (
          <SoftCard
            variant="highlight"
            style={{
              marginBottom:
                "16px",
              color:
                colors.pinkDeep,
              fontSize:
                "13px",
            }}
          >
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && (
          <>
            {/* =============================================
                MONTH SUMMARY
            ============================================= */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "8px",
                marginBottom:
                  "12px",
              }}
            >
              <SoftCard
                variant="base"
                padding="12px"
                noAnimate
              >
                <div
                  style={{
                    fontSize:
                      "9px",
                    fontWeight:
                      700,
                    color:
                      colors.textMuted,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                  }}
                >
                  Incoming Income
                </div>

                <div
                  style={{
                    marginTop:
                      "4px",
                    fontFamily:
                      typography.fontDisplay,
                    fontSize:
                      "20px",
                    fontWeight:
                      700,
                    color:
                      colors.gold,
                  }}
                >
                  {money(
                    monthlyIncome
                  )}
                </div>
              </SoftCard>

              <SoftCard
                variant="base"
                padding="12px"
                noAnimate
              >
                <div
                  style={{
                    fontSize:
                      "9px",
                    fontWeight:
                      700,
                    color:
                      colors.textMuted,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                  }}
                >
                  Bills / Expenses
                </div>

                <div
                  style={{
                    marginTop:
                      "4px",
                    fontFamily:
                      typography.fontDisplay,
                    fontSize:
                      "20px",
                    fontWeight:
                      700,
                    color:
                      colors.rose,
                  }}
                >
                  {money(
                    monthlyExpenses
                  )}
                </div>
              </SoftCard>
            </div>

            {/* =============================================
                MONTH NAVIGATION
            ============================================= */}

            <SoftCard
              variant="base"
              style={{
                marginBottom:
                  "16px",
              }}
              noAnimate
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                }}
              >
                <button
                  type="button"
                  onClick={
                    prevMonth
                  }
                  style={{
                    width:
                      "34px",
                    height:
                      "34px",
                    borderRadius:
                      radii.md,
                    border:
                      `1.5px solid ${colors.border}`,
                    background:
                      colors.bgWarm,
                    cursor:
                      "pointer",
                    fontSize:
                      "16px",
                  }}
                >
                  ‹
                </button>

                <h2
                  style={{
                    fontFamily:
                      typography.fontDisplay,
                    fontSize:
                      "20px",
                    margin:
                      0,
                  }}
                >
                  {
                    MONTH_NAMES[
                      viewMonth
                    ]
                  }{" "}
                  <span
                    style={{
                      color:
                        colors.textMuted,
                      fontWeight:
                        400,
                    }}
                  >
                    {viewYear}
                  </span>
                </h2>

                <button
                  type="button"
                  onClick={
                    nextMonth
                  }
                  style={{
                    width:
                      "34px",
                    height:
                      "34px",
                    borderRadius:
                      radii.md,
                    border:
                      `1.5px solid ${colors.border}`,
                    background:
                      colors.bgWarm,
                    cursor:
                      "pointer",
                    fontSize:
                      "16px",
                  }}
                >
                  ›
                </button>
              </div>
            </SoftCard>

            {/* =============================================
                CALENDAR GRID
            ============================================= */}

            <SoftCard
              variant="base"
              padding="12px"
              style={{
                marginBottom:
                  "16px",
              }}
              noAnimate
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(7,1fr)",
                  gap: "2px",
                  marginBottom:
                    "4px",
                }}
              >
                {DAY_LABELS.map(
                  day => (
                    <div
                      key={
                        day
                      }
                      style={{
                        textAlign:
                          "center",
                        fontSize:
                          "9px",
                        fontWeight:
                          700,
                        color:
                          colors.textFaint,
                        padding:
                          "4px 0",
                      }}
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(7,1fr)",
                  gap: "3px",
                }}
              >
                {gridDays.map(
                  (
                    date,
                    index
                  ) => {
                    const ds =
                      dateString(
                        date
                      );

                    return (
                      <DayCell
                        key={
                          `${ds}-${index}`
                        }
                        date={
                          date
                        }
                        isCurrentMonth={
                          date.getMonth() ===
                          viewMonth
                        }
                        isToday={
                          ds ===
                          todayStr
                        }
                        isSelected={
                          ds ===
                          selected
                        }
                        events={
                          eventsByDate[
                            ds
                          ] ??
                          []
                        }
                        onSelect={
                          setSelected
                        }
                        moodEmoji={
                          moods[
                            ds
                          ]
                            ? MOOD_EMOJI[
                                moods[
                                  ds
                                ]
                              ]
                            : null
                        }
                      />
                    );
                  }
                )}
              </div>

              {/* LEGEND */}

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
                  marginTop:
                    "12px",
                  paddingTop:
                    "12px",
                  borderTop:
                    `1px solid ${colors.borderSoft}`,
                }}
              >
                {[
                  "income",
                  "work",
                  "payperiod",
                  "bill",
                  "debt",
                  "event",
                  "reminder",
                ].map(
                  type => {
                    const meta =
                      TYPE_META[
                        type
                      ];

                    return (
                      <div
                        key={
                          type
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "4px",
                        }}
                      >
                        <span>
                          {
                            meta.emoji
                          }
                        </span>

                        <span
                          style={{
                            fontSize:
                              "9px",
                            color:
                              colors.textMuted,
                          }}
                        >
                          {
                            meta.label
                          }
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </SoftCard>

            {/* =============================================
                SELECTED DATE
            ============================================= */}

            {selected && (
              <SoftCard
                variant="soft"
                style={{
                  marginBottom:
                    "16px",
                }}
                noAnimate
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
                  <strong
                    style={{
                      fontSize:
                        "13px",
                    }}
                  >
                    {parseDate(
                      selected
                    )?.toLocaleDateString(
                      "en-CA",
                      {
                        weekday:
                          "long",
                        month:
                          "long",
                        day:
                          "numeric",
                      }
                    )}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        null
                      )
                    }
                    style={{
                      border:
                        "none",
                      background:
                        "none",
                      cursor:
                        "pointer",
                      fontSize:
                        "18px",
                    }}
                  >
                    ×
                  </button>
                </div>

                {selectedMood && (
                  <div
                    style={{
                      padding:
                        "10px",
                      marginBottom:
                        "8px",
                      borderRadius:
                        radii.lg,
                      background:
                        colors.pinkPale,
                    }}
                  >
                    {
                      MOOD_EMOJI[
                        selectedMood
                      ]
                    }{" "}
                    Feeling{" "}
                    {
                      selectedMood
                    }
                  </div>
                )}

                {selectedEvents.length ===
                  0 &&
                  !selectedMood && (
                    <div
                      style={{
                        fontSize:
                          "12px",
                        color:
                          colors.textMuted,
                        padding:
                          "10px 0",
                      }}
                    >
                      Nothing scheduled
                      for this date.
                    </div>
                  )}

                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "8px",
                  }}
                >
                  {selectedEvents.map(
                    event => {
                      const meta =
                        TYPE_META[
                          event.type
                        ] ??
                        TYPE_META.bill;

                      const isCustom =
                        event.type ===
                          "event" ||
                        event.type ===
                          "reminder";

                      return (
                        <div
                          key={
                            event.id
                          }
                          style={{
                            padding:
                              "11px 12px",
                            borderRadius:
                              radii.lg,
                            background:
                              meta.bg,
                            border:
                              `1px solid ${meta.border}`,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "10px",
                            }}
                          >
                            <span>
                              {
                                meta.emoji
                              }
                            </span>

                            <div
                              style={{
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    "13px",
                                  fontWeight:
                                    600,
                                }}
                              >
                                {
                                  event.title
                                }
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    meta.color,
                                  marginTop:
                                    "3px",
                                }}
                              >
                                {
                                  meta.label
                                }

                                {event.time
                                  ? ` · ${event.time}`
                                  : ""}
                              </div>

                              {event.type ===
                                "income" && (
                                <div
                                  style={{
                                    marginTop:
                                      "6px",
                                    fontSize:
                                      "10px",
                                    color:
                                      colors.textMuted,
                                  }}
                                >
                                  Pay period:{" "}
                                  {formatShortDate(
                                    event.payPeriodStart
                                  )}{" "}
                                  –{" "}
                                  {formatShortDate(
                                    event.payPeriodEnd
                                  )}
                                </div>
                              )}
                            </div>

                            {event.amount >
                              0 && (
                              <strong
                                style={{
                                  fontFamily:
                                    typography.fontDisplay,
                                  color:
                                    meta.color,
                                  fontSize:
                                    "15px",
                                }}
                              >
                                {money(
                                  event.amount
                                )}
                              </strong>
                            )}

                            {isCustom && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteEntry(
                                    event.id
                                  )
                                }
                                style={{
                                  border:
                                    "none",
                                  background:
                                    "none",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "16px",
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>

                          {event.type ===
                            "income" && (
                            <div
                              style={{
                                marginTop:
                                  "8px",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  600,
                                color:
                                  event.actual
                                    ? "#4d8764"
                                    : "#9b6b2f",
                              }}
                            >
                              {event.actual
                                ? "✓ Actual paycheck"
                                : "≈ Estimated paycheck"}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </SoftCard>
            )}

            {/* =============================================
                INCOMING PAYDAYS
            ============================================= */}

            <section
              style={{
                marginBottom:
                  "18px",
              }}
            >
              <h2
                style={{
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  color:
                    colors.textMuted,
                  letterSpacing:
                    "0.12em",
                  textTransform:
                    "uppercase",
                  marginBottom:
                    "10px",
                }}
              >
                Upcoming Income
              </h2>

              {upcomingIncome.length ===
                0 ? (
                <SoftCard
                  variant="ghost"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "24px",
                    color:
                      colors.textFaint,
                    fontSize:
                      "12px",
                  }}
                  noAnimate
                >
                  No upcoming income
                  is currently
                  calculated.
                  <br />
                  Add work hours in
                  Income first.
                </SoftCard>
              ) : (
                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "8px",
                  }}
                >
                  {upcomingIncome.map(
                    event => {
                      const days =
                        daysUntil(
                          event.date
                        );

                      return (
                        <SoftCard
                          key={
                            event.id
                          }
                          variant="base"
                          padding="12px 14px"
                          noAnimate
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "12px",
                            }}
                          >
                            <div
                              style={{
                                width:
                                  "40px",
                                height:
                                  "40px",
                                borderRadius:
                                  radii.md,
                                background:
                                  TYPE_META
                                    .income
                                    .bg,
                                border:
                                  `1px solid ${TYPE_META.income.border}`,
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                fontSize:
                                  "19px",
                              }}
                            >
                              💰
                            </div>

                            <div
                              style={{
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    "13px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {
                                  event.person
                                }{" "}
                                —{" "}
                                {
                                  event.employer
                                }
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    colors.textMuted,
                                  marginTop:
                                    "3px",
                                }}
                              >
                                Payday:{" "}
                                {formatDate(
                                  event.date
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    colors.textMuted,
                                  marginTop:
                                    "2px",
                                }}
                              >
                                Pay period:{" "}
                                {formatShortDate(
                                  event.payPeriodStart
                                )}{" "}
                                –{" "}
                                {formatShortDate(
                                  event.payPeriodEnd
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
                                  fontFamily:
                                    typography.fontDisplay,
                                  fontSize:
                                    "17px",
                                  fontWeight:
                                    700,
                                  color:
                                    colors.gold,
                                }}
                              >
                                {money(
                                  event.amount
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "9px",
                                  marginTop:
                                    "3px",
                                  color:
                                    event.actual
                                      ? "#4d8764"
                                      : "#9b6b2f",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {event.actual
                                  ? "ACTUAL"
                                  : "ESTIMATED"}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "10px",
                                  color:
                                    days <=
                                    3
                                      ? colors.pinkDeep
                                      : colors.textMuted,
                                  marginTop:
                                    "3px",
                                }}
                              >
                                {days ===
                                0
                                  ? "Today"
                                  : days ===
                                    1
                                    ? "Tomorrow"
                                    : `${days} days`}
                              </div>
                            </div>
                          </div>
                        </SoftCard>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* =============================================
                PERSONAL EVENTS / REMINDERS
            ============================================= */}

            <AddEntrySection
              entries={
                customEntries
              }
              onAdd={
                handleAddEntry
              }
              onDelete={
                handleDeleteEntry
              }
              today={
                today
              }
            />

            {/* =============================================
                UPCOMING
            ============================================= */}

            <section>
              <h2
                style={{
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  color:
                    colors.textMuted,
                  letterSpacing:
                    "0.12em",
                  textTransform:
                    "uppercase",
                  marginBottom:
                    "10px",
                }}
              >
                Upcoming
              </h2>

              {upcoming.length ===
                0 ? (
                <SoftCard
                  variant="ghost"
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "28px",
                    color:
                      colors.textFaint,
                    fontSize:
                      "12px",
                  }}
                  noAnimate
                >
                  Nothing upcoming.
                </SoftCard>
              ) : (
                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "8px",
                  }}
                >
                  {upcoming.map(
                    event => {
                      const meta =
                        TYPE_META[
                          event.type
                        ] ??
                        TYPE_META.bill;

                      const days =
                        daysUntil(
                          event.date
                        );

                      return (
                        <SoftCard
                          key={
                            event.id
                          }
                          variant="base"
                          padding="11px 14px"
                          noAnimate
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap:
                              "10px",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "34px",
                              height:
                                "34px",
                              borderRadius:
                                radii.md,
                              background:
                                meta.bg,
                              border:
                                `1px solid ${meta.border}`,
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              flexShrink:
                                0,
                            }}
                          >
                            {
                              meta.emoji
                            }
                          </div>

                          <div
                            style={{
                              flex: 1,
                              minWidth:
                                0,
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "12px",
                                fontWeight:
                                  600,
                              }}
                            >
                              {
                                event.title
                              }
                            </div>

                            <div
                              style={{
                                fontSize:
                                  "9px",
                                color:
                                  meta.color,
                                textTransform:
                                  "uppercase",
                                marginTop:
                                  "2px",
                              }}
                            >
                              {
                                meta.label
                              }{" "}
                              ·{" "}
                              {formatShortDate(
                                event.date
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                              flexShrink:
                                0,
                            }}
                          >
                            {event.amount >
                              0 && (
                              <div
                                style={{
                                  fontFamily:
                                    typography.fontDisplay,
                                  fontWeight:
                                    700,
                                  color:
                                    meta.color,
                                  fontSize:
                                    "14px",
                                }}
                              >
                                {money(
                                  event.amount
                                )}
                              </div>
                            )}

                            <div
                              style={{
                                fontSize:
                                  "9px",
                                color:
                                  days <=
                                  3
                                    ? colors.pinkDeep
                                    : colors.textMuted,
                              }}
                            >
                              {days ===
                              0
                                ? "Today"
                                : days ===
                                  1
                                  ? "Tomorrow"
                                  : `${days}d`}
                            </div>
                          </div>
                        </SoftCard>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
