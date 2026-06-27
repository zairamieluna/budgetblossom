/**
 * useDashboard.js
 *
 * Budget Blossom — Hook Layer
 *
 * Orchestrates all data and state for the Dashboard page.
 * Components never call services or engines directly —
 * they consume this hook's return values only.
 *
 * Change log:
 *   v1.1 — Added goals (GoalEngine), health (HealthEngine),
 *           and tip (TipEngine) to the return value.
 *           No structural changes to loading, saving, or period logic.
 */

import { useEffect, useMemo, useState } from "react";

import FinanceEngine  from "../finance/FinanceEngine";
import GoalEngine     from "../finance/GoalEngine";
import HealthEngine   from "../finance/HealthEngine";
import TipEngine      from "../finance/TipEngine";

import DashboardService from "../services/dashboard/DashboardService";

import {
  PERIODS,
  getCurrentPeriodIndex,
} from "../finance/calendar/periodService";

export default function useDashboard() {

  // ── State ───────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [rawData,  setRawData]  = useState(null);

  const [periodIndex, setPeriodIndex] =
    useState(getCurrentPeriodIndex());

  const [showQuickActions, setShowQuickActions] =
    useState(false);

  const period = PERIODS[periodIndex];

  // ── Data loading ────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const parsed = await DashboardService.loadDashboard();
      setRawData(parsed);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Data saving ─────────────────────────────────────────
  async function saveData(updatedData) {
    setSaving(true);

    try {
      await DashboardService.saveDashboard(updatedData);
      setRawData(updatedData);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // ── Finance engine ──────────────────────────────────────
  const finance = useMemo(() => {
    if (!rawData) return null;
    return FinanceEngine.calculate(rawData, period);
  }, [rawData, period]);

  // ── Goals engine ────────────────────────────────────────
  /**
   * Converts rawData.savings into enriched goal objects.
   * Keeps the database key (savings) while showing "Goals" in UI.
   * No renaming required.
   */
  const goals = useMemo(() => {
    if (!rawData?.savings) return [];
    return GoalEngine.buildGoals(rawData.savings);
  }, [rawData]);

  // ── Health engine ───────────────────────────────────────
  /**
   * Composite financial health score derived from
   * finance and goals. Recalculates whenever either changes.
   */
  const health = useMemo(() => {
    if (!finance) return null;
    return HealthEngine.calculate(finance, goals);
  }, [finance, goals]);

  // ── Tip engine ──────────────────────────────────────────
  /**
   * Single best tip for the user's current state.
   * Rule-based, no LLM required.
   */
  const tip = useMemo(() => {
    if (!finance || !health) return null;
    return TipEngine.generate(finance, goals, health, period);
  }, [finance, goals, health, period]);

  // ── Profile ─────────────────────────────────────────────
  const name = rawData?.profile?.name || "";

  // ── Period navigation ───────────────────────────────────
  function previousPeriod() {
    setPeriodIndex(index => Math.max(0, index - 1));
  }

  function nextPeriod() {
    setPeriodIndex(index =>
      Math.min(PERIODS.length - 1, index + 1)
    );
  }

  // ── Quick actions ───────────────────────────────────────
  function handleQuickAction(action) {
    switch (action) {
      case "scan":
        alert("📷 Smart Scan coming soon.");
        break;
      case "expense":
        alert("💸 Add Expense");
        break;
      case "income":
        alert("💰 Add Income");
        break;
      case "card":
        alert("💳 Update Card");
        break;
      case "saving":
        alert("🏦 Savings");
        break;
      case "statement":
        alert("📄 Statement Import");
        break;
      default:
        break;
    }
  }

  // ── Return surface ──────────────────────────────────────
  return {
    // Loading state
    loading,
    saving,
    error,

    // Raw data + persistence
    rawData,
    saveData,

    // Computed finance
    finance,

    // Computed goals (from rawData.savings)
    goals,

    // Computed health score
    health,

    // Computed tip
    tip,

    // Profile
    name,

    // Period
    period,
    periodIndex,
    previousPeriod,
    nextPeriod,

    // Quick actions
    showQuickActions,
    setShowQuickActions,
    handleQuickAction,

    // Refresh
    reload: loadData,
  };
}
