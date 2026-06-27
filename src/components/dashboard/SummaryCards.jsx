/**
 * SummaryCards.jsx
 *
 * Budget Blossom
 */

import SoftCard from "../common/SoftCard";
import { colors, typography } from "../../ui/designTokens";

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

export default function SummaryCards({
  income,
  expenses,
  paid,
  incomeCount,
  expenseCount,
  paidCount,
}) {
  const cards = [
    {
      label: "Income",
      value: income,
      color: colors.gold,
      emoji: "💛",
      sub:
        incomeCount > 0
          ? `${incomeCount} entr${
              incomeCount === 1 ? "y" : "ies"
            } sent`
          : "nothing sent yet",
    },
    {
      label: "Expenses",
      value: expenses,
      color: colors.pink,
      emoji: "📄",
      sub: `${expenseCount} bill${
        expenseCount !== 1 ? "s" : ""
      } this period`,
    },
    {
      label: "Paid",
      value: paid,
      color: colors.teal ?? "#3a6b4e",
      emoji: "✅",
      sub: `${paidCount}/${expenseCount} paid`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
        marginBottom: "16px",
      }}
    >
      {cards.map((card) => (
        <SoftCard
          key={card.label}
          variant="base"
          padding="12px 10px"
          noAnimate
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              marginBottom: "4px",
            }}
          >
            {card.emoji}
          </div>

          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: colors.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            {card.label}
          </div>

          <div
            style={{
              fontFamily:
                typography.fontDisplay,
              fontSize: "14px",
              fontWeight: 700,
              color: card.color,
            }}
          >
            {fmt(card.value)}
          </div>

          <div
            style={{
              fontSize: "9px",
              color: colors.textMuted,
              marginTop: "3px",
            }}
          >
            {card.sub}
          </div>
        </SoftCard>
      ))}
    </div>
  );
}
