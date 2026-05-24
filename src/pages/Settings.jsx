/**
 * Settings.jsx
 * Settings page — profile info + theme selector + advanced customization.
 *
 * Changes from previous version:
 *  - Removed "Theme" row from Profile card (it now has its own section)
 *  - Added ThemeSection: 5-theme selector with preview swatches
 *  - Added AdvancedSection: accent color, border radius, shadow, card style
 *  - useTheme() wired to ThemeContext — all changes apply + persist instantly
 *  - Profile card and app info card are pixel-identical to before
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useTheme } from "../context/ThemeContext";
import { THEME_META, DEFAULT_CUSTOM } from "../ui/themes";
import { colors, typography, radii, transitions } from "../ui/designTokens";

// ─────────────────────────────────────────────────────────────────────────────
// THEME CARD  — one selectable theme tile
// ─────────────────────────────────────────────────────────────────────────────
function ThemeCard({ id, meta, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const [bg, accent, border] = meta.preview;

  return (
    <button
      onClick={() => onSelect(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            "8px",
        padding:        "12px 8px 10px",
        borderRadius:   "var(--r)",
        border:         isActive
          ? `2px solid var(--primary)`
          : `1.5px solid var(--line)`,
        background:     isActive ? "var(--primary-bg)" : "var(--card)",
        cursor:         "pointer",
        transition:     `all ${transitions.base}`,
        boxShadow:      isActive || hovered ? "var(--sh)" : "none",
        transform:      hovered && !isActive ? "translateY(-1px)" : "none",
        flex:           "1 1 0",
        minWidth:       0,
      }}
      aria-pressed={isActive}
      aria-label={meta.label}
    >
      {/* Swatch preview */}
      <div style={{
        width: "100%", height: "36px", borderRadius: "8px",
        background: bg, border: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "4px", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent }} />
        <div style={{ width: 18, height: 6, borderRadius: 3, background: border }} />
        <div style={{ width: 8,  height: 8, borderRadius: 2, background: accent, opacity: 0.5 }} />
      </div>

      {/* Emoji */}
      <span style={{ fontSize: "18px", lineHeight: 1 }}>{meta.emoji}</span>

      {/* Label */}
      <span style={{
        fontSize:   "10px",
        fontWeight: isActive ? 700 : 500,
        color:      isActive ? "var(--primary)" : "var(--dust)",
        textAlign:  "center",
        lineHeight: 1.2,
        letterSpacing: "0.01em",
      }}>
        {meta.label}
      </span>

      {/* Active check */}
      {isActive && (
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "9px", color: "#fff", fontWeight: 700,
        }}>✓</div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return (
    <h2 style={{
      fontSize: "11px", fontWeight: 700, color: "var(--dust)",
      letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px",
    }}>
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION ROW  — label + segmented control
// ─────────────────────────────────────────────────────────────────────────────
function OptionRow({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontSize: "12px", fontWeight: 600, color: "var(--ink)",
        marginBottom: "8px",
      }}>
        {label}
      </div>
      <div style={{
        display: "flex", gap: "6px", flexWrap: "wrap",
      }}>
        {options.map(opt => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding:      "6px 14px",
                borderRadius: "var(--r-sm)",
                border:       isActive ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
                background:   isActive ? "var(--primary-bg)" : "var(--card)",
                color:        isActive ? "var(--primary)" : "var(--dust)",
                fontSize:     "12px",
                fontWeight:   isActive ? 700 : 500,
                cursor:       "pointer",
                transition:   `all ${transitions.base}`,
                fontFamily:   typography.fontBase,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCENT COLOR PICKER
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { color: null,      label: "Theme default" },
  { color: "#db2777", label: "Pink"    },
  { color: "#7c3aed", label: "Purple"  },
  { color: "#2e7d52", label: "Green"   },
  { color: "#2860a0", label: "Blue"    },
  { color: "#a67c20", label: "Gold"    },
  { color: "#c24b1a", label: "Rust"    },
  { color: "#0891b2", label: "Teal"    },
];

function AccentPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px",
      }}>
        Accent Color
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {ACCENT_PRESETS.map(({ color, label }) => {
          const isActive = value === color;
          return (
            <button
              key={label}
              onClick={() => onChange(color)}
              title={label}
              style={{
                width:        color ? "28px" : "auto",
                height:       "28px",
                borderRadius: color ? "50%" : "var(--r-sm)",
                padding:      color ? 0 : "0 10px",
                background:   color ?? "var(--card)",
                border:       isActive
                  ? `3px solid var(--ink)`
                  : color
                    ? `2px solid transparent`
                    : `1.5px solid var(--line)`,
                cursor:       "pointer",
                fontSize:     "11px",
                fontWeight:   isActive ? 700 : 500,
                color:        color ? "#fff" : "var(--dust)",
                transition:   `all ${transitions.base}`,
                fontFamily:   typography.fontBase,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                boxShadow:    isActive ? "0 0 0 2px var(--primary-bg)" : "none",
              }}
            >
              {!color && (label)}
              {color && isActive && <span style={{ fontSize: "10px" }}>✓</span>}
            </button>
          );
        })}

        {/* Custom hex input */}
        <label style={{
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "11px", color: "var(--dust)", cursor: "pointer",
        }}>
          <input
            type="color"
            value={value ?? "#db2777"}
            onChange={e => onChange(e.target.value)}
            style={{
              width: "28px", height: "28px",
              borderRadius: "50%", border: "none",
              cursor: "pointer", padding: 0,
              background: "none",
            }}
            title="Custom color"
          />
          Custom
        </label>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { theme, setTheme, custom, setCustom } = useTheme();

  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase
          .from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (cancelled) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob === "string" ? JSON.parse(blob) : blob ?? null);
      } catch(err) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const profile = rawData?.profile ?? {};

  const profileRows = [
    { label: "Name",         value: profile.name        || "—", emoji: "👤" },
    { label: "Partner Name", value: profile.partnerName || "—", emoji: "💕" },
    { label: "Debt Method",  value: rawData?.debtMethod || "snowball", emoji: "💳" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--paper)",
      fontFamily: typography.fontBase,
      color: "var(--ink)",
      paddingBottom: "80px",
    }}>
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "0 16px" }}>

        {/* Page header */}
        <div className="fade-up" style={{ padding: "40px 0 24px" }}>
          <p style={{
            fontSize: "11px", fontWeight: 700, color: "var(--dust)",
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px",
          }}>App</p>
          <h1 style={{
            fontFamily: typography.fontDisplay, fontSize: "30px", fontWeight: 700,
            color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>Settings</h1>
        </div>

        {loading && <LoadingSpinner message="Loading settings…" />}
        {error && (
          <SoftCard variant="highlight" style={{ marginBottom: "16px", color: colors.pink, fontSize: "13px" }} noAnimate>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && (
          <>
            {/* ── Profile card ─────────────────────────────────────────── */}
            {rawData && (
              <SoftCard variant="base" style={{ marginBottom: "16px" }} noAnimate>
                <SectionHead>Profile</SectionHead>
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  {profileRows.map(({ label, value, emoji }, i) => (
                    <div
                      key={label}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 0",
                        borderBottom: i < profileRows.length - 1
                          ? `1px solid ${colors.borderSoft}`
                          : "none",
                      }}
                    >
                      <span style={{ fontSize: "18px", width: "28px", textAlign: "center" }}>
                        {emoji}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: "10px", fontWeight: 700, color: "var(--dust)",
                          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1px",
                        }}>{label}</div>
                        <div style={{
                          fontSize: "14px", fontWeight: 500, color: "var(--ink)",
                          textTransform: "capitalize",
                        }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SoftCard>
            )}

            {/* ── Theme selector ───────────────────────────────────────── */}
            <SoftCard variant="base" style={{ marginBottom: "16px" }} noAnimate>
              <SectionHead>Theme</SectionHead>

              {/* Theme tiles — 2 rows of up to 3 */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                {["pink","neutral","sage"].map(id => (
                  <ThemeCard
                    key={id}
                    id={id}
                    meta={THEME_META[id]}
                    isActive={theme === id}
                    onSelect={setTheme}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {["lavender","dark"].map(id => (
                  <ThemeCard
                    key={id}
                    id={id}
                    meta={THEME_META[id]}
                    isActive={theme === id}
                    onSelect={setTheme}
                  />
                ))}
                {/* Spacer to keep dark card same width as above */}
                <div style={{ flex: "1 1 0" }} />
              </div>

              <p style={{
                fontSize: "11px", color: "var(--dust)", marginTop: "12px", lineHeight: 1.5,
              }}>
                Theme preference is saved and restored on every visit.
              </p>
            </SoftCard>

            {/* ── Advanced customization ───────────────────────────────── */}
            <SoftCard variant="base" style={{ marginBottom: "16px" }} noAnimate>
              <SectionHead>Advanced Customization</SectionHead>

              <AccentPicker
                value={custom.accentColor}
                onChange={color => setCustom({ accentColor: color })}
              />

              <OptionRow
                label="Border Radius"
                value={custom.borderRadius ?? "default"}
                onChange={v => setCustom({ borderRadius: v })}
                options={[
                  { value: "sharp",   label: "Sharp" },
                  { value: "default", label: "Default" },
                  { value: "rounded", label: "Rounded" },
                ]}
              />

              <OptionRow
                label="Shadow Intensity"
                value={custom.shadowIntensity ?? "default"}
                onChange={v => setCustom({ shadowIntensity: v })}
                options={[
                  { value: "none",    label: "None" },
                  { value: "subtle",  label: "Subtle" },
                  { value: "default", label: "Default" },
                  { value: "strong",  label: "Strong" },
                ]}
              />

              <OptionRow
                label="Card Style"
                value={custom.cardStyle ?? "default"}
                onChange={v => setCustom({ cardStyle: v })}
                options={[
                  { value: "default",  label: "Filled" },
                  { value: "outlined", label: "Outlined" },
                  { value: "flat",     label: "Flat" },
                ]}
              />

              {/* Reset button */}
              <button
                onClick={() => setCustom(DEFAULT_CUSTOM)}
                style={{
                  marginTop: "4px",
                  padding: "8px 16px",
                  borderRadius: "var(--r-sm)",
                  border: "1.5px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--dust)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: typography.fontBase,
                  transition: `all ${transitions.base}`,
                }}
              >
                Reset to defaults
              </button>
            </SoftCard>

            {/* ── App info card — unchanged ────────────────────────────── */}
            <SoftCard variant="soft" style={{ textAlign: "center", padding: "20px" }} noAnimate>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌸</div>
              <div style={{
                fontFamily: typography.fontDisplay, fontSize: "18px", fontWeight: 700,
                color: "var(--primary)", marginBottom: "4px",
              }}>
                Budget Bloom
              </div>
              <div style={{ fontSize: "12px", color: "var(--dust)" }}>
                Your cozy personal finance companion
              </div>
            </SoftCard>
          </>
        )}
      </div>
    </div>
  );
}
