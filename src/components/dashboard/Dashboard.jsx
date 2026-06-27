/**
 * Dashboard.jsx
 *
 * Budget Blossom — Pages
 *
 * Orchestration page only. No business logic lives here.
 *
 * Responsibilities:
 *   • Call useDashboard() to get all computed state
 *   • Handle loading and error states
 *   • Compose dashboard components in layout order
 *   • Pass props down — never compute anything
 *
 * Component layout:
 *   DashboardHeader    — greeting, period nav
 *   BlossomTipCard     — what should I do next?
 *   SummaryCards       — income / expenses / remaining
 *   FinancialHealthCard — how am I doing overall?
 *   GoalsCard          — what am I working toward?
 *   CashFlowCard       — bills and cashflow detail
 *
 * Target: ~100–130 lines. Keep it that way.
 */

import React from "react";

import useDashboard from "../hooks/useDashboard";
import { PERIODS }  from "../finance/calendar/periodService";

import DashboardHeader     from "../components/dashboard/DashboardHeader";
import BlossomTipCard      from "../components/dashboard/BlossomTipCard";
import SummaryCards        from "../components/dashboard/SummaryCards";
import FinancialHealthCard from "../components/dashboard/FinancialHealthCard";
import GoalsCard           from "../components/dashboard/GoalsCard";
import CashFlowCard        from "../components/dashboard/CashFlowCard";

export default function Dashboard() {
  const {
    // Loading
    loading,
    error,

    // Finance
    finance,
    goals,
    health,
    tip,

    // Profile
    name,

    // Period
    period,
    periodIndex,
    previousPeriod,
    nextPeriod,

    // Refresh
    reload,
  } = useDashboard();

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bb-dashboard bb-dashboard--loading">
        <div className="bb-loading-spinner" role="status" aria-live="polite">
          <span className="bb-loading-icon">🌸</span>
          <span className="bb-loading-text">Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="bb-dashboard bb-dashboard--error">
        <p className="bb-error-message">{error}</p>
        <button className="bb-btn bb-btn--secondary" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────
  return (
    <div className="bb-dashboard">

      <DashboardHeader
        name={name}
        period={period}
        periodIndex={periodIndex}
        onPrevious={previousPeriod}
        onNext={nextPeriod}
        maxIndex={PERIODS.length - 1}
      />

      <main className="bb-dashboard-main">

        {tip && (
          <BlossomTipCard tip={tip} />
        )}

        <SummaryCards finance={finance} />

        <div className="bb-dashboard-grid">
          <FinancialHealthCard health={health} />
          <GoalsCard goals={goals} />
        </div>

        <CashFlowCard finance={finance} />

      </main>

    </div>
  );
}
