/**
 * BlossomTipCard.jsx
 *
 * Budget Blossom — Dashboard Components
 *
 * Displays the single best tip from TipEngine.
 * The card shifts accent color based on tip type:
 *   warning      → amber
 *   success      → green
 *   encouragement → purple (brand primary)
 *   info         → blue
 *
 * Props:
 *   tip  {object} — TipEngine.generate() output
 *          { message, icon, type }
 */

import React from "react";

// Maps tip type to CSS modifier and accessible label
const TYPE_CONFIG = {
  warning: {
    modifier:    "bb-tip--warning",
    ariaLabel:   "Financial tip: action needed",
  },
  success: {
    modifier:    "bb-tip--success",
    ariaLabel:   "Financial tip: great work",
  },
  encouragement: {
    modifier:    "bb-tip--encouragement",
    ariaLabel:   "Financial tip",
  },
  info: {
    modifier:    "bb-tip--info",
    ariaLabel:   "Financial tip",
  },
};

export default function BlossomTipCard({ tip = null }) {
  if (!tip) return null;

  const { message, icon, type = "info" } = tip;
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

  return (
    <div
      className={`bb-card bb-tip-card ${config.modifier}`}
      role="complementary"
      aria-label={config.ariaLabel}
    >
      <div className="bb-tip-inner">
        {/* Icon */}
        <span className="bb-tip-icon" aria-hidden="true">
          {icon}
        </span>

        {/* Content */}
        <div className="bb-tip-content">
          <span className="bb-tip-eyebrow">
            Blossom Tip
          </span>
          <p className="bb-tip-message">{message}</p>
        </div>
      </div>
    </div>
  );
}
