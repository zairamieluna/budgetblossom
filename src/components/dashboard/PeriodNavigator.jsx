/**
 * PeriodNavigator.jsx
 *
 * Budget Blossom
 */

import { colors, typography } from "../../ui/designTokens";

export default function PeriodNavigator({
  period,
  periodIdx,
  totalPeriods,
  onPrevious,
  onNext,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "16px",
      }}
    >
      <button
        onClick={onPrevious}
        disabled={periodIdx === 0}
        style={{
          background: colors.bgCard,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "9px",
          padding: "7px 12px",
          fontWeight: 700,
          color: colors.textMuted,
          cursor:
            periodIdx === 0
              ? "not-allowed"
              : "pointer",
          fontSize: "14px",
          opacity:
            periodIdx === 0 ? 0.4 : 1,
        }}
      >
        ‹
      </button>

      <div
        style={{
          flex: 1,
          textAlign: "center",
          background: colors.bgCard,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "9px",
          padding: "7px 10px",
          fontFamily:
            typography.fontDisplay,
          fontWeight: 700,
          fontSize: "14px",
          color: colors.text,
        }}
      >
        {period?.lbl}
      </div>

      <button
        onClick={onNext}
        disabled={
          periodIdx === totalPeriods - 1
        }
        style={{
          background: colors.bgCard,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "9px",
          padding: "7px 12px",
          fontWeight: 700,
          color: colors.textMuted,
          cursor:
            periodIdx === totalPeriods - 1
              ? "not-allowed"
              : "pointer",
          fontSize: "14px",
          opacity:
            periodIdx === totalPeriods - 1
              ? 0.4
              : 1,
        }}
      >
        ›
      </button>
    </div>
  );
}
