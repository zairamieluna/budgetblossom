/**
 * Budget Blossom
 * Income & Work Hours
 *
 * Uses incomeCalculator.ts for payroll calculations.
 *
 * Existing functionality preserved:
 * - Supabase user_data storage
 * - Jobs
 * - Work shifts
 * - Pay periods
 * - Budget Pool
 * - Actual paycheck entry
 * - Job deletion
 * - Pooled income deletion
 */

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";

import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { typography } from "../ui/designTokens";

import {
  calculateShift,
  calculatePaycheck,
} from "../services/income/incomeCalculator";


/* =========================================================
   PAY PERIODS
========================================================= */

const MO = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function buildPeriods() {
  const out = [];
  const year = 2026;

  for (let m = 0; m < 12; m++) {
    const lastDay =
      new Date(year, m + 1, 0).getDate();

    out.push({
      k: `26${m}a`,
      lbl: `${MO[m]} 1–15`,
      s: new Date(year, m, 1),
      e: new Date(
        year,
        m,
        15,
        23,
        59,
        59
      ),
      pd: new Date(year, m, 7),
    });

    out.push({
      k: `26${m}b`,
      lbl: `${MO[m]} 16–${lastDay}`,
      s: new Date(year, m, 16),
      e: new Date(
        year,
        m,
        lastDay,
        23,
        59,
        59
      ),
      pd: new Date(year, m, 22),
    });
  }

  return out;
}

const PERIODS = buildPeriods();

function currentPeriodIdx() {
  const now = new Date();

  const idx = PERIODS.findIndex(
    p => now >= p.s && now <= p.e
  );

  if (idx >= 0) return idx;

  const next = PERIODS.findIndex(
    p => p.s > now
  );

  return next >= 0
    ? Math.max(0, next - 1)
    : PERIODS.length - 1;
}


/* =========================================================
   CANADIAN / ONTARIO HOLIDAYS
========================================================= */

const HOLS = [
  {
    d: "2026-01-01",
    n: "New Year's Day",
  },
  {
    d: "2026-02-16",
    n: "Family Day (ON)",
  },
  {
    d: "2026-04-03",
    n: "Good Friday",
  },
  {
    d: "2026-04-06",
    n: "Easter Monday",
  },
  {
    d: "2026-05-18",
    n: "Victoria Day",
  },
  {
    d: "2026-07-01",
    n: "Canada Day",
  },
  {
    d: "2026-08-03",
    n: "Civic Holiday (ON)",
  },
  {
    d: "2026-09-07",
    n: "Labour Day",
  },
  {
    d: "2026-10-12",
    n: "Thanksgiving",
  },
  {
    d: "2026-11-11",
    n: "Remembrance Day",
  },
  {
    d: "2026-12-25",
    n: "Christmas Day",
  },
  {
    d: "2026-12-26",
    n: "Boxing Day",
  },
];

const getHol = date =>
  HOLS.find(h => h.d === date) ?? null;


/* =========================================================
   HELPERS
========================================================= */

const fmt = n =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  })
    .format(Number(n) || 0)
    .replace("CA$", "$");

const fd = d =>
  d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });

const todayStr = () =>
  new Date()
    .toISOString()
    .split("T")[0];

const numberOrZero = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};


/* =========================================================
   DEFAULT JOBS
========================================================= */

const DEFAULT_JOBS = [
  {
    id: "j1",
    person: "Zai",
    title: "A&W",
    employer: "A&W Canada",
    rate: 17.75,
    otRate: 26.63,
    ded: 5.29,
    overtimeThreshold: 44,
    statMultiplier: 1.5,
    vacationPercent: 0,
    color: 0,
  },

  {
    id: "j2",
    person: "Zai",
    title: "Loblaws",
    employer: "Loblaw Companies",
    rate: 17.70,
    otRate: 26.55,
    ded: 14.7,
    overtimeThreshold: 44,
    statMultiplier: 1.5,
    vacationPercent: 0,
    color: 1,
  },

  {
    id: "j3",
    person: "Ariel",
    title: "INGERV",
    employer: "INGERV Cleaner",
    rate: 20.50,
    otRate: 30.75,
    ded: 8.70,
    overtimeThreshold: 44,
    statMultiplier: 1.5,
    vacationPercent: 0,
    color: 2,
  },
];

const JOB_COLORS = [
  "#db2777",
  "#3a6b4e",
  "#2860a0",
  "#a67c20",
  "#7c3aed",
];


/* =========================================================
   STYLES
========================================================= */

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #fce7f3",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "12px",
  boxShadow:
    "0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)",
};

const inp = {
  width: "100%",
  padding: "9px 11px",
  background: "#fff5f9",
  border: "1.5px solid #fce7f3",
  borderRadius: "9px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#1a0f1e",
  outline: "none",
  boxSizing: "border-box",
};

