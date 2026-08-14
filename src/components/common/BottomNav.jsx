/**
 * BottomNav.jsx
 * Budget Blossom
 *
 * Main bottom navigation.
 */

import { typography, transitions } from "../../ui/designTokens";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Home",
    emoji: "🏠",
  },
  {
    id: "money",
    label: "Money",
    emoji: "💳",
  },
  {
    id: "goals",
    label: "Goals",
    emoji: "🎯",
  },
  {
    id: "scan",
    label: "Scan",
    emoji: "📷",
  },
  {
    id: "more",
    label: "More",
    emoji: "☰",
  },
];

export default function BottomNav({
  activePage,
  onNavigate,
  onScan,
}) {
  function handleClick(item) {
    if (item.id === "scan") {
      onScan?.();
      return;
    }

    onNavigate?.(item.id);
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        backgroundColor: "var(--nav-bg)",
        borderTop: "1.5px solid var(--nav-border)",
        boxShadow: "var(--nav-shadow)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        zIndex: 400,
        boxSizing: "border-box",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          activePage === item.id ||
          (item.id === "money" &&
            ["money", "expenses", "income", "cards"].includes(
              activePage
            )) ||
          (item.id === "goals" &&
            ["goals", "savings", "forecast", "calendar"].includes(
              activePage
            )) ||
          (item.id === "more" &&
            activePage === "more");

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              flex: 1,
              height: "100%",
              padding: "6px 2px 4px",
              margin: 0,
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              background: isActive
                ? "var(--primary-bg)"
                : "transparent",
              color: isActive
                ? "var(--nav-active)"
                : "var(--nav-inactive)",
              fontSize: "9px",
              fontWeight: isActive
                ? typography.bold
                : typography.medium,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: `all ${transitions.base}`,
              position: "relative",
              zIndex: 401,
            }}
          >
            <span
              style={{
                fontSize: "20px",
                lineHeight: 1,
                transform: isActive
                  ? "scale(1.1)"
                  : "scale(1)",
                opacity: isActive ? 1 : 0.7,
                transition: `all ${transitions.base}`,
                pointerEvents: "none",
              }}
            >
              {item.emoji}
            </span>

            <span
              style={{
                pointerEvents: "none",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
