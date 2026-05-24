/**
 * BottomNav.jsx
 * Mobile-first bottom navigation bar.
 *
 * Change from previous version:
 *   - background, borderTop, active/inactive colors now read from CSS vars
 *     (--nav-bg, --nav-border, --nav-shadow, --nav-active, --nav-inactive)
 *     so the nav automatically reflects whichever theme is active.
 *   - Income tab added (carried from previous update).
 *   - No layout or spacing changes.
 */
import { typography, radii, transitions } from "../../ui/designTokens";

const NAV_ITEMS = [
  { id: "dashboard", label: "Home",     emoji: "🏠" },
  { id: "expenses",  label: "Expenses", emoji: "💸" },
  { id: "income",    label: "Income",   emoji: "💰" },
  { id: "cards",     label: "Cards",    emoji: "💳" },
  { id: "debts",     label: "Debts",    emoji: "📊" },
  { id: "calendar",  label: "Calendar", emoji: "📅" },
  { id: "settings",  label: "Settings", emoji: "⚙️"  },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav style={{
      position:        "fixed",
      bottom:          0,
      left:            0,
      right:           0,
      backgroundColor: "var(--nav-bg)",
      borderTop:       "1.5px solid var(--nav-border)",
      display:         "flex",
      justifyContent:  "space-around",
      alignItems:      "center",
      padding:         "6px 0 10px",
      zIndex:          400,
      boxShadow:       "var(--nav-shadow)",
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "3px",
              padding:        "4px 8px",
              borderRadius:   radii.lg,
              cursor:         "pointer",
              transition:     `all ${transitions.base}`,
              fontSize:       "9px",
              fontWeight:     isActive ? typography.bold : typography.medium,
              color:          isActive ? "var(--nav-active)" : "var(--nav-inactive)",
              border:         "none",
              background:     isActive ? "var(--primary-bg)" : "transparent",
              minWidth:       "44px",
              letterSpacing:  "0.04em",
              textTransform:  "uppercase",
            }}
          >
            <span style={{
              fontSize:   "20px",
              lineHeight: 1,
              filter:     isActive ? "none" : "grayscale(0.3) opacity(0.7)",
              transform:  isActive ? "scale(1.1)" : "scale(1)",
              transition: `transform ${transitions.base}`,
            }}>
              {item.emoji}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
