/**
 * theme.js
 * Semantic theme layer built on top of designTokens.
 * Use this for component-level styling decisions.
 */

import { colors, typography, spacing, radii, shadows, transitions } from "./designTokens";

export const theme = {
  // Page wrapper
  page: {
    backgroundColor: colors.bg,
    fontFamily:      typography.fontBody,
    color:           colors.text,
    minHeight:       "100vh",
    paddingBottom:   spacing["16"],
  },

  // Section container
  container: {
    maxWidth:  "520px",
    margin:    "0 auto",
    padding:   `0 ${spacing["4"]}`,
  },

  // Cards
  card: {
    base: {
      backgroundColor: colors.bgCard,
      border:          `1.5px solid ${colors.border}`,
      borderRadius:    radii.xl,
      padding:         `${spacing["5"]} ${spacing["5"]}`,
      boxShadow:       shadows.card,
    },
    soft: {
      backgroundColor: colors.bgWarm,
      border:          `1.5px solid ${colors.borderSoft}`,
      borderRadius:    radii.xl,
      padding:         `${spacing["5"]} ${spacing["5"]}`,
      boxShadow:       shadows.xs,
    },
    highlight: {
      backgroundColor: colors.pinkPale,
      border:          `1.5px solid ${colors.pinkLight}`,
      borderRadius:    radii.xl,
      padding:         `${spacing["5"]} ${spacing["5"]}`,
      boxShadow:       shadows.md,
    },
  },

  // Typography
  text: {
    displayLg: {
      fontFamily:    typography.fontDisplay,
      fontSize:      typography["3xl"],
      fontWeight:    typography.bold,
      color:         colors.text,
      letterSpacing: "-0.03em",
      lineHeight:    typography.tight,
    },
    displayMd: {
      fontFamily:    typography.fontDisplay,
      fontSize:      typography["2xl"],
      fontWeight:    typography.semibold,
      color:         colors.text,
      letterSpacing: "-0.02em",
      lineHeight:    typography.snug,
    },
    heading: {
      fontSize:      typography.lg,
      fontWeight:    typography.semibold,
      color:         colors.text,
      letterSpacing: "-0.01em",
    },
    label: {
      fontSize:      typography.xs,
      fontWeight:    typography.semibold,
      color:         colors.textMuted,
      letterSpacing: "0.10em",
      textTransform: "uppercase",
    },
    body: {
      fontSize:      typography.base,
      fontWeight:    typography.normal,
      color:         colors.textSoft,
      lineHeight:    typography.normal_lh,
    },
    muted: {
      fontSize:      typography.sm,
      color:         colors.textMuted,
      fontWeight:    typography.normal,
    },
    amount: {
      fontFamily:    typography.fontDisplay,
      fontSize:      typography["2xl"],
      fontWeight:    typography.bold,
      letterSpacing: "-0.02em",
      lineHeight:    typography.tight,
    },
  },

  // Buttons
  button: {
    primary: {
      backgroundColor: colors.pink,
      color:           colors.white,
      border:          "none",
      borderRadius:    radii.full,
      padding:         `${spacing["3"]} ${spacing["6"]}`,
      fontSize:        typography.base,
      fontWeight:      typography.semibold,
      cursor:          "pointer",
      transition:      `all ${transitions.base}`,
      boxShadow:       shadows.sm,
    },
    secondary: {
      backgroundColor: colors.pinkPale,
      color:           colors.pinkDeep,
      border:          `1.5px solid ${colors.pinkLight}`,
      borderRadius:    radii.full,
      padding:         `${spacing["3"]} ${spacing["6"]}`,
      fontSize:        typography.base,
      fontWeight:      typography.semibold,
      cursor:          "pointer",
      transition:      `all ${transitions.base}`,
    },
    ghost: {
      backgroundColor: "transparent",
      color:           colors.textMuted,
      border:          `1.5px solid ${colors.border}`,
      borderRadius:    radii.full,
      padding:         `${spacing["2"]} ${spacing["4"]}`,
      fontSize:        typography.sm,
      fontWeight:      typography.medium,
      cursor:          "pointer",
      transition:      `all ${transitions.base}`,
    },
  },

  // Input
  input: {
    base: {
      backgroundColor: colors.bgWarm,
      border:          `1.5px solid ${colors.border}`,
      borderRadius:    radii.lg,
      padding:         `${spacing["3"]} ${spacing["4"]}`,
      fontSize:        typography.base,
      color:           colors.text,
      width:           "100%",
      outline:         "none",
      transition:      `border-color ${transitions.base}`,
      fontFamily:      typography.fontBody,
    },
  },

  // Bottom nav
  nav: {
    wrapper: {
      position:        "fixed",
      bottom:          0,
      left:            0,
      right:           0,
      backgroundColor: colors.bgCard,
      borderTop:       `1.5px solid ${colors.border}`,
      display:         "flex",
      justifyContent:  "space-around",
      alignItems:      "center",
      padding:         `${spacing["2"]} 0 ${spacing["3"]}`,
      zIndex:          400,
      boxShadow:       `0 -4px 20px rgba(200,80,100,0.08)`,
    },
    item: {
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      gap:            spacing["1"],
      padding:        `${spacing["1"]} ${spacing["3"]}`,
      borderRadius:   radii.lg,
      cursor:         "pointer",
      transition:     `all ${transitions.base}`,
      fontSize:       typography.xs,
      fontWeight:     typography.medium,
      color:          colors.textMuted,
      border:         "none",
      background:     "none",
      minWidth:       "56px",
    },
    itemActive: {
      color:          colors.pink,
      fontWeight:     typography.semibold,
    },
  },
};

export default theme;
