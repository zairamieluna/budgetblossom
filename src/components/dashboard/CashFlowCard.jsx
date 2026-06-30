/**
 * CashFlowCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays:
 * • Income vs Expenses
 * • Cash Flow
 * • Bills due this period
 */

import React from "react";
import { formatCurrency } from "../../utils/currency";

export default function CashFlowCard({ finance = null }) {
  if (!finance) {
    return <CashFlowSkeleton />;
  }

  const {
    income = 0,
    expenses = 0,
    cashflow = 0,
    paidCount = 0,
    expenseCount = 0,
    periodExpenses = [],
  } = finance;

  const isPositive = cashflow >= 0;

  const expenseRatio =
    income > 0
      ? Math.min(
          100,
          Math.round((expenses / income) * 100)
        )
      : expenses > 0
      ? 100
      : 0;

  const sortedBills = [...periodExpenses].sort((a, b) => {
    if (a.paid !== b.paid) {
      return a.paid ? 1 : -1;
    }

    return (
      new Date(a.due || 0) -
      new Date(b.due || 0)
    );
  });

  return (
    <div className="bb-card bb-cashflow-card">

      <div className="bb-card-header">
        <h2 className="bb-card-title">
          Cash Flow
        </h2>

        <span
          className={`bb-cashflow-badge ${
            isPositive
              ? "bb-cashflow-badge--positive"
              : "bb-cashflow-badge--negative"
          }`}
        >
          {isPositive ? "+" : ""}
          {formatCurrency(cashflow)}
        </span>
      </div>

      <div className="bb-cashflow-bar-section">

        <div className="bb-cashflow-bar-labels">
          <span>
            Income: {formatCurrency(income)}
          </span>

          <span>
            Expenses: {formatCurrency(expenses)}
          </span>
        </div>

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
              width: `${expenseRatio}%`,
              transition: "width .5s ease",
            }}
          />
        </div>

      </div>

      {sortedBills.length > 0 ? (
        <div className="bb-cashflow-bills">

          <div className="bb-cashflow-bills-header">

            <span className="bb-cashflow-bills-title">
              Bills this period
            </span>

            <span className="bb-cashflow-bills-count">
              {paidCount}/{expenseCount} paid
            </span>

          </div>

          <ul
            className="bb-cashflow-bills-list"
            role="list"
          >
            {sortedBills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
              />
            ))}
          </ul>

        </div>
      ) : (
        <p className="bb-cashflow-no-bills">
          No bills logged for this period.
        </p>
      )}

    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BillRow({ bill }) {
  const amount =
    Number(bill.amount ?? bill.amt ?? 0);

  const name =
    bill.name ??
    bill.label ??
    "Unnamed";

  const due = bill.due
    ? new Date(
        `${bill.due}T12:00:00`
      ).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <li
      className={`bb-bill-row ${
        bill.paid
          ? "bb-bill-row--paid"
          : "bb-bill-row--unpaid"
      }`}
    >

      <span
        className="bb-bill-status-dot"
        aria-label={
          bill.paid ? "Paid" : "Unpaid"
        }
        title={
          bill.paid ? "Paid" : "Unpaid"
        }
      />

      <span className="bb-bill-name">
        {name}
      </span>

      {due && (
        <span className="bb-bill-due">
          {due}
        </span>
      )}

      <span className="bb-bill-amount">
        {formatCurrency(amount)}
      </span>

    </li>
  );
}

/* -------------------------------------------------------------------------- */

function CashFlowSkeleton() {
  return (
    <div className="bb-card bb-cashflow-card bb-skeleton">
      <div className="bb-skeleton-line bb-skeleton-line--wide" />
      <div className="bb-skeleton-line" />
      <div className="bb-skeleton-line bb-skeleton-line--narrow" />
    </div>
  );
}
