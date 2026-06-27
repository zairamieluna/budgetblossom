/**
 * FinancialHealthCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays the user's Financial Health Score with:
 *   • A large score number and rating label
 *   • An SVG arc ring that fills to the score percentage
 *   • Four sub-score bars: Savings, Bills, Cash Flow, Debt
 *
 * Props:
 *   health  {object} — HealthEngine output
 *             { score, rating, breakdown: { savings, bills, cashflow, debt } }
 */

import React from "react";

// Sub-score row definitions
const BREAKDOWN_ITEMS = [
  { key: "savings",  label: "Savings",    icon: "🏦" },
  { key: "bills",    label: "Bills",      icon: "📋" },
  { key: "cashflow", label: "Cash Flow",  icon: "💚" },
  { key: "debt",     label: "Debt",       icon: "🔒" },
];

export default function FinancialHealthCard({ health = null }) {
  if (!health) return <HealthCardSkeleton />;

  const { score, rating, breakdown = {} } = health;

  return (
    <div className="bb-card bb-health-card">

      {/* Header */}
      <div className="bb-card-header">
        <h2 className="bb-card-title">Financial Health</h2>
      </div>

      {/* Score ring + label */}
      <div className="bb-health-score-area">
        <ScoreRing score={score} />

        <div className="bb-health-score-label">
          <span className="bb-health-score-number">{score}</span>
          <span className="bb-health-rating">{rating}</span>
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div className="bb-health-breakdown">
        {BREAKDOWN_ITEMS.map(({ key, label, icon }) => (
          <BreakdownRow
            key={key}
            label={label}
            icon={icon}
            value={breakdown[key] ?? 0}
          />
        ))}
      </div>

    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────

/**
 * SVG arc ring. Fills from 0 to score%.
 * Uses stroke-dasharray trick for the progress arc.
 */
function ScoreRing({ score = 0 }) {
  const radius      = 42;
  const cx          = 54;
  const cy          = 54;
  const circumference = 2 * Math.PI * radius;
  const filled      = circumference * (score / 100);
  const gap         = circumference - filled;

  const color = scoreColor(score);

  return (
    <svg
      className="bb-health-ring"
      viewBox="0 0 108 108"
      aria-label={`Health score: ${score} out of 100`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="var(--bb-health-track, #e8e4f0)"
        strokeWidth="10"
      />

      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Breakdown Row ────────────────────────────────────────

function BreakdownRow({ label, icon, value }) {
  return (
    <div className="bb-health-row">
      <span className="bb-health-row-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="bb-health-row-label">{label}</span>

      <div
        className="bb-health-bar-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
      >
        <div
          className="bb-health-bar-fill"
          style={{
            width:            `${value}%`,
            backgroundColor:  scoreColor(value),
            transition:       "width 0.5s ease",
          }}
        />
      </div>

      <span className="bb-health-row-value">{value}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────

function HealthCardSkeleton() {
  return (
    <div className="bb-card bb-health-card bb-skeleton">
      <div className="bb-skeleton-ring" />
      <div className="bb-skeleton-bars">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bb-skeleton-bar-row" />
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Returns a color hex based on a 0–100 score.
 * Maps to the Budget Blossom warm palette.
 */
function scoreColor(score) {
  if (score >= 80) return "var(--bb-color-success, #4caf82)";
  if (score >= 60) return "var(--bb-color-caution, #f0a500)";
  return "var(--bb-color-warning, #e05c5c)";
}
