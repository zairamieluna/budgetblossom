/**
 * FinancialHealthCard.jsx
 *
 * Budget Blossom
 * Displays the user's overall Financial Health.
 */

import SoftCard from "../common/SoftCard";
import { colors, typography } from "../../ui/designTokens";

const RATING_COLORS = {
  Excellent: "#16A34A",
  Great: "#22C55E",
  Good: "#F59E0B",
  Fair: "#FB923C",
  "Needs Attention": "#EF4444",
};

export default function FinancialHealthCard({ health }) {
  if (!health) return null;

  const color =
    RATING_COLORS[health.rating] ||
    colors.pinkDeep;

  const metrics = [
    {
      label: "Bills",
      value: health.breakdown?.bills ?? 0,
    },
    {
      label: "Cash Flow",
      value: health.breakdown?.cashFlow ?? 0,
    },
    {
      label: "Goals",
      value: health.breakdown?.goals ?? 0,
    },
    {
      label: "Debt",
      value: health.breakdown?.debt ?? 0,
    },
  ];

  return (
    <SoftCard
      variant="highlight"
      style={{
        marginBottom: "16px",
      }}
      noAnimate
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.textMuted,
              marginBottom: "4px",
            }}
          >
            🌸 Financial Health
          </div>

          <div
            style={{
              fontFamily: typography.fontDisplay,
              fontSize: "36px",
              fontWeight: 700,
              color,
              lineHeight: 1,
            }}
          >
            {health.score}
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color,
              marginTop: "4px",
            }}
          >
            {health.rating}
          </div>
        </div>

        <div
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            border: `8px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            fontWeight: 700,
            color,
            background: colors.bgCard,
          }}
        >
          {health.score}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {metrics.map((metric) => (
          <Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </SoftCard>
  );
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        background: colors.bgCard,
        borderRadius: "12px",
        padding: "10px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: colors.textMuted,
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: "6px",
          fontFamily: typography.fontDisplay,
          fontSize: "22px",
          fontWeight: 700,
          color: colors.text,
        }}
      >
        {value}/25
      </div>
    </div>
  );
}
