/**
 * LoadingSpinner.jsx
 * Soft pink loading spinner.
 */

import { colors } from "../../ui/designTokens";

export default function LoadingSpinner({
  size    = 32,
  color   = colors.pink,
  message = null,
}) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "12px",
      padding:        "48px 24px",
      color:          colors.textMuted,
      fontSize:       "13px",
    }}>
      <div style={{
        width:        `${size}px`,
        height:       `${size}px`,
        borderRadius: "50%",
        border:       `3px solid ${color}30`,
        borderTopColor: color,
        animation:    "spin 0.8s linear infinite",
      }} />
      {message && <span>{message}</span>}
    </div>
  );
}
