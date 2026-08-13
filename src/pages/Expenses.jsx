/**
 * Expenses.jsx
 * Budget Blossom — Expenses
 *
 * Includes:
 * - One-time expenses
 * - Monthly recurring expenses
 * - Biweekly recurring expenses
 * - Independent paid status for each recurring occurrence
 * - Add / Edit / Delete
 * - Charge To card
 * - Pay Type
 * - Carry Forward
 * - Period Summary
 * - Expense Progress
 * - Supabase persistence
 *
 * IMPORTANT:
 * Periods now come from the shared periodService.
 * Recurring expenses are expanded into the selected period
 * instead of only checking their original due date.
 */

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";

import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";

import {
  typography,
  transitions,
} from "../ui/designTokens";

import {
  PERIODS,
  getCurrentPeriodIndex,
} from "../finance/calendar/periodService";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  })
    .format(Number(n) || 0)
    .replace("CA$", "$");

const todayStr = () =>
  new Date().toISOString().split("T")[0];

function parseLocalDate(dateString) {
  if (!dateString) return null;

  const parts = dateString
    .split("-")
    .map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function formatDateInput(date) {
  if (!date) return "";

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysDiff(dateStr) {
  if (!dateStr) return null;

  const d =
    parseLocalDate(dateStr);

  if (!d) return null;

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (d.getTime() -
      today.getTime()) /
      86400000
  );
}

function daysInMonth(
  year,
  monthIndex
) {
  return new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING EXPENSE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a monthly occurrence.
 *
 * Example:
 *
 * July 1
 * August 1
 * September 1
 *
 * For a 31st:
 *
 * Jan 31
 * Feb 28
 * Mar 31
 */
function getMonthlyOccurrence(
  originalDate,
  year,
  monthIndex
) {
  const originalDay =
    originalDate.getDate();

  const lastDay =
    daysInMonth(
      year,
      monthIndex
    );

  const day = Math.min(
    originalDay,
    lastDay
  );

  return new Date(
    year,
    monthIndex,
    day,
    12,
    0,
    0
  );
}

/**
 * Find monthly occurrences inside
 * the currently selected period.
 */
function getMonthlyOccurrences(
  originalDate,
  period
) {
  const occurrences = [];

  if (!period) {
    return occurrences;
  }

  let cursor = new Date(
    period.s.getFullYear(),
    period.s.getMonth(),
    1,
    12,
    0,
    0
  );

  const lastMonth =
    new Date(
      period.e.getFullYear(),
      period.e.getMonth(),
      1,
      12,
      0,
      0
    );

  while (
    cursor <= lastMonth
  ) {
    const occurrence =
      getMonthlyOccurrence(
        originalDate,
        cursor.getFullYear(),
        cursor.getMonth()
      );

    if (
      occurrence >= period.s &&
      occurrence <= period.e
    ) {
      occurrences.push(
        occurrence
      );
    }

    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      1,
      12,
      0,
      0
    );
  }

  return occurrences;
}

/**
 * Find biweekly occurrences.
 *
 * Every occurrence is exactly
 * 14 days from the original due date.
 */
function getBiweeklyOccurrences(
  originalDate,
  period
) {
  const occurrences = [];

  if (!period) {
    return occurrences;
  }

  const DAY =
    24 * 60 * 60 * 1000;

  const diffDays = Math.floor(
    (
      period.s.getTime() -
      originalDate.getTime()
    ) / DAY
  );

  let startStep = Math.floor(
    diffDays / 14
  );

  startStep = Math.max(
    0,
    startStep - 1
  );

  for (
    let step = startStep;
    step <= startStep + 4;
    step++
  ) {
    const occurrence =
      new Date(
        originalDate.getTime() +
          step * 14 * DAY
      );

    occurrence.setHours(
      12,
      0,
      0,
      0
    );

    if (
      occurrence >= period.s &&
      occurrence <= period.e
    ) {
      occurrences.push(
        occurrence
      );
    }
  }

  return occurrences;
}

/**
 * Converts one stored expense into
 * the occurrence(s) that belong to
 * the selected period.
 */
function expandExpenseForPeriod(
  expense,
  period
) {
  if (!expense?.due || !period) {
    return [];
  }

  const originalDate =
    parseLocalDate(
      expense.due
    );

  if (!originalDate) {
    return [];
  }

  let dates = [];

  if (
    expense.recur ===
    "monthly"
  ) {
    dates =
      getMonthlyOccurrences(
        originalDate,
        period
      );
  } else if (
    expense.recur ===
    "biweekly"
  ) {
    dates =
      getBiweeklyOccurrences(
        originalDate,
        period
      );
  } else {
    if (
      originalDate >= period.s &&
      originalDate <= period.e
    ) {
      dates = [
        originalDate,
      ];
    }
  }

  return dates.map(
    (date) => {
      const due =
        formatDateInput(date);

      const occurrenceKey =
        `${expense.id}_${due}`;

      const paidOccurrences =
        expense.paidOccurrences ??
        {};

      let paid = false;

      if (
        expense.recur ===
        "no"
      ) {
        paid =
          due === expense.due
            ? !!expense.paid
            : false;
      } else {
        paid =
          !!paidOccurrences[
            due
          ];
      }

      return {
        ...expense,

        due,

        originalDue:
          expense.due,

        originalExpenseId:
          expense.id,

        occurrenceKey,

        paid,
      };
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    value: "rent",
    label: "🏠 Rent / Housing",
  },
  {
    value: "utilities",
    label: "💡 Utilities",
  },
  {
    value: "groceries",
    label: "🛒 Groceries",
  },
  {
    value: "transport",
    label: "🚌 Transport",
  },
  {
    value: "phone",
    label: "📱 Phone",
  },
  {
    value: "internet",
    label: "🌐 Internet",
  },
  {
    value: "subscriptions",
    label: "📺 Subscriptions",
  },
  {
    value: "dining",
    label: "🍜 Dining",
  },
  {
    value: "health",
    label: "💊 Health",
  },
  {
    value: "savings",
    label: "💰 Savings",
  },
  {
    value: "remittance",
    label: "🇵🇭 Remittance",
  },
  {
    value: "school",
    label: "📚 School",
  },
  {
    value: "credit",
    label: "💳 CC Bill",
  },
  {
    value: "installment",
    label: "📦 Installment",
  },
  {
    value: "other",
    label: "🗂 Other",
  },
];

const CAT_ICON = (category) =>
  ({
    rent: "🏠",
    utilities: "💡",
    groceries: "🛒",
    transport: "🚌",
    phone: "📱",
    internet: "🌐",
    subscriptions: "📺",
    dining: "🍜",
    health: "💊",
    savings: "💰",
    remittance: "🇵🇭",
    school: "📚",
    credit: "💳",
    installment: "📦",
    other: "🗂",
  }[category] ?? "🗂");

const PAY_TYPES = [
  {
    value: "banking",
    label: "🏦 Online Banking",
  },
  {
    value: "etransfer",
    label: "📲 e-Transfer",
  },
  {
    value: "auto",
    label: "🔁 Auto-Pay",
  },
  {
    value: "debit",
    label: "💳 Debit",
  },
  {
    value: "cash",
    label: "💵 Cash",
  },
  {
    value: "cheque",
    label: "📝 Cheque",
  },
];

const RECUR_OPTS = [
  {
    value: "no",
    label: "One-time only",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
  {
    value: "biweekly",
    label: "Every pay period",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CARRY FORWARD
// ─────────────────────────────────────────────────────────────────────────────

const CF_OPTIONS = [
  {
    value: "next",
    label: "➡️ Carry to next period",
    desc: "Adds to next period's available balance",
  },
  {
    value: "savings",
    label: "🫙 Add to Savings Jar",
    desc: "Choose a jar to top up",
  },
  {
    value: "debt",
    label: "💳 Extra Debt Payment",
    desc: "Apply to a credit card balance",
  },
  {
    value: "sinking",
    label: "🪣 Sinking Fund",
    desc: "Save for a future irregular expense",
  },
  {
    value: "custom",
    label: "✏️ Custom Category",
    desc: "Label it yourself",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #fce7f3",
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
  border:
    "1.5px solid #fce7f3",
  borderRadius: "9px",
  fontFamily:
    "'DM Sans',sans-serif",
  fontSize: "14px",
  color: "#1a0f1e",
  outline: "none",
  transition:
    "border-color .15s",
  WebkitAppearance:
    "none",
};

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: "0.62rem",
        fontWeight: 700,
        textTransform:
          "uppercase",
        letterSpacing:
          "0.07em",
        color: "#9b6b8a",
        margin:
          "11px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function Toast({
  msg,
  onDone,
}) {
  useEffect(() => {
    if (!msg) return;

    const timer =
      setTimeout(
        onDone,
        2200
      );

    return () =>
      clearTimeout(timer);
  }, [msg, onDone]);

  if (!msg) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform:
          "translateX(-50%)",
        background:
          "#1a0f1e",
        color: "#f6f2ec",
        borderRadius: "99px",
        padding:
          "9px 20px",
        fontSize: "13px",
        fontWeight: 600,
        zIndex: 700,
        whiteSpace:
          "nowrap",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.25)",
        animation:
          "fadeUp .2s ease both",
      }}
    >
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ROW
// ─────────────────────────────────────────────────────────────────────────────

function EditRow({
  expense,
  cards,
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] =
    useState({
      name:
        expense.name ?? "",
      amt:
        expense.amt ?? "",
      due:
        expense.due ?? "",
      cat:
        expense.cat ?? "other",
      card:
        expense.card ?? "",
      payType:
        expense.payType ??
        "banking",
      recur:
        expense.recur ?? "no",
      note:
        expense.note ?? "",
    });

  function handleSave() {
    if (
      !form.name.trim() ||
      !form.amt
    ) {
      return;
    }

    onSave({
      ...expense,

      name:
        form.name.trim(),

      amt:
        parseFloat(
          form.amt
        ),

      due:
        form.due ||
        expense.due,

      cat:
        form.cat,

      card:
        form.card,

      payType:
        form.payType,

      recur:
        form.recur,

      note:
        form.note.trim(),
    });
  }

  return (
    <div
      style={{
        background:
          "#fff8fb",
        border:
          "1.5px solid #f4b8d4",
        borderRadius: "11px",
        padding: "14px",
        marginTop: "6px",
        marginBottom: "4px",
      }}
    >
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "#db2777",
          letterSpacing:
            "0.07em",
          textTransform:
            "uppercase",
          marginBottom:
            "10px",
        }}
      >
        ✏️ Editing:{" "}
        {expense.name}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
        }}
      >
        <div>
          <Label>
            Name / Description
          </Label>

          <input
            style={inp}
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name:
                  e.target.value,
              }))
            }
            placeholder="e.g. Rent, Hydro"
          />
        </div>

        <div>
          <Label>
            Amount ($)
          </Label>

          <input
            style={inp}
            type="number"
            step="0.01"
            value={form.amt}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                amt:
                  e.target.value,
              }))
            }
            placeholder="0.00"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
        }}
      >
        <div>
          <Label>
            Due Date
          </Label>

          <input
            style={inp}
            type="date"
            value={form.due}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                due:
                  e.target.value,
              }))
            }
          />
        </div>

        <div>
          <Label>
            Category
          </Label>

          <select
            style={inp}
            value={form.cat}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cat:
                  e.target.value,
              }))
            }
          >
            {CATEGORIES.map(
              (category) => (
                <option
                  key={
                    category.value
                  }
                  value={
                    category.value
                  }
                >
                  {
                    category.label
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
        }}
      >
        <div>
          <Label>
            Charge To
          </Label>

          <select
            style={inp}
            value={form.card}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                card:
                  e.target.value,
              }))
            }
          >
            <option value="">
              Cash / Debit / Chequing
            </option>

            {cards.map(
              (card) => (
                <option
                  key={card.id}
                  value={card.id}
                >
                  {card.label ??
                    card.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <Label>
            Pay Type
          </Label>

          <select
            style={inp}
            value={form.payType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                payType:
                  e.target.value,
              }))
            }
          >
            {PAY_TYPES.map(
              (payType) => (
                <option
                  key={
                    payType.value
                  }
                  value={
                    payType.value
                  }
                >
                  {
                    payType.label
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
        }}
      >
        <div>
          <Label>
            Note (optional)
          </Label>

          <input
            style={inp}
            value={form.note}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                note:
                  e.target.value,
              }))
            }
            placeholder="e.g. paid via app"
          />
        </div>

        <div>
          <Label>
            Recurring?
          </Label>

          <select
            style={inp}
            value={form.recur}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                recur:
                  e.target.value,
              }))
            }
          >
            {RECUR_OPTS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <button
          onClick={handleSave}
          disabled={
            saving ||
            !form.name.trim() ||
            !form.amt
          }
          style={{
            flex: 1,
            padding: "9px",
            borderRadius: "9px",
            border: "none",
            background:
              !saving &&
              form.name.trim() &&
              form.amt
                ? "#db2777"
                : "#f4b8d4",
            color: "#fff",
            fontFamily:
              "'DM Sans',sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            cursor: saving
              ? "default"
              : "pointer",
          }}
        >
          {saving
            ? "Saving…"
            : "✓ Save Changes"}
        </button>

        <button
          onClick={onCancel}
          style={{
            padding:
              "9px 18px",
            borderRadius: "9px",
            border:
              "1.5px solid #fce7f3",
            background: "#fff",
            color: "#9b6b8a",
            fontFamily:
              "'DM Sans',sans-serif",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARRY FORWARD PANEL
// ─────────────────────────────────────────────────────────────────────────────

function CarryForwardPanel({
  remaining,
  periodKey,
  nextPeriodLbl,
  rawData,
  onSave,
  saving,
}) {
  const existing =
    rawData?.carryovers?.[
      periodKey
    ];

  const goals =
    rawData?.goals ?? [];

  const cards =
    rawData?.cards ?? [];

  const [dest, setDest] =
    useState(
      existing?.dest ??
        "next"
    );

  const [jarId, setJarId] =
    useState(
      existing?.jarId ??
        (goals[0]?.id ?? "")
    );

  const [cardId, setCardId] =
    useState(
      existing?.cardId ??
        (cards[0]?.id ?? "")
    );

  const [sinkLabel, setSinkLabel] =
    useState(
      existing?.sinkLabel ??
        ""
    );

  const [customLbl, setCustomLbl] =
    useState(
      existing?.customLbl ??
        ""
    );

  const [amt, setAmt] =
    useState(
      existing?.amt ??
        remaining
    );

  const [enabled, setEnabled] =
    useState(
      existing?.use !== false
    );

  useEffect(() => {
    if (!existing) {
      setAmt(remaining);
    }
  }, [
    existing,
    remaining,
  ]);

  function buildCarryoverRecord() {
    const safeRemaining =
      Math.max(
        Number(remaining) || 0,
        0
      );

    return {
      use: enabled,

      dest,

      amt: enabled
        ? Math.min(
            parseFloat(amt) ||
              0,
            safeRemaining
          )
        : 0,

      jarId:
        dest === "savings"
          ? jarId
          : null,

      cardId:
        dest === "debt"
          ? cardId
          : null,

      sinkLabel:
        dest === "sinking"
          ? sinkLabel
          : null,

      customLbl:
        dest === "custom"
          ? customLbl
          : null,

      savedAt:
        todayStr(),
    };
  }

  function handleSave() {
    const co =
      buildCarryoverRecord();

    let updated = {
      ...rawData,

      carryovers: {
        ...(rawData?.carryovers ??
          {}),
        [periodKey]: co,
      },
    };

    if (
      co.use &&
      dest === "savings" &&
      jarId
    ) {
      updated = {
        ...updated,

        goals: (
          rawData.goals ?? []
        ).map((goal) =>
          String(goal.id) ===
          String(jarId)
            ? {
                ...goal,
                saved:
                  (Number(
                    goal.saved
                  ) || 0) +
                  co.amt,
              }
            : goal
        ),
      };
    }

    if (
      co.use &&
      dest === "debt" &&
      cardId
    ) {
      updated = {
        ...updated,

        cards: (
          rawData.cards ?? []
        ).map((card) => {
          if (
            String(card.id) !==
            String(cardId)
          ) {
            return card;
          }

          const balance =
            Number(
              card.balance ??
                card.bal ??
                0
            );

          const newBalance =
            Math.max(
              0,
              balance -
                co.amt
            );

          return {
            ...card,
            balance:
              newBalance,
            bal:
              newBalance,
          };
        }),
      };
    }

    onSave(updated);
  }

  const cfLabel =
    dest === "next"
      ? `Rolls into ${
          nextPeriodLbl ??
          "next period"
        }`
      : dest === "savings"
      ? goals.find(
          (goal) =>
            String(goal.id) ===
            String(jarId)
        )?.label ??
        "Savings Jar"
      : dest === "debt"
      ? cards.find(
          (card) =>
            String(card.id) ===
            String(cardId)
        )?.label ??
        "Credit Card"
      : dest === "sinking"
      ? sinkLabel ||
        "Sinking Fund"
      : customLbl ||
        "Custom";

  return (
    <div
      style={{
        ...cardStyle,
        borderColor:
          remaining > 0
            ? "#9ecab0"
            : "#fce7f3",
        background:
          remaining > 0
            ? "#f0faf4"
            : "#fff5f9",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "10px",
        }}
      >
        <div
          style={{
            fontFamily:
              typography?.fontDisplay,
            fontSize:
              "0.97rem",
            fontWeight: 700,
            color:
              "#1a0f1e",
          }}
        >
          💚 Carry Forward
        </div>

        <label
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize:
                "0.72rem",
              color:
                "#9b6b8a",
              fontWeight: 600,
            }}
          >
            {enabled
              ? "On"
              : "Off"}
          </span>

          <div
            onClick={() =>
              setEnabled(
                (value) =>
                  !value
              )
            }
            style={{
              width: "38px",
              height: "22px",
              borderRadius:
                "11px",
              position:
                "relative",
              cursor:
                "pointer",
              background:
                enabled
                  ? "#3a6b4e"
                  : "#d4b8c4",
              transition:
                "background .2s",
            }}
          >
            <div
              style={{
                position:
                  "absolute",
                top: "3px",
                left: enabled
                  ? "17px"
                  : "3px",
                width: "16px",
                height: "16px",
                borderRadius:
                  "50%",
                background:
                  "#fff",
                transition:
                  "left .2s",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,.2)",
              }}
            />
          </div>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          background:
            "#eaf3ee",
          border:
            "1px solid #9ecab0",
          borderRadius:
            "9px",
          padding:
            "10px 14px",
          marginBottom:
            "12px",
        }}
      >
        <span
          style={{
            fontSize:
              "0.81rem",
            color:
              "#3a6b4e",
            fontWeight: 600,
          }}
        >
          {remaining >= 0
            ? "Leftover this period"
            : "Over budget"}
        </span>

        <span
          style={{
            fontFamily:
              typography?.fontDisplay,
            fontSize:
              "1.1rem",
            fontWeight: 700,
            color:
              remaining >= 0
                ? "#3a6b4e"
                : "#c24b1a",
          }}
        >
          {remaining >= 0
            ? fmt(remaining)
            : `-${fmt(
                Math.abs(
                  remaining
                )
              )}`}
        </span>
      </div>

      {!enabled ? (
        <p
          style={{
            fontSize:
              "0.75rem",
            color:
              "#9b6b8a",
            textAlign:
              "center",
            padding:
              "8px 0",
          }}
        >
          Carry Forward is
          off. Leftover money
          won't be tracked.
        </p>
      ) : (
        <>
          <Label>
            Amount to Carry Forward
          </Label>

          <div
            style={{
              position:
                "relative",
            }}
          >
            <span
              style={{
                position:
                  "absolute",
                left: "10px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                fontSize:
                  "14px",
                color:
                  "#9b6b8a",
                fontWeight: 700,
              }}
            >
              $
            </span>

            <input
              style={{
                ...inp,
                paddingLeft:
                  "24px",
              }}
              type="number"
              min="0"
              step="0.01"
              max={Math.max(
                remaining,
                0
              )}
              value={amt}
              onChange={(e) =>
                setAmt(
                  e.target.value
                )
              }
            />
          </div>

          {parseFloat(amt) >
            remaining &&
            remaining > 0 && (
              <div
                style={{
                  fontSize:
                    "0.67rem",
                  color:
                    "#c24b1a",
                  marginTop:
                    "3px",
                }}
              >
                ⚠ Can't carry more
                than your leftover
                ({fmt(remaining)})
              </div>
            )}

          <Label>
            Where should it go?
          </Label>

          <div
            style={{
              display:
                "flex",
              flexDirection:
                "column",
              gap: "6px",
              marginBottom:
                "10px",
            }}
          >
            {CF_OPTIONS.map(
              (option) => (
                <label
                  key={
                    option.value
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "flex-start",
                    gap: "10px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "9px",
                    cursor:
                      "pointer",
                    background:
                      dest ===
                      option.value
                        ? "#eaf3ee"
                        : "#fff5f9",
                    border: `1.5px solid ${
                      dest ===
                      option.value
                        ? "#9ecab0"
                        : "#fce7f3"
                    }`,
                  }}
                >
                  <input
                    type="radio"
                    name={`cf-dest-${periodKey}`}
                    value={
                      option.value
                    }
                    checked={
                      dest ===
                      option.value
                    }
                    onChange={() =>
                      setDest(
                        option.value
                      )
                    }
                    style={{
                      marginTop:
                        "2px",
                      accentColor:
                        "#3a6b4e",
                      flexShrink: 0,
                    }}
                  />

                  <div>
                    <div
                      style={{
                        fontSize:
                          "0.81rem",
                        fontWeight: 700,
                        color:
                          "#1a0f1e",
                      }}
                    >
                      {
                        option.label
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          "0.67rem",
                        color:
                          "#9b6b8a",
                      }}
                    >
                      {
                        option.desc
                      }
                    </div>
                  </div>
                </label>
              )
            )}
          </div>

          {dest ===
            "savings" &&
            goals.length > 0 && (
              <>
                <Label>
                  Which Savings Jar?
                </Label>

                <select
                  style={inp}
                  value={jarId}
                  onChange={(e) =>
                    setJarId(
                      e.target.value
                    )
                  }
                >
                  {goals.map(
                    (goal) => (
                      <option
                        key={
                          goal.id
                        }
                        value={
                          goal.id
                        }
                      >
                        {goal.label}{" "}
                        (
                        {fmt(
                          goal.saved ??
                            0
                        )}{" "}
                        saved)
                      </option>
                    )
                  )}
                </select>
              </>
            )}

          {dest ===
            "savings" &&
            goals.length === 0 && (
              <p
                style={{
                  fontSize:
                    "0.72rem",
                  color:
                    "#9b6b8a",
                  marginTop:
                    "6px",
                }}
              >
                No savings jars
                found. Add goals in
                Settings first.
              </p>
            )}

          {dest ===
            "debt" &&
            cards.length > 0 && (
              <>
                <Label>
                  Which Credit Card?
                </Label>

                <select
                  style={inp}
                  value={cardId}
                  onChange={(e) =>
                    setCardId(
                      e.target.value
                    )
                  }
                >
                  {cards.map(
                    (card) => (
                      <option
                        key={
                          card.id
                        }
                        value={
                          card.id
                        }
                      >
                        {card.label ??
                          card.name}{" "}
                        (Balance:{" "}
                        {fmt(
                          card.balance ??
                            card.bal ??
                            0
                        )}
                        )
                      </option>
                    )
                  )}
                </select>
              </>
            )}

          {dest ===
            "debt" &&
            cards.length === 0 && (
              <p
                style={{
                  fontSize:
                    "0.72rem",
                  color:
                    "#9b6b8a",
                  marginTop:
                    "6px",
                }}
              >
                No credit cards
                found. Add cards
                first.
              </p>
            )}

          {dest ===
            "sinking" && (
            <>
              <Label>
                Sinking Fund Name
              </Label>

              <input
                style={inp}
                placeholder="e.g. Car repairs, Christmas gifts"
                value={sinkLabel}
                onChange={(e) =>
                  setSinkLabel(
                    e.target.value
                  )
                }
              />
            </>
          )}

          {dest ===
            "custom" && (
            <>
              <Label>
                Custom Label
              </Label>

              <input
                style={inp}
                placeholder="e.g. Extra groceries budget"
                value={customLbl}
                onChange={(e) =>
                  setCustomLbl(
                    e.target.value
                  )
                }
              />
            </>
          )}

          <div
            style={{
              background:
                "#fff",
              border:
                "1px solid #fce7f3",
              borderRadius:
                "9px",
              padding:
                "10px 14px",
              margin:
                "12px 0",
              fontSize:
                "0.79rem",
              color:
                "#1a0f1e",
            }}
          >
            <strong>
              {fmt(
                Math.min(
                  parseFloat(
                    amt
                  ) || 0,
                  Math.max(
                    remaining,
                    0
                  )
                )
              )}
            </strong>

            <span
              style={{
                color:
                  "#9b6b8a",
              }}
            >
              {" "}
              →{" "}
            </span>

            <strong
              style={{
                color:
                  "#3a6b4e",
              }}
            >
              {cfLabel}
            </strong>
          </div>

          <button
            onClick={
              handleSave
            }
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius:
                "9px",
              border: "none",
              background:
                saving
                  ? "#d4b8c4"
                  : "#3a6b4e",
              color: "#fff",
              fontFamily:
                "'DM Sans',sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "Saving…"
              : "✓ Save Carry Forward Choice"}
          </button>
        </>
      )}

      {existing?.savedAt && (
        <div
          style={{
            marginTop: "8px",
            fontSize:
              "0.67rem",
            color:
              "#9b6b8a",
            textAlign:
              "center",
          }}
        >
          Last saved:{" "}
          {existing.savedAt}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function Expenses() {
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

  const [expIdx, setExpIdx] =
    useState(() =>
      getCurrentPeriodIndex(
        PERIODS
      )
    );

  const [editingId, setEditingId] =
    useState(null);

  const blank = {
    name: "",
    amt: "",
    due: "",
    cat: "rent",
    card: "",
    payType: "banking",
    recur: "no",
  };

  const [form, setForm] =
    useState(blank);

  // ───────────────────────────────────────────────────────────────────────────
  // LOAD
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let dead = false;

    (async () => {
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
          data?.data
            ?.budgetsbloom;

        setRawData(
          typeof blob ===
            "string"
            ? JSON.parse(blob)
            : blob ?? null
        );
      } catch (err) {
        if (!dead) {
          setError(
            err.message ??
              "Failed to load"
          );
        }
      } finally {
        if (!dead) {
          setLoading(false);
        }
      }
    })();

    return () => {
      dead = true;
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // SAVE
  // ───────────────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (updated) => {
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
          error: saveError,
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

        if (saveError) {
          throw saveError;
        }

        setRawData(updated);
      } catch (err) {
        console.error(err);

        setToast(
          "❌ Save failed"
        );
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // DATA
  // ───────────────────────────────────────────────────────────────────────────

  const allExpenses =
    useMemo(
      () =>
        rawData?.expenses ??
        [],
      [rawData]
    );

  const cards =
    useMemo(
      () =>
        rawData?.cards ??
        [],
      [rawData]
    );

  const sentMap =
    useMemo(
      () =>
        rawData?.sent ??
        {},
      [rawData]
    );

  const period =
    PERIODS[expIdx];

  const periodKey =
    period?.k ?? "";

  const nextPeriod =
    PERIODS[expIdx + 1];

  // ───────────────────────────────────────────────────────────────────────────
  // PERIOD EXPENSES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * THIS IS THE MAIN FIX.
   *
   * Previously:
   *
   *     allExpenses.filter(e => e.due is inside period)
   *
   * That meant a July monthly expense
   * could only ever appear in July.
   *
   * Now:
   *
   *     monthly → generate monthly occurrence
   *     biweekly → generate 14-day occurrence
   *     one-time → use original date
   */
  const periodExpenses =
    useMemo(() => {
      if (!period) {
        return [];
      }

      return allExpenses
        .flatMap(
          (expense) =>
            expandExpenseForPeriod(
              expense,
              period
            )
        )
        .sort(
          (a, b) =>
            new Date(
              `${a.due}T12:00:00`
            ).getTime() -
            new Date(
              `${b.due}T12:00:00`
            ).getTime()
        );
    }, [
      allExpenses,
      period,
    ]);

  // ───────────────────────────────────────────────────────────────────────────
  // CARRYOVER
  // ───────────────────────────────────────────────────────────────────────────

  const getCarryover =
    useCallback(
      (pidx) => {
        if (pidx <= 0) {
          return 0;
        }

        const currentPeriod =
          PERIODS[pidx];

        const stored =
          rawData?.carryovers?.[
            currentPeriod?.k
          ];

        if (
          stored &&
          stored.use === false
        ) {
          return 0;
        }

        if (
          stored &&
          stored.amt != null
        ) {
          return Number(
            stored.amt
          ) || 0;
        }

        const previousPeriod =
          PERIODS[pidx - 1];

        if (!previousPeriod) {
          return 0;
        }

        const previousKey =
          previousPeriod.k;

        const previousSent =
          (
            sentMap[
              previousKey
            ] ?? []
          ).reduce(
            (sum, item) =>
              sum +
              (Number(
                item.amt
              ) || 0),
            0
          );

        const previousCarry =
          getCarryover(
            pidx - 1
          );

        // IMPORTANT:
        // recurring expenses must also
        // be included when calculating
        // the previous period.
        const previousExpenses =
          allExpenses
            .flatMap(
              (expense) =>
                expandExpenseForPeriod(
                  expense,
                  previousPeriod
                )
            )
            .reduce(
              (sum, expense) =>
                sum +
                (Number(
                  expense.amt
                ) || 0),
              0
            );

        return Math.max(
          0,
          previousSent +
            previousCarry -
            previousExpenses
        );
      },
      [
        rawData,
        sentMap,
        allExpenses,
      ]
    );

  const carryover =
    useMemo(
      () =>
        getCarryover(
          expIdx
        ),
      [
        getCarryover,
        expIdx,
      ]
    );

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────────────────────

  const income =
    useMemo(
      () =>
        (
          sentMap[
            periodKey
          ] ?? []
        ).reduce(
          (sum, item) =>
            sum +
            (Number(
              item.amt
            ) || 0),
          0
        ),
      [
        sentMap,
        periodKey,
      ]
    );

  const totalAmt =
    useMemo(
      () =>
        periodExpenses.reduce(
          (sum, expense) =>
            sum +
            (Number(
              expense.amt
            ) || 0),
          0
        ),
      [periodExpenses]
    );

  const paidAmt =
    useMemo(
      () =>
        periodExpenses
          .filter(
            (expense) =>
              expense.paid
          )
          .reduce(
            (sum, expense) =>
              sum +
              (Number(
                expense.amt
              ) || 0),
            0
          ),
      [periodExpenses]
    );

  const paidCount =
    useMemo(
      () =>
        periodExpenses.filter(
          (expense) =>
            expense.paid
        ).length,
      [periodExpenses]
    );

  const pool =
    income + carryover;

  const remaining =
    pool - totalAmt;

  // ───────────────────────────────────────────────────────────────────────────
  // ADD EXPENSE
  // ───────────────────────────────────────────────────────────────────────────

  function addExpense() {
    if (
      !form.name.trim() ||
      !form.amt
    ) {
      setToast(
        "⚠️ Name and amount required"
      );

      return;
    }

    const due =
      form.due ||
      formatDateInput(
        period?.pd ??
          new Date()
      );

    const expense = {
      id:
        "e" +
        Date.now(),

      name:
        form.name.trim(),

      amt:
        parseFloat(
          form.amt
        ),

      due,

      cat:
        form.cat,

      card:
        form.card,

      payType:
        form.payType,

      recur:
        form.recur,

      paid: false,

      // Used for monthly and biweekly
      // paid occurrences.
      paidOccurrences: {},
    };

    save({
      ...rawData,

      expenses: [
        ...allExpenses,
        expense,
      ],
    });

    setForm((current) => ({
      ...blank,
      cat:
        current.cat,
      payType:
        current.payType,
      recur:
        current.recur,
    }));

    setToast(
      "✅ Expense added!"
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TOGGLE PAID
  // ───────────────────────────────────────────────────────────────────────────

  function togglePaid(
    occurrence,
    value
  ) {
    const originalId =
      occurrence.originalExpenseId ??
      occurrence.id;

    const updatedExpenses =
      allExpenses.map(
        (expense) => {
          if (
            expense.id !==
            originalId
          ) {
            return expense;
          }

          // One-time expense
          if (
            expense.recur ===
            "no"
          ) {
            return {
              ...expense,
              paid: value,
            };
          }

          // Recurring expense:
          // store paid state by actual
          // occurrence date.
          return {
            ...expense,

            paidOccurrences: {
              ...(expense.paidOccurrences ??
                {}),
              [occurrence.due]:
                value,
            },
          };
        }
      );

    save({
      ...rawData,

      expenses:
        updatedExpenses,
    });

    if (value) {
      setToast(
        "✅ Marked as paid!"
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE
  // ───────────────────────────────────────────────────────────────────────────

  function delExpense(
    id
  ) {
    if (
      editingId === id
    ) {
      setEditingId(null);
    }

    save({
      ...rawData,

      expenses:
        allExpenses.filter(
          (expense) =>
            expense.id !== id
        ),
    });

    setToast(
      "🗑 Removed"
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EDIT
  // ───────────────────────────────────────────────────────────────────────────

  function editExpense(
    updated
  ) {
    const newExpenses =
      allExpenses.map(
        (expense) =>
          expense.id ===
          updated.id
            ? updated
            : expense
      );

    save({
      ...rawData,

      expenses:
        newExpenses,
    });

    setEditingId(null);

    setToast(
      "✏️ Expense updated!"
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PERIOD NAVIGATION
  // ───────────────────────────────────────────────────────────────────────────

  function moveExp(
    direction
  ) {
    setExpIdx(
      (index) =>
        Math.max(
          0,
          Math.min(
            PERIODS.length - 1,
            index +
              direction
          )
        )
    );

    setEditingId(null);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────

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
        {/* Header */}

        <div
          className="fade-up"
          style={{
            padding:
              "28px 0 14px",
          }}
        >
          <p
            style={{
              fontSize:
                "11px",
              fontWeight: 700,
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
            Budget
          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "baseline",
            }}
          >
            <h1
              style={{
                fontFamily:
                  typography.fontDisplay,
                fontSize:
                  "28px",
                fontWeight: 700,
                color:
                  "#1a0f1e",
                letterSpacing:
                  "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Expenses
            </h1>

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
        </div>

        {loading && (
          <LoadingSpinner
            message="Loading expenses…"
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
              {/* Carryover bar */}

              {carryover > 0 && (
                <div
                  style={{
                    background:
                      "#eaf3ee",
                    border:
                      "1px solid #9ecab0",
                    borderRadius:
                      "9px",
                    padding:
                      "10px 14px",
                    marginBottom:
                      "10px",
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
                          "0.61rem",
                        fontWeight: 700,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.06em",
                        color:
                          "#3a6b4e",
                      }}
                    >
                      Carryover from
                      last period
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        fontSize:
                          "0.97rem",
                        color:
                          "#3a6b4e",
                      }}
                    >
                      {fmt(
                        carryover
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize:
                        "0.72rem",
                      color:
                        "#3a6b4e",
                    }}
                  >
                    ✓ Included in pool
                  </span>
                </div>
              )}

              {/* Period navigator */}

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "6px",
                  marginBottom:
                    "12px",
                }}
              >
                <button
                  onClick={() =>
                    moveExp(-1)
                  }
                  disabled={
                    expIdx === 0
                  }
                  style={{
                    background:
                      "#ffffff",
                    border:
                      "1.5px solid #f0dce4",
                    borderRadius:
                      "9px",
                    padding:
                      "7px 12px",
                    fontWeight: 700,
                    color:
                      "#9b6b8a",
                    cursor:
                      expIdx ===
                      0
                        ? "not-allowed"
                        : "pointer",
                    fontFamily:
                      "'DM Sans',sans-serif",
                    fontSize:
                      "14px",
                    opacity:
                      expIdx ===
                      0
                        ? 0.4
                        : 1,
                  }}
                >
                  ‹
                </button>

                <div
                  style={{
                    flex: 1,
                    textAlign:
                      "center",
                    background:
                      "#ffffff",
                    border:
                      "1.5px solid #f0dce4",
                    borderRadius:
                      "9px",
                    padding:
                      "7px 10px",
                    fontFamily:
                      typography.fontDisplay,
                    fontWeight: 700,
                    fontSize:
                      "14px",
                  }}
                >
                  {period?.lbl}
                </div>

                <button
                  onClick={() =>
                    moveExp(1)
                  }
                  disabled={
                    expIdx ===
                    PERIODS.length -
                      1
                  }
                  style={{
                    background:
                      "#ffffff",
                    border:
                      "1.5px solid #f0dce4",
                    borderRadius:
                      "9px",
                    padding:
                      "7px 12px",
                    fontWeight: 700,
                    color:
                      "#9b6b8a",
                    cursor:
                      expIdx ===
                      PERIODS.length -
                        1
                        ? "not-allowed"
                        : "pointer",
                    fontFamily:
                      "'DM Sans',sans-serif",
                    fontSize:
                      "14px",
                    opacity:
                      expIdx ===
                      PERIODS.length -
                        1
                        ? 0.4
                        : 1,
                  }}
                >
                  ›
                </button>
              </div>

              {/* Paydays info */}

              <div
                style={{
                  background:
                    "#faf5e6",
                  border:
                    "1px solid #dcca84",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 14px",
                  marginBottom:
                    "12px",
                  fontSize:
                    "0.79rem",
                  color:
                    "#7a5010",
                  lineHeight:
                    1.5,
                }}
              >
                💸 Paydays are the{" "}
                <strong>
                  7th & 22nd
                </strong>
                . Expenses shown by
                due date within the
                period.
              </div>

              {/* Add Expense */}

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
                      "4px",
                  }}
                >
                  + Add Expense
                </div>

                <Label>
                  Name
                </Label>

                <input
                  style={inp}
                  placeholder="e.g. Rent, Hydro, Netflix"
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    setForm(
                      (f) => ({
                        ...f,
                        name:
                          e.target
                            .value,
                      })
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      addExpense();
                    }
                  }}
                />

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div>
                    <Label>
                      Amount ($)
                    </Label>

                    <input
                      style={inp}
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={
                        form.amt
                      }
                      onChange={(
                        e
                      ) =>
                        setForm(
                          (f) => ({
                            ...f,
                            amt:
                              e.target
                                .value,
                          })
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label>
                      Due Date
                    </Label>

                    <input
                      style={inp}
                      type="date"
                      value={
                        form.due
                      }
                      onChange={(
                        e
                      ) =>
                        setForm(
                          (f) => ({
                            ...f,
                            due:
                              e.target
                                .value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <Label>
                  Category
                </Label>

                <select
                  style={inp}
                  value={
                    form.cat
                  }
                  onChange={(e) =>
                    setForm(
                      (f) => ({
                        ...f,
                        cat:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    )
                  )}
                </select>

                <Label>
                  Charge To
                </Label>

                <select
                  style={inp}
                  value={
                    form.card
                  }
                  onChange={(e) =>
                    setForm(
                      (f) => ({
                        ...f,
                        card:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    Cash / Debit /
                    Chequing
                  </option>

                  {cards.map(
                    (card) => (
                      <option
                        key={
                          card.id
                        }
                        value={
                          card.id
                        }
                      >
                        {card.label ??
                          card.name}{" "}
                        (
                        {
                          card.owner
                        }
                        )
                      </option>
                    )
                  )}
                </select>

                <Label>
                  Pay Type
                </Label>

                <select
                  style={inp}
                  value={
                    form.payType
                  }
                  onChange={(e) =>
                    setForm(
                      (f) => ({
                        ...f,
                        payType:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  {PAY_TYPES.map(
                    (payType) => (
                      <option
                        key={
                          payType.value
                        }
                        value={
                          payType.value
                        }
                      >
                        {
                          payType.label
                        }
                      </option>
                    )
                  )}
                </select>

                <Label>
                  Recurring?
                </Label>

                <select
                  style={inp}
                  value={
                    form.recur
                  }
                  onChange={(e) =>
                    setForm(
                      (f) => ({
                        ...f,
                        recur:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  {RECUR_OPTS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>

                <button
                  onClick={
                    addExpense
                  }
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
                      "#db2777",
                    border: "none",
                    color:
                      "#fff",
                    fontFamily:
                      "'DM Sans',sans-serif",
                    fontWeight: 700,
                    fontSize:
                      "14px",
                    cursor:
                      "pointer",
                  }}
                >
                  + Add Expense
                </button>
              </div>

              {/* Expense list */}

              <div
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
                      "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily:
                        typography.fontDisplay,
                      fontSize:
                        "0.97rem",
                      fontWeight: 700,
                    }}
                  >
                    Expenses{" "}
                    <span
                      style={{
                        fontFamily:
                          "'DM Sans',sans-serif",
                        fontSize:
                          "0.7rem",
                        fontWeight: 400,
                        color:
                          "#9b6b8a",
                        marginLeft:
                          "4px",
                      }}
                    >
                      —{" "}
                      {period?.lbl}
                    </span>
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        "#db2777",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    {fmt(
                      totalAmt
                    )}
                  </span>
                </div>

                {periodExpenses.length ===
                0 ? (
                  <p
                    style={{
                      color:
                        "#9b6b8a",
                      fontSize:
                        "0.75rem",
                    }}
                  >
                    No expenses for
                    this period. Add
                    one above!
                  </p>
                ) : (
                  periodExpenses.map(
                    (
                      expense,
                      index
                    ) => {
                      const diff =
                        daysDiff(
                          expense.due
                        );

                      const overdue =
                        diff !==
                          null &&
                        diff < 0 &&
                        !expense.paid;

                      const soon =
                        diff !==
                          null &&
                        diff >= 0 &&
                        diff <= 3 &&
                        !expense.paid;

                      const linked =
                        cards.find(
                          (card) =>
                            String(
                              card.id
                            ) ===
                            String(
                              expense.card
                            )
                        );

                      const isEditing =
                        editingId ===
                        expense.occurrenceKey;

                      const originalExpense =
                        allExpenses.find(
                          (original) =>
                            String(
                              original.id
                            ) ===
                            String(
                              expense.originalExpenseId
                            )
                        ) ??
                        expense;

                      return (
                        <div
                          key={
                            expense.occurrenceKey
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "9px",
                              padding:
                                "9px 0",
                              borderBottom:
                                !isEditing &&
                                index <
                                  periodExpenses.length -
                                    1
                                  ? "1px solid #fce7f3"
                                  : "none",
                              opacity:
                                expense.paid
                                  ? 0.42
                                  : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                !!expense.paid
                              }
                              onChange={(
                                event
                              ) =>
                                togglePaid(
                                  expense,
                                  event
                                    .target
                                    .checked
                                )
                              }
                              style={{
                                width:
                                  "17px",
                                height:
                                  "17px",
                                flexShrink: 0,
                                cursor:
                                  "pointer",
                                accentColor:
                                  "#3a6b4e",
                              }}
                            />

                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    "0.83rem",
                                  fontWeight: 600,
                                  textDecoration:
                                    expense.paid
                                      ? "line-through"
                                      : "none",
                                }}
                              >
                                {CAT_ICON(
                                  expense.cat
                                )}{" "}
                                {
                                  expense.name
                                }

                                {linked && (
                                  <span
                                    style={{
                                      background:
                                        "#eaf1f9",
                                      color:
                                        "#2860a0",
                                      fontSize:
                                        "0.57rem",
                                      fontWeight: 700,
                                      letterSpacing:
                                        "0.06em",
                                      textTransform:
                                        "uppercase",
                                      padding:
                                        "2px 7px",
                                      borderRadius:
                                        "5px",
                                      marginLeft:
                                        "5px",
                                    }}
                                  >
                                    {linked.label ??
                                      linked.name}
                                  </span>
                                )}

                                {expense.recur !==
                                  "no" && (
                                  <span
                                    style={{
                                      background:
                                        "#f5f0ff",
                                      color:
                                        "#7c3aed",
                                      fontSize:
                                        "0.57rem",
                                      fontWeight: 700,
                                      letterSpacing:
                                        "0.06em",
                                      textTransform:
                                        "uppercase",
                                      padding:
                                        "2px 7px",
                                      borderRadius:
                                        "5px",
                                      marginLeft:
                                        "4px",
                                    }}
                                  >
                                    {expense.recur ===
                                    "monthly"
                                      ? "Monthly"
                                      : "Biweekly"}
                                  </span>
                                )}

                                {expense.note && (
                                  <span
                                    style={{
                                      fontSize:
                                        "0.67rem",
                                      color:
                                        "#9b6b8a",
                                      fontWeight: 400,
                                      marginLeft:
                                        "6px",
                                    }}
                                  >
                                    ·{" "}
                                    {
                                      expense.note
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
                                    "1px",
                                }}
                              >
                                Due{" "}
                                {
                                  expense.due
                                }

                                {overdue && (
                                  <strong
                                    style={{
                                      color:
                                        "#c24b1a",
                                      marginLeft:
                                        "4px",
                                    }}
                                  >
                                    OVERDUE
                                  </strong>
                                )}

                                {soon && (
                                  <span
                                    style={{
                                      color:
                                        "#a67c20",
                                      marginLeft:
                                        "4px",
                                    }}
                                  >
                                    · Due soon
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                textAlign:
                                  "right",
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    "0.85rem",
                                  fontWeight: 700,
                                }}
                              >
                                {fmt(
                                  expense.amt
                                )}
                              </div>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap:
                                    "4px",
                                  justifyContent:
                                    "flex-end",
                                  marginTop:
                                    "2px",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    setEditingId(
                                      isEditing
                                        ? null
                                        : expense.occurrenceKey
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
                                      isEditing
                                        ? "#db2777"
                                        : "#b8a0b8",
                                    fontSize:
                                      "0.85rem",
                                    padding:
                                      "0 2px",
                                    fontWeight:
                                      isEditing
                                        ? 700
                                        : 400,
                                  }}
                                  title="Edit expense"
                                >
                                  ✏️
                                </button>

                                <button
                                  onClick={() =>
                                    delExpense(
                                      expense.originalExpenseId ??
                                        expense.id
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
                                    fontSize:
                                      "0.95rem",
                                    padding:
                                      "0 2px",
                                  }}
                                  title="Delete expense"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </div>

                          {isEditing && (
                            <EditRow
                              expense={
                                originalExpense
                              }
                              cards={
                                cards
                              }
                              onSave={
                                editExpense
                              }
                              onCancel={() =>
                                setEditingId(
                                  null
                                )
                              }
                              saving={
                                saving
                              }
                            />
                          )}

                          {isEditing &&
                            index <
                              periodExpenses.length -
                                1 && (
                              <div
                                style={{
                                  height:
                                    "1px",
                                  background:
                                    "#fce7f3",
                                  margin:
                                    "4px 0 0",
                                }}
                              />
                            )}
                        </div>
                      );
                    }
                  )
                )}
              </div>

              {/* Period Summary */}

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
                      "10px",
                  }}
                >
                  📊 Period Summary
                </div>

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
                  }}
                >
                  <div
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
                      Income this
                      period
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          "#3a6b4e",
                      }}
                    >
                      {fmt(
                        income
                      )}
                    </span>
                  </div>

                  {carryover > 0 && (
                    <div
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
                        Carryover
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            "#a67c20",
                        }}
                      >
                        {fmt(
                          carryover
                        )}
                      </span>
                    </div>
                  )}

                  <div
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
                      Total budgeted
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          "#db2777",
                      }}
                    >
                      {fmt(
                        totalAmt
                      )}
                    </span>
                  </div>

                  <div
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
                      Paid so far (
                      {paidCount}/
                      {
                        periodExpenses.length
                      }
                      )
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          "#3a6b4e",
                      }}
                    >
                      {fmt(
                        paidAmt
                      )}
                    </span>
                  </div>

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
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      Remaining
                    </span>

                    <span
                      style={{
                        fontSize:
                          "1.05rem",
                        color:
                          remaining >=
                          0
                            ? "#3a6b4e"
                            : "#c24b1a",
                      }}
                    >
                      {remaining >=
                      0
                        ? fmt(
                            remaining
                          )
                        : `-${fmt(
                            Math.abs(
                              remaining
                            )
                          )}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}

              {totalAmt > 0 && (
                <div
                  style={{
                    ...cardStyle,
                    padding:
                      "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      fontSize:
                        "0.83rem",
                      fontWeight: 600,
                      marginBottom:
                        "6px",
                    }}
                  >
                    <span>
                      Expense Progress
                    </span>

                    <span
                      style={{
                        color:
                          "#9b6b8a",
                        fontSize:
                          "0.72rem",
                      }}
                    >
                      {fmt(
                        paidAmt
                      )}{" "}
                      /{" "}
                      {fmt(
                        totalAmt
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      height:
                        "7px",
                      background:
                        "#fce7f3",
                      borderRadius:
                        "4px",
                      overflow:
                        "hidden",
                      marginBottom:
                        "6px",
                    }}
                  >
                    <div
                      style={{
                        height:
                          "100%",
                        width: `${Math.min(
                          100,
                          totalAmt >
                            0
                            ? (paidAmt /
                                totalAmt) *
                              100
                            : 0
                        )}%`,
                        background:
                          "#db2777",
                        borderRadius:
                          "4px",
                        transition: `width 0.6s ${transitions.spring}`,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      fontSize:
                        "0.67rem",
                      color:
                        "#9b6b8a",
                    }}
                  >
                    <span>
                      {paidCount} paid
                      ✓
                    </span>

                    <span>
                      {
                        periodExpenses.length -
                          paidCount
                      }{" "}
                      pending ·{" "}
                      {fmt(
                        totalAmt -
                          paidAmt
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Carry Forward */}

              <CarryForwardPanel
                remaining={
                  remaining
                }
                periodKey={
                  periodKey
                }
                nextPeriodLbl={
                  nextPeriod?.lbl
                }
                rawData={
                  rawData
                }
                onSave={
                  save
                }
                saving={
                  saving
                }
              />
            </>
          )}
      </div>

      <Toast
        msg={toast}
        onDone={() =>
          setToast("")
        }
      />
    </div>
  );
}
