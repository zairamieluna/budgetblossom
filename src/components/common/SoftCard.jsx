/**
 * SoftCard.jsx
 * Reusable soft card wrapper used across all pages.
 *
 * Variants: "base" | "soft" | "highlight" | "ghost"
 * Optionally clickable (adds hover lift + cursor pointer).
 */

import { useState } from "react";
import { colors, radii, shadows, transitions } from "../../ui/designTokens";

const VARIANT_STYLES = {
  base: {
    backgroundColor: colors.bgCard,
    border:          `1.5px solid ${colors.border}`,
    boxShadow:       shadows.card,
  },
  soft: {
    backgroundColor: colors.bgWarm,
    border:          `1.5px solid ${colors.borderSoft}`,
    boxShadow:       shadows.xs,
  },
  highlight: {
    backgroundColor: colors.pinkPale,
    border:          `1.5px solid ${colors.pinkLight}`,
    boxShadow:       shadows.md,
  },
  ghost: {
    backgroundColor: "transparent",
    border:          `1.5px dashed ${colors.border}`,
    boxShadow:       "none",
  },
  gold: {
    backgroundColor: colors.goldPale,
    border:          `1.5px solid ${colors.goldLight}`,
    boxShadow:       shadows.xs,
  },
  teal: {
    backgroundColor: colors.tealPale,
    border:          `1.5px solid ${colors.teal}40`,
    boxShadow:       shadows.xs,
  },
};

export default function SoftCard({
  children,
  variant    = "base",
  onClick,
  padding    = "20px",
  radius     = radii.xl,
  style      = {},
  className  = "",
  animDelay  = 0,
  noAnimate  = false,
}) {
  const [hovered, setHovered] = useState(false);
  const isClickable = !!onClick;

  const base = VARIANT_STYLES[variant] || VARIANT_STYLES.base;

  return (
    <div
      className={`${noAnimate ? "" : "fade-up"} ${className}`}
      onClick={onClick}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => isClickable && setHovered(false)}
      style={{
        ...base,
        borderRadius:     radius,
        padding,
        cursor:           isClickable ? "pointer" : "default",
        transform:        isClickable && hovered ? "translateY(-2px)" : "none",
        transition:       `transform ${transitions.base}, box-shadow ${transitions.base}`,
        boxShadow:        isClickable && hovered ? shadows.md : base.boxShadow,
        animationDelay:   `${animDelay}s`,
        position:         "relative",
        overflow:         "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
