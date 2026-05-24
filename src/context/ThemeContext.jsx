/**
 * ThemeContext.jsx
 * Theme provider — applies base theme + customization overrides to :root.
 *
 * Exposes:
 *   theme      — active theme key ("pink" | "neutral" | "sage" | "lavender" | "dark")
 *   setTheme   — (key) => void  — switches + persists
 *   custom     — { accentColor, borderRadius, shadowIntensity, cardStyle }
 *   setCustom  — (partial) => void  — merges + persists
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  THEMES, DEFAULT_THEME, DEFAULT_CUSTOM,
  RADIUS_MAP, SHADOW_MAP, CARD_STYLE_MAP,
} from "../ui/themes";

const ThemeContext = createContext({
  theme:     DEFAULT_THEME,
  setTheme:  () => {},
  custom:    DEFAULT_CUSTOM,
  setCustom: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ─────────────────────────────────────────────────────────────────────────────
// DOM application
// ─────────────────────────────────────────────────────────────────────────────
function applyToDom(themeKey, custom = DEFAULT_CUSTOM) {
  const base = THEMES[themeKey] ?? THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  // 1. Base theme vars
  Object.entries(base).forEach(([k, v]) => root.style.setProperty(k, v));

  // 2. Border radius override
  const radii = RADIUS_MAP[custom.borderRadius];
  if (radii) Object.entries(radii).forEach(([k, v]) => root.style.setProperty(k, v));

  // 3. Shadow override
  const shadows = SHADOW_MAP[custom.shadowIntensity];
  if (shadows) Object.entries(shadows).forEach(([k, v]) => root.style.setProperty(k, v));

  // 4. Card style override
  const cardVars = CARD_STYLE_MAP[custom.cardStyle];
  if (cardVars) Object.entries(cardVars).forEach(([k, v]) => root.style.setProperty(k, v));

  // 5. Accent color override (replaces --primary and --pink family)
  if (custom.accentColor) {
    root.style.setProperty("--primary",     custom.accentColor);
    root.style.setProperty("--pink",        custom.accentColor);
    root.style.setProperty("--nav-active",  custom.accentColor);
  }

  root.setAttribute("data-theme", themeKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────
const LS_THEME  = "bb_theme";
const LS_CUSTOM = "bb_custom";

const readLS = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const writeLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = readLS(LS_THEME, DEFAULT_THEME);
    return (THEMES[saved] ? saved : DEFAULT_THEME);
  });

  const [custom, setCustomState] = useState(() =>
    ({ ...DEFAULT_CUSTOM, ...readLS(LS_CUSTOM, {}) })
  );

  // Apply immediately on first render (no flash)
  useEffect(() => { applyToDom(theme, custom); }, []); // eslint-disable-line

  // ── Load from Supabase on mount ──────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_data").select("data").limit(1).single();
        if (error || dead) return;
        const prefs = data?.data?.preferences ?? {};
        const savedTheme  = prefs.theme;
        const savedCustom = prefs.custom;
        const resolvedTheme  = (savedTheme && THEMES[savedTheme]) ? savedTheme : theme;
        const resolvedCustom = { ...DEFAULT_CUSTOM, ...(savedCustom ?? {}) };
        if (!dead) {
          applyToDom(resolvedTheme, resolvedCustom);
          writeLS(LS_THEME,  resolvedTheme);
          writeLS(LS_CUSTOM, resolvedCustom);
          setThemeState(resolvedTheme);
          setCustomState(resolvedCustom);
        }
      } catch { /* Supabase unavailable — localStorage already applied */ }
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line

  // ── Persist to Supabase ──────────────────────────────────────────────────
  const persistToSupabase = useCallback(async (newTheme, newCustom) => {
    try {
      const { data: row } = await supabase
        .from("user_data").select("id, data").limit(1).single();
      if (!row) return;
      const merged = {
        ...row.data,
        preferences: { ...(row.data?.preferences ?? {}), theme: newTheme, custom: newCustom },
      };
      await supabase.from("user_data").update({ data: merged }).eq("id", row.id);
    } catch { /* non-fatal */ }
  }, []);

  // ── setTheme ─────────────────────────────────────────────────────────────
  const setTheme = useCallback((newTheme) => {
    if (!THEMES[newTheme]) return;
    applyToDom(newTheme, custom);
    writeLS(LS_THEME, newTheme);
    setThemeState(newTheme);
    persistToSupabase(newTheme, custom);
  }, [custom, persistToSupabase]);

  // ── setCustom ────────────────────────────────────────────────────────────
  const setCustom = useCallback((partial) => {
    const next = { ...custom, ...partial };
    applyToDom(theme, next);
    writeLS(LS_CUSTOM, next);
    setCustomState(next);
    persistToSupabase(theme, next);
  }, [theme, custom, persistToSupabase]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, custom, setCustom }}>
      {children}
    </ThemeContext.Provider>
  );
}
