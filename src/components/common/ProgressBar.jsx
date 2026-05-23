/**
 * ProgressBar.jsx
 * Animated progress bar with label support.
 */

import { colors, radii } from "../../ui/designTokens";

export default function ProgressBar({
  pct        = 0,
  color      = colors.pink,
  bgColor    = colors.bgDeep,
  height     = "7px",
  radius     = radii.full,
  showLabel  = false,
  label      = null,
  animDelay  = "0.2s",
  style      = {},
}) {
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div style={{ width: "100%", ...style }}>
      {(showLabel || label) && (
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "6px",
        }}>
          {label && (
            <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 500 }}>
              {label}
            </span>
          )}
          {showLabel && (
            <span style={{ fontSize: "11px", color, fontWeight: 700 }}>
              {clampedPct}%
            </span>
          )}
        </div>
      )}

      <div style={{
        height,
        borderRadius: radius,
        backgroundColor: bgColor,
        overflow: "hidden",
        position: "relative",
      }}>
        <div
          style={{
            width:          `${clampedPct}%`,
            height:         "100%",
            borderRadius:   radius,
            background:     `linear-gradient(90deg, ${color}88, ${color})`,
            animation:      `barGrow 0.9s cubic-bezier(0.22,1,0.36,1) ${animDelay} both`,
            position:       "relative",
          }}
        >
          {/* Shimmer effect */}
          {clampedPct > 10 && (
            <div style={{
              position:   "absolute",
              top:        0, left: 0, bottom: 0,
              width:      "30%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              animation:  "shimmer 2s infinite",
            }} />
          )}
        </div>
      </div>
    </div>
  );
}
