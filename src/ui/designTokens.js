/**
 * designTokens.js
 * Single source of truth for all visual design tokens.
 * Import this wherever you need colours, spacing, typography, or shadows.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg:            "#fdf6f8",
  bgDeep:        "#f9eef2",
  bgCard:        "#ffffff",
  bgWarm:        "#fff8fa",
  bgOverlay:     "rgba(253,246,248,0.92)",

  // ── Borders ───────────────────────────────────────────────────────────────
  border:        "#f0dce4",
  borderSoft:    "#f7e8ee",
  borderFocus:   "#e8708a",

  // ── Pink (primary) ────────────────────────────────────────────────────────
  pink:          "#e8708a",
  pinkLight:     "#f4a0b4",
  pinkPale:      "#fce8ee",
  pinkDeep:      "#c94d6a",
  pinkGlow:      "rgba(232,112,138,0.15)",

  // ── Rose (accent) ─────────────────────────────────────────────────────────
  rose:          "#f06080",
  rosePale:      "#fdedf1",

  // ── Mauve (secondary) ─────────────────────────────────────────────────────
  mauve:         "#c890b8",
  mauvePale:     "#f8eef6",
  mauveDeep:     "#9a6090",

  // ── Gold (income) ─────────────────────────────────────────────────────────
  gold:          "#e8a840",
  goldLight:     "#f4c870",
  goldPale:      "#fef6e4",
  goldDeep:      "#c07820",

  // ── Teal (savings / positive) ─────────────────────────────────────────────
  teal:          "#60b8a8",
  tealPale:      "#e8f7f4",
  tealDeep:      "#3a9080",

  // ── Risk / status ─────────────────────────────────────────────────────────
  low:           "#60b8a8",
  lowPale:       "#e8f7f4",
  medium:        "#e8a840",
  mediumPale:    "#fef6e4",
  high:          "#e8708a",
  highPale:      "#fce8ee",
  critical:      "#c94d6a",
  criticalPale:  "#fce0e8",

  // ── Text ──────────────────────────────────────────────────────────────────
  text:          "#3a2430",
  textSoft:      "#7a5868",
  textMuted:     "#b899a8",
  textFaint:     "#d4b8c4",
  textInverse:   "#ffffff",

  // ── Utility ───────────────────────────────────────────────────────────────
  white:         "#ffffff",
  black:         "#1a0a10",
  transparent:   "transparent",
};

export const typography = {
  fontDisplay: "'Playfair Display', 'Georgia', serif",
  fontBody:    "'DM Sans', 'Helvetica Neue', sans-serif",
  fontMono:    "'DM Mono', 'Courier New', monospace",

  // Scale
  xs:   "10px",
  sm:   "12px",
  base: "14px",
  md:   "15px",
  lg:   "17px",
  xl:   "20px",
  "2xl":"24px",
  "3xl":"28px",
  "4xl":"34px",

  // Weights
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,

  // Line heights
  tight:   1.1,
  snug:    1.3,
  normal_lh: 1.5,
  relaxed: 1.7,
};

export const spacing = {
  "0":  "0px",
  "1":  "4px",
  "2":  "8px",
  "3":  "12px",
  "4":  "16px",
  "5":  "20px",
  "6":  "24px",
  "8":  "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
};

export const radii = {
  sm:   "8px",
  md:   "12px",
  lg:   "16px",
  xl:   "20px",
  "2xl":"24px",
  "3xl":"32px",
  full: "9999px",
};

export const shadows = {
  xs:   "0 1px 4px rgba(200,80,100,0.06)",
  sm:   "0 2px 12px rgba(200,80,100,0.08)",
  md:   "0 4px 24px rgba(200,80,100,0.10)",
  lg:   "0 8px 40px rgba(200,80,100,0.13)",
  xl:   "0 16px 60px rgba(200,80,100,0.16)",
  glow: "0 0 0 3px rgba(232,112,138,0.20)",
  card: "0 2px 16px rgba(200,80,100,0.07), 0 1px 3px rgba(200,80,100,0.04)",
};

export const transitions = {
  fast:   "0.12s ease",
  base:   "0.18s ease",
  slow:   "0.28s ease",
  spring: "0.3s cubic-bezier(0.22,1,0.36,1)",
};

export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
  nav:     400,
};

// ── Semantic aliases ──────────────────────────────────────────────────────────
export const semantic = {
  income:  { color: colors.gold,     pale: colors.goldPale,     border: colors.goldDeep   + "40" },
  expense: { color: colors.pink,     pale: colors.pinkPale,     border: colors.pink        + "40" },
  debt:    { color: colors.rose,     pale: colors.rosePale,     border: colors.rose        + "40" },
  savings: { color: colors.teal,     pale: colors.tealPale,     border: colors.teal        + "40" },
  sub:     { color: colors.mauve,    pale: colors.mauvePale,    border: colors.mauve       + "40" },
  holiday: { color: colors.textMuted,pale: colors.bgDeep,       border: colors.border              },
};

// ── Google Fonts import string (paste into global CSS or <style>) ─────────────
export const googleFontsUrl =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap";

// ── CSS variables string (inject into :root) ──────────────────────────────────
export const cssVariables = `
  :root {
    --color-bg:           ${colors.bg};
    --color-bg-deep:      ${colors.bgDeep};
    --color-bg-card:      ${colors.bgCard};
    --color-border:       ${colors.border};
    --color-pink:         ${colors.pink};
    --color-pink-pale:    ${colors.pinkPale};
    --color-pink-deep:    ${colors.pinkDeep};
    --color-gold:         ${colors.gold};
    --color-gold-pale:    ${colors.goldPale};
    --color-teal:         ${colors.teal};
    --color-teal-pale:    ${colors.tealPale};
    --color-mauve:        ${colors.mauve};
    --color-text:         ${colors.text};
    --color-text-soft:    ${colors.textSoft};
    --color-text-muted:   ${colors.textMuted};
    --font-display:       ${typography.fontDisplay};
    --font-body:          ${typography.fontBody};
    --radius-lg:          ${radii.lg};
    --radius-xl:          ${radii.xl};
    --shadow-card:        ${shadows.card};
    --transition-base:    ${transitions.base};
  }
`;

export default {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
  zIndex,
  semantic,
  googleFontsUrl,
  cssVariables,
};
