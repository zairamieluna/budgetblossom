/**
 * QuickActionsMenu.jsx
 *
 * Budget Blossom
 * Premium Quick Actions
 */

import { colors, typography, transitions } from "../../ui/designTokens";

const ACTIONS = [
  {
    id: "scan",
    title: "Smart Scan",
    subtitle: "Receipt, Card, PDF",
    icon: "📷",
  },
  {
    id: "expense",
    title: "Expense",
    subtitle: "Add manually",
    icon: "💸",
  },
  {
    id: "income",
    title: "Income",
    subtitle: "Salary or payment",
    icon: "💰",
  },
  {
    id: "card",
    title: "Update Card",
    subtitle: "Credit card balance",
    icon: "💳",
  },
  {
    id: "saving",
    title: "Savings",
    subtitle: "Deposit money",
    icon: "🏦",
  },
  {
    id: "statement",
    title: "Statement",
    subtitle: "Import transactions",
    icon: "📄",
  },
];

export default function QuickActionsMenu({
  open,
  onClose,
  onSelect,
}) {
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.35)",
          backdropFilter: "blur(2px)",
          zIndex: 600,
        }}
      />

      {/* Menu */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 165,
          width: 300,
          borderRadius: 20,
          background: colors.bgCard,
          boxShadow: "0 18px 45px rgba(0,0,0,.18)",
          padding: 14,
          zIndex: 601,
        }}
      >
        <h2
          style={{
            margin: 6,
            marginBottom: 16,
            fontFamily: typography.fontDisplay,
            fontSize: 22,
          }}
        >
          Quick Actions
        </h2>

        {ACTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              onClose();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 14,
              border: "none",
              borderRadius: 14,
              background: "transparent",
              cursor: "pointer",
              transition: transitions.base,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: colors.pinkPale,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {item.icon}
            </div>

            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: .65,
                }}
              >
                {item.subtitle}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}