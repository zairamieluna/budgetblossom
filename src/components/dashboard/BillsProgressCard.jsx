/**
 * BillsProgressCard.jsx
 *
 * Budget Blossom
 */

import SoftCard from "../common/SoftCard";
import ProgressBar from "../common/ProgressBar";
import { colors } from "../../ui/designTokens";

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

export default function BillsProgressCard({
  paid,
  total,
  paidCount,
  totalCount,
}) {
  if (total <= 0) return null;

  const pct =
    total > 0
      ? Math.round((paid / total) * 100)
      : 0;

  return (
    <SoftCard
      variant="base"
      padding="14px 16px"
      noAnimate
      style={{
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        <span style={{ color: colors.text }}>
          Bills paid
        </span>

        <span style={{ color: colors.textMuted }}>
          {fmt(paid)} / {fmt(total)}
        </span>
      </div>

      <ProgressBar
        pct={pct}
        color={colors.pink}
        height="7px"
        animDelay="0.2s"
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: colors.textMuted,
          marginTop: "6px",
        }}
      >
        <span>
          {paidCount} paid ✓
        </span>

        <span>
          {totalCount - paidCount} pending ·{" "}
          {fmt(total - paid)}
        </span>
      </div>
    </SoftCard>
  );
}
