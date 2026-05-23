/**
 * StatBadge.jsx
 * Small colored badge / chip for labels, statuses, and types.
 */

import { colors, radii, typography } from "../../ui/designTokens";

export default function StatBadge({
  label,
  color      = colors.pink,
  bg         = colors.pinkPale,
  border     = null,
  icon       = null,
  size       = "sm",   // "xs" | "sm" | "md"
  style      = {},
}) {
  const sizeStyles = {
    xs: { fontSize: "9px",  padding: "2px 7px",  gap: "3px" },
    sm: { fontSize: "10px", padding: "3px 9px",  gap: "4px" },
    md: { fontSize: "12px", padding: "4px 11px", gap: "5px" },
  };

  const s = sizeStyles[size] || sizeStyles.sm;

  return (
    <div style={{
      display:         "inline-flex",
      alignItems:      "center",
      gap:             s.gap,
      padding:         s.padding,
      borderRadius:    radii.full,
      backgroundColor: bg,
      border:          `1.5px solid ${border ?? color + "40"}`,
      fontSize:        s.fontSize,
      fontWeight:      typography.bold,
      color,
      letterSpacing:   "0.05em",
      textTransform:   "uppercase",
      whiteSpace:      "nowrap",
      ...style,
    }}>
      {icon && <span style={{ fontSize: parseInt(s.fontSize) + 1 + "px" }}>{icon}</span>}
      {label}
    </div>
  );
}
