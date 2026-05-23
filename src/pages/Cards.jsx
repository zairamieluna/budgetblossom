/**
 * Cards.jsx
 * Credit cards dashboard — V2 design, connected to Supabase user_data.
 * Tabs: CARDS | INSTALLMENTS
 */

import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, shadows, transitions } from "../ui/designTokens";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n ?? 0);

function utilizationColor(pct) {
  if (pct >= 70) return colors.pinkDeep;
  if (pct >= 40) return colors.gold;
  return colors.teal;
}

function dueDayStatus(dueDay) {
  if (!dueDay) return null;
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) due.setMonth(due.getMonth() + 1);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: "Overdue",   color: colors.pinkDeep, bg: "#fce0e8", icon: "🚨" };
  if (diff <= 3) return { label: "Due Soon",  color: colors.gold,     bg: colors.goldPale, icon: "⚠️" };
  return           { label: `Due in ${diff}d`, color: colors.teal,    bg: colors.tealPale, icon: "✓" };
}

// Assign a rich card color per card index
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #c0336a 0%, #e8557a 50%, #f07090 100%)",
  "linear-gradient(135deg, #1a5c3a 0%, #2d7a52 50%, #3a9060 100%)",
  "linear-gradient(135deg, #2a3580 0%, #4455b0 50%, #6070d0 100%)",
  "linear-gradient(135deg, #7a3080 0%, #a050a8 50%, #c070c0 100%)",
  "linear-gradient(135deg, #804020 0%, #b05830 50%, #d07040 100%)",
];

