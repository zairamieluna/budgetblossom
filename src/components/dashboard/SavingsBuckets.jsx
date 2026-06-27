/**
 * SavingsBuckets.jsx
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

export default function SavingsBuckets({
  buckets = [],
}) {
  if (buckets.length === 0) return null;

  return (
    <div
      className="fade-up"
      style={{
        animationDelay: "0.08s",
        marginBottom: "16px",
      }}
    >
      <h2
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: colors.textMuted,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        Savings Buckets

        <span
          style={{
            flex: 1,
            height: "1px",
            backgroundColor: colors.border,
          }}
        />
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {buckets.map((bucket) => (
          <SoftCard
            key={bucket.id}
            variant="base"
            padding="14px 16px"
            noAnimate
            style={{
              borderLeft: `4px solid ${bucket.color}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {bucket.label}
              </span>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                {bucket.pct !== null && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: bucket.color,
                    }}
                  >
                    {bucket.pct}%
                  </span>
                )}

                <span
                  style={{
                    fontSize: "10px",
                    color: colors.textMuted,
                    marginLeft: "6px",
                  }}
                >
                  {fmt(bucket.monthly)}/mo
                </span>
              </div>
            </div>

            {bucket.pct !== null ? (
              <>
                <ProgressBar
                  pct={bucket.pct}
                  color={bucket.color}
                  height="6px"
                  animDelay="0.3s"
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: colors.textMuted,
                    }}
                  >
                    {fmt(bucket.saved)} saved
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      color: colors.textMuted,
                    }}
                  >
                    Goal: {fmt(bucket.target)}
                  </span>
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: "11px",
                  color: colors.textMuted,
                }}
              >
                {fmt(bucket.saved)} saved so far
              </div>
            )}
          </SoftCard>
        ))}
      </div>
    </div>
  );
}
