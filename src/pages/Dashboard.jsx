/**
 * Dashboard.jsx
 * Financial summary — period-filtered, no cross-period mixing.
 *
 * Rules:
 *  - Income: ONLY from rawData.sent[periodKey] for the selected period
 *  - Expenses: ONLY expenses with due dates inside the selected period
 *  - Remaining: income - expenses (no carryover, no cross-period data)
 *  - Period selector lets user browse any period
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const fmt = n =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
    .format(n);

// ── Period helpers ────────────────────────────────────────────────────────────
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildPeriods() {
  const out  = [];
  const year = 2026;
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    out.push({ k:`26${m}a`, lbl:`${MO[m]} 1–15`,          s:new Date(year,m,1),  e:new Date(year,m,15,23,59,59),      pd:new Date(year,m,7)  });
    out.push({ k:`26${m}b`, lbl:`${MO[m]} 16–${lastDay}`, s:new Date(year,m,16), e:new Date(year,m,lastDay,23,59,59), pd:new Date(year,m,22) });
  }
  return out;
}
const PERIODS = buildPeriods();

function currentPeriodIdx() {
  const now = new Date();
  const idx = PERIODS.findIndex(p => now >= p.s && now <= p.e);
  return idx >= 0 ? idx : Math.max(0, PERIODS.findIndex(p => p.s > now) - 1);
}

// ── Mood Tracker ─────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: "😊", label: "Happy",   value: "happy"   },
  { emoji: "😐", label: "Okay",    value: "okay"    },
  { emoji: "😔", label: "Sad",     value: "sad"     },
  { emoji: "😤", label: "Stressed",value: "stressed"},
  { emoji: "🥲", label: "Meh",     value: "meh"     },
];

function MoodTracker({ rawData, onSave, saving }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const existing = rawData?.moods?.[todayStr];
  const [selected, setSelected] = useState(existing ?? null);
  const [saved,    setSaved]    = useState(!!existing);

  async function pickMood(value) {
    setSelected(value);
    setSaved(false);
    const updated = {
      ...rawData,
      moods: { ...(rawData?.moods ?? {}), [todayStr]: value },
    };
    await onSave(updated);
    setSaved(true);
  }

  const currentMood = MOODS.find(m => m.value === selected);

  return (
    <SoftCard variant="base" noAnimate style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
            Today's Mood
          </div>
          <div style={{ fontSize: "12px", color: colors.textMuted }}>
            {saved && currentMood ? `Feeling ${currentMood.label} today 🌸` : "How are you feeling?"}
          </div>
        </div>
        {saved && currentMood && (
          <div style={{ fontSize: "28px", lineHeight: 1 }}>{currentMood.emoji}</div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => pickMood(m.value)}
            disabled={saving}
            title={m.label}
            style={{
              flex: 1,
              padding: "10px 4px",
              borderRadius: "10px",
              border: `2px solid ${selected === m.value ? colors.pinkDeep : colors.border}`,
              background: selected === m.value ? colors.pinkPale : colors.bgDeep,
              cursor: saving ? "default" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              transition: `all ${transitions.base}`,
              transform: selected === m.value ? "scale(1.08)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: "22px", lineHeight: 1 }}>{m.emoji}</span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: selected === m.value ? colors.pinkDeep : colors.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </SoftCard>
  );
}

// ── AI Coach ──────────────────────────────────────────────────────────────────
function AICoach({ rawData, periodIncome, periodExpenses }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! 👋 I'm your Budget Bloom AI Coach. Ask me anything about your finances — spending habits, saving tips, or how to hit your goals!" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const apiKey = rawData?.openAIKey ?? "";

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    if (!apiKey) {
      setMessages(m => [...m,
        { role: "user", content: q },
        { role: "assistant", content: "⚠️ No OpenAI key found. Add your key in Settings to use the AI Coach." }
      ]);
      setInput("");
      return;
    }

    const savings = rawData?.savings ?? [];
    const cards   = rawData?.cards   ?? [];
    const remaining = periodIncome - periodExpenses;

    const context = `
You are a friendly, encouraging personal finance coach for Budget Bloom app.
User's financial snapshot (current pay period — no estimates, no cross-period data):
- Confirmed income this period: $${periodIncome.toFixed(2)} CAD
- Total expenses this period: $${periodExpenses.toFixed(2)} CAD
- Remaining balance: $${remaining.toFixed(2)} CAD
- Savings buckets: ${savings.map(s => `${s.name} ($${s.saved} saved of $${s.target} goal, $${s.monthly}/mo)`).join(", ") || "none"}
- Credit cards: ${cards.map(c => `${c.label} balance $${c.balance} limit $${c.limit}`).join(", ") || "none"}

IMPORTANT: Only use data from the current period. Do not estimate or assume any additional income.
Be warm, concise, and practical. Use CAD dollars. Give actionable advice.
    `.trim();

    const newMessages = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model:      "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            { role: "system", content: context },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data  = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response. Try again!";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "❌ Connection error. Check your API key in Settings." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SoftCard variant="base" noAnimate style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${colors.pinkDeep}, ${colors.mauve})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px"
        }}>🌸</div>
        <div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize: "15px", fontWeight: 700, color: colors.text }}>AI Finance Coach</div>
          <div style={{ fontSize: "11px", color: colors.textMuted }}>Powered by your data</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf:             m.role === "user" ? "flex-end" : "flex-start",
            maxWidth:              "85%",
            background:            m.role === "user" ? colors.pinkDeep : colors.bgDeep,
            color:                 m.role === "user" ? "#fff" : colors.text,
            padding:               "9px 13px",
            borderRadius:          "12px",
            borderBottomRightRadius: m.role === "user"      ? "3px"  : "12px",
            borderBottomLeftRadius:  m.role === "assistant" ? "3px"  : "12px",
            fontSize:              "13px",
            lineHeight:            1.5,
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: colors.bgDeep, padding: "9px 13px", borderRadius: "12px", borderBottomLeftRadius: "3px", fontSize: "13px", color: colors.textMuted }}>
            Thinking… 🌸
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask me anything about your budget…"
          style={{
            flex: 1, padding: "9px 12px",
            background: colors.bgDeep, border: `1.5px solid ${colors.border}`,
            borderRadius: "9px", fontFamily: typography.fontBody,
            fontSize: "13px", color: colors.text, outline: "none"
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{
            padding: "9px 16px", borderRadius: "9px",
            background: (!loading && input.trim()) ? colors.pinkDeep : colors.bgDeep,
            border: "none", color: (!loading && input.trim()) ? "#fff" : colors.textFaint,
            fontWeight: 700, fontSize: "13px", cursor: loading ? "default" : "pointer",
            transition: `all ${transitions.base}`
          }}>
          Send
        </button>
      </div>
    </SoftCard>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData,   setRawData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [periodIdx, setPeriodIdx] = useState(currentPeriodIdx);

  async function saveData(updated) {
    setSaving(true);
    try {
      const { data: row } = await supabase.from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("id", row.id);
      setRawData(updated);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setSaving(false);
    }
  }

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

  const period = PERIODS[periodIdx];

  const stats = useMemo(() => {
    if (!rawData || !period) return null;

    const expenses = rawData.expenses ?? [];
    const savings  = rawData.savings  ?? [];
    const sent     = rawData.sent     ?? {};

    // ── INCOME: only from sent entries for THIS period ───────────────────────
    const periodSent    = sent[period.k] ?? [];
    const periodIncome  = periodSent.reduce((s, x) => s + (Number(x.amt) || 0), 0);

    // ── EXPENSES: only expenses with due dates inside THIS period ────────────
    const periodExpenseItems = expenses.filter(e => {
      if (!e.due) return false;
      const d = new Date(e.due + "T12:00:00");
      return d >= period.s && d <= period.e;
    });
    const periodExpensesTotal = periodExpenseItems.reduce((s, e) => s + (Number(e.amount || e.amt) || 0), 0);
    const paidTotal           = periodExpenseItems.filter(e => e.paid).reduce((s, e) => s + (Number(e.amount || e.amt) || 0), 0);
    const paidCount           = periodExpenseItems.filter(e => e.paid).length;

    // ── REMAINING: income minus expenses, no carryover ───────────────────────
    const remaining  = periodIncome - periodExpensesTotal;
    const totalSaved = savings.reduce((s, b) => s + (Number(b.saved) || 0), 0);

    const savingsBuckets = savings.map(b => ({
      id:      b.id,
      label:   b.name,
      saved:   Number(b.saved)   || 0,
      target:  Number(b.target)  || 0,
      monthly: Number(b.monthly) || 0,
      color:   b.color || colors.pink,
      pct:     b.target > 0 ? Math.min(100, Math.round((Number(b.saved) || 0) / Number(b.target) * 100)) : null,
    }));

    return {
      periodIncome,
      periodExpensesTotal,
      paidTotal,
      paidCount,
      totalExpenseCount: periodExpenseItems.length,
      remaining,
      totalSaved,
      savingsBuckets,
      sentCount: periodSent.length,
    };
  }, [rawData, period]);

  const name = rawData?.profile?.name;

  function movePeriod(dir) {
    setPeriodIdx(i => Math.max(0, Math.min(PERIODS.length - 1, i + dir)));
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: typography.fontBody, color: colors.text, paddingBottom: "80px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding: "40px 0 20px" }}>
          <p style={{ fontSize: "13px", color: colors.textMuted, marginBottom: "4px" }}>
            {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ fontFamily: typography.fontDisplay, fontSize: "28px", fontWeight: 700, color: colors.text, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {name ? `Hey ${name}! 🌸` : "Dashboard"}
          </h1>
        </div>

        {/* Mood Tracker */}
        {!loading && rawData && (
          <MoodTracker rawData={rawData} onSave={saveData} saving={saving} />
        )}

        {/* Period navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
          <button
            onClick={() => movePeriod(-1)}
            disabled={periodIdx === 0}
            style={{ background: colors.bgCard, border: `1.5px solid ${colors.border}`, borderRadius: "9px", padding: "7px 12px", fontWeight: 700, color: colors.textMuted, cursor: periodIdx === 0 ? "not-allowed" : "pointer", fontSize: "14px", opacity: periodIdx === 0 ? 0.4 : 1 }}>
            ‹
          </button>
          <div style={{ flex: 1, textAlign: "center", background: colors.bgCard, border: `1.5px solid ${colors.border}`, borderRadius: "9px", padding: "7px 10px", fontFamily: typography.fontDisplay, fontWeight: 700, fontSize: "14px", color: colors.text }}>
            {period?.lbl}
          </div>
          <button
            onClick={() => movePeriod(1)}
            disabled={periodIdx === PERIODS.length - 1}
            style={{ background: colors.bgCard, border: `1.5px solid ${colors.border}`, borderRadius: "9px", padding: "7px 12px", fontWeight: 700, color: colors.textMuted, cursor: periodIdx === PERIODS.length - 1 ? "not-allowed" : "pointer", fontSize: "14px", opacity: periodIdx === PERIODS.length - 1 ? 0.4 : 1 }}>
            ›
          </button>
        </div>

        {loading && <LoadingSpinner message="Loading…" />}
        {error && (
          <SoftCard variant="highlight" style={{ marginBottom: "16px", color: colors.pinkDeep, fontSize: "13px" }}>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && stats && (
          <>
            {/* No income notice */}
            {stats.sentCount === 0 && (
              <SoftCard variant="soft" padding="12px 16px" noAnimate style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", color: colors.textMuted, margin: 0 }}>
                  💡 No income sent to the Budget Pool for this period. Go to the <strong>Salary</strong> tab to log shifts.
                </p>
              </SoftCard>
            )}

            {/* Remaining hero */}
            <SoftCard variant="highlight" style={{ marginBottom: "16px", textAlign: "center" }} noAnimate>
              <p style={{ fontSize: "11px", fontWeight: 700, color: colors.pinkDeep, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
                Remaining Balance
              </p>
              <p style={{ fontFamily: typography.fontDisplay, fontSize: "40px", fontWeight: 700, color: stats.remaining >= 0 ? colors.pinkDeep : colors.critical, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {fmt(stats.remaining)}
              </p>
              <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "6px" }}>
                income − expenses for {period?.lbl}
              </p>
            </SoftCard>

            {/* Income / Expenses / Paid grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              {[
                {
                  label: "Income",
                  value: fmt(stats.periodIncome),
                  color: colors.gold,
                  emoji: "💛",
                  sub:   stats.sentCount > 0 ? `${stats.sentCount} entr${stats.sentCount === 1 ? "y" : "ies"} sent` : "nothing sent yet",
                },
                {
                  label: "Expenses",
                  value: fmt(stats.periodExpensesTotal),
                  color: colors.pink,
                  emoji: "📄",
                  sub:   `${stats.totalExpenseCount} bill${stats.totalExpenseCount !== 1 ? "s" : ""} this period`,
                },
                {
                  label: "Paid",
                  value: fmt(stats.paidTotal),
                  color: colors.teal ?? "#3a6b4e",
                  emoji: "✅",
                  sub:   `${stats.paidCount}/${stats.totalExpenseCount} paid`,
                },
              ].map(({ label, value, color, emoji, sub }) => (
                <SoftCard key={label} variant="base" padding="12px 10px" noAnimate style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "16px", marginBottom: "4px" }}>{emoji}</div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontFamily: typography.fontDisplay, fontSize: "14px", fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: "9px", color: colors.textMuted, marginTop: "3px" }}>{sub}</div>
                </SoftCard>
              ))}
            </div>

            {/* Expense progress bar */}
            {stats.periodExpensesTotal > 0 && (
              <SoftCard variant="base" padding="14px 16px" noAnimate style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, marginBottom: "8px" }}>
                  <span style={{ color: colors.text }}>Bills paid</span>
                  <span style={{ color: colors.textMuted }}>{fmt(stats.paidTotal)} / {fmt(stats.periodExpensesTotal)}</span>
                </div>
                <ProgressBar
                  pct={stats.periodExpensesTotal > 0 ? Math.round(stats.paidTotal / stats.periodExpensesTotal * 100) : 0}
                  color={colors.pink}
                  height="7px"
                  animDelay="0.2s"
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: colors.textMuted, marginTop: "6px" }}>
                  <span>{stats.paidCount} paid ✓</span>
                  <span>{stats.totalExpenseCount - stats.paidCount} pending · {fmt(stats.periodExpensesTotal - stats.paidTotal)}</span>
                </div>
              </SoftCard>
            )}

            {/* Total Saved */}
            <SoftCard variant="teal" padding="16px" noAnimate style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "28px" }}>🫙</div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: colors.tealDeep, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>Total Saved (All Time)</div>
                  <div style={{ fontFamily: typography.fontDisplay, fontSize: "26px", fontWeight: 700, color: colors.tealDeep, letterSpacing: "-0.02em" }}>{fmt(stats.totalSaved)}</div>
                </div>
              </div>
            </SoftCard>

            {/* Savings buckets */}
            {stats.savingsBuckets.length > 0 && (
              <div className="fade-up" style={{ animationDelay: "0.08s", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  Savings Buckets
                  <span style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {stats.savingsBuckets.map(b => (
                    <SoftCard key={b.id} variant="base" padding="14px 16px" noAnimate style={{ borderLeft: `4px solid ${b.color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: colors.text }}>{b.label}</span>
                        <div style={{ textAlign: "right" }}>
                          {b.pct !== null && <span style={{ fontSize: "12px", fontWeight: 700, color: b.color }}>{b.pct}%</span>}
                          <span style={{ fontSize: "10px", color: colors.textMuted, marginLeft: "6px" }}>{fmt(b.monthly)}/mo</span>
                        </div>
                      </div>
                      {b.pct !== null && (
                        <>
                          <ProgressBar pct={b.pct} color={b.color} height="6px" animDelay="0.3s" />
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                            <span style={{ fontSize: "10px", color: colors.textMuted }}>{fmt(b.saved)} saved</span>
                            <span style={{ fontSize: "10px", color: colors.textMuted }}>goal: {fmt(b.target)}</span>
                          </div>
                        </>
                      )}
                      {b.pct === null && <div style={{ fontSize: "11px", color: colors.textMuted }}>{fmt(b.saved)} saved so far</div>}
                    </SoftCard>
                  ))}
                </div>
              </div>
            )}

            {/* AI Coach */}
            <AICoach
              rawData={rawData}
              periodIncome={stats.periodIncome}
              periodExpenses={stats.periodExpensesTotal}
            />
          </>
        )}
      </div>
    </div>
  );
}
