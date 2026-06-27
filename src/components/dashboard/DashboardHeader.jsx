/**
 * DashboardHeader.jsx
 *
 * Budget Blossom
 * Dashboard Header Component
 */

import { colors, typography } from "../../ui/designTokens";

export default function DashboardHeader({ name }) {
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fade-up"
      style={{
        padding: "40px 0 20px",
      }}
    >
      <p
        style={{
          fontSize: "13px",
          color: colors.textMuted,
          marginBottom: "4px",
        }}
      >
        {today}
      </p>

      <h1
        style={{
          fontFamily: typography.fontDisplay,
          fontSize: "28px",
          fontWeight: 700,
          color: colors.text,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        {name ? `Hey ${name}! 🌸` : "Dashboard"}
      </h1>
    </div>
  );
}
