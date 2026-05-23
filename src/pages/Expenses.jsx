/**
 * Expenses.jsx
 * Expenses page — connected to Supabase user_data.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const fmt = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);

const CATEGORY_META = {
  Fixed:    { color: colors.pink,  bg: colors.pinkPale,  emoji: "📌" },
  Variable: { color: colors.mauve, bg: colors.mauvePale, emoji: "🔀" },
  default:  { color: colors.gold,  bg: colors.goldPale,  emoji: "📄" },
};

const PRIORITY_META = {
  high:   { color: colors.pinkDeep, label: "High"   },
  medium: { color: colors.gold,     label: "Medium" },
  low:    { color: colors.teal,     label: "Low"    },
};

export default function Expenses() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all");

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

  const expenses = useMemo(() => rawData?.expenses ?? [], [rawData]);

  const filtered = useMemo(() => {
    if (filter==="all")  return expenses;
    if (filter==="paid") return expenses.filter(e=>e.paid);
    return expenses.filter(e=>!e.paid);
  }, [expenses, filter]);

  const totalMonthly  = expenses.filter(e=>e.recurring).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const totalPaid     = expenses.filter(e=>e.paid).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const totalUnpaid   = expenses.filter(e=>!e.paid).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const paidPct       = totalMonthly>0 ? Math.round(totalPaid/totalMonthly*100) : 0;

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Monthly</p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>Expenses</h1>
        </div>

        {loading && <LoadingSpinner message="Loading expenses…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Summary */}
            <SoftCard variant="base" style={{ marginBottom:"14px" }} noAnimate>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
                <span style={{ fontSize:"12px",fontWeight:600,color:colors.textSoft }}>Monthly Total</span>
                <span style={{ fontFamily:typography.fontDisplay,fontSize:"20px",fontWeight:700,color:colors.pinkDeep }}>{fmt(totalMonthly)}</span>
              </div>
              <ProgressBar pct={paidPct} color={colors.teal} height="6px" animDelay="0.2s" showLabel label={`${fmt(totalPaid)} paid`} />
            </SoftCard>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px" }}>
              <SoftCard variant="teal" padding="14px" noAnimate>
                <div style={{ fontSize:"10px",fontWeight:700,color:colors.tealDeep,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"2px" }}>Paid</div>
                <div style={{ fontFamily:typography.fontDisplay,fontSize:"20px",fontWeight:700,color:colors.tealDeep }}>{fmt(totalPaid)}</div>
              </SoftCard>
              <SoftCard variant="highlight" padding="14px" noAnimate>
                <div style={{ fontSize:"10px",fontWeight:700,color:colors.pinkDeep,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"2px" }}>Remaining</div>
                <div style={{ fontFamily:typography.fontDisplay,fontSize:"20px",fontWeight:700,color:colors.pinkDeep }}>{fmt(totalUnpaid)}</div>
              </SoftCard>
            </div>

            {/* Filter tabs */}
            <div style={{ display:"flex",gap:"6px",marginBottom:"16px" }}>
              {[["all","All"],["unpaid","Unpaid"],["paid","Paid ✓"]].map(([val,label])=>(
                <button key={val} onClick={()=>setFilter(val)} style={{
                  flex:1,padding:"8px 6px",borderRadius:radii.full,
                  border:`1.5px solid ${filter===val?colors.pink:colors.border}`,
                  backgroundColor:filter===val?colors.pinkPale:colors.bgCard,
                  color:filter===val?colors.pinkDeep:colors.textMuted,
                  fontSize:"12px",fontWeight:700,cursor:"pointer",
                  transition:`all ${transitions.base}`,
                }}>{label}</button>
              ))}
            </div>

            {/* Expense list */}
            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              {filtered.length===0 ? (
                <SoftCard variant="ghost" style={{ textAlign:"center",padding:"32px",color:colors.textFaint,fontSize:"13px" }} noAnimate>
                  No expenses found.
                </SoftCard>
              ) : filtered.map((expense,i) => {
                const cat  = CATEGORY_META[expense.category] || CATEGORY_META.default;
                const pri  = PRIORITY_META[expense.priority] || PRIORITY_META.medium;
                return (
                  <SoftCard key={expense.id??i} variant="base" padding="14px 16px"
                    animDelay={i*0.05} style={{ opacity:expense.paid?0.65:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                      <div style={{ width:"38px",height:"38px",borderRadius:radii.md,flexShrink:0,
                        backgroundColor:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"18px" }}>
                        {expense.paid ? "✅" : cat.emoji}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px" }}>
                          <span style={{ fontSize:"14px",fontWeight:600,color:colors.text,
                            textDecoration:expense.paid?"line-through":"none" }}>
                            {expense.label}
                          </span>
                          {expense.recurring && (
                            <span style={{ fontSize:"9px",color:colors.mauve,fontWeight:700,
                              backgroundColor:colors.mauvePale,padding:"1px 5px",borderRadius:radii.full }}>
                              🔄 Monthly
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                          <span style={{ fontSize:"10px",color:cat.color,fontWeight:600 }}>{expense.category}</span>
                          {expense.dueDay && (
                            <span style={{ fontSize:"10px",color:colors.textMuted }}>Due day {expense.dueDay}</span>
                          )}
                          <span style={{ fontSize:"10px",fontWeight:700,color:pri.color }}>{pri.label}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontFamily:typography.fontDisplay,fontSize:"16px",
                          fontWeight:700,color:expense.paid?colors.teal:colors.pinkDeep }}>
                          {fmt(expense.amount)}
                        </div>
                      </div>
                    </div>
                  </SoftCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
