/**
 * GoalsCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays all financial goals with progress bars,
 * status badges, and estimated completion timelines.
 *
 * The database key is rawData.savings — this component
 * always shows "Goals" to the user. No DB rename needed.
 *
 * Props:
 *   goals  {Array}  — GoalEngine.buildGoals() output
 */

import React from "react";
import { formatCurrency } from "../../utils/currency";

export default function GoalsCard({ goals = [] }) {
  if (!goals || goals.length === 0) {
    return <GoalsEmptyState />;
  }

  const totalSaved  = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target,  0);
  const overallPct  =
    totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0;

  return (
    <div className="bb-card bb-goals-card">

      {/* Header */}
      <div className="bb-card-header">
        <h2 className="bb-card-title">Goals</h2>

        <div className="bb-goals-summary">
          <span className="bb-goals-overall">
            {overallPct}% overall
          </span>
        </div>
      </div>

      {/* Goal rows */}
      <div className="bb-goals-list">
        {goals.map(goal => (
          <GoalRow key={goal.id ?? goal.name} goal={goal} />
        ))}
      </div>

    </div>
  );
}

// ─── Goal Row ─────────────────────────────────────────────

function GoalRow({ goal }) {
  const {
    name,
    current,
    target,
    progress,
    estimatedMonths,
    status,
    color,
  } = goal;

  const accentColor = color ?? "var(--bb-color-primary, #9b7fe8)";

  return (
    <div className="bb-goal-row">

      {/* Goal name + status */}
      <div className="bb-goal-header">
        <span className="bb-goal-name">{name}</span>
        <span
          className={`bb-goal-badge bb-goal-badge--${statusKey(status)}`}
        >
          {status}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="bb-goal-bar-track"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name}: ${progress}% complete`}
      >
        <div
          className="bb-goal-bar-fill"
          style={{
            width:           `${progress}%`,
            backgroundColor: accentColor,
            transition:      "width 0.5s ease",
          }}
        />
      </div>

      {/* Stats row */}
      <div className="bb-goal-stats">
        <span className="bb-goal-saved">
          {formatCurrency(current)}
          <span className="bb-goal-target">
            {" / "}{formatCurrency(target)}
          </span>
        </span>

        <span className="bb-goal-eta">
          {estimatedMonths !== null
            ? estimatedMonths === 1
              ? "~1 mo left"
              : `~${estimatedMonths} mo left`
            : progress >= 100
              ? "Complete 🎉"
              : "Set a monthly amount"}
        </span>
      </div>

    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function GoalsEmptyState() {
  return (
    <div className="bb-card bb-goals-card bb-goals-empty">
      <div className="bb-card-header">
        <h2 className="bb-card-title">Goals</h2>
      </div>

      <div className="bb-empty-state">
        <span className="bb-empty-icon" aria-hidden="true">🌱</span>
        <p className="bb-empty-message">
          No goals yet. Add a savings goal to start tracking your progress.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Converts a status string to a CSS-safe key.
 * "Getting Started" → "getting-started"
 */
function statusKey(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}
