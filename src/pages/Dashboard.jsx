/**
 * Dashboard.jsx
 * Financial summary — fixed income calc, savings buckets, AI Coach.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const fmt = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);

// ── AI Coach ──────────────────────────────────────────────────────────────────
function AICoach({ rawData }) {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hi! 👋 I'm your Budget Bloom AI Coach. Ask me anything about your finances — spending habits, saving tips, or how to hit your goals!" }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const apiKey = rawData?.openAIKey ?? "";

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    if (!apiKey) {
      setMessages(m => [...m,
        { role:"user", content:q },
        { role:"assistant", content:"⚠️ No OpenAI key found. Add your key in Settings to use the AI Coach." }
      ]);
      setInput("");
      return;
    }

    // Build financial context
    const incomes  = rawData?.incomes  ?? [];
    const expenses = rawData?.expenses ?? [];
    const savings  = rawData?.savings  ?? [];
    const cards    = rawData?.cards    ?? [];
    const goals    = rawData?.goals    ?? [];

    const monthlyIncome = incomes.reduce((s, i) => {
      if (i.type === "manual") return s + (Number(i.amount) || 0);
      const weekly = (Number(i.hoursPerWeek) || 0) * (Number(i.hourlyRate) || 0);
      return s + (i.frequency === "biweekly" ? weekly * 26 / 12 :
                  i.frequency === "weekly"   ? weekly * 52 / 12 : weekly * 4.33);
    }, 0);

    const monthlyExpenses = expenses.filter(e => e.recurring || e.recur === "monthly")
      .reduce((s, e) => s + (Number(e.amount || e.amt) || 0), 0);

    const context = `
You are a friendly, encouraging personal finance coach for Budget Bloom app.
User's financial snapshot:
- Monthly income: $${monthlyIncome.toFixed(2)} CAD
- Monthly recurring expenses: $${monthlyExpenses.toFixed(2)} CAD
- Monthly leftover: $${(monthlyIncome - monthlyExpenses).toFixed(2)} CAD
- Savings buckets: ${savings.map(s=>`${s.name} ($${s.saved} saved of $${s.target} goal, $${s.monthly}/mo)`).join(", ") || "none"}
- Credit cards: ${cards.map(c=>`${c.label} balance $${c.balance} limit $${c.limit}`).join(", ") || "none"}
- Goals: ${goals.map(g=>`${g.label} ($${g.saved}/$${g.target})`).join(", ") || "none"}
- Income sources: ${incomes.filter(i=>i.label&&i.id!==1779237062979).map(i=>i.label).join(", ")}

Be warm, concise, and practical. Use CAD dollars. Give actionable advice.
    `.trim();

    const newMessages = [...messages, { role:"user", content:q }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            { role:"system", content:context },
            ...newMessages.map(m => ({ role:m.role, content:m.content })),
          ],
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response. Try again!";
      setMessages(m => [...m, { role:"assistant", content:reply }]);
    } catch {
      setMessages(m => [...m, { role:"assistant", content:"❌ Connection error. Check your API key in Settings." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SoftCard variant="base" noAnimate style={{ marginTop:"24px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
        <div style={{ width:"36px", height:"36px", borderRadius:"50%",
          background:`linear-gradient(135deg, ${colors.pinkDeep}, ${colors.mauve})`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>
          🌸
        </div>
        <div>
          <div style={{ fontFamily:typography.fontDisplay, fontSize:"15px", fontWeight:700, color:colors.text }}>AI Finance Coach</div>
          <div style={{ fontSize:"11px", color:colors.textMuted }}>Powered by your data</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"12px",
        maxHeight:"280px", overflowY:"auto", paddingRight:"4px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role==="user" ? "flex-end" : "flex-start",
            maxWidth:"85%",
            background: m.role==="user" ? colors.pinkDeep : colors.bgDeep,
            color: m.role==="user" ? "#fff" : colors.text,
            padding:"9px 13px", borderRadius:"12px",
            borderBottomRightRadius: m.role==="user" ? "3px" : "12px",
            borderBottomLeftRadius:  m.role==="assistant" ? "3px" : "12px",
            fontSize:"13px", lineHeight:1.5,
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf:"flex-start", background:colors.bgDeep,
            padding:"9px 13px", borderRadius:"12px", borderBottomLeftRadius:"3px",
            fontSize:"13px", color:colors.textMuted }}>
            Thinking… 🌸
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display:"flex", gap:"8px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send()}
          placeholder="Ask me anything about your budget…"
          style={{ flex:1, padding:"9px 12px",
            background:colors.bgDeep, border:`1.5px solid ${colors.border}`,
            borderRadius:"9px", fontFamily:typography.fontBody,
            fontSize:"13px", color:colors.text, outline:"none" }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding:"9px 16px", borderRadius:"9px",
            background: (!loading && input.trim()) ? colors.pinkDeep : colors.bgDeep,
            border:"none", color: (!loading && input.trim()) ? "#fff" : colors.textFaint,
            fontWeight:700, fontSize:"13px", cursor: loading ? "default" : "pointer",
            transition:`all ${transitions.base}` }}>
          Send
        </button>
      </div>
    </SoftCard>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data, error:e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (cancelled) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob==="string"?JSON.parse(blob):blob??null);
      } catch(err) { if(!cancelled) setError(err.message||"Failed to load"); }
      finally      { if(!cancelled) setLoading(false); }
    }
    load(); return ()=>{cancelled=true;};
  }, []);

  const stats = useMemo(() => {
    if (!rawData) return null;
    const incomes  = rawData.incomes  ?? [];
    const expenses = rawData.expenses ?? [];
    const savings  = rawData.savings  ?? [];
    const goals    = rawData.goals    ?? [];

    // ── Fixed income calculation ─────────────────────────────────────────────
    const monthlyIncome = incomes
      .filter(i => i.label && i.id !== 1779237062979) // exclude test entry
      .reduce((s, i) => {
        if (i.type === "manual") return s + (Number(i.amount) || 0);
        const weekly = (Number(i.hoursPerWeek) || 0) * (Number(i.hourlyRate) || 0);
        const monthly =
          i.frequency === "biweekly" ? weekly * 26 / 12 :
          i.frequency === "weekly"   ? weekly * 52 / 12 :
          weekly * 4.33;
        return s + monthly;
      }, 0);

    // ── Recurring expenses (new format: amt, old format: amount) ─────────────
    const monthlyExpenses = expenses
      .filter(e => e.recurring || e.recur === "monthly")
      .reduce((s, e) => s + (Number(e.amount || e.amt) || 0), 0);

    const leftover   = monthlyIncome - monthlyExpenses;
    const totalSaved = savings.reduce((s, b) => s + (Number(b.saved) || 0), 0);

    // Savings bucket progress
    const savingsBuckets = savings.map(b => ({
      id:      b.id,
      label:   b.name,
      saved:   Number(b.saved)   || 0,
      target:  Number(b.target)  || 0,
      monthly: Number(b.monthly) || 0,
      color:   b.color || colors.pink,
      pct:     b.target > 0 ? Math.min(100, Math.round((Number(b.saved)||0) / Number(b.target) * 100)) : null,
    }));

    // Goals (legacy)
    const goalProgress = goals.map(g => ({
      label:  g.label,
      pct:    Math.min(100, Math.round((Number(g.saved)||0)/(Number(g.target)||1)*100)),
      saved:  Number(g.saved)  || 0,
      target: Number(g.target) || 0,
      color:  g.color || colors.pink,
    }));

    return { monthlyIncome, monthlyExpenses, leftover, totalSaved, savingsBuckets, goalProgress };
  }, [rawData]);

  const name = rawData?.profile?.name;

  return (
    <div style={{ minHeight:"100vh", backgroundColor:colors.bg, fontFamily:typography.fontBody,
      color:colors.text, paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px", margin:"0 auto", padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"13px", color:colors.textMuted, marginBottom:"4px" }}>
            {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})}
          </p>
          <h1 style={{ fontFamily:typography.fontDisplay, fontSize:"28px", fontWeight:700,
            color:colors.text, letterSpacing:"-0.03em", lineHeight:1.1 }}>
            {name ? `Hi, ${name} 👋` : "Dashboard"}
          </h1>
        </div>

        {loading && <LoadingSpinner message="Loading…" />}
        {error   && (
          <SoftCard variant="highlight" style={{ marginBottom:"16px", color:colors.pinkDeep, fontSize:"13px" }}>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && stats && (
          <>
            {/* Leftover hero */}
            <SoftCard variant="highlight" style={{ marginBottom:"16px", textAlign:"center" }} noAnimate>
              <p style={{ fontSize:"11px", fontWeight:700, color:colors.pinkDeep,
                letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>
                Monthly Leftover
              </p>
              <p style={{ fontFamily:typography.fontDisplay, fontSize:"40px", fontWeight:700,
                color: stats.leftover >= 0 ? colors.pinkDeep : colors.critical,
                letterSpacing:"-0.03em", lineHeight:1 }}>
                {fmt(stats.leftover)}
              </p>
              <p style={{ fontSize:"12px", color:colors.textMuted, marginTop:"6px" }}>
                after all bills & expenses
              </p>
            </SoftCard>

            {/* Income / Bills */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"16px" }}>
              {[
                { label:"Income", value:fmt(stats.monthlyIncome),   color:colors.gold, emoji:"💛" },
                { label:"Bills",  value:fmt(stats.monthlyExpenses),  color:colors.pink, emoji:"📄" },
              ].map(({label,value,color,emoji}) => (
                <SoftCard key={label} variant="base" padding="14px 12px" noAnimate style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"18px", marginBottom:"4px" }}>{emoji}</div>
                  <div style={{ fontSize:"10px", fontWeight:700, color:colors.textMuted,
                    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"2px" }}>{label}</div>
                  <div style={{ fontFamily:typography.fontDisplay, fontSize:"16px", fontWeight:700, color }}>{value}</div>
                </SoftCard>
              ))}
            </div>

            {/* Total Saved */}
            <SoftCard variant="teal" padding="16px" noAnimate style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ fontSize:"28px" }}>🫙</div>
                <div>
                  <div style={{ fontSize:"10px", fontWeight:700, color:colors.tealDeep,
                    letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"2px" }}>Total Saved</div>
                  <div style={{ fontFamily:typography.fontDisplay, fontSize:"26px", fontWeight:700,
                    color:colors.tealDeep, letterSpacing:"-0.02em" }}>{fmt(stats.totalSaved)}</div>
                </div>
              </div>
            </SoftCard>

            {/* Savings buckets */}
            {stats.savingsBuckets.length > 0 && (
              <div className="fade-up" style={{ animationDelay:"0.08s", marginBottom:"16px" }}>
                <h2 style={{ fontSize:"11px", fontWeight:700, color:colors.textMuted,
                  letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px",
                  display:"flex", alignItems:"center", gap:"8px" }}>
                  Savings Buckets
                  <span style={{ flex:1, height:"1px", backgroundColor:colors.border }} />
                </h2>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {stats.savingsBuckets.map(b => (
                    <SoftCard key={b.id} variant="base" padding="14px 16px" noAnimate
                      style={{ borderLeft:`4px solid ${b.color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                        <span style={{ fontSize:"13px", fontWeight:600, color:colors.text }}>{b.label}</span>
                        <div style={{ textAlign:"right" }}>
                          {b.pct !== null && (
                            <span style={{ fontSize:"12px", fontWeight:700, color:b.color }}>{b.pct}%</span>
                          )}
                          <span style={{ fontSize:"10px", color:colors.textMuted, marginLeft:"6px" }}>
                            {fmt(b.monthly)}/mo
                          </span>
                        </div>
                      </div>
                      {b.pct !== null && (
                        <>
                          <ProgressBar pct={b.pct} color={b.color} height="6px" animDelay="0.3s" />
                          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
                            <span style={{ fontSize:"10px", color:colors.textMuted }}>{fmt(b.saved)} saved</span>
                            <span style={{ fontSize:"10px", color:colors.textMuted }}>goal: {fmt(b.target)}</span>
                          </div>
                        </>
                      )}
                      {b.pct === null && (
                        <div style={{ fontSize:"11px", color:colors.textMuted }}>{fmt(b.saved)} saved so far</div>
                      )}
                    </SoftCard>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy goals */}
            {stats.goalProgress.length > 0 && (
              <div className="fade-up" style={{ animationDelay:"0.1s", marginBottom:"16px" }}>
                <h2 style={{ fontSize:"11px", fontWeight:700, color:colors.textMuted,
                  letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px",
                  display:"flex", alignItems:"center", gap:"8px" }}>
                  Savings Goals
                  <span style={{ flex:1, height:"1px", backgroundColor:colors.border }} />
                </h2>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {stats.goalProgress.map(g => (
                    <SoftCard key={g.label} variant="base" padding="14px 16px" noAnimate>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                        <span style={{ fontSize:"13px", fontWeight:600, color:colors.text }}>{g.label}</span>
                        <span style={{ fontSize:"12px", fontWeight:700, color:g.color }}>{g.pct}%</span>
                      </div>
                      <ProgressBar pct={g.pct} color={g.color} height="6px" animDelay="0.3s" />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
                        <span style={{ fontSize:"10px", color:colors.textMuted }}>{fmt(g.saved)} saved</span>
                        <span style={{ fontSize:"10px", color:colors.textMuted }}>goal: {fmt(g.target)}</span>
                      </div>
                    </SoftCard>
                  ))}
                </div>
              </div>
            )}

            {/* AI Coach */}
            <AICoach rawData={rawData} />
          </>
        )}
      </div>
    </div>
  );
}
