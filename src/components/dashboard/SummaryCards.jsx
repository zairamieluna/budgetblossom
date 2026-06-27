/**
 * SummaryCards.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Three top-line metric cards:
 *   Income | Expenses | Remaining
 *
 * Answers "How am I doing?" within 5 seconds of opening the app.
 * Remaining is color-coded: green when positive, amber when tight,
 * red when negative.
 *
 * Props:
 *   finance  {object} — FinanceEngine output
 */

import React from "react";
import { formatCurrency } from "../../utils/currency";

const CARDS = [
  {
    key:       "income",
    label:     "Income",
    icon:      "💰",
    className: "bb-summary-income",
  },
  {
    key:       "expenses",
    label:     "Expenses",
    icon:      "💸",
    className: "bb-summary-expenses",
  },
  {
    key:       "remaining",
    label:     "Remaining",
    icon:      "🏦",
    className: "bb-summary-remaining",
  },
];

export default function SummaryCards({ finance = {} }) {
  if (!finance) return null;

  return (
    <div className="bb-summary-cards">
      {CARDS.map(({ key, label, icon, className }) => {
        const value = finance[key] ?? 0;
        const accent = key === "remaining"
          ? remainingAccent(value)
          : "";

        return (
          <div
            key={key}
            className={`bb-summary-card ${className} ${accent}`}
          >
            <span className="bb-summary-icon" aria-hidden="true">
              {icon}
            </span>

            <div className="bb-summary-body">
              <span className="bb-summary-label">{label}</span>
              <span className="bb-summary-value">
                {formatCurrency(value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Returns a CSS modifier class based on remaining value.
 * Signals to the user whether their cushion is healthy.
 */
function remainingAccent(value) {
  if (value > 200)  return "bb-remaining--positive";
  if (value >= 0)   return "bb-remaining--tight";
  return "bb-remaining--negative";
}
