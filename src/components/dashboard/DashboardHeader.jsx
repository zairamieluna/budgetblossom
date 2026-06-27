/**
 * DashboardHeader.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays:
 *   • Warm greeting with user's name
 *   • Current period label (e.g. "Jun 1–15")
 *   • Previous / Next period navigation
 *   • A soft date context line
 *
 * Props:
 *   name           {string}   — user's first name
 *   period         {object}   — current period from periodService
 *   periodIndex    {number}   — current index in PERIODS array
 *   onPrevious     {function} — navigate to previous period
 *   onNext         {function} — navigate to next period
 *   maxIndex       {number}   — PERIODS.length - 1
 */

import React from "react";

export default function DashboardHeader({
  name        = "",
  period      = {},
  periodIndex = 0,
  onPrevious,
  onNext,
  maxIndex    = 23,
}) {
  const greeting = buildGreeting(name);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-CA", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  const canGoPrev = periodIndex > 0;
  const canGoNext = periodIndex < maxIndex;

  return (
    <header className="bb-dashboard-header">

      {/* Greeting */}
      <div className="bb-header-greeting">
        <h1 className="bb-header-name">{greeting}</h1>
        <p className="bb-header-date">{dateLabel}</p>
      </div>

      {/* Period navigator */}
      <div className="bb-header-period">
        <button
          className="bb-period-btn"
          onClick={onPrevious}
          disabled={!canGoPrev}
          aria-label="Previous period"
          title="Previous period"
        >
          ‹
        </button>

        <span className="bb-period-label">
          {period?.lbl ?? "—"}
        </span>

        <button
          className="bb-period-btn"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next period"
          title="Next period"
        >
          ›
        </button>
      </div>

    </header>
  );
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Returns a time-aware greeting.
 * "Good morning, Zaira." / "Good evening." etc.
 */
function buildGreeting(name) {
  const hour = new Date().getHours();

  let prefix;
  if (hour < 12)       prefix = "Good morning";
  else if (hour < 17)  prefix = "Good afternoon";
  else                 prefix = "Good evening";

  return name
    ? `${prefix}, ${name.split(" ")[0]}.`
    : `${prefix}.`;
}