function Lbl({ children }) {
  return (
    <div
      style={{
        fontSize: "0.62rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#9b6b8a",
        margin: "11px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

function DividerLabel({ children }) {
  return (
    <div
      style={{
        fontSize: "0.67rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#9b6b8a",
        textAlign: "center",
        borderTop: "1px solid #fce7f3",
        paddingTop: "12px",
        marginTop: "12px",
        marginBottom: "10px",
      }}
    >
      — {children} —
    </div>
  );
}


/* =========================================================
   TOAST
========================================================= */

function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;

    const timer = setTimeout(
      onDone,
      2400
    );

    return () => clearTimeout(timer);
  }, [msg, onDone]);

  if (!msg) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a0f1e",
        color: "#f6f2ec",
        borderRadius: "99px",
        padding: "9px 20px",
        fontSize: "13px",
        fontWeight: 600,
        zIndex: 700,
        whiteSpace: "nowrap",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {msg}
    </div>
  );
}


/* =========================================================
   PERIOD NAVIGATION
========================================================= */

function PeriodNav({
  pidx,
  period,
  onChange,
}) {
  const navBtn = disabled => ({
    background: "#fff",
    border: "1.5px solid #f0dce4",
    borderRadius: "9px",
    padding: "7px 12px",
    fontWeight: 700,
    color: "#9b6b8a",
    cursor: disabled
      ? "not-allowed"
      : "pointer",
    fontFamily:
      "'DM Sans', sans-serif",
    fontSize: "14px",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "12px",
      }}
    >
      <button
        style={navBtn(pidx === 0)}
        disabled={pidx === 0}
        onClick={() =>
          onChange(
            Math.max(0, pidx - 1)
          )
        }
      >
        ‹
      </button>

      <div
        style={{
          flex: 1,
          textAlign: "center",
          background: "#fff",
          border: "1.5px solid #f0dce4",
          borderRadius: "9px",
          padding: "7px 10px",
          fontFamily:
            typography.fontDisplay,
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        {period?.lbl}
      </div>

      <button
        style={navBtn(
          pidx === PERIODS.length - 1
        )}
        disabled={
          pidx === PERIODS.length - 1
        }
        onClick={() =>
          onChange(
            Math.min(
              PERIODS.length - 1,
              pidx + 1
            )
          )
        }
      >
        ›
      </button>
    </div>
  );
}


/* =========================================================
   ADD JOB
========================================================= */

function AddJobModal({
  open,
  onClose,
  onAdd,
}) {
  const [form, setForm] =
    useState({
      person: "Zai",
      title: "",
      employer: "",
      rate: "",
      ded: "5",
      overtimeThreshold: "44",
      statMultiplier: "1.5",
      vacationPercent: "0",
    });

  if (!open) return null;

  const set = (key, value) =>
    setForm(current => ({
      ...current,
      [key]: value,
    }));

  function submit() {
    const rate =
      Number(form.rate);

    if (
      !form.title.trim() ||
      !rate ||
      rate <= 0
    ) {
      alert(
        "Job title and hourly rate are required."
      );
      return;
    }

    const overtimeThreshold =
      Number(
        form.overtimeThreshold
      ) || 44;

    const statMultiplier =
      Number(form.statMultiplier) || 1;

    const vacationPercent =
      (Number(form.vacationPercent) || 0) /
      100;

    onAdd({
      id: "j" + Date.now(),
      person: form.person,
      title: form.title.trim(),
      employer:
        form.employer.trim() || "—",
      rate,
      otRate:
        +(rate * 1.5).toFixed(2),
      ded:
        Number(form.ded) || 0,
      overtimeThreshold,
      statMultiplier,
      vacationPercent,
      color:
        Math.floor(
          Math.random() * JOB_COLORS.length
        ),
    });

    setForm({
      person: "Zai",
      title: "",
      employer: "",
      rate: "",
      ded: "5",
      overtimeThreshold: "44",
      statMultiplier: "1.5",
      vacationPercent: "0",
    });

    onClose();
  }

  return (
    <div
      onClick={e =>
        e.target === e.currentTarget &&
        onClose()
      }
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background:
          "rgba(26,9,30,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius:
            "20px 20px 0 0",
          padding: "22px 18px 34px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow:
            "0 -8px 40px rgba(26,9,30,.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontFamily:
                typography.fontDisplay,
              fontSize: "17px",
              fontWeight: 700,
              color: "#1a0f1e",
            }}
          >
            + Add Job / Employer
          </h3>

          <button
            onClick={onClose}
            style={{
              background: "#fff5f9",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#9b6b8a",
            }}
          >
            ✕
          </button>
        </div>

        <Lbl>Person</Lbl>

        <select
          style={inp}
          value={form.person}
          onChange={e =>
            set(
              "person",
              e.target.value
            )
          }
        >
          <option value="Zai">
            Zai
          </option>
          <option value="Ariel">
            Ariel
          </option>
        </select>

        <Lbl>Job Title</Lbl>

        <input
          style={inp}
          placeholder="e.g. A&W"
          value={form.title}
          onChange={e =>
            set(
              "title",
              e.target.value
            )
          }
        />

        <Lbl>Employer</Lbl>

        <input
          style={inp}
          placeholder="Employer name"
          value={form.employer}
          onChange={e =>
            set(
              "employer",
              e.target.value
            )
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <Lbl>Hourly Rate ($)</Lbl>

            <input
              style={inp}
              type="number"
              step="0.01"
              value={form.rate}
              onChange={e =>
                set(
                  "rate",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Estimated Deduction %
            </Lbl>

            <input
              style={inp}
              type="number"
              step="0.1"
              value={form.ded}
              onChange={e =>
                set(
                  "ded",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <Lbl>
              OT Threshold (hrs)
            </Lbl>

            <input
              style={inp}
              type="number"
              step="0.5"
              value={
                form.overtimeThreshold
              }
              onChange={e =>
                set(
                  "overtimeThreshold",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Stat Multiplier
            </Lbl>

            <select
              style={inp}
              value={
                form.statMultiplier
              }
              onChange={e =>
                set(
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
          </div>
        </div>

        <Lbl>
          Vacation Pay %
        </Lbl>

        <input
          style={inp}
          type="number"
          step="0.1"
          value={
            form.vacationPercent
          }
          onChange={e =>
            set(
              "vacationPercent",
              e.target.value
            )
          }
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border:
                "1.5px solid #f0dce4",
              background: "#fff",
              color: "#3a2430",
              fontFamily:
                "'DM Sans',sans-serif",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={submit}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: "#db2777",
              color: "#fff",
              fontFamily:
                "'DM Sans',sans-serif",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Add Job
          </button>
        </div>
      </div>
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
  onRmShift,
  onSendShifts,
  onSendActual,
  onRemoveJob,
}) {
  const [date, setDate] =
    useState(todayStr());

  const [inT, setInT] =
    useState("09:00");

  const [outT, setOutT] =
    useState("17:00");

  const [brk, setBrk] =
    useState("30");

  const [type, setType] =
    useState("regular");

  const [freezingPremium, setFreezingPremium] =
    useState("");

  const [eveningPremium, setEveningPremium] =
    useState("");

  const [trainingHours, setTrainingHours] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [holNote, setHolNote] =
    useState("");

  const [actualN, setActualN] =
    useState("");

  const [actualG, setActualG] =
    useState("");

  const accentColor =
    JOB_COLORS[
      job.color ?? 0
    ];

  /*
   * Convert old stored shifts and new
   * calculator-compatible shifts into
   * calculator input.
   */

  const calculatorShifts =
    shifts.map(shift => {
      let statMultiplier = 1;

      if (
        shift.type ===
        "stat_1_5x"
      ) {
        statMultiplier = 1.5;
      }

      if (
        shift.type ===
        "stat_2x"
      ) {
        statMultiplier = 2;
      }

      if (
        shift.type === "stat"
      ) {
        statMultiplier =
          job.statMultiplier ??
          1.5;
      }

      return {
        date: shift.date,

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
          shift.isStatHoliday ??
          (
            shift.type ===
              "stat" ||
            shift.type ===
              "stat_1x" ||
            shift.type ===
              "stat_1_5x" ||
            shift.type ===
              "stat_2x" ||
            Boolean(shift.hol)
          ),

        statMultiplier,

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
      };
    });

  const payroll =
    calculatorShifts.length
      ? calculatePaycheck(
          calculatorShifts,
          {
            vacationPercent:
              job.vacationPercent ??
              0,

            federalTax: 0,
            cpp: 0,
            ei: 0,
            otherDeductions: 0,
          }
        )
      : null;

  const totH =
    payroll?.regularHours +
    payroll?.overtimeHours +
    payroll?.statHours +
    payroll?.trainingHours ||
    0;

  const gross =
    payroll?.grossPay || 0;

  /*
   * Existing Budget Blossom estimated
   * deduction percentage remains available.
   */

  const estimatedDed =
    gross *
    (
      numberOrZero(job.ded) /
      100
    );

  const estimatedNet =
    gross -
    estimatedDed;

  function handleDateChange(
    value
  ) {
    setDate(value);

    const holiday =
      getHol(value);

    if (holiday) {
      setHolNote(
        `🎉 ${holiday.n} — choose the applicable employer pay treatment below.`
      );

      setType(
        "stat_1_5x"
      );
    } else {
      setHolNote("");
    }
  }

  function getShiftSettings() {
    const holiday =
      getHol(date);

    let isStatHoliday =
      Boolean(holiday);

    let statMultiplier =
      1;

    if (
      type === "stat_1x"
    ) {
      isStatHoliday = true;
      statMultiplier = 1;
    }

    if (
      type === "stat_1_5x"
    ) {
      isStatHoliday = true;
      statMultiplier = 1.5;
    }

    if (
      type === "stat_2x"
    ) {
      isStatHoliday = true;
      statMultiplier = 2;
    }

    /*
     * "overtime" is calculated using the
     * employer threshold rather than
     * simply replacing the hourly rate.
     */

    return {
      isStatHoliday,
      statMultiplier,
    };
  }

  function handleAddShift() {
    if (
      !date ||
      !inT ||
      !outT
    ) {
      alert(
        "Enter date, time in, and time out."
      );
      return;
    }

    const breakMinutes =
      Number(brk) || 0;

    const {
      isStatHoliday,
      statMultiplier,
    } = getShiftSettings();

    const shift = {
      date,

      startTime: inT,
      endTime: outT,

      unpaidBreakMinutes:
        breakMinutes,

      hourlyRate:
        job.rate,

      overtimeThreshold:
        job.overtimeThreshold ??
        44,

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
        Number(trainingHours) ||
        0,

      notes,

      /*
       * Legacy-compatible fields.
       * Keeping these prevents existing
       * saved Budget Blossom shifts from
       * becoming unusable.
       */

      id: Date.now(),

      inT,
      outT,

      brk: breakMinutes,

      type,

      rate: job.rate,

      hol:
        getHol(date)?.n ??
        null,
    };

    const calculation =
      calculateShift(shift);

    const savedShift = {
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
    };

    onAddShift(
      job.id,
      savedShift
    );

    setInT("09:00");
    setOutT("17:00");
    setBrk("30");
    setType("regular");
    setFreezingPremium("");
    setEveningPremium("");
    setTrainingHours("");
    setNotes("");
    setHolNote("");
  }

  function handleSendActual() {
    const net =
      Number(actualN);

    const grossActual =
      Number(actualG) ||
      net;

    if (
      !net ||
      net <= 0
    ) {
      alert(
        "Enter the actual net paycheck amount."
      );
      return;
    }

    onSendActual(
      job.id,
      net,
      grossActual,
      estimatedNet
    );

    setActualN("");
    setActualG("");
  }

  const payTypeOptions = [
    {
      value: "regular",
      label:
        `Regular — ${fmt(job.rate)}/hr`,
    },
    {
      value: "overtime",
      label:
        `Overtime — ${fmt(
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

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily:
                typography.fontDisplay,
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#1a0f1e",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                background:
                  accentColor,
                color: "#fff",
                fontSize:
                  "0.6rem",
                fontWeight: 700,
                padding:
                  "2px 8px",
                borderRadius:
                  "5px",
              }}
            >
              {job.person}
            </span>

            {job.title}
          </div>

          <div
            style={{
              fontSize:
                "0.72rem",
              color:
                "#9b6b8a",
              marginTop:
                "2px",
            }}
          >
            {fmt(job.rate)}
            /hr · OT{" "}
            {fmt(
              job.otRate ??
                job.rate * 1.5
            )}
            /hr ·{" "}
            {job.employer}
          </div>
        </div>

        <button
          onClick={() =>
            onRemoveJob(
              job.id
            )
          }
          style={{
            background:
              "none",
            border: "none",
            cursor:
              "pointer",
            color:
              "#d4b8c4",
            fontSize:
              "0.85rem",
          }}
        >
          ✕
        </button>
      </div>


      {/* HOLIDAY MESSAGE */}

      {holNote && (
        <div
          style={{
            background:
              "#faf5e6",
            border:
              "1px solid #dcca84",
            borderRadius:
              "9px",
            padding:
              "8px 12px",
            marginBottom:
              "10px",
            fontSize:
              "0.75rem",
            color:
              "#7a5010",
            fontWeight: 600,
          }}
        >
          {holNote}
        </div>
      )}


      {/* SHIFT FORM */}

      <div
        style={{
          borderTop:
            "1px solid #fce7f3",
          paddingTop:
            "12px",
          marginBottom:
            "10px",
        }}
      >
        <div
          style={{
            fontSize:
              "0.72rem",
            fontWeight: 700,
            color:
              "#9b6b8a",
            letterSpacing:
              "0.06em",
            textTransform:
              "uppercase",
            marginBottom:
              "8px",
          }}
        >
          Log Work Hours
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <Lbl>Date</Lbl>

            <input
              style={inp}
              type="date"
              value={date}
              onChange={e =>
                handleDateChange(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Break (mins)
            </Lbl>

            <input
              style={inp}
              type="number"
              min="0"
              value={brk}
              onChange={e =>
                setBrk(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Start Time
            </Lbl>

            <input
              style={inp}
              type="time"
              value={inT}
              onChange={e =>
                setInT(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              End Time
            </Lbl>

            <input
              style={inp}
              type="time"
              value={outT}
              onChange={e =>
                setOutT(
                  e.target.value
                )
              }
            />
          </div>
        </div>


        <Lbl>
          Pay Treatment
        </Lbl>

        <select
          style={inp}
          value={type}
          onChange={e =>
            setType(
              e.target.value
            )
          }
        >
          {payTypeOptions.map(
            option => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            )
          )}
        </select>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <Lbl>
              Freezing Premium ($/hr)
            </Lbl>

            <input
              style={inp}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={
                freezingPremium
              }
              onChange={e =>
                setFreezingPremium(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Evening Premium ($/hr)
            </Lbl>

            <input
              style={inp}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={
                eveningPremium
              }
              onChange={e =>
                setEveningPremium(
                  e.target.value
                )
              }
            />
          </div>
        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <Lbl>
              Training Hours
            </Lbl>

            <input
              style={inp}
              type="number"
              step="0.25"
              min="0"
              placeholder="0"
              value={
                trainingHours
              }
              onChange={e =>
                setTrainingHours(
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Lbl>
              Hourly Rate
            </Lbl>

            <input
              style={inp}
              type="text"
              value={fmt(job.rate)}
              readOnly
            />
          </div>
        </div>


        <Lbl>
          Notes
        </Lbl>

        <input
          style={inp}
          type="text"
          placeholder="Optional notes"
          value={notes}
          onChange={e =>
            setNotes(
              e.target.value
            )
          }
        />

        <button
          onClick={
            handleAddShift
          }
          style={{
            width: "100%",
            marginTop:
              "10px",
            padding:
              "10px",
            borderRadius:
              "9px",
            background:
              "#db2777",
            border:
              "none",
            color: "#fff",
            fontFamily:
              "'DM Sans',sans-serif",
            fontWeight: 700,
            cursor:
              "pointer",
          }}
        >
          + Add Work Hours
        </button>
      </div>


      {/* SHIFTS */}

      {shifts.length > 0 ? (
        <div
          style={{
            marginBottom:
              "12px",
          }}
        >
          {shifts.map(
            shift => (
              <div
                key={
                  shift.id
                }
                style={{
                  background:
                    "#fff5f9",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 11px",
                  marginBottom:
                    "6px",
                  display:
                    "flex",
                  alignItems:
                    "flex-start",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "0.83rem",
                      fontWeight:
                        600,
                    }}
                  >
                    {shift.date}

                    {shift.hol && (
                      <span
                        style={{
                          color:
                            "#a67c20",
                          fontSize:
                            "0.65rem",
                          marginLeft:
                            "5px",
                        }}
                      >
                        🎉{" "}
                        {
                          shift.hol
                        }
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "0.67rem",
                      color:
                        "#9b6b8a",
                      marginTop:
                        "2px",
                    }}
                  >
                    {shift.inT ??
                      shift.startTime}
                    –
                    {shift.outT ??
                      shift.endTime}
                    {" · "}
                    {numberOrZero(
                      shift.hrs
                    ).toFixed(2)}
                    {" hrs"}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "0.67rem",
                      color:
                        "#9b6b8a",
                    }}
                  >
                    {shift.type ??
                      "regular"}
                    {" · "}
                    {fmt(
                      shift.rate ??
                        job.rate
                    )}
                    /hr
                  </div>
                </div>

                <div
                  style={{
                    fontWeight:
                      700,
                    color:
                      "#3a6b4e",
                    fontSize:
                      "0.85rem",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {fmt(
                    shift.gross ??
                      0
                  )}
                </div>

                <button
                  onClick={() =>
                    onRmShift(
                      job.id,
                      shift.id
                    )
                  }
                  style={{
                    background:
                      "none",
                    border:
                      "none",
                    cursor:
                      "pointer",
                    color:
                      "#d4b8c4",
                  }}
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <p
          style={{
            fontSize:
              "0.77rem",
            color:
              "#9b6b8a",
            marginBottom:
              "12px",
          }}
        >
          No work hours logged yet.
        </p>
      )}


      {/* PAYROLL SUMMARY */}

      <div
        style={{
          background:
            "#fff5f9",
          border:
            "1px solid #fce7f3",
          borderRadius:
            "9px",
          padding:
            "13px",
          marginBottom:
            "12px",
        }}
      >
        <div
          style={{
            fontSize:
              "0.72rem",
            fontWeight:
              700,
            color:
              "#9b6b8a",
            textTransform:
              "uppercase",
            marginBottom:
              "10px",
          }}
        >
          Payroll Estimate
        </div>

        {[
          {
            label:
              "Regular Hours",
            value:
              `${(
                payroll?.regularHours ??
                0
              ).toFixed(2)} hrs`,
          },
          {
            label:
              "Overtime Hours",
            value:
              `${(
                payroll?.overtimeHours ??
                0
              ).toFixed(2)} hrs`,
          },
          {
            label:
              "Holiday Hours",
            value:
              `${(
                payroll?.statHours ??
                0
              ).toFixed(2)} hrs`,
          },
          {
            label:
              "Premium Hours",
            value:
              `${(
                payroll?.premiumHours ??
                0
              ).toFixed(2)} hrs`,
          },
          {
            label:
              "Training Hours",
            value:
              `${(
                payroll?.trainingHours ??
                0
              ).toFixed(2)} hrs`,
          },
          {
            label:
              "Gross Pay",
            value:
              fmt(gross),
          },
          {
            label:
              `Estimated Deductions (${numberOrZero(
                job.ded
              )}%)`,
            value:
              `−${fmt(
                estimatedDed
              )}`,
          },
        ].map(
          row => (
            <div
              key={
                row.label
              }
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                fontSize:
                  "0.81rem",
                marginBottom:
                  "6px",
              }}
            >
              <span
                style={{
                  color:
                    "#9b6b8a",
                }}
              >
                {row.label}
              </span>

              <span
                style={{
                  fontWeight:
                    700,
                  color:
                    "#1a0f1e",
                }}
              >
                {row.value}
              </span>
            </div>
          )
        )}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            fontSize:
              "0.81rem",
            paddingTop:
              "8px",
            borderTop:
              "1px solid #fce7f3",
            fontWeight:
              700,
          }}
        >
          <span>
            Estimated Net Pay
          </span>

          <span
            style={{
              fontSize:
                "1.05rem",
              color:
                "#db2777",
            }}
          >
            {fmt(
              estimatedNet
            )}
          </span>
        </div>
      </div>


      {/* SEND ESTIMATE */}

      <button
        onClick={() =>
          onSendShifts(
            job.id
          )
        }
        disabled={
          shifts.length === 0
        }
        style={{
          width: "100%",
          padding:
            "11px",
          borderRadius:
            "9px",
          background:
            shifts.length
              ? "#3a6b4e"
              : "#d4b8c4",
          border:
            "none",
          color: "#fff",
          fontFamily:
            "'DM Sans',sans-serif",
          fontWeight:
            700,
          cursor:
            shifts.length
              ? "pointer"
              : "not-allowed",
          marginBottom:
            "12px",
        }}
      >
        ✓ Send Estimated Pay to Budget Pool
      </button>


      {/* ACTUAL PAY */}

      <DividerLabel>
        Actual Paycheck
      </DividerLabel>

      <div
        style={{
          background:
            "#f8fbff",
          border:
            "1px solid #d7e6f5",
          borderRadius:
            "9px",
          padding:
            "12px",
          marginBottom:
            "10px",
          fontSize:
            "0.72rem",
          color:
            "#2860a0",
        }}
      >
        Estimated net:
        {" "}
        <strong>
          {fmt(
            estimatedNet
          )}
        </strong>

        <br />

        Enter the real paycheck
        after you receive it.
      </div>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "10px",
          marginBottom:
            "8px",
        }}
      >
        <div>
          <Lbl>
            Actual Net Pay
          </Lbl>

          <input
            style={inp}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={
              actualN
            }
            onChange={e =>
              setActualN(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <Lbl>
            Actual Gross
          </Lbl>

          <input
            style={inp}
            type="number"
            step="0.01"
            placeholder="Optional"
            value={
              actualG
            }
            onChange={e =>
              setActualG(
                e.target.value
              )
            }
          />
        </div>
      </div>

      <button
        onClick={
          handleSendActual
        }
        style={{
          width: "100%",
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
          fontFamily:
            "'DM Sans',sans-serif",
          fontWeight:
            700,
          cursor:
            "pointer",
        }}
      >
        ✓ Save Actual Paycheck
      </button>
    </div>
  );
}


/* =========================================================
   POOLED INCOME
========================================================= */

function PooledIncomeCard({
  periodSent,
  periodLabel,
  totalPool,
  onRemove,
}) {
  return (
    <div
      style={cardStyle}
    >
      <div
        style={{
          fontFamily:
            typography.fontDisplay,
          fontSize:
            "0.97rem",
          fontWeight: 700,
          marginBottom:
            "12px",
        }}
      >
        💰 Pooled Income —{" "}
        {periodLabel}
      </div>

      {periodSent.length ===
      0 ? (
        <p
          style={{
            color:
              "#9b6b8a",
            fontSize:
              "0.75rem",
          }}
        >
          No salary sent yet
          this period.
        </p>
      ) : (
        <>
          {periodSent.map(
            (entry, index) => (
              <div
                key={index}
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
                    "1px solid #fce7f3",
                  fontSize:
                    "0.81rem",
                  gap: 6,
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
                      fontWeight:
                        700,
                    }}
                  >
                    {entry.src}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "0.67rem",
                      color:
                        "#9b6b8a",
                    }}
                  >
                    {entry.date}
                    {" · Gross: "}
                    {fmt(
                      entry.gross ??
                        entry.amt
                    )}
                  </div>

                  {entry.estimatedNet !=
                    null && (
                    <div
                      style={{
                        fontSize:
                          "0.67rem",
                        color:
                          "#9b6b8a",
                      }}
                    >
                      Estimated:
                      {" "}
                      {fmt(
                        entry.estimatedNet
                      )}
                    </div>
                  )}

                  {entry.actualDifference !=
                    null && (
                    <div
                      style={{
                        fontSize:
                          "0.67rem",
                        color:
                          entry.actualDifference >=
                          0
                            ? "#3a6b4e"
                            : "#c24b1a",
                      }}
                    >
                      Actual vs estimate:
                      {" "}
                      {fmt(
                        entry.actualDifference
                      )}
                    </div>
                  )}
                </div>

                <span
                  style={{
                    background:
                      "#eaf3ee",
                    color:
                      "#3a6b4e",
                    fontSize:
                      "0.57rem",
                    fontWeight:
                      700,
                    padding:
                      "2px 6px",
                    borderRadius:
                      "5px",
                  }}
                >
                  {entry.isActual
                    ? "ACTUAL"
                    : "ESTIMATE"}
                </span>

                <div
                  style={{
                    fontWeight:
                      700,
                    color:
                      "#3a6b4e",
                  }}
                >
                  {fmt(
                    entry.amt
                  )}
                </div>

                <button
                  onClick={() =>
                    onRemove(
                      index
                    )
                  }
                  style={{
                    background:
                      "none",
                    border:
                      "none",
                    cursor:
                      "pointer",
                    color:
                      "#d4b8c4",
                  }}
                >
                  ✕
                </button>
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
                "10px",
              fontWeight:
                700,
              fontSize:
                "0.9rem",
              borderTop:
                "1px solid #fce7f3",
              marginTop:
                "4px",
            }}
          >
            <span>
              Total Pool
            </span>

            <span
              style={{
                color:
                  "#3a6b4e",
              }}
            >
              {fmt(
                totalPool
              )}
            </span>
          </div>
        </>
      )}
    </div>
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
    useState(null);

  const [toast, setToast] =
    useState("");

  const [addJobOpen, setAddJobOpen] =
    useState(false);

  const [pidx, setPidx] =
    useState(
      currentPeriodIdx()
    );


  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    let dead = false;

    async function load() {
      setLoading(true);
      setError(null);

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

        setRawData(parsed);
      } catch (err) {
        if (!dead) {
          setError(
            err?.message ??
              "Failed to load income data."
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

        try {
          const {
            data: row,
            error: rowError,
          } = await supabase
            .from("user_data")
            .select("id")
            .limit(1)
            .single();

          if (rowError) {
            throw rowError;
          }

          const {
            error: updateError,
          } = await supabase
            .from("user_data")
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
            "❌ Save failed"
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
    () =>
      rawData?.jobs ??
      DEFAULT_JOBS,
    [rawData]
  );

  const shifts = useMemo(
    () =>
      rawData?.shifts ??
      {},
    [rawData]
  );

  const sent = useMemo(
    () =>
      rawData?.sent ??
      {},
    [rawData]
  );

  const period =
    PERIODS[pidx];

  const periodKey =
    period?.k ?? "";

  const periodSent =
    useMemo(
      () =>
        sent[
          periodKey
        ] ?? [],
      [
        sent,
        periodKey,
      ]
    );

  const totalPool =
    useMemo(
      () =>
        periodSent.reduce(
          (sum, entry) =>
            sum +
            numberOrZero(
              entry.amt
            ),
          0
        ),
      [periodSent]
    );


  /* =======================================================
     ADD SHIFT
  ======================================================= */

  function handleAddShift(
    jobId,
    shift
  ) {
    const key =
      `${jobId}|${periodKey}`;

    const current =
      shifts[key] ?? [];

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


  /* =======================================================
     REMOVE SHIFT
  ======================================================= */

  function handleRmShift(
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
        [key]: current,
      },
    });

    setToast(
      "🗑 Work hours removed"
    );
  }


  /* =======================================================
     SEND ESTIMATED PAY
  ======================================================= */

  function handleSendShifts(
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
      `${jobId}|${periodKey}`;

    const jobShifts =
      shifts[key] ?? [];

    if (!jobShifts.length) {
      setToast(
        "⚠️ No work hours to send"
      );
      return;
    }

    const calculatorShifts =
      jobShifts.map(
        shift => ({
          date:
            shift.date,

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
            shift.isStatHoliday ??
            Boolean(
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
        })
      );

    const paycheck =
      calculatePaycheck(
        calculatorShifts,
        {
          vacationPercent:
            job.vacationPercent ??
            0,
        }
      );

    const estimatedGross =
      paycheck.grossPay;

    const estimatedDeduction =
      estimatedGross *
      (
        numberOrZero(
          job.ded
        ) / 100
      );

    const estimatedNet =
      estimatedGross -
      estimatedDeduction;

    const entry = {
      src:
        `${job.person} — ${job.title}`,

      amt:
        +estimatedNet.toFixed(
          2
        ),

      gross:
        +estimatedGross.toFixed(
          2
        ),

      estimatedNet:
        +estimatedNet.toFixed(
          2
        ),

      date:
        todayStr(),

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
      `✅ ${fmt(
        estimatedNet
      )} estimated pay → Budget Pool!`
    );
  }


  /* =======================================================
     ACTUAL PAY
  ======================================================= */

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

    const difference =
      actualNet -
      numberOrZero(
        estimatedNet
      );

    const entry = {
      src:
        `${job.person} — ${job.title}`,

      amt:
        +actualNet.toFixed(
          2
        ),

      gross:
        +actualGross.toFixed(
          2
        ),

      estimatedNet:
        numberOrZero(
          estimatedNet
        ),

      actualDifference:
        +difference.toFixed(
          2
        ),

      date:
        todayStr(),

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
      `✅ ${fmt(
        actualNet
      )} actual paycheck saved!`
    );
  }


  /* =======================================================
     ADD JOB
  ======================================================= */

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


  /* =======================================================
     REMOVE JOB
  ======================================================= */

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


  /* =======================================================
     REMOVE POOLED ENTRY
  ======================================================= */

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
          "#fdf6f8",
        fontFamily:
          "'DM Sans',sans-serif",
        color:
          "#1a0f1e",
        paddingBottom:
          "80px",
      }}
    >
      <div
        style={{
          maxWidth:
            "640px",
          margin:
            "0 auto",
          padding:
            "14px",
        }}
      >

        {/* PAGE HEADER */}

        <div
          className="fade-up"
          style={{
            padding:
              "28px 0 14px",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "baseline",
          }}
        >
          <div>
            <p
              style={{
                fontSize:
                  "11px",
                fontWeight:
                  700,
                color:
                  "#9b6b8a",
                letterSpacing:
                  "0.12em",
                textTransform:
                  "uppercase",
                marginBottom:
                  "4px",
              }}
            >
              Salary
            </p>

            <h1
              style={{
                fontFamily:
                  typography.fontDisplay,
                fontSize:
                  "28px",
                fontWeight:
                  700,
                color:
                  "#1a0f1e",
                letterSpacing:
                  "-0.02em",
                lineHeight:
                  1.1,
              }}
            >
              Income & Work Hours
            </h1>
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


        {loading && (
          <LoadingSpinner
            message="Loading salary data…"
          />
        )}


        {error && (
          <div
            style={{
              background:
                "#fdedf1",
              border:
                "1px solid #f4a0b4",
              borderRadius:
                "14px",
              padding:
                "14px",
              marginBottom:
                "12px",
              color:
                "#c94d6a",
              fontSize:
                "13px",
            }}
          >
            ⚠ {error}
          </div>
        )}


        {!loading &&
          !error && (
            <>
              <PeriodNav
                pidx={pidx}
                period={period}
                onChange={
                  setPidx
                }
              />

              <div
                style={{
                  background:
                    "#fdf2f8",
                  border:
                    "1px solid #f9a8c9",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 14px",
                  marginBottom:
                    "12px",
                  fontSize:
                    "0.83rem",
                  color:
                    "#db2777",
                }}
              >
                💰 Period:{" "}
                <strong>
                  {period?.lbl}
                </strong>

                {" · "}

                Payday{" "}
                <strong>
                  {period
                    ? fd(
                        period.pd
                      )
                    : "—"}
                </strong>
              </div>


              {/* JOBS */}

              {jobs.map(
                job => (
                  <JobCard
                    key={
                      job.id
                    }
                    job={
                      job
                    }
                    shifts={
                      shifts[
                        `${job.id}|${periodKey}`
                      ] ??
                      []
                    }
                    onAddShift={
                      handleAddShift
                    }
                    onRmShift={
                      handleRmShift
                    }
                    onSendShifts={
                      handleSendShifts
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
                periodSent={
                  periodSent
                }
                periodLabel={
                  period?.lbl
                }
                totalPool={
                  totalPool
                }
                onRemove={
                  handleRemoveSent
                }
              />


              {/* ADD JOB */}

              <button
                onClick={() =>
                  setAddJobOpen(
                    true
                  )
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "12px",
                  background:
                    "#fff",
                  border:
                    "1.5px solid #f0dce4",
                  borderRadius:
                    "14px",
                  fontFamily:
                    "'DM Sans',sans-serif",
                  fontWeight:
                    700,
                  fontSize:
                    "13px",
                  color:
                    "#9b6b8a",
                  cursor:
                    "pointer",
                }}
              >
                + Add Another Job / Employer
              </button>
            </>
          )}
      </div>


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


      <Toast
        msg={toast}
        onDone={() =>
          setToast("")
        }
      />
    </div>
  );
}
