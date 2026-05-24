/**
 * BottomNav.jsx
 * Mobile-first bottom navigation bar.
 */
import { typography, transitions } from "../../ui/designTokens";

const NAV_ITEMS = [
  { id: "dashboard", label: "Home",     emoji: "🏠" },
  { id: "expenses",  label: "Expenses", emoji: "💸" },
  { id: "income",    label: "Income",   emoji: "💰" },
  { id: "cards",     label: "Cards",    emoji: "💳" },
  { id: "savings",   label: "Savings",  emoji: "🫙" },
  { id: "calendar",  label: "Calendar", emoji: "📅" },
  { id: "settings",  label: "Settings", emoji: "⚙️" },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav style={{
      position:        "fixed",
      bottom:          0,
      left:            0,
      right:           0,
      height:          "64px",
      backgroundColor: "var(--nav-bg)",
      borderTop:       "1.5px solid var(--nav-border)",
      boxShadow:       "var(--nav-shadow)",
      display:         "flex",
      justifyContent:  "space-around",
      alignItems:      "center",
      paddingBottom:   "env(safe-area-inset-bottom)",
      paddingLeft:     "env(safe-area-inset-left)",
      paddingRight:    "env(safe-area-inset-right)",
      zIndex:          400,
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
              justifyContent: "center",
              gap:            "2px",
              flex:           "1 1 0",
              height:         "100%",
              padding:        "6px 2px 4px",
              border:         "none",
              borderRadius:   "10px",
              cursor:         "pointer",
              background:     isActive ? "var(--primary-bg)" : "transparent",
              color:          isActive ? "var(--nav-active)" : "var(--nav-inactive)",
              fontSize:       "8.5px",
              fontWeight:     isActive ? typography.bold : typography.medium,
              letterSpacing:  "0.04em",
              textTransform:  "uppercase",
              transition:     `all ${transitions.base}`,
              overflow:       "hidden",
              whiteSpace:     "nowrap",
            }}
          >
            <span style={{
              fontSize:   "18px",
              lineHeight: 1,
              filter:     isActive ? "none" : "grayscale(0.3) opacity(0.65)",
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
