/**
 * GoalsCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays all financial goals with progress bars,
 * status badges, and estimated completion timelines.
 */

import React from "react";
import { formatCurrency } from "../../utils/currency";

export default function GoalsCard({ goals = [] }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return <GoalsEmptyState />;
  }

  const totalSaved = goals.reduce(
    (sum, goal) => sum + Number(goal.current ?? 0),
    0
  );

  const totalTarget = goals.reduce(
    (sum, goal) => sum + Number(goal.target ?? 0),
    0
  );

  const overallPct =
    totalTarget > 0
      ? Math.min(
          100,
          Math.round((totalSaved / totalTarget) * 100)
        )
      : 0;

  return (
    <div className="bb-card bb-goals-card">

      <div className="bb-card-header">
        <h2 className="bb-card-title">Goals</h2>

        <span className="bb-goals-overall">
          {overallPct}% overall
        </span>
      </div>

      <div className="bb-goals-list">
        {goals.map((goal) => (
          <GoalRow
            key={goal.id ?? goal.name}
            goal={goal}
          />
        ))}
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */

function GoalRow({ goal }) {
  const {
    name = "Goal",
    current = 0,
    target = 0,
    progress = 0,
    estimatedMonths = null,
    status = "Getting Started",
    color,
  } = goal;

  const accentColor =
    color || "var(--bb-color-primary, #9b7fe8)";

  return (
    <div className="bb-goal-row">

      <div className="bb-goal-header">
        <span className="bb-goal-name">
          {name}
        </span>

        <span
          className={`bb-goal-badge bb-goal-badge--${statusKey(
            status
          )}`}
        >
          {status}
        </span>
      </div>

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
            width: `${Math.min(
              100,
              Math.max(0, progress)
            )}%`,
            backgroundColor: accentColor,
            transition: "width .5s ease",
          }}
        />
      </div>

      <div className="bb-goal-stats">
        <span className="bb-goal-saved">
          {formatCurrency(current)}

          <span className="bb-goal-target">
            {" / "}
            {formatCurrency(target)}
          </span>
        </span>

        <span className="bb-goal-eta">
          {progress >= 100
            ? "Complete 🎉"
            : estimatedMonths === null
            ? "Set a monthly amount"
            : estimatedMonths === 1
            ? "~1 mo left"
            : `~${estimatedMonths} mo left`}
        </span>
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */

function GoalsEmptyState() {
  return (
    <div className="bb-card bb-goals-card bb-goals-empty">

      <div className="bb-card-header">
        <h2 className="bb-card-title">
          Goals
        </h2>
      </div>

      <div className="bb-empty-state">
        <span
          className="bb-empty-icon"
          aria-hidden="true"
        >
          🌱
        </span>

        <p className="bb-empty-message">
          No goals yet. Add a savings goal to
          start tracking your progress.
        </p>
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */

function statusKey(status = "") {
  return status
    .toLowerCase()
    .replace(/\s+/g, "-");
}
