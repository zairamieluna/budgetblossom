/**
 * themes.js
 * All BudgetsBloom theme definitions.
 *
 * Structure:
 *  THEMES       — base theme CSS variable maps (5 themes)
 *  THEME_META   — display labels, emojis, preview swatches
 *  DEFAULT_THEME
 *  DEFAULT_CUSTOM  — advanced customization defaults
 *  RADIUS_MAP      — border radius presets
 *  SHADOW_MAP      — shadow intensity presets
 *  CARD_STYLE_MAP  — card style presets
 */

export const THEMES = {

  // ── 1. BudgetsBloom Pink — exact current palette ─────────────────────────
  pink: {
    "--ink":           "#1a0f1e",
    "--ink2":          "#2d1f35",
    "--paper":         "#fff5f9",
    "--card":          "#ffffff",
    "--line":          "#fce7f3",
    "--line2":         "#f9a8c9",
    "--dust":          "#9b6b8a",
    "--ghost":         "#d4a8c0",
    "--primary":       "#db2777",
    "--primary-lt":    "#f472b6",
    "--primary-bg":    "#fdf2f8",
    "--primary-bdr":   "#f9a8c9",
    "--pink":          "#db2777",
    "--pink-lt":       "#f472b6",
    "--pink-bg":       "#fdf2f8",
    "--pink-bdr":      "#f9a8c9",
    "--sage":          "#3a6b4e",
    "--sage-lt":       "#72aa88",
    "--sage-bg":       "#eaf3ee",
    "--sage-bdr":      "#9ecab0",
    "--gold":          "#a67c20",
    "--gold-lt":       "#deb84a",
    "--gold-bg":       "#faf5e6",
    "--gold-bdr":      "#dcca84",
    "--sky":           "#2860a0",
    "--sky-lt":        "#6a9fd4",
    "--sky-bg":        "#eaf1f9",
    "--sky-bdr":       "#9cc0e4",
    "--red":           "#c24b1a",
    "--red-bg":        "#fdf3f3",
    "--red-bdr":       "#f5a090",
    "--purple":        "#7c3aed",
    "--purple-bg":     "#f5f0ff",
    "--purple-bdr":    "#c4b5fd",
    "--nav-bg":        "#ffffff",
    "--nav-border":    "#fce7f3",
    "--nav-shadow":    "0 -4px 20px rgba(200,80,100,0.08)",
    "--nav-active":    "#db2777",
    "--nav-inactive":  "#9b6b8a",
    "--progress-track":"#fce7f3",
    "--sh":            "0 1px 4px rgba(26,15,30,.07), 0 4px 18px rgba(26,15,30,.07)",
    "--sh-lg":         "0 8px 32px rgba(26,15,30,.14)",
    "--r":             "14px",
    "--r-sm":          "9px",
  },

  // ── 2. Soft Neutral — cream, warm beige, stone ────────────────────────────
  neutral: {
    "--ink":           "#2c2520",
    "--ink2":          "#3d3530",
    "--paper":         "#faf7f4",
    "--card":          "#ffffff",
    "--line":          "#ede8e3",
    "--line2":         "#d9d0c7",
    "--dust":          "#8a7d74",
    "--ghost":         "#c4b8b0",
    "--primary":       "#8a6a52",
    "--primary-lt":    "#b89880",
    "--primary-bg":    "#f5efe9",
    "--primary-bdr":   "#d9c8ba",
    "--pink":          "#8a6a52",
    "--pink-lt":       "#b89880",
    "--pink-bg":       "#f5efe9",
    "--pink-bdr":      "#d9c8ba",
    "--sage":          "#5a7a5a",
    "--sage-lt":       "#85a885",
    "--sage-bg":       "#eef3ee",
    "--sage-bdr":      "#aac4aa",
    "--gold":          "#8a7040",
    "--gold-lt":       "#b89e6a",
    "--gold-bg":       "#f5f0e4",
    "--gold-bdr":      "#d4c494",
    "--sky":           "#4a6a8a",
    "--sky-lt":        "#7a9ab8",
    "--sky-bg":        "#eaf0f5",
    "--sky-bdr":       "#a8c0d4",
    "--red":           "#a04040",
    "--red-bg":        "#f8efef",
    "--red-bdr":       "#d4a0a0",
    "--purple":        "#7060a0",
    "--purple-bg":     "#f0eef8",
    "--purple-bdr":    "#b8b0d4",
    "--nav-bg":        "#faf7f4",
    "--nav-border":    "#ede8e3",
    "--nav-shadow":    "0 -4px 20px rgba(100,80,60,0.08)",
    "--nav-active":    "#8a6a52",
    "--nav-inactive":  "#8a7d74",
    "--progress-track":"#ede8e3",
    "--sh":            "0 1px 4px rgba(44,37,32,.06), 0 4px 18px rgba(44,37,32,.06)",
    "--sh-lg":         "0 8px 32px rgba(44,37,32,.12)",
    "--r":             "14px",
    "--r-sm":          "9px",
  },

  // ── 3. Sage Green — soft earthy greens ────────────────────────────────────
  sage: {
    "--ink":           "#152018",
    "--ink2":          "#243528",
    "--paper":         "#f4f8f5",
    "--card":          "#ffffff",
    "--line":          "#d8ece0",
    "--line2":         "#aed4bc",
    "--dust":          "#5a8268",
    "--ghost":         "#a0c4b0",
    "--primary":       "#2e7d52",
    "--primary-lt":    "#5aa87a",
    "--primary-bg":    "#edf7f1",
    "--primary-bdr":   "#9ecab0",
    "--pink":          "#2e7d52",
    "--pink-lt":       "#5aa87a",
    "--pink-bg":       "#edf7f1",
    "--pink-bdr":      "#9ecab0",
    "--sage":          "#2e7d52",
    "--sage-lt":       "#5aa87a",
    "--sage-bg":       "#edf7f1",
    "--sage-bdr":      "#9ecab0",
    "--gold":          "#7a6520",
    "--gold-lt":       "#b09040",
    "--gold-bg":       "#f5f0e0",
    "--gold-bdr":      "#d0c080",
    "--sky":           "#206070",
    "--sky-lt":        "#5090a0",
    "--sky-bg":        "#e8f4f6",
    "--sky-bdr":       "#90c0cc",
    "--red":           "#a04530",
    "--red-bg":        "#f8efec",
    "--red-bdr":       "#d4a090",
    "--purple":        "#6050a0",
    "--purple-bg":     "#eeecf8",
    "--purple-bdr":    "#b0a8d4",
    "--nav-bg":        "#ffffff",
    "--nav-border":    "#d8ece0",
    "--nav-shadow":    "0 -4px 20px rgba(20,80,40,0.08)",
    "--nav-active":    "#2e7d52",
    "--nav-inactive":  "#5a8268",
    "--progress-track":"#d8ece0",
    "--sh":            "0 1px 4px rgba(21,32,24,.07), 0 4px 18px rgba(21,32,24,.07)",
    "--sh-lg":         "0 8px 32px rgba(21,32,24,.13)",
    "--r":             "14px",
    "--r-sm":          "9px",
  },

  // ── 4. Lavender — soft lilac/purple ───────────────────────────────────────
  lavender: {
    "--ink":           "#1e1430",
    "--ink2":          "#2e2040",
    "--paper":         "#f8f5ff",
    "--card":          "#ffffff",
    "--line":          "#e8e0f8",
    "--line2":         "#ccc0f0",
    "--dust":          "#7868a8",
    "--ghost":         "#bab0d8",
    "--primary":       "#7c4dbe",
    "--primary-lt":    "#a87de0",
    "--primary-bg":    "#f2eeff",
    "--primary-bdr":   "#c4b5fd",
    "--pink":          "#7c4dbe",
    "--pink-lt":       "#a87de0",
    "--pink-bg":       "#f2eeff",
    "--pink-bdr":      "#c4b5fd",
    "--sage":          "#4a7a6a",
    "--sage-lt":       "#7aaa98",
    "--sage-bg":       "#eaf4f0",
    "--sage-bdr":      "#a8ccc0",
    "--gold":          "#8a6a28",
    "--gold-lt":       "#b89850",
    "--gold-bg":       "#f8f2e4",
    "--gold-bdr":      "#d4bc84",
    "--sky":           "#3858b0",
    "--sky-lt":        "#6888d4",
    "--sky-bg":        "#eceeff",
    "--sky-bdr":       "#a0b0e8",
    "--red":           "#b04050",
    "--red-bg":        "#faeef0",
    "--red-bdr":       "#d8a0a8",
    "--purple":        "#7c4dbe",
    "--purple-bg":     "#f2eeff",
    "--purple-bdr":    "#c4b5fd",
    "--nav-bg":        "#ffffff",
    "--nav-border":    "#e8e0f8",
    "--nav-shadow":    "0 -4px 20px rgba(100,60,180,0.08)",
    "--nav-active":    "#7c4dbe",
    "--nav-inactive":  "#7868a8",
    "--progress-track":"#e8e0f8",
    "--sh":            "0 1px 4px rgba(30,20,48,.07), 0 4px 18px rgba(30,20,48,.07)",
    "--sh-lg":         "0 8px 32px rgba(30,20,48,.13)",
    "--r":             "14px",
    "--r-sm":          "9px",
  },

  // ── 5. Dark Mode — cozy dark, soft contrast ───────────────────────────────
  dark: {
    "--ink":           "#f0eaf4",
    "--ink2":          "#d8d0e0",
    "--paper":         "#1a1520",
    "--card":          "#241e2c",
    "--line":          "#332840",
    "--line2":         "#4a3858",
    "--dust":          "#9888b0",
    "--ghost":         "#5a4870",
    "--primary":       "#e06090",
    "--primary-lt":    "#f090b8",
    "--primary-bg":    "#2e1f2c",
    "--primary-bdr":   "#6a304a",
    "--pink":          "#e06090",
    "--pink-lt":       "#f090b8",
    "--pink-bg":       "#2e1f2c",
    "--pink-bdr":      "#6a304a",
    "--sage":          "#5ab880",
    "--sage-lt":       "#80d4a0",
    "--sage-bg":       "#1c2e24",
    "--sage-bdr":      "#306848",
    "--gold":          "#d4a840",
    "--gold-lt":       "#e8c870",
    "--gold-bg":       "#2a2210",
    "--gold-bdr":      "#5a4818",
    "--sky":           "#60a0e0",
    "--sky-lt":        "#90c0f0",
    "--sky-bg":        "#182030",
    "--sky-bdr":       "#2a4868",
    "--red":           "#e07060",
    "--red-bg":        "#2a1810",
    "--red-bdr":       "#683020",
    "--purple":        "#a880e8",
    "--purple-bg":     "#201828",
    "--purple-bdr":    "#503880",
    "--nav-bg":        "#1e1828",
    "--nav-border":    "#332840",
    "--nav-shadow":    "0 -4px 20px rgba(0,0,0,0.30)",
    "--nav-active":    "#e06090",
    "--nav-inactive":  "#9888b0",
    "--progress-track":"#332840",
    "--sh":            "0 1px 4px rgba(0,0,0,.20), 0 4px 18px rgba(0,0,0,.20)",
    "--sh-lg":         "0 8px 32px rgba(0,0,0,.40)",
    "--r":             "14px",
    "--r-sm":          "9px",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const THEME_META = {
  pink:     { label: "BudgetsBloom Pink", emoji: "🌸", preview: ["#fff5f9", "#db2777", "#fce7f3"] },
  neutral:  { label: "Soft Neutral",      emoji: "🪵", preview: ["#faf7f4", "#8a6a52", "#ede8e3"] },
  sage:     { label: "Sage Green",        emoji: "🌿", preview: ["#f4f8f5", "#2e7d52", "#d8ece0"] },
  lavender: { label: "Lavender",          emoji: "💜", preview: ["#f8f5ff", "#7c4dbe", "#e8e0f8"] },
  dark:     { label: "Dark Mode",         emoji: "🌙", preview: ["#1a1520", "#e06090", "#332840"] },
};

export const DEFAULT_THEME = "pink";

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCED CUSTOMIZATION
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_CUSTOM = {
  accentColor:     null,       // null = use theme default; "#hex" to override
  borderRadius:    "default",  // "sharp" | "default" | "rounded"
  shadowIntensity: "default",  // "none" | "subtle" | "default" | "strong"
  cardStyle:       "default",  // "default" | "outlined" | "flat"
};

export const RADIUS_MAP = {
  sharp:   { "--r": "6px",  "--r-sm": "4px"  },
  default: null,             // use theme's own values
  rounded: { "--r": "22px", "--r-sm": "14px" },
};

export const SHADOW_MAP = {
  none:    { "--sh": "none", "--sh-lg": "none" },
  subtle:  { "--sh": "0 1px 3px rgba(0,0,0,.05)", "--sh-lg": "0 4px 16px rgba(0,0,0,.08)" },
  default: null,             // use theme's own values
  strong:  { "--sh": "0 2px 8px rgba(0,0,0,.14), 0 6px 24px rgba(0,0,0,.14)", "--sh-lg": "0 10px 40px rgba(0,0,0,.22)" },
};

export const CARD_STYLE_MAP = {
  default:  {},
  outlined: { "--card": "transparent" },
  flat:     { "--sh": "none", "--sh-lg": "none" },
};
