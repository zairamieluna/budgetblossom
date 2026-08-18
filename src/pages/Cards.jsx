/**
 * Cards.jsx
 * Budget Blossom
 *
 * Credit Card Tracker
 *
 * Features:
 * - Add / edit credit cards
 * - Card type
 * - Owner
 * - Credit limit
 * - Current balance
 * - Available credit
 * - Credit utilization
 * - APR / interest rate
 * - Estimated monthly interest
 * - Statement date
 * - Payment due date
 * - Minimum payment
 * - Planned payment
 * - Remaining balance
 * - Payoff progress
 * - Payment history
 * - Debt Crusher
 * - Installments
 * - Supabase save
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { typography, transitions } from "../ui/designTokens";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  })
    .format(Number(n) || 0)
    .replace("CA$", "$");

const todayStr = () => new Date().toISOString().split("T")[0];

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const calcAvailable = (card) => {
  const limit = num(card.limit);
  const balance = num(card.balance ?? card.bal);
  return Math.max(0, limit - balance);
};

const calcUtilization = (card) => {
  const limit = num(card.limit);
  const balance = num(card.balance ?? card.bal);

  if (limit <= 0) return 0;

  return clamp((balance / limit) * 100, 0, 100);
};

const calcMin = (card) => {
  const balance = num(card.balance ?? card.bal);
  const pct = num(card.minPct) || 2.5;

  if (balance <= 0) return 0;

  return Math.max(10, +(balance * (pct / 100)).toFixed(2));
};

const calcMonthlyInterest = (card) => {
  const balance = num(card.balance ?? card.bal);
  const apr = num(card.apr);

  if (balance <= 0 || apr <= 0) return 0;

  return +((balance * (apr / 100)) / 12).toFixed(2);
};

const calcPlannedPayment = (card) => {
  const planned = num(card.plannedPayment);

  if (planned > 0) return planned;

  return calcMin(card);
};

const calcRemainingAfterPlanned = (card) => {
  const balance = num(card.balance ?? card.bal);
  const planned = calcPlannedPayment(card);

  return Math.max(0, balance - planned);
};

const calcPayoffProgress = (card) => {
  const limit = num(card.limit);
  const balance = num(card.balance ?? card.bal);

  if (limit <= 0) return 0;

  return clamp(((limit - balance) / limit) * 100, 0, 100);
};

const utilColor = (pct) =>
  pct > 70
    ? "#c94d6a"
    : pct > 40
      ? "#e8a840"
      : "#60b8a8";

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateValue) {
  if (!dateValue) return null;

  const now = new Date();
  const target = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(target.getTime())) return null;

  now.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

const CC_GRADIENTS = [
  "linear-gradient(135deg,#db2777,#7c1d4e)",
  "linear-gradient(135deg,#3a6b4e,#1c3a28)",
  "linear-gradient(135deg,#2860a0,#123060)",
  "linear-gradient(135deg,#a67c20,#5a4010)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
];

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(26,9,30,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px 20px 0 0",
          padding: "22px 18px 34px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(26,9,30,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <h3
            style={{
              fontFamily: typography.fontDisplay,
              fontSize: "17px",
              fontWeight: 700,
              color: "#1a0f1e",
              margin: 0,
            }}
          >
            {title}
          </h3>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: "#f9eef3",
              border: "none",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#6f5362",
            }}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: "13px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#9b6b8a",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      {children}

      {hint && (
        <div
          style={{
            fontSize: "10px",
            color: "#b899a8",
            marginTop: "4px",
            lineHeight: 1.4,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

const inp = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  background: "#fff5f9",
  border: "1.5px solid #fce7f3",
  borderRadius: "9px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#1a0f1e",
  outline: "none",
};

const selectStyle = {
  ...inp,
  cursor: "pointer",
};

// ─────────────────────────────────────────────────────────────────────────────
// Credit Card Visual
// ─────────────────────────────────────────────────────────────────────────────

function CCCard({
  card,
  index,
  onPay,
  onEdit,
  onBalance,
  onDelete,
}) {
  const [histOpen, setHistOpen] = useState(false);

  const balance = num(card.balance ?? card.bal);
  const limit = num(card.limit);
  const available = calcAvailable(card);
  const utilization = calcUtilization(card);
  const monthlyInterest = calcMonthlyInterest(card);
  const minimum = calcMin(card);
  const planned = calcPlannedPayment(card);
  const remaining = calcRemainingAfterPlanned(card);
  const payoffProgress = calcPayoffProgress(card);

  const dueDays = daysUntil(card.paymentDueDate);

  const overdue =
    dueDays !== null && dueDays < 0;

  const dueSoon =
    dueDays !== null &&
    dueDays >= 0 &&
    dueDays <= 5;

  const recentPays = (card.payments ?? []).slice(0, 5);

  return (
    <div
      style={{
        marginBottom: "12px",
      }}
    >
      {/* ───────────────── Card Face ───────────────── */}

      <div
        style={{
          background:
            CC_GRADIENTS[index % CC_GRADIENTS.length],
          borderRadius: "14px",
          padding: "18px",
          position: "relative",
          overflow: "hidden",
          color: "#fff",
          minHeight: "145px",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "-35px",
            right: "-35px",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              {card.label ?? card.name}
            </div>

            <div
              style={{
                fontSize: "0.66rem",
                opacity: 0.7,
                marginTop: "3px",
              }}
            >
              {card.cardType || "Credit Card"}
              {card.owner ? ` · ${card.owner}` : ""}
            </div>
          </div>

          {overdue && (
            <span
              style={{
                background: "rgba(220,50,50,0.85)",
                padding: "3px 7px",
                borderRadius: "5px",
                fontSize: "0.55rem",
                fontWeight: 700,
              }}
            >
              OVERDUE
            </span>
          )}

          {!overdue && dueSoon && (
            <span
              style={{
                background: "rgba(220,170,0,0.75)",
                padding: "3px 7px",
                borderRadius: "5px",
                fontSize: "0.55rem",
                fontWeight: 700,
              }}
            >
              DUE SOON
            </span>
          )}
        </div>

        {/* Balance */}

        <div
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: "1.75rem",
            fontWeight: 700,
            marginTop: "12px",
          }}
        >
          {fmt(balance)}
        </div>

        <div
          style={{
            fontSize: "0.65rem",
            opacity: 0.65,
            marginBottom: "9px",
          }}
        >
          Limit {fmt(limit)} · Available {fmt(available)}
        </div>

        {/* Utilization */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.62rem",
            opacity: 0.75,
            marginBottom: "4px",
          }}
        >
          <span>Utilization</span>
          <strong>{utilization.toFixed(0)}%</strong>
        </div>

        <div
          style={{
            height: "5px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "11px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${utilization}%`,
              background: "rgba(255,255,255,0.8)",
              borderRadius: "3px",
            }}
          />
        </div>

        {/* Buttons */}

        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => onPay(card)}
            style={glassButton}
          >
            💳 Pay
          </button>

          <button
            type="button"
            onClick={() => onEdit(card)}
            style={glassButton}
          >
            ✏️ Edit
          </button>

          <button
            type="button"
            onClick={() => onBalance(card)}
            style={glassButton}
          >
            Balance
          </button>

          <button
            type="button"
            onClick={() => onDelete(card)}
            style={glassButton}
          >
            🗑
          </button>
        </div>
      </div>

      {/* ───────────────── Summary ───────────────── */}

      <div
        style={{
          background: "#faf5e6",
          border: "1px solid #dcca84",
          borderRadius: "0 0 14px 14px",
          padding: "13px 14px",
          marginTop: "-10px",
        }}
      >
        <div
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "#a67c20",
            marginBottom: "8px",
          }}
        >
          💰 Payment & Credit Summary
        </div>

        <SummaryRow
          label="Current Balance"
          value={fmt(balance)}
        />

        <SummaryRow
          label="Available Credit"
          value={fmt(available)}
          valueColor="#3a6b4e"
        />

        <SummaryRow
          label="Credit Utilization"
          value={`${utilization.toFixed(1)}%`}
          valueColor={utilColor(utilization)}
          bold
        />

        <SummaryRow
          label="Minimum Payment"
          value={fmt(minimum)}
        />

        <SummaryRow
          label="Planned Payment"
          value={fmt(planned)}
          valueColor="#db2777"
          bold
        />

        <SummaryRow
          label="Balance After Planned Payment"
          value={fmt(remaining)}
          valueColor="#3a6b4e"
        />

        <SummaryRow
          label="Estimated Monthly Interest"
          value={fmt(monthlyInterest)}
          valueColor="#c94d6a"
        />

        <SummaryRow
          label="Statement Date"
          value={formatDate(card.statementDate)}
        />

        <SummaryRow
          label="Payment Due Date"
          value={formatDate(card.paymentDueDate)}
          valueColor={
            overdue
              ? "#c94d6a"
              : dueSoon
                ? "#a67c20"
                : "#1a0f1e"
          }
        />

        {/* Payoff progress */}

        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #e5d7a5",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              marginBottom: "5px",
            }}
          >
            <span style={{ color: "#9b6b8a" }}>
              Payoff Progress
            </span>

            <strong style={{ color: "#3a6b4e" }}>
              {payoffProgress.toFixed(0)}%
            </strong>
          </div>

          <div
            style={{
              height: "7px",
              background: "#eadfb9",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${payoffProgress}%`,
                background:
                  "linear-gradient(90deg,#3a6b4e,#72aa88)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        {/* Payment history */}

        {recentPays.length > 0 && (
          <div style={{ marginTop: "9px" }}>
            <button
              type="button"
              onClick={() => setHistOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.67rem",
                color: "#9b6b8a",
                padding: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {histOpen ? "▲" : "▼"} Payment History (
              {recentPays.length})
            </button>

            {histOpen &&
              recentPays.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.68rem",
                    marginTop: "5px",
                    borderTop: "1px solid #dcca84",
                    paddingTop: "5px",
                  }}
                >
                  <span style={{ color: "#9b6b8a" }}>
                    {formatDate(payment.date)}
                  </span>

                  <strong style={{ color: "#3a6b4e" }}>
                    -{fmt(payment.amount)}
                  </strong>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

const glassButton = {
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.28)",
  color: "#fff",
  borderRadius: "6px",
  fontSize: "0.65rem",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700,
  padding: "5px 9px",
  cursor: "pointer",
};

function SummaryRow({
  label,
  value,
  valueColor = "#1a0f1e",
  bold = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        fontSize: "0.76rem",
        marginBottom: "4px",
      }}
    >
      <span style={{ color: "#9b6b8a" }}>
        {label}
      </span>

      <strong
        style={{
          color: valueColor,
          fontWeight: bold ? 700 : 500,
          textAlign: "right",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Installment Card
// ─────────────────────────────────────────────────────────────────────────────

function InstCard({ item, index, onDelete }) {
  const monthsPaid = num(item.paid);
  const totalMonths = Math.max(1, num(item.months));
  const monthly = num(item.amt ?? item.monthly);

  const paidPct = clamp(
    Math.round((monthsPaid / totalMonths) * 100),
    0,
    100
  );

  const paidAmt = monthsPaid * monthly;
  const totalAmt = totalMonths * monthly;
  const remaining = Math.max(0, totalAmt - paidAmt);
  const monthsLeft = Math.max(0, totalMonths - monthsPaid);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #fce7f3",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "10px",
        boxShadow:
          "0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: typography.fontDisplay,
              fontWeight: 700,
              fontSize: "0.97rem",
            }}
          >
            {item.label ?? item.name}
          </div>

          {item.start && (
            <div
              style={{
                fontSize: "0.67rem",
                color: "#9b6b8a",
                marginTop: "2px",
              }}
            >
              Started {formatDate(item.start)}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(item)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#d4b8c4",
          }}
        >
          🗑
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          marginBottom: "4px",
        }}
      >
        <span style={{ color: "#9b6b8a" }}>
          Progress
        </span>

        <span
          style={{
            fontWeight: 700,
            color: "#7c3aed",
          }}
        >
          {paidPct}%
        </span>
      </div>

      <div
        style={{
          height: "7px",
          background: "#fce7f3",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${paidPct}%`,
            background:
              "linear-gradient(90deg,#7c3aed,#c890b8)",
            borderRadius: "4px",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        {[
          ["Total", fmt(totalAmt), "#1a0f1e"],
          ["Paid", fmt(paidAmt), "#3a6b4e"],
          ["Remaining", fmt(remaining), "#c94d6a"],
        ].map(([label, value, color]) => (
          <div
            key={label}
            style={{
              background: "#fff5f9",
              borderRadius: "9px",
              padding: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#9b6b8a",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                color,
                marginTop: "2px",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: "0.72rem",
          color: "#9b6b8a",
          textAlign: "center",
          marginTop: "9px",
        }}
      >
        {monthsLeft > 0
          ? `${monthsLeft} month${
              monthsLeft !== 1 ? "s" : ""
            } left · ${fmt(monthly)}/mo`
          : "🎉 Fully paid!"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Cards() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("cards");

  // Modals
  const [payCard, setPayCard] = useState(null);
  const [balCard, setBalCard] = useState(null);
  const [editCard, setEditCard] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  // Payment / balance forms
  const [payAmt, setPayAmt] = useState("");
  const [newBal, setNewBal] = useState("");

  // Credit card form
  const emptyCardForm = {
    label: "",
    cardType: "Credit Card",
    owner: "Zai",
    limit: "",
    balance: "",
    apr: "19.99",
    minPct: "2.5",
    plannedPayment: "",
    statementDate: "",
    paymentDueDate: "",
  };

  const [nc, setNc] = useState(emptyCardForm);

  // Installment form
  const [ni, setNi] = useState({
    label: "",
    amt: "",
    months: "",
    paid: "0",
    start: "",
  });

  // Debt crusher
  const [crushMethod, setCrushMethod] =
    useState("snowball");

  // ───────────────────────────────────────────────────────────────────────────
  // Load
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let dead = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data,
          error: e,
        } = await supabase
          .from("user_data")
          .select("data")
          .limit(1)
          .single();

        if (e) throw e;

        if (dead) return;

        const blob = data?.data?.budgetsbloom;

        setRawData(
          typeof blob === "string"
            ? JSON.parse(blob)
            : blob ?? null
        );
      } catch (err) {
        if (!dead) {
          setError(
            err.message ?? "Failed to load"
          );
        }
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Save
  // ───────────────────────────────────────────────────────────────────────────

  const save = useCallback(async (updated) => {
    setSaving(true);

    try {
      const {
        data: rows,
        error: findError,
      } = await supabase
        .from("user_data")
        .select("id")
        .limit(1)
        .single();

      if (findError) throw findError;

      const { error: saveError } =
        await supabase
          .from("user_data")
          .update({
            data: {
              budgetsbloom: JSON.stringify(
                updated
              ),
            },
          })
          .eq("id", rows.id);

      if (saveError) throw saveError;

      setRawData(updated);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Derived
  // ───────────────────────────────────────────────────────────────────────────

  const cards = useMemo(
    () => rawData?.cards ?? [],
    [rawData]
  );

  const installs = useMemo(
    () => rawData?.installments ?? [],
    [rawData]
  );

  const totalDebt = useMemo(
    () =>
      cards.reduce(
        (sum, card) =>
          sum +
          num(card.balance ?? card.bal),
        0
      ),
    [cards]
  );

  const totalLimit = useMemo(
    () =>
      cards.reduce(
        (sum, card) => sum + num(card.limit),
        0
      ),
    [cards]
  );

  const totalAvailable = useMemo(
    () =>
      cards.reduce(
        (sum, card) =>
          sum + calcAvailable(card),
        0
      ),
    [cards]
  );

  const totalMin = useMemo(
    () =>
      cards.reduce(
        (sum, card) => sum + calcMin(card),
        0
      ),
    [cards]
  );

  const totalPlanned = useMemo(
    () =>
      cards.reduce(
        (sum, card) =>
          sum + calcPlannedPayment(card),
        0
      ),
    [cards]
  );

  const totalInterest = useMemo(
    () =>
      cards.reduce(
        (sum, card) =>
          sum + calcMonthlyInterest(card),
        0
      ),
    [cards]
  );

  const overallUtilization =
    totalLimit > 0
      ? clamp(
          (totalDebt / totalLimit) * 100,
          0,
          100
        )
      : 0;

  const crusherCards = useMemo(() => {
    const withBalance = cards.filter(
      (card) =>
        num(card.balance ?? card.bal) > 0
    );

    if (crushMethod === "snowball") {
      return [...withBalance].sort(
        (a, b) =>
          num(a.balance ?? a.bal) -
          num(b.balance ?? b.bal)
      );
    }

    return [...withBalance].sort(
      (a, b) =>
        num(b.apr) - num(a.apr)
    );
  }, [cards, crushMethod]);

  const extraBudget = 200;

  const estimatedMonths =
    totalDebt > 0 &&
    totalMin + extraBudget > 0
      ? Math.ceil(
          totalDebt /
            (totalMin + extraBudget)
        )
      : 0;

  const debtFreeDate = (() => {
    const date = new Date();

    if (estimatedMonths > 0) {
      date.setMonth(
        date.getMonth() + estimatedMonths
      );
    }

    return date;
  })();

  // ───────────────────────────────────────────────────────────────────────────
  // Card actions
  // ───────────────────────────────────────────────────────────────────────────

  function openPay(card) {
    setPayAmt(
      calcPlannedPayment(card).toFixed(2)
    );
    setPayCard(card);
  }

  function doPay() {
    const amount = num(payAmt);

    if (amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (!payCard) return;

    const currentBalance = num(
      payCard.balance ?? payCard.bal
    );

    if (amount > currentBalance) {
      if (
        !window.confirm(
          "This payment is greater than the current balance. Record it anyway?"
        )
      ) {
        return;
      }
    }

    const updated = {
      ...rawData,
      cards: cards.map((card) => {
        if (card.id !== payCard.id) {
          return card;
        }

        const newBalance = Math.max(
          0,
          currentBalance - amount
        );

        const payments = [
          {
            id: Date.now(),
            date: todayStr(),
            amount,
          },
          ...(card.payments ?? []),
        ].slice(0, 30);

        return {
          ...card,
          balance: newBalance,
          bal: newBalance,
          payments,
        };
      }),
    };

    save(updated);
    setPayCard(null);
  }

  function openBalance(card) {
    setNewBal(
      String(
        card.balance ??
          card.bal ??
          0
      )
    );

    setBalCard(card);
  }

  function doBalance() {
    const value = Number(newBal);

    if (!Number.isFinite(value) || value < 0) {
      alert("Enter a valid balance.");
      return;
    }

    const updated = {
      ...rawData,
      cards: cards.map((card) =>
        card.id !== balCard.id
          ? card
          : {
              ...card,
              balance: value,
              bal: value,
            }
      ),
    };

    save(updated);
    setBalCard(null);
  }

  function openAddCard() {
    setNc(emptyCardForm);
    setEditCard(null);
    setAddOpen(true);
  }

  function openEditCard(card) {
    setNc({
      label: card.label ?? card.name ?? "",
      cardType:
        card.cardType ??
        card.type ??
        "Credit Card",
      owner: card.owner ?? "Zai",
      limit:
        card.limit !== undefined
          ? String(card.limit)
          : "",
      balance:
        card.balance !== undefined
          ? String(card.balance)
          : String(card.bal ?? ""),
      apr:
        card.apr !== undefined
          ? String(card.apr)
          : "19.99",
      minPct:
        card.minPct !== undefined
          ? String(card.minPct)
          : "2.5",
      plannedPayment:
        card.plannedPayment !== undefined
          ? String(card.plannedPayment)
          : "",
      statementDate:
        card.statementDate ?? "",
      paymentDueDate:
        card.paymentDueDate ?? "",
    });

    setEditCard(card);
    setAddOpen(true);
  }

  function saveCardForm() {
    if (!nc.label.trim()) {
      alert("Credit card name is required.");
      return;
    }

    const limit = Math.max(
      0,
      num(nc.limit)
    );

    const balance = Math.min(
      Math.max(0, num(nc.balance)),
      limit > 0 ? limit : Infinity
    );

    const apr = Math.max(
      0,
      num(nc.apr)
    );

    const minPct =
      num(nc.minPct) > 0
        ? num(nc.minPct)
        : 2.5;

    const plannedPayment =
      Math.max(
        0,
        num(nc.plannedPayment)
      );

    const cardData = {
      label: nc.label.trim(),
      name: nc.label.trim(),

      cardType:
        nc.cardType || "Credit Card",

      type:
        nc.cardType || "Credit Card",

      owner: nc.owner || "Zai",

      limit,
      balance,
      bal: balance,

      apr,
      minPct,

      plannedPayment,

      statementDate:
        nc.statementDate || "",

      paymentDueDate:
        nc.paymentDueDate || "",

      payments:
        editCard?.payments ?? [],
    };

    let updatedCards;

    if (editCard) {
      updatedCards = cards.map((card) =>
        card.id === editCard.id
          ? {
              ...card,
              ...cardData,
            }
          : card
      );
    } else {
      updatedCards = [
        ...cards,
        {
          id: "c" + Date.now(),
          ...cardData,
        },
      ];
    }

    save({
      ...rawData,
      cards: updatedCards,
    });

    setNc(emptyCardForm);
    setEditCard(null);
    setAddOpen(false);
  }

  function doDelete() {
    if (!delTarget) return;

    const updated =
      delTarget.type === "card"
        ? {
            ...rawData,
            cards: cards.filter(
              (card) =>
                card.id !==
                delTarget.item.id
            ),
          }
        : {
            ...rawData,
            installments: installs.filter(
              (item) =>
                item.id !==
                delTarget.item.id
            ),
          };

    save(updated);
    setDelTarget(null);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Installments
  // ───────────────────────────────────────────────────────────────────────────

  function doAddInstall() {
    if (
      !ni.label.trim() ||
      !ni.amt ||
      !ni.months
    ) {
      alert(
        "Name, monthly amount, and total months are required."
      );
      return;
    }

    const installment = {
      id: "i" + Date.now(),
      label: ni.label.trim(),
      amt: num(ni.amt),
      months: Math.max(
        1,
        parseInt(ni.months, 10) || 1
      ),
      paid: Math.max(
        0,
        parseInt(ni.paid, 10) || 0
      ),
      start: ni.start,
      active: true,
    };

    save({
      ...rawData,
      installments: [
        ...installs,
        installment,
      ],
    });

    setNi({
      label: "",
      amt: "",
      months: "",
      paid: "0",
      start: "",
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation tabs
  // ───────────────────────────────────────────────────────────────────────────

  const TABS = [
    {
      id: "cards",
      label: "Cards",
    },
    {
      id: "crusher",
      label: "Debt Crusher",
    },
    {
      id: "installments",
      label: "Installments",
    },
  ];

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      style={{
        flex: "0 0 auto",
        padding: "10px 14px",
        background: "none",
        border: "none",
        borderBottom:
          tab === id
            ? "2px solid #db2777"
            : "2px solid transparent",
        color:
          tab === id
            ? "#db2777"
            : "#9b6b8a",
        fontFamily:
          "'DM Sans', sans-serif",
        fontSize: "0.64rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const actionBtn = (
    label,
    onClick,
    primary
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "11px",
        borderRadius: "9px",
        border: primary
          ? "none"
          : "1.5px solid #f0dce4",
        background: primary
          ? "#db2777"
          : "#ffffff",
        color: primary
          ? "#fff"
          : "#3a2430",
        fontFamily:
          "'DM Sans', sans-serif",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fdf6f8",
        fontFamily:
          "'DM Sans', sans-serif",
        color: "#1a0f1e",
        paddingBottom: "85px",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "14px",
        }}
      >
        {/* Header */}

        <div
          style={{
            padding: "28px 0 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#9b6b8a",
                letterSpacing: "0.12em",
                textTransform:
                  "uppercase",
                marginBottom: "4px",
              }}
            >
              Credit Card Tracker
            </p>

            <h1
              style={{
                fontFamily:
                  typography.fontDisplay,
                fontSize: "28px",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Your Cards
            </h1>
          </div>

          {saving && (
            <span
              style={{
                fontSize: "11px",
                color: "#9b6b8a",
              }}
            >
              Saving…
            </span>
          )}
        </div>

        {loading && (
          <LoadingSpinner message="Loading cards…" />
        )}

        {error && (
          <div
            style={{
              background: "#fdedf1",
              border:
                "1px solid #f4a0b4",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "16px",
              color: "#c94d6a",
              fontSize: "13px",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ───────────────── Overall Summary ───────────────── */}

            <div
              style={{
                background: "#fff",
                border:
                  "1px solid #fce7f3",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "12px",
                boxShadow:
                  "0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)",
              }}
            >
              <div
                style={{
                  fontFamily:
                    typography.fontDisplay,
                  fontSize: "0.97rem",
                  fontWeight: 700,
                  marginBottom: "9px",
                }}
              >
                💳 Credit Card Overview
              </div>

              <div
                style={{
                  fontFamily:
                    typography.fontDisplay,
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#db2777",
                }}
              >
                {fmt(totalDebt)}
              </div>

              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#9b6b8a",
                  marginBottom: "12px",
                }}
              >
                {cards.length} card
                {cards.length !== 1
                  ? "s"
                  : ""}{" "}
                · Available{" "}
                {fmt(totalAvailable)}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {[
                  [
                    "Minimum / Month",
                    fmt(totalMin),
                    "#a67c20",
                  ],
                  [
                    "Planned / Month",
                    fmt(totalPlanned),
                    "#db2777",
                  ],
                  [
                    "Possible Interest",
                    fmt(totalInterest),
                    "#c94d6a",
                  ],
                  [
                    "Total Credit",
                    fmt(totalLimit),
                    "#2860a0",
                  ],
                ].map(
                  ([label, value, color]) => (
                    <div
                      key={label}
                      style={{
                        background:
                          "#fff5f9",
                        borderRadius: "9px",
                        padding: "9px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.59rem",
                          color: "#9b6b8a",
                          textTransform:
                            "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "0.84rem",
                          fontWeight: 700,
                          color,
                          marginTop: "2px",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: "0.67rem",
                  color: "#9b6b8a",
                  marginBottom: "4px",
                }}
              >
                <span>
                  Overall Utilization
                </span>

                <strong
                  style={{
                    color:
                      utilColor(
                        overallUtilization
                      ),
                  }}
                >
                  {overallUtilization.toFixed(
                    1
                  )}
                  %
                </strong>
              </div>

              <div
                style={{
                  height: "7px",
                  background: "#fce7f3",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${overallUtilization}%`,
                    background:
                      "linear-gradient(90deg,#db2777,#f472b6)",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            {/* Tabs */}

            <div
              style={{
                display: "flex",
                overflowX: "auto",
                scrollbarWidth: "none",
                background: "#fff",
                borderBottom:
                  "1px solid #fce7f3",
                marginBottom: "12px",
                borderRadius:
                  "14px 14px 0 0",
              }}
            >
              {TABS.map((item) =>
                tabBtn(
                  item.id,
                  item.label
                )
              )}
            </div>

            {/* ───────────────── CARDS TAB ───────────────── */}

            {tab === "cards" && (
              <div>
                {cards.length === 0 && (
                  <div
                    style={{
                      background: "#fff",
                      border:
                        "1.5px dashed #f0dce4",
                      borderRadius: "14px",
                      padding: "40px",
                      textAlign: "center",
                      color: "#b899a8",
                      fontSize: "13px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "30px",
                        marginBottom: "8px",
                      }}
                    >
                      💳
                    </div>

                    No credit cards yet.
                    <br />
                    Add your first card
                    below.
                  </div>
                )}

                {cards.map((card, index) => (
                  <CCCard
                    key={
                      card.id ??
                      card.label ??
                      index
                    }
                    card={card}
                    index={index}
                    onPay={openPay}
                    onEdit={openEditCard}
                    onBalance={openBalance}
                    onDelete={(item) =>
                      setDelTarget({
                        type: "card",
                        item,
                      })
                    }
                  />
                ))}

                <button
                  type="button"
                  onClick={openAddCard}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "13px",
                    background: "#fff",
                    border:
                      "1.5px solid #f0dce4",
                    borderRadius: "14px",
                    fontFamily:
                      "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#db2777",
                    cursor: "pointer",
                  }}
                >
                  + Add Credit Card
                </button>
              </div>
            )}

            {/* ───────────────── DEBT CRUSHER ───────────────── */}

            {tab === "crusher" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    background: "#fff5f9",
                    border:
                      "1.5px solid #f0dce4",
                    borderRadius: "10px",
                    overflow: "hidden",
                    marginBottom: "14px",
                  }}
                >
                  {[
                    [
                      "snowball",
                      "❄️ Snowball",
                    ],
                    [
                      "avalanche",
                      "🏔 Avalanche",
                    ],
                  ].map(([method, label]) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setCrushMethod(
                          method
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        border: "none",
                        background:
                          crushMethod ===
                          method
                            ? "#db2777"
                            : "none",
                        color:
                          crushMethod ===
                          method
                            ? "#fff"
                            : "#9b6b8a",
                        fontFamily:
                          "'DM Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.77rem",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {crusherCards.length ===
                0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border:
                        "1px solid #fce7f3",
                      borderRadius: "14px",
                      padding: "25px",
                      textAlign: "center",
                      color: "#3a6b4e",
                      fontWeight: 700,
                    }}
                  >
                    🎉 No credit card
                    debt!
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        background: "#fff",
                        border:
                          "1px solid #fce7f3",
                        borderRadius: "14px",
                        padding: "16px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily:
                            typography.fontDisplay,
                          fontWeight: 700,
                          marginBottom:
                            "8px",
                        }}
                      >
                        🎯{" "}
                        {crushMethod ===
                        "snowball"
                          ? "❄️ Snowball"
                          : "🏔 Avalanche"}{" "}
                        Strategy
                      </div>

                      <p
                        style={{
                          fontSize:
                            "0.79rem",
                          color:
                            "#9b6b8a",
                          lineHeight: 1.6,
                          marginBottom:
                            "12px",
                        }}
                      >
                        {crushMethod ===
                        "snowball"
                          ? "Focus your extra payment on the smallest balance first."
                          : "Focus your extra payment on the highest APR first to reduce interest."}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        {[
                          [
                            "Total Debt",
                            fmt(totalDebt),
                            "#db2777",
                          ],
                          [
                            "Min / Month",
                            fmt(totalMin),
                            "#a67c20",
                          ],
                          [
                            "Extra Budget",
                            fmt(extraBudget),
                            "#3a6b4e",
                          ],
                          [
                            "Est. Payoff",
                            `${estimatedMonths} mo`,
                            "#2860a0",
                          ],
                        ].map(
                          ([
                            label,
                            value,
                            color,
                          ]) => (
                            <div
                              key={label}
                              style={{
                                background:
                                  "#fff5f9",
                                borderRadius:
                                  "8px",
                                padding:
                                  "10px",
                                textAlign:
                                  "center",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize:
                                    "1rem",
                                  color,
                                }}
                              >
                                {value}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "0.61rem",
                                  color:
                                    "#9b6b8a",
                                }}
                              >
                                {label}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          fontSize:
                            "0.7rem",
                          color:
                            "#9b6b8a",
                          marginTop:
                            "10px",
                        }}
                      >
                        Estimated debt-free:
                        {" "}
                        <strong>
                          {debtFreeDate.toLocaleDateString(
                            "en-CA",
                            {
                              month:
                                "short",
                              year:
                                "numeric",
                            }
                          )}
                        </strong>
                      </div>
                    </div>

                    {crusherCards.map(
                      (card, index) => {
                        const balance =
                          num(
                            card.balance ??
                              card.bal
                          );

                        const progress =
                          calcPayoffProgress(
                            card
                          );

                        const isFocus =
                          index === 0;

                        return (
                          <div
                            key={card.id}
                            style={{
                              background:
                                "#fff",
                              border: `1px solid ${
                                isFocus
                                  ? "#f9a8c9"
                                  : "#fce7f3"
                              }`,
                              borderRadius:
                                "14px",
                              padding:
                                "15px",
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
                                gap: "10px",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                  }}
                                >
                                  {card.label ??
                                    card.name}
                                </div>

                                <div
                                  style={{
                                    fontSize:
                                      "0.67rem",
                                    color:
                                      "#9b6b8a",
                                    marginTop:
                                      "3px",
                                  }}
                                >
                                  Priority #
                                  {index +
                                    1}
                                </div>
                              </div>

                              {isFocus && (
                                <span
                                  style={{
                                    background:
                                      "#fdf2f8",
                                    color:
                                      "#db2777",
                                    fontSize:
                                      "0.58rem",
                                    fontWeight:
                                      700,
                                    padding:
                                      "3px 7px",
                                    borderRadius:
                                      "5px",
                                  }}
                                >
                                  🎯 FOCUS
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                marginTop:
                                  "12px",
                                fontSize:
                                  "0.8rem",
                              }}
                            >
                              <strong>
                                {fmt(
                                  balance
                                )}
                              </strong>

                              <span
                                style={{
                                  color:
                                    "#9b6b8a",
                                }}
                              >
                                {num(
                                  card.apr
                                ).toFixed(
                                  2
                                )}
                                % APR
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
                                marginTop:
                                  "6px",
                              }}
                            >
                              <div
                                style={{
                                  height:
                                    "100%",
                                  width: `${progress}%`,
                                  background:
                                    "linear-gradient(90deg,#3a6b4e,#72aa88)",
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
                                marginTop:
                                  "4px",
                              }}
                            >
                              <span>
                                {progress.toFixed(
                                  0
                                )}
                                % paid off
                              </span>

                              <span>
                                Available{" "}
                                {fmt(
                                  calcAvailable(
                                    card
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </>
                )}
              </div>
            )}

            {/* ───────────────── INSTALLMENTS ───────────────── */}

            {tab === "installments" && (
              <div>
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid #fce7f3",
                    borderRadius: "14px",
                    padding: "16px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily:
                        typography.fontDisplay,
                      fontWeight: 700,
                      fontSize:
                        "0.97rem",
                      marginBottom:
                        "12px",
                    }}
                  >
                    + Add Installment
                  </div>

                  <Field label="Item Name">
                    <input
                      style={inp}
                      placeholder="e.g. Laptop, Phone"
                      value={ni.label}
                      onChange={(e) =>
                        setNi((prev) => ({
                          ...prev,
                          label:
                            e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <Field label="Monthly Payment">
                      <input
                        style={inp}
                        type="number"
                        step="0.01"
                        value={ni.amt}
                        onChange={(e) =>
                          setNi((prev) => ({
                            ...prev,
                            amt:
                              e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Total Months">
                      <input
                        style={inp}
                        type="number"
                        value={ni.months}
                        onChange={(e) =>
                          setNi((prev) => ({
                            ...prev,
                            months:
                              e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Months Paid">
                      <input
                        style={inp}
                        type="number"
                        value={ni.paid}
                        onChange={(e) =>
                          setNi((prev) => ({
                            ...prev,
                            paid:
                              e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Start Date">
                      <input
                        style={inp}
                        type="date"
                        value={ni.start}
                        onChange={(e) =>
                          setNi((prev) => ({
                            ...prev,
                            start:
                              e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <button
                    type="button"
                    onClick={
                      doAddInstall
                    }
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius:
                        "9px",
                      background:
                        "#db2777",
                      border: "none",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Add Installment
                  </button>
                </div>

                {installs.length ===
                  0 && (
                  <div
                    style={{
                      background:
                        "#fff",
                      border:
                        "1.5px dashed #f0dce4",
                      borderRadius:
                        "14px",
                      padding: "30px",
                      textAlign:
                        "center",
                      color:
                        "#b899a8",
                    }}
                  >
                    No installments
                    yet.
                  </div>
                )}

                {installs.map(
                  (item, index) => (
                    <InstCard
                      key={
                        item.id ??
                        item.label ??
                        index
                      }
                      item={item}
                      index={index}
                      onDelete={(value) =>
                        setDelTarget({
                          type:
                            "installment",
                          item: value,
                        })
                      }
                    />
                  )
                )}
              </div>
            )}

            <div
              style={{
                marginTop: "20px",
                padding: "12px 14px",
                background: "#fff8fa",
                border:
                  "1px dashed #f0dce4",
                borderRadius: "14px",
                fontSize: "12px",
                color: "#9b6b8a",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              💡 Keeping utilization below
              30% is generally a good target
              for credit management.
            </div>
          </>
        )}
      </div>

      {/* ───────────────── PAYMENT MODAL ───────────────── */}

      <Modal
        open={!!payCard}
        onClose={() => setPayCard(null)}
        title="💳 Record Credit Card Payment"
      >
        {payCard && (
          <>
            <div
              style={{
                background: "#fff5f9",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "14px",
              }}
            >
              <strong>
                {payCard.label ??
                  payCard.name}
              </strong>

              <div
                style={{
                  fontSize: "12px",
                  color: "#9b6b8a",
                  marginTop: "3px",
                }}
              >
                Current balance:{" "}
                {fmt(
                  payCard.balance ??
                    payCard.bal
                )}
              </div>
            </div>

            <Field label="Amount Paid">
              <input
                style={inp}
                type="number"
                min="0"
                step="0.01"
                value={payAmt}
                onChange={(e) =>
                  setPayAmt(
                    e.target.value
                  )
                }
              />
            </Field>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              {actionBtn(
                "Cancel",
                () =>
                  setPayCard(null),
                false
              )}

              {actionBtn(
                "✓ Record Payment",
                doPay,
                true
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ───────────────── BALANCE MODAL ───────────────── */}

      <Modal
        open={!!balCard}
        onClose={() => setBalCard(null)}
        title="✏️ Update Current Balance"
      >
        {balCard && (
          <>
            <p
              style={{
                fontSize: "13px",
                color: "#9b6b8a",
                marginBottom: "14px",
              }}
            >
              {balCard.label ??
                balCard.name}
              <br />
              Current:{" "}
              {fmt(
                balCard.balance ??
                  balCard.bal ??
                  0
              )}
            </p>

            <Field label="New Balance">
              <input
                style={inp}
                type="number"
                min="0"
                step="0.01"
                value={newBal}
                onChange={(e) =>
                  setNewBal(
                    e.target.value
                  )
                }
              />
            </Field>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              {actionBtn(
                "Cancel",
                () =>
                  setBalCard(null),
                false
              )}

              {actionBtn(
                "✓ Update Balance",
                doBalance,
                true
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ───────────────── ADD / EDIT CARD MODAL ───────────────── */}

      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditCard(null);
        }}
        title={
          editCard
            ? "✏️ Edit Credit Card"
            : "💳 Add Credit Card"
        }
      >
        <Field label="Credit Card Name">
          <input
            style={inp}
            placeholder="e.g. CIBC Dividend Visa"
            value={nc.label}
            onChange={(e) =>
              setNc((prev) => ({
                ...prev,
                label: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Card Type">
          <select
            style={selectStyle}
            value={nc.cardType}
            onChange={(e) =>
              setNc((prev) => ({
                ...prev,
                cardType: e.target.value,
              }))
            }
          >
            <option>Credit Card</option>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>American Express</option>
            <option>Store Credit Card</option>
            <option>Rewards Card</option>
            <option>Cash Back Card</option>
            <option>Other</option>
          </select>
        </Field>

        <Field label="Owner">
          <select
            style={selectStyle}
            value={nc.owner}
            onChange={(e) =>
              setNc((prev) => ({
                ...prev,
                owner: e.target.value,
              }))
            }
          >
            <option>Zai</option>
            <option>Ariel</option>
            <option>Joint</option>
          </select>
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <Field label="Credit Limit">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.01"
              placeholder="5000"
              value={nc.limit}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  limit:
                    e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Current Balance">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.01"
              placeholder="1500"
              value={nc.balance}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  balance:
                    e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Interest Rate / APR">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.01"
              placeholder="19.99"
              value={nc.apr}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  apr: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Minimum Payment %">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.1"
              placeholder="2.5"
              value={nc.minPct}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  minPct:
                    e.target.value,
                }))
              }
            />
          </Field>
        </div>

        {/* Live calculated interest */}

        <div
          style={{
            background: "#fdf2f8",
            border:
              "1px solid #f9c5dc",
            borderRadius: "10px",
            padding: "11px 12px",
            marginBottom: "13px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#9b6b8a",
              textTransform:
                "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Estimated Monthly Interest
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#c94d6a",
              marginTop: "2px",
            }}
          >
            {fmt(
              (num(nc.balance) *
                (num(nc.apr) / 100)) /
                12
            )}
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#9b6b8a",
              marginTop: "2px",
            }}
          >
            Estimated from current
            balance and APR. Actual interest
            can vary by issuer and billing
            cycle.
          </div>
        </div>

        <Field
          label="Planned Payment"
          hint="Leave blank to automatically use the calculated minimum payment."
        >
          <input
            style={inp}
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 200"
            value={nc.plannedPayment}
            onChange={(e) =>
              setNc((prev) => ({
                ...prev,
                plannedPayment:
                  e.target.value,
              }))
            }
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
          }}
        >
          <Field
            label="Statement Date"
            hint="The date your statement is generated."
          >
            <input
              style={inp}
              type="date"
              value={nc.statementDate}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  statementDate:
                    e.target.value,
                }))
              }
            />
          </Field>

          <Field
            label="Payment Due Date"
            hint="The actual payment deadline."
          >
            <input
              style={inp}
              type="date"
              value={nc.paymentDueDate}
              onChange={(e) =>
                setNc((prev) => ({
                  ...prev,
                  paymentDueDate:
                    e.target.value,
                }))
              }
            />
          </Field>
        </div>

        {/* Live calculated values */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              background: "#eaf3ee",
              border:
                "1px solid #b8d8c3",
              borderRadius: "9px",
              padding: "9px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: "#6b8875",
                textTransform:
                  "uppercase",
                fontWeight: 700,
              }}
            >
              Available Credit
            </div>

            <strong
              style={{
                color: "#3a6b4e",
                fontSize: "14px",
              }}
            >
              {fmt(
                Math.max(
                  0,
                  num(nc.limit) -
                    num(nc.balance)
                )
              )}
            </strong>
          </div>

          <div
            style={{
              background: "#fff5f9",
              border:
                "1px solid #f9c5dc",
              borderRadius: "9px",
              padding: "9px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: "#9b6b8a",
                textTransform:
                  "uppercase",
                fontWeight: 700,
              }}
            >
              Utilization
            </div>

            <strong
              style={{
                color: utilColor(
                  num(nc.limit) > 0
                    ? (num(nc.balance) /
                        num(nc.limit)) *
                        100
                    : 0
                ),
                fontSize: "14px",
              }}
            >
              {num(nc.limit) > 0
                ? (
                    (num(nc.balance) /
                      num(nc.limit)) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "5px",
          }}
        >
          {actionBtn(
            "Cancel",
            () => {
              setAddOpen(false);
              setEditCard(null);
            },
            false
          )}

          {actionBtn(
            editCard
              ? "✓ Save Changes"
              : "+ Add Card",
            saveCardForm,
            true
          )}
        </div>
      </Modal>

      {/* ───────────────── DELETE MODAL ───────────────── */}

      <Modal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="🗑 Confirm Delete"
      >
        {delTarget && (
          <>
            <p
              style={{
                fontSize: "13px",
                color: "#9b6b8a",
                marginBottom: "20px",
                lineHeight: 1.6,
              }}
            >
              Delete{" "}
              <strong
                style={{
                  color: "#1a0f1e",
                }}
              >
                {delTarget.item.label ??
                  delTarget.item.name}
              </strong>
              ?
              <br />
              This cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              {actionBtn(
                "Cancel",
                () =>
                  setDelTarget(null),
                false
              )}

              {actionBtn(
                "Delete",
                doDelete,
                true
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
