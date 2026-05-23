/**
 * Dashboard.jsx
 * Financial summary dashboard — connected to Supabase user_data.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii } from "../ui/designTokens";

const fmt = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);

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
    const jars     = rawData.jars     ?? [];
    const goals    = rawData.goals    ?? [];

    // ── Monthly income (fixed multipliers) ──────────────────────────────────
    const monthlyIncome = incomes.reduce((s, i) => {
      if (i.type === "manual") return s + (Number(i.amount) || 0);
      const weekly = (Number(i.hoursPerWeek) || 0) * (Number(i.hourlyRate) || 0);
      const monthly =
        i.frequency === "biweekly" ? weekly * 26 / 12 :
        i.frequency === "weekly"   ? weekly * 52 / 12 :
        weekly * 4.33;
      return s + monthly;
    }, 0);

    // ── Recurring expenses only (debt payments already included here) ────────
    const monthlyExpenses = expenses
      .filter(e => e.recurring)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // ── Leftover (no separate debt subtraction — already in expenses) ────────
    const leftover   = monthlyIncome - monthlyExpenses;
    const totalSaved = jars.reduce((s, j) => s + (Number(j.saved) || 0), 0);

    const goalProgress = goals.map(g => ({
      label:  g.label,
      pct:    Math.min(100, Math.round((Number(g.saved) || 0) / (Number(g.target) || 1) * 100)),
      saved:  Number(g.saved)  || 0,
      target: Number(g.target) || 0,
      color:  g.color || colors.pink,
    }));

    return { monthlyIncome, monthlyExpenses, leftover, totalSaved, goalProgress };
  }, [rawData]);

  const name = rawData?.profile?.name;

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>

      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"13px",color:colors.textMuted,marginBottom:"4px" }}>
            {new Date().toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})}
          </p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"28px",fontWeight:700,
            color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>
            {name ? `Hi, ${name} 👋` : "Dashboard"}
          </h1>
        </div>

        {loading && <LoadingSpinner message="Loading…" />}
        {error   && (
          <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && stats && (
          <>
            {/* Leftover hero card */}
            <SoftCard variant="highlight" style={{ marginBottom:"16px",textAlign:"center" }} noAnimate>
              <p style={{ fontSize:"11px",fontWeight:700,color:colors.pinkDeep,
                letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"4px" }}>
                Monthly Leftover
              </p>
              <p style={{ fontFamily:typography.fontDisplay,fontSize:"40px",fontWeight:700,
                color:stats.leftover>=0?colors.pinkDeep:colors.critical,
                letterSpacing:"-0.03em",lineHeight:1 }}>
                {fmt(stats.leftover)}
              </p>
              <p style={{ fontSize:"12px",color:colors.textMuted,marginTop:"6px" }}>
                after all bills & expenses
              </p>
            </SoftCard>

            {/* Income / Expenses grid */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px" }}>
              {[
                { label:"Income",   value:fmt(stats.monthlyIncome),   color:colors.gold, emoji:"💛" },
                { label:"Bills",    value:fmt(stats.monthlyExpenses),  color:colors.pink, emoji:"📄" },
              ].map(({label,value,color,emoji}) => (
                <SoftCard key={label} variant="base" padding="14px 12px" noAnimate style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"18px",marginBottom:"4px" }}>{emoji}</div>
                  <div style={{ fontSize:"10px",fontWeight:700,color:colors.textMuted,
                    letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"2px" }}>{label}</div>
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"16px",fontWeight:700,color }}>{value}</div>
                </SoftCard>
              ))}
            </div>

            {/* Total saved */}
            <SoftCard variant="teal" padding="16px" noAnimate style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ fontSize:"28px" }}>🫙</div>
                <div>
                  <div style={{ fontSize:"10px",fontWeight:700,color:colors.tealDeep,
                    letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"2px" }}>Total Saved</div>
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"26px",fontWeight:700,
                    color:colors.tealDeep,letterSpacing:"-0.02em" }}>{fmt(stats.totalSaved)}</div>
                </div>
              </div>
            </SoftCard>

            {/* Goals */}
            {stats.goalProgress.length > 0 && (
              <div className="fade-up" style={{ animationDelay:"0.1s" }}>
                <h2 style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,
                  letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"12px",
                  display:"flex",alignItems:"center",gap:"8px" }}>
                  Savings Goals
                  <span style={{ flex:1,height:"1px",backgroundColor:colors.border }} />
                </h2>
                <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
                  {stats.goalProgress.map(g => (
                    <SoftCard key={g.label} variant="base" padding="14px 16px" noAnimate>
                      <div style={{ display:"flex",justifyContent:"space-between",
                        alignItems:"center",marginBottom:"8px" }}>
                        <span style={{ fontSize:"13px",fontWeight:600,color:colors.text }}>{g.label}</span>
                        <span style={{ fontSize:"12px",fontWeight:700,color:g.color }}>{g.pct}%</span>
                      </div>
                      <ProgressBar pct={g.pct} color={g.color} height="6px" animDelay="0.3s" />
                      <div style={{ display:"flex",justifyContent:"space-between",marginTop:"4px" }}>
                        <span style={{ fontSize:"10px",color:colors.textMuted }}>{fmt(g.saved)} saved</span>
                        <span style={{ fontSize:"10px",color:colors.textMuted }}>goal: {fmt(g.target)}</span>
                      </div>
                    </SoftCard>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
