/**
 * TipEngine.js
 *
 * Budget Blossom — Finance Layer
 *
 * Generates a single, contextual financial tip for the
 * BlossomTip card. No LLM. No API calls. Pure rule logic.
 *
 * Rules are evaluated in priority order. The first rule
 * that matches wins — this ensures the tip is always the
 * most urgent or actionable thing for the user right now.
 *
 * Priority order:
 *   1. Overdue / urgent bills
 *   2. Cashflow problems
 *   3. Goals nearing completion
 *   4. Positive reinforcement (good cashflow, all bills paid)
 *   5. Savings encouragement
 *   6. Default encouragement
 */

export class TipEngine {
  /**
   * Generate the best tip for the current state.
   *
   * @param {object} finance   — FinanceEngine output
   * @param {Array}  goals     — GoalEngine output
   * @param {object} health    — HealthEngine output
   * @param {object} period    — current period from periodService
   * @returns {Tip}
   */
  static generate(
    finance = {},
    goals = [],
    health = {},
    period = {}
  ) {
    const rules = TipEngine._buildRules(
      finance,
      goals,
      health,
      period
    );

    for (const rule of rules) {
      if (rule.condition) {
        return {
          message: rule.message,
          icon: rule.icon,
          type: rule.type ?? "info",
        };
      }
    }

    // Should never reach here, but safe fallback
    return TipEngine._defaultTip();
  }

  // ─── Rule builder ─────────────────────────────────────

  /**
   * Builds the prioritized rule list.
   * Each rule is { condition: boolean, message, icon, type }.
   *
   * type: "warning" | "success" | "info" | "encouragement"
   */
  static _buildRules(finance, goals, health, period) {
    const {
      income = 0,
      expenses = 0,
      paidCount = 0,
      expenseCount = 0,
      cashflow = 0,
    } = finance;

    const score = health?.score ?? 0;
    const breakdown = health?.breakdown ?? {};

    const unpaidCount = expenseCount - paidCount;

    // Days until period ends
    const today = new Date();
    const periodEnd = period?.e ? new Date(period.e) : null;
    const daysLeft = periodEnd
      ? Math.max(
          0,
          Math.ceil((periodEnd - today) / (1000 * 60 * 60 * 24))
        )
      : null;

    // Unpaid bills due soon
    const billsDueSoon =
      unpaidCount > 0 && daysLeft !== null && daysLeft <= 5;

    // Goal closest to completion (but not yet complete)
    const nearComplete = goals
      .filter((g) => g.progress >= 80 && g.progress < 100)
      .sort((a, b) => b.progress - a.progress)[0] ?? null;

    // Goal just started
    const justStarted = goals
      .filter((g) => g.progress < 20 && g.target > 0)
      .sort((a, b) => a.progress - b.progress)[0] ?? null;

    // Month-over-month spending signal (not yet tracked — future)
    // Placeholder so the rule slot exists when data is available
    const spentLessThanLastMonth = false;

    return [
      // ── Priority 1: Urgent unpaid bills ──────────────
      {
        condition: unpaidCount > 0 && billsDueSoon,
        message:
          unpaidCount === 1
            ? `You have 1 unpaid bill due in the next ${daysLeft} days. Don't let it slip.`
            : `You have ${unpaidCount} unpaid bills due in the next ${daysLeft} days. Stay on top of it.`,
        icon: "🔔",
        type: "warning",
      },

      // ── Priority 2: Cashflow problem ─────────────────
      {
        condition: income > 0 && expenses > income,
        message:
          "Your expenses are exceeding your income this period. Review what can wait.",
        icon: "⚠️",
        type: "warning",
      },

      // ── Priority 3: Bills behind, period not over ────
      {
        condition:
          unpaidCount > 0 &&
          breakdown.bills !== undefined &&
          breakdown.bills < 60,
        message:
          `${unpaidCount} bill${unpaidCount > 1 ? "s" : ""} still unpaid this period. Mark them off as you go.`,
        icon: "📋",
        type: "warning",
      },

      // ── Priority 4: Goal almost done ─────────────────
      {
        condition: nearComplete !== null,
        message: nearComplete
          ? `You're ${nearComplete.progress}% of the way to your ${nearComplete.name} goal. Almost there!`
          : "",
        icon: "🎯",
        type: "encouragement",
      },

      // ── Priority 5: Excellent health score ───────────
      {
        condition: score >= 90,
        message:
          "Your finances are in excellent shape. Keep the momentum going.",
        icon: "🌸",
        type: "success",
      },

      // ── Priority 6: All bills paid ───────────────────
      {
        condition: expenseCount > 0 && paidCount === expenseCount,
        message:
          "All bills paid this period. One less thing to think about.",
        icon: "✅",
        type: "success",
      },

      // ── Priority 7: Good cashflow ─────────────────────
      {
        condition: cashflow > 0 && income > 0,
        message: `You're keeping ${Math.round((cashflow / income) * 100)}% of your income after expenses this period. Well done.`,
        icon: "💚",
        type: "success",
      },

      // ── Priority 8: Spent less than last month ────────
      {
        condition: spentLessThanLastMonth,
        message:
          "You spent less than last period. Small wins add up.",
        icon: "📉",
        type: "success",
      },

      // ── Priority 9: Encourage new goal ───────────────
      {
        condition: justStarted !== null,
        message: justStarted
          ? `Your ${justStarted.name} goal is just getting started. Every contribution counts.`
          : "",
        icon: "🌱",
        type: "encouragement",
      },

      // ── Priority 10: No income logged yet ────────────
      {
        condition: income === 0 && expenses === 0,
        message:
          "Add your income for this period to see how your finances are doing.",
        icon: "💡",
        type: "info",
      },

      // ── Default fallback ──────────────────────────────
      TipEngine._defaultTip(),
    ];
  }

  static _defaultTip() {
    return {
      condition: true,
      message:
        "Keep going. Consistent small actions are how financial goals get reached.",
      icon: "🌸",
      type: "encouragement",
    };
  }
}

export default TipEngine;

/**
 * @typedef {object} Tip
 * @property {string} message  — the tip text to display
 * @property {string} icon     — emoji icon for visual accent
 * @property {string} type     — "warning" | "success" | "info" | "encouragement"
 */
