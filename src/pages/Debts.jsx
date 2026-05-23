/**
 * Debts.jsx
 * Debt dashboard — connected to Supabase user_data.
 */

import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { analyseDebts } from "../finance/debts/debtEngine";
import { summariseDebts } from "../finance/debts/debtSummary";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import StatBadge from "../components/common/StatBadge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const fmtFull = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2}).format(n);

function payoffLabel(months) {
  if (months >= 600) return "Never at min";
  if (months <= 0)   return "Paid off ✓";
  const y = Math.floor(months/12), m = months%12;
  if (y===0) return `${m}mo`;
  if (m===0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

const RISK_META = {
  low:      { color: colors.teal,     bg: colors.tealPale,     label: "Low Risk",    emoji: "🌿" },
  medium:   { color: colors.gold,     bg: colors.goldPale,     label: "Medium Risk", emoji: "🌼" },
  high:     { color: colors.pink,     bg: colors.pinkPale,     label: "High Risk",   emoji: "🌸" },
  critical: { color: colors.pinkDeep, bg: colors.criticalPale, label: "Critical",    emoji: "🚨" },
};

// ── DebtCard ──────────────────────────────────────────────────────────────────
function DebtCard({ debt, isTop, index }) {
  const [open, setOpen] = useState(false);
  const paidPct = Math.min(99, Math.round((1 - debt.remaining / (debt.remaining * 1.6)) * 100));

  return (
    <SoftCard
      variant={isTop ? "highlight" : "base"}
      animDelay={index * 0.07}
      onClick={() => setOpen(o => !o)}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Top accent */}
      {isTop && (
        <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",
          background:`linear-gradient(90deg,${colors.pinkDeep},${colors.pinkLight},transparent)` }} />
      )}

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px" }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"2px" }}>
            <span style={{ fontFamily:typography.fontDisplay,fontSize:"16px",fontWeight:700,color:colors.text }}>
              {debt.name}
            </span>
            {isTop && (
              <StatBadge label="PAY FIRST" color={colors.pinkDeep} bg={colors.bgCard}
                border={colors.pinkDeep} icon="★" size="xs" />
            )}
          </div>
          {debt.dueDate && (
            <span style={{ fontSize:"11px",color:colors.textMuted }}>
              Due {new Date(debt.dueDate).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}
            </span>
          )}
        </div>

        {/* Score ring */}
        <div style={{ width:"44px",height:"44px",flexShrink:0,borderRadius:"50%",position:"relative",
          background:`conic-gradient(${debt.priorityScore>=70?colors.pinkDeep:colors.pink} ${debt.priorityScore*3.6}deg,${colors.bgDeep} 0deg)`,
          display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:"34px",height:"34px",borderRadius:"50%",
            backgroundColor:isTop?colors.pinkPale:colors.bgCard,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontSize:"10px",fontWeight:700,color:debt.priorityScore>=70?colors.pinkDeep:colors.pink }}>
              {debt.priorityScore}
            </span>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom:"12px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px" }}>
          <span style={{ fontFamily:typography.fontDisplay,fontSize:"26px",fontWeight:700,color:colors.pinkDeep,letterSpacing:"-0.02em" }}>
            {fmt(debt.remaining)}
          </span>
          <span style={{ fontSize:"11px",color:colors.textMuted }}>remaining</span>
        </div>
        <ProgressBar pct={paidPct} color={isTop?colors.pinkDeep:colors.pink} animDelay="0.3s" />
        <div style={{ display:"flex",justifyContent:"flex-end",marginTop:"3px" }}>
          <span style={{ fontSize:"10px",color:colors.textMuted }}>{paidPct}% paid</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"12px" }}>
        {[
          { label:"Min/mo",  value: fmt(debt.minPayment) },
          { label:"Rate",    value: `${debt.interestRate}%` },
          { label:"Payoff",  value: payoffLabel(debt.payoffMonthsEstimate) },
        ].map(({label,value}) => (
          <div key={label} style={{ backgroundColor:colors.bgDeep,borderRadius:radii.md,padding:"8px 10px",textAlign:"center" }}>
            <div style={{ fontSize:"9px",color:colors.textMuted,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"2px" }}>{label}</div>
            <div style={{ fontSize:"13px",fontWeight:700,color:colors.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Strategy + expand */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <StatBadge
          label={debt.recommendedStrategy === "avalanche" ? "Avalanche 🔥" : "Snowball ❄️"}
          color={debt.recommendedStrategy === "avalanche" ? colors.rose : colors.mauve}
          bg={debt.recommendedStrategy === "avalanche" ? colors.rosePale : colors.mauvePale}
          size="sm"
        />
        <span style={{ fontSize:"11px",color:colors.textFaint }}>{open?"▲":"▼"}</span>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ marginTop:"14px",paddingTop:"14px",borderTop:`1px dashed ${colors.border}`,
          display:"flex",flexDirection:"column",gap:"8px" }}>
          <p style={{ fontSize:"12px",color:colors.textSoft,lineHeight:1.6 }}>
            <strong style={{ color:colors.text }}>Strategy: </strong>
            {debt.recommendedStrategy==="avalanche"
              ? "Pay this debt first to save the most in interest."
              : "Pay this off first for a quick win and momentum."}
          </p>
          {debt.interestRate > 0 && (
            <p style={{ fontSize:"12px",color:colors.textSoft }}>
              <strong style={{ color:colors.text }}>Est. annual interest: </strong>
              {fmtFull(debt.remaining*(debt.interestRate/100))}
            </p>
          )}
        </div>
      )}
    </SoftCard>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Debts() {
  const [rawData,  setRawData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [strategy, setStrategy] = useState("auto");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (cancelled) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob==="string" ? JSON.parse(blob) : blob ?? null);
      } catch(err) { if(!cancelled) setError(err.message||"Failed to load"); }
      finally      { if(!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled=true; };
  }, []);

  // Adapt debts from budgetsbloom schema
  const rawDebts = useMemo(() => {
    if (!rawData) return [];
    return (rawData.debts ?? []).map(d => ({
      id: d.id, name: d.label,
      remaining: d.balance ?? 0,
      minPayment: d.minPayment ?? 0,
      interestRate: d.rate ?? 0,
      dueDate: null,
    }));
  }, [rawData]);

  const analysed = useMemo(() => analyseDebts(rawDebts, { strategy }), [rawDebts, strategy]);
  const summary  = useMemo(() => {
    const income = rawData?.incomes?.reduce((s,i)=>s+(Number(i.amount)||0),0) ?? null;
    return summariseDebts(rawDebts, income);
  }, [rawDebts, rawData]);

  const riskMeta    = RISK_META[summary.riskLevel] || RISK_META.low;
  const pressurePct = summary.monthlyPressureRatio!=null ? Math.round(summary.monthlyPressureRatio*100) : null;

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>

      {/* Blobs */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden" }}>
        <div style={{ position:"absolute",top:"-80px",right:"-80px",width:"350px",height:"350px",
          borderRadius:"50%",background:"radial-gradient(circle,#f4c0d020 0%,transparent 70%)" }} />
      </div>

      <div style={{ position:"relative",zIndex:1,maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
            <div>
              <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Debt Overview</p>
              <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>
                Your Debts
              </h1>
            </div>
            <StatBadge label={riskMeta.label} icon={riskMeta.emoji} color={riskMeta.color} bg={riskMeta.bg} size="sm" />
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading debts…" />}
        {error   && (
          <SoftCard variant="highlight" style={{ marginBottom:"20px",color:colors.pinkDeep,fontSize:"13px" }}>
            ⚠ {error}
          </SoftCard>
        )}

        {!loading && (
          <>
            {/* Summary grid */}
            <div className="fade-up" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px",animationDelay:"0.05s" }}>
              {[
                { label:"Total Debt",    value:fmt(summary.totalDebt),         sub:`${summary.debtCount} debts`,           icon:"💳", color:colors.pinkDeep },
                { label:"Min / Month",   value:fmt(summary.totalMinPayments),   sub: pressurePct!=null?`${pressurePct}% of income`:"minimums", icon:"📅", color:colors.mauve },
              ].map(({label,value,sub,icon,color})=>(
                <SoftCard key={label} variant="base" padding="16px 18px" noAnimate style={{ animationDelay:"0.05s" }}>
                  <div style={{ fontSize:"18px",marginBottom:"6px" }}>{icon}</div>
                  <div style={{ fontSize:"10px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"3px" }}>{label}</div>
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"22px",fontWeight:700,color,letterSpacing:"-0.02em",lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:"11px",color:colors.textMuted,marginTop:"3px" }}>{sub}</div>
                </SoftCard>
              ))}
            </div>

            <div className="fade-up" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"20px",animationDelay:"0.10s" }}>
              {[
                { label:"Annual Interest", value:fmt(summary.estimatedAnnualInterest), sub:"at current balances", icon:"📈", color:colors.gold },
                { label:"Avg Rate",        value:`${summary.avgInterestRate.toFixed(1)}%`,   sub:"weighted by balance",  icon:"🏦", color:summary.avgInterestRate>15?colors.high:colors.low },
              ].map(({label,value,sub,icon,color})=>(
                <SoftCard key={label} variant="base" padding="16px 18px" noAnimate>
                  <div style={{ fontSize:"18px",marginBottom:"6px" }}>{icon}</div>
                  <div style={{ fontSize:"10px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"3px" }}>{label}</div>
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"22px",fontWeight:700,color,letterSpacing:"-0.02em",lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:"11px",color:colors.textMuted,marginTop:"3px" }}>{sub}</div>
                </SoftCard>
              ))}
            </div>

            {/* Pressure bar */}
            {pressurePct!=null && (
              <SoftCard variant="base" style={{ marginBottom:"20px" }} noAnimate>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
                  <span style={{ fontSize:"12px",fontWeight:600,color:colors.textSoft }}>Monthly Payment Pressure</span>
                  <span style={{ fontSize:"13px",fontWeight:700,
                    color:pressurePct>=43?colors.critical:pressurePct>=30?colors.high:pressurePct>=15?colors.medium:colors.low }}>
                    {pressurePct}%
                  </span>
                </div>
                <ProgressBar pct={Math.min(pressurePct,100)}
                  color={pressurePct>=43?colors.critical:pressurePct>=30?colors.high:pressurePct>=15?colors.medium:colors.low}
                  animDelay="0.2s" />
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:"5px" }}>
                  <span style={{ fontSize:"9px",color:colors.textFaint }}>Safe</span>
                  <span style={{ fontSize:"9px",color:colors.textFaint }}>15% · 30% · 43%</span>
                  <span style={{ fontSize:"9px",color:colors.textFaint }}>Critical</span>
                </div>
              </SoftCard>
            )}

            {/* Strategy toggle */}
            <div className="fade-up" style={{ display:"flex",gap:"6px",marginBottom:"20px",animationDelay:"0.12s" }}>
              {[["auto","🤖 Auto"],["avalanche","🔥 Avalanche"],["snowball","❄️ Snowball"]].map(([mode,label])=>(
                <button key={mode} onClick={()=>setStrategy(mode)} style={{
                  flex:1,padding:"9px 6px",borderRadius:radii.full,
                  border:`1.5px solid ${strategy===mode?colors.pink:colors.border}`,
                  backgroundColor:strategy===mode?colors.pinkPale:colors.bgCard,
                  color:strategy===mode?colors.pinkDeep:colors.textMuted,
                  fontSize:"11px",fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.02em",transition:`all ${transitions.base}`,
                }}>{label}</button>
              ))}
            </div>

            {/* Debt cards */}
            <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
              {analysed.length===0 ? (
                <SoftCard variant="ghost" style={{ textAlign:"center",padding:"40px",color:colors.textFaint,fontSize:"13px" }}>
                  No debts found. Add debts in Settings.
                </SoftCard>
              ) : analysed.map((debt,i)=>(
                <DebtCard key={debt.id??debt.name} debt={debt} isTop={i===0} index={i} />
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop:"28px",padding:"14px 16px",backgroundColor:colors.bgWarm,
              border:`1px dashed ${colors.border}`,borderRadius:radii.xl,
              fontSize:"12px",color:colors.textMuted,lineHeight:1.6,textAlign:"center" }}>
              Estimates use minimum payments only. Paying extra saves time and interest. 💕
            </div>
          </>
        )}
      </div>
    </div>
  );
}
