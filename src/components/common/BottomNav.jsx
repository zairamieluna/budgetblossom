/**
 * BottomNav.jsx
 * Budget Blossom
 *
 * Main bottom navigation.
 *
 * Navigation:
 * Home → Dashboard
 * Income → Work Hours / Payroll / Paychecks
 * Expenses → Bills / Recurring Expenses
 * Credit Cards → Credit Card Tracker
 * Calendar → Work shifts / Paydays / Bills / Notes / Reminders
 * Goals → Savings / Financial Goals
 * More → Additional features / Settings
 */

import { typography, transitions } from "../../ui/designTokens";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Home",
    emoji: "🏠",
  },
  {
    id: "income",
    label: "Income",
    emoji: "💰",
  },
  {
    id: "expenses",
    label: "Expenses",
    emoji: "🧾",
  },
  {
    id: "cards",
    label: "Credit Cards",
    emoji: "💳",
  },
  {
    id: "calendar",
    label: "Calendar",
    emoji: "📅",
  },
  {
    id: "goals",
    label: "Goals",
    emoji: "🎯",
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
}) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: "64px",
        backgroundColor: "var(--nav-bg)",
        borderTop: "1.5px solid var(--nav-border)",
        boxShadow: "var(--nav-shadow)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        paddingTop: "4px",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        zIndex: 400,
        overflowX: "auto",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              flex: "1 1 0",
              minWidth: "0",
              height: "64px",
              padding: "6px 2px 4px",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              background: isActive
                ? "var(--primary-bg)"
                : "transparent",
              color: isActive
                ? "var(--nav-active)"
                : "var(--nav-inactive)",
              fontSize: "8px",
              fontWeight: isActive
                ? typography.bold
                : typography.medium,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              transition: `all ${transitions.base}`,
              touchAction: "manipulation",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: "19px",
                lineHeight: 1,
                transform: isActive
                  ? "scale(1.1)"
                  : "scale(1)",
                opacity: isActive ? 1 : 0.7,
                transition: `all ${transitions.base}`,
              }}
            >
              {item.emoji}
            </span>

            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
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
