/**
 * FloatingActionButton.jsx
 *
 * Budget Blossom
 * Reusable Floating Action Button
 */

import { colors, transitions } from "../../ui/designTokens";

export default function FloatingActionButton({
  icon = "＋",
  label = "",
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        position: "fixed",
        right: 20,
        bottom: 90,
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",

        background: `linear-gradient(135deg, ${colors.pink}, ${colors.pinkDeep})`,

        color: "#fff",

        fontSize: 28,

        fontWeight: 700,

        boxShadow: "0 12px 30px rgba(0,0,0,.18)",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        transition: `all ${transitions.base}`,

        zIndex: 500,
      }}
    >
      {icon}
    </button>
  );
}
