/**
 * QuickActionsMenu.jsx
 *
 * Budget Blossom
 * Floating Quick Actions
 */

import { colors, transitions, typography } from "../../ui/designTokens";

const ACTIONS = [
  { id: "scan", label: "Smart Scan", icon: "📷" },
  { id: "expense", label: "Add Expense", icon: "💸" },
  { id: "income", label: "Add Income", icon: "💰" },
  { id: "card", label: "Update Card", icon: "💳" },
  { id: "saving", label: "Savings", icon: "🏦" },
  { id: "statement", label: "Import Statement", icon: "📄" },
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
          zIndex: 600,
        }}
      />

      {/* Menu */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 165,
          width: 260,
          background: colors.bgCard,
          borderRadius: 18,
          padding: 12,
          boxShadow: "0 16px 40px rgba(0,0,0,.18)",
          zIndex: 601,
        }}
      >
        <h3
          style={{
            marginTop: 4,
            marginBottom: 12,
            fontFamily: typography.fontDisplay,
          }}
        >
          Quick Actions
        </h3>

        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              onSelect?.(action.id);
              onClose?.();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 14px",
              border: "none",
              background: "transparent",
              borderRadius: 12,
              cursor: "pointer",
              transition: transitions.base,
              textAlign: "left",
              fontSize: 16,
            }}
          >
            <span style={{ fontSize: 24 }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}