// ── CreditCardFace ────────────────────────────────────────────────────────────
function CreditCardFace({ card, index, onPayClick, onBalanceClick }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const utilPct  = card.limit > 0 ? Math.round((card.balance / card.limit) * 100) : 0;
  const status   = dueDayStatus(card.dueDay);

  return (
    <div className="fade-up" style={{ animationDelay: `${index * 0.08}s` }}>
      {/* Card face */}
      <div style={{
        background:   gradient,
        borderRadius: radii["2xl"],
        padding:      "22px 20px 18px",
        position:     "relative",
        overflow:     "hidden",
        boxShadow:    `0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)`,
        marginBottom: "1px",
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute", right: "-30px", bottom: "-30px",
          width: "140px", height: "140px", borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
        }} />
        <div style={{
          position: "absolute", right: "30px", bottom: "-50px",
          width: "100px", height: "100px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }} />

        {/* Card chip icon */}
        <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.95)", letterSpacing: "0.01em", marginBottom: "2px" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>
              {card.owner || ""}
            </div>
          </div>
          {/* Chip */}
          <div style={{
            width: "28px", height: "22px", borderRadius: "4px",
            background: "linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.15))",
            border: "1px solid rgba(255,255,255,0.3)",
          }} />
        </div>

        {/* Balance */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{
            fontFamily: typography.fontDisplay,
            fontSize: "28px", fontWeight: 700,
            color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1,
            marginBottom: "4px",
          }}>
            {fmt(card.balance)}
          </div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>
            Limit {fmt(card.limit)} · Available {fmt(card.limit - card.balance)} · {card.apr}% APR
          </div>
        </div>

        {/* Utilization bar */}
        <div style={{
          height: "3px", borderRadius: "99px",
          background: "rgba(255,255,255,0.2)",
          marginBottom: "14px", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${utilPct}%`,
            background: utilPct >= 70 ? "#ffb0b0" : utilPct >= 40 ? "#ffd080" : "#80ffcc",
            borderRadius: "99px",
            transition: `width 0.6s ${transitions.spring}`,
          }} />
        </div>

        {/* Actions row */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => onPayClick?.(card)}
            style={{
              padding: "7px 16px", borderRadius: radii.full,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#ffffff", fontSize: "11px", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
              transition: `all ${transitions.base}`,
              backdropFilter: "blur(4px)",
            }}
          >
            💳 Pay
          </button>
          <button
            onClick={() => onBalanceClick?.(card)}
            style={{
              padding: "7px 16px", borderRadius: radii.full,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#ffffff", fontSize: "11px", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
              transition: `all ${transitions.base}`,
              backdropFilter: "blur(4px)",
            }}
          >
            📊 Balance
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Due Day chip */}
            <div style={{
              padding: "4px 10px", borderRadius: radii.full,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.25)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Due Day</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{card.dueDay ?? "—"}</div>
            </div>
            {/* Min chip */}
            <div style={{
              padding: "4px 10px", borderRadius: radii.full,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.25)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Min</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>${card.minPayment}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary panel */}
      <div style={{
        background: colors.goldPale,
        border: `1px solid ${colors.goldLight}40`,
        borderRadius: `0 0 ${radii.xl} ${radii.xl}`,
        padding: "14px 20px",
        marginBottom: "20px",
      }}>
        <div style={{
          fontSize: "9px", fontWeight: 800, color: colors.gold,
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px",
        }}>
          {status?.icon ?? "📋"} PAYMENT SUMMARY
        </div>

        {[
          { label: "Balance Owing",       value: fmt(card.balance),     bold: false },
          { label: `Min Payment (${card.limit > 0 ? ((card.minPayment/card.limit)*100).toFixed(1) : "—"}%)`,
                                          value: fmt(card.minPayment),  bold: false },
          { label: "Due Date",            value: card.dueDay ? `Day ${card.dueDay}` : "—", bold: false },
          { label: "Utilization",         value: `${utilPct}%`,
            valueColor: utilizationColor(utilPct), bold: true },
          { label: "Available Credit",    value: fmt(card.limit - card.balance),
            valueColor: colors.teal, bold: false },
        ].map(({ label, value, valueColor, bold }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 0",
            borderBottom: `1px solid ${colors.goldLight}30`,
          }}>
            <span style={{ fontSize: "12px", color: colors.textSoft }}>{label}</span>
            <span style={{
              fontSize: "12px", fontWeight: bold ? 700 : 500,
              color: valueColor ?? colors.text,
            }}>{value}</span>
          </div>
        ))}

        {/* Status badge */}
        {status && (
          <div style={{
            marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", borderRadius: radii.full,
            background: status.bg, border: `1px solid ${status.color}30`,
          }}>
            <span style={{ fontSize: "10px" }}>{status.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: status.color, letterSpacing: "0.04em" }}>
              {status.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── InstallmentCard ───────────────────────────────────────────────────────────
function InstallmentCard({ item, index }) {
  const paidPct = item.total > 0 ? Math.round((item.paid / item.total) * 100) : 0;
  const remaining = item.total - item.paid;
  const monthsLeft = item.monthly > 0 ? Math.ceil(remaining / item.monthly) : null;

  return (
    <SoftCard variant="base" animDelay={index * 0.08} padding="18px 20px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize: "15px", fontWeight: 700, color: colors.text, marginBottom: "2px" }}>
            {item.label}
          </div>
          <div style={{ fontSize: "10px", color: colors.textMuted }}>
            Started {item.startDate ? new Date(item.startDate).toLocaleDateString("en-CA", { month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
        <div style={{
          padding: "5px 12px", borderRadius: radii.full,
          background: colors.mauvePale, border: `1px solid ${colors.mauve}40`,
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: colors.mauve }}>INST</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", color: colors.textMuted }}>Progress</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: colors.mauve }}>{paidPct}% paid</span>
        </div>
        <div style={{ height: "6px", background: colors.bgDeep, borderRadius: "99px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${paidPct}%`,
            background: `linear-gradient(90deg,${colors.mauve},${colors.pinkLight})`,
            borderRadius: "99px",
            transition: `width 0.6s ${transitions.spring}`,
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Total",     value: fmt(item.total) },
          { label: "Paid",      value: fmt(item.paid), color: colors.teal },
          { label: "Remaining", value: fmt(remaining), color: colors.pinkDeep },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: colors.bgDeep, borderRadius: radii.md,
            padding: "8px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: "9px", color: colors.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: color ?? colors.text }}>{value}</div>
          </div>
        ))}
      </div>

      {monthsLeft !== null && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: colors.textMuted, textAlign: "center" }}>
          ~{monthsLeft} month{monthsLeft !== 1 ? "s" : ""} left · {fmt(item.monthly)}/mo
        </div>
      )}
    </SoftCard>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cards() {
  const [rawData,  setRawData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState("cards");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (cancelled) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob === "string" ? JSON.parse(blob) : blob ?? null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const cards        = useMemo(() => rawData?.cards        ?? [], [rawData]);
  const installments = useMemo(() => rawData?.installments ?? [], [rawData]);

  const totalBalance  = useMemo(() => cards.reduce((s, c) => s + (c.balance ?? 0), 0), [cards]);
  const totalLimit    = useMemo(() => cards.reduce((s, c) => s + (c.limit   ?? 0), 0), [cards]);
  const totalMin      = useMemo(() => cards.reduce((s, c) => s + (c.minPayment ?? 0), 0), [cards]);
  const overallUtil   = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

  const TABS = [
    { id: "cards",        label: "CARDS" },
    { id: "installments", label: "INSTALLMENTS" },
  ];

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: colors.bg,
      fontFamily: typography.fontBody, color: colors.text,
      paddingBottom: "80px",
    }}>
      {/* Background blob */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "280px", height: "280px", borderRadius: "50%",
          background: "radial-gradient(circle,#f4c0d018 0%,transparent 70%)",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "520px", margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding: "40px 0 20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>
            Credit Cards
          </p>
          <h1 style={{
            fontFamily: typography.fontDisplay, fontSize: "30px", fontWeight: 700,
            color: colors.text, letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            Your Cards
          </h1>
        </div>

        {loading && <LoadingSpinner message="Loading cards…" />}
        {error && (
          <SoftCard variant="highlight" style={{ marginBottom: "20px", color: colors.pinkDeep, fontSize: "13px" }}>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && !error && (
          <>
            {/* Total Summary Card */}
            <SoftCard variant="base" padding="20px 22px" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "16px" }}>💳</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textSoft }}>Total CC Debt</span>
              </div>
              <div style={{
                fontFamily: typography.fontDisplay, fontSize: "32px", fontWeight: 700,
                color: colors.pinkDeep, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "6px",
              }}>
                {fmt(totalBalance)}
              </div>
              <div style={{ fontSize: "11px", color: colors.textMuted, marginBottom: "12px" }}>
                {cards.length} card{cards.length !== 1 ? "s" : ""} · Total min payments: {fmt(totalMin)}
              </div>

              {/* Overall utilization bar */}
              <div style={{ marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "10px", color: colors.textMuted }}>Overall Utilization</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: utilizationColor(overallUtil) }}>
                    {overallUtil}% of {fmt(totalLimit)}
                  </span>
                </div>
                <div style={{ height: "5px", background: colors.bgDeep, borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${overallUtil}%`,
                    background: `linear-gradient(90deg,${colors.pink},${colors.pinkDeep})`,
                    borderRadius: "99px",
                    transition: `width 0.6s ${transitions.spring}`,
                  }} />
                </div>
              </div>
            </SoftCard>

            {/* Tabs */}
            <div style={{
              display: "flex", gap: "0", marginBottom: "20px",
              borderBottom: `1.5px solid ${colors.border}`,
            }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "10px 18px",
                    border: "none", background: "transparent",
                    fontSize: "11px", fontWeight: 800,
                    letterSpacing: "0.1em",
                    color: tab === t.id ? colors.pink : colors.textMuted,
                    borderBottom: tab === t.id ? `2px solid ${colors.pink}` : "2px solid transparent",
                    marginBottom: "-1.5px",
                    cursor: "pointer",
                    transition: `all ${transitions.base}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* CARDS tab */}
            {tab === "cards" && (
              <div>
                {cards.length === 0 ? (
                  <SoftCard variant="ghost" style={{ textAlign: "center", padding: "40px", color: colors.textFaint, fontSize: "13px" }}>
                    No cards found. Add cards in Settings.
                  </SoftCard>
                ) : (
                  cards.map((card, i) => (
                    <CreditCardFace
                      key={card.id ?? card.label}
                      card={card}
                      index={i}
                    />
                  ))
                )}
              </div>
            )}

            {/* INSTALLMENTS tab */}
            {tab === "installments" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {installments.length === 0 ? (
                  <SoftCard variant="ghost" style={{ textAlign: "center", padding: "40px", color: colors.textFaint, fontSize: "13px" }}>
                    No installments found. Add them in Settings.
                  </SoftCard>
                ) : (
                  installments.map((item, i) => (
                    <InstallmentCard key={item.id ?? item.label} item={item} index={i} />
                  ))
                )}
              </div>
            )}

            {/* Footer note */}
            <div style={{
              marginTop: "28px", padding: "14px 16px",
              backgroundColor: colors.bgWarm,
              border: `1px dashed ${colors.border}`,
              borderRadius: radii.xl,
              fontSize: "12px", color: colors.textMuted,
              lineHeight: 1.6, textAlign: "center",
            }}>
              Keep utilization under 30% for a healthy credit score. 💕
            </div>
          </>
        )}
      </div>
    </div>
  );
}
