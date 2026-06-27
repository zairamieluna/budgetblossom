/**
 * GoalEngine.js
 *
 * Budget Blossom
 * Handles all goal calculations.
 */

export class GoalEngine {
  /**
   * Convert savings buckets into dashboard goals.
   * (Temporary until we migrate to rawData.goals)
   */
  static buildGoals(savings = []) {
    return savings.map((goal) => {
      const current = Number(goal.saved) || 0;
      const target = Number(goal.target) || 0;
      const monthly = Number(goal.monthly) || 0;

      const progress =
        target > 0
          ? Math.min(
              100,
              Math.round((current / target) * 100)
            )
          : 0;

      const remaining = Math.max(0, target - current);

      const estimatedMonths =
        monthly > 0
          ? Math.ceil(remaining / monthly)
          : null;

      return {
        id: goal.id,

        name: goal.name,

        current,

        target,

        monthly,

        color: goal.color,

        progress,

        remaining,

        estimatedMonths,

        status:
          progress >= 100
            ? "Completed"
            : progress >= 75
            ? "On Track"
            : progress >= 40
            ? "In Progress"
            : "Getting Started",
      };
    });
  }

  static totalSaved(goals = []) {
    return goals.reduce(
      (sum, goal) => sum + goal.current,
      0
    );
  }

  static totalTarget(goals = []) {
    return goals.reduce(
      (sum, goal) => sum + goal.target,
      0
    );
  }
}

export default GoalEngine;
