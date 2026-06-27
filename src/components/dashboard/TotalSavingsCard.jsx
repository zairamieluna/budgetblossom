/**
 * TotalSavingsCard.jsx
 *
 * Budget Blossom
 */

import SoftCard from "../common/SoftCard";
import { colors, typography } from "../../ui/designTokens";

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

export default function TotalSavingsCard({
  totalSaved,
}) {
  return (
    <SoftCard
      variant="teal"
      padding="16px"
      noAnimate
      style={{
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontSize: "28px",
          }}
        >
          🫙
        </div>

        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: colors.tealDeep,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            Total Saved (All Time)
          </div>

          <div
            style={{
              fontFamily: typography.fontDisplay,
              fontSize: "26px",
              fontWeight: 700,
              color: colors.tealDeep,
              letterSpacing: "-0.02em",
            }}
          >
            {fmt(totalSaved)}
          </div>
        </div>
      </div>
    </SoftCard>
  );
}
