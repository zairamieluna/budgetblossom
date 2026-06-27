/**
 * CashFlowCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays:
 *   • Income vs Expenses ratio bar
 *   • Cashflow result (surplus or deficit)
 *   • List of bills due this period with paid/unpaid status
 *
 * Props:
 *   finance  {object} — FinanceEngine output
 *             Requires: income, expenses, cashflow,
 *                       paidCount, expenseCount, periodExpenses
 */

import React from "react";
import { formatCurrency } from "../../utils/currency";

export default function CashFlowCard({ finance = null }) {
  if (!finance) return <CashFlowSkeleton />;

  const {
    income         = 0,
    expenses       = 0,
    cashflow       = 0,
    paidCount      = 0,
    expenseCount   = 0,
    periodExpenses = [],
  } = finance;

  const isPositive = cashflow >= 0;

  // Ratio of expenses to income (for the bar)
  const expenseRatio =
    income > 0
      ? Math.min(100, Math.round((expenses / income) * 100))
      : expenses > 0
        ? 100
        : 0;

  return (
    <div className="bb-card bb-cashflow-card">

      {/* Header */}
      <div className="bb-card-header">
        <h2 className="bb-card-title">Cash Flow</h2>

        <span
          className={`bb-cashflow-badge ${
            isPositive ? "bb-cashflow-badge--positive" : "bb-cashflow-badge--negative"
          }`}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(cashflow)}
        </span>
      </div>

      {/* Income vs expenses bar */}
      <div className="bb-cashflow-bar-section">
        <div className="bb-cashflow-bar-labels">
          <span className="bb-cashflow-income-label">
            Income: {formatCurrency(income)}
          </span>
          <span className="bb-cashflow-expense-label">
            Expenses: {formatCurrency(expenses)}
          </span>
        </div>

        {/* Full-width income track, expense fill overlaid */}
        <div
          className="bb-cashflow-bar-track"
          role="img"
          aria-label={`Expenses are ${expenseRatio}% of income`}
        >
          <div
            className={`bb-cashflow-bar-fill ${
              expenseRatio >= 100
                ? "bb-cashflow-bar-fill--danger"
                : expenseRatio >= 80
                  ? "bb-cashflow-bar-fill--caution"
                  : "bb-cashflow-bar-fill--safe"
            }`}
            style={{
              width:      `${expenseRatio}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* Bills this period */}
      {periodExpenses.length > 0 && (
        <div className="bb-cashflow-bills">
          <div className="bb-cashflow-bills-header">
            <span className="bb-cashflow-bills-title">
              Bills this period
            </span>
            <span className="bb-cashflow-bills-count">
              {paidCount}/{expenseCount} paid
            </span>
          </div>

          <ul className="bb-cashflow-bills-list" role="list">
            {periodExpenses
              .slice()
              .sort((a, b) => {
                // Unpaid first, then by due date ascending
                if (a.paid !== b.paid) return a.paid ? 1 : -1;
                return new Date(a.due) - new Date(b.due);
              })
              .map((bill, idx) => (
                <BillRow key={bill.id ?? idx} bill={bill} />
              ))}
          </ul>
        </div>
      )}

      {periodExpenses.length === 0 && (
        <p className="bb-cashflow-no-bills">
          No bills logged for this period.
        </p>
      )}

    </div>
  );
}

// ─── Bill Row ─────────────────────────────────────────────

function BillRow({ bill }) {
  const amount = Number(bill.amount || bill.amt) || 0;
  const name   = bill.name || bill.label || "Unnamed";
  const due    = bill.due
    ? new Date(bill.due + "T12:00:00").toLocaleDateString(
        "en-CA",
        { month: "short", day: "numeric" }
      )
    : "";

  return (
    <li className={`bb-bill-row ${bill.paid ? "bb-bill-row--paid" : "bb-bill-row--unpaid"}`}>
      <span
        className="bb-bill-status-dot"
        aria-label={bill.paid ? "Paid" : "Unpaid"}
        title={bill.paid ? "Paid" : "Unpaid"}
      />

      <span className="bb-bill-name">{name}</span>

      {due && (
        <span className="bb-bill-due">{due}</span>
      )}

      <span className="bb-bill-amount">
        {formatCurrency(amount)}
      </span>
    </li>
  );
}

// ─── Skeleton ─────────────────────────────────────────────

function CashFlowSkeleton() {
  return (
    <div className="bb-card bb-cashflow-card bb-skeleton">
      <div className="bb-skeleton-line bb-skeleton-line--wide" />
      <div className="bb-skeleton-line" />
      <div className="bb-skeleton-line bb-skeleton-line--narrow" />
    </div>
  );
}
