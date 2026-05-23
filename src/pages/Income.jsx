/**
 * Income.jsx
 * Income / shift management page — connected to Supabase user_data.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const fmt     = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const fmtDec  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2}).format(n);

function estimateMonthly(income) {
  if (income.type === "manual") return Number(income.amount)||0;
  const weekly = (Number(income.hoursPerWeek)||0) * (Number(income.hourlyRate)||0);
  if (income.frequency === "weekly")   return weekly * 4.33;
  if (income.frequency === "biweekly") return weekly * 2.17;
  return weekly * 4.33;
}

function estimateTax(annual) {
  // Simple Ontario marginal approximation
  if (annual <= 0)      return 0;
  if (annual <= 11141)  return 0;
  if (annual <= 49231)  return (annual - 11141) * 0.2005;
  if (annual <= 98463)  return (38090 * 0.2005) + (annual - 49231) * 0.2415;
  return (38090 * 0.2005) + (49232 * 0.2415) + (annual - 98463) * 0.2965;
}

export default function Income() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [expanded, setExpanded] = useState(null);

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

  const incomes = useMemo(() => rawData?.incomes ?? [], [rawData]);

  const totals = useMemo(() => {
    const monthly = incomes.reduce((s,i)=>s+estimateMonthly(i),0);
    const annual  = monthly * 12;
    const tax     = estimateTax(annual);
    return { monthly, annual, tax, takeHome: annual - tax, monthlyTakeHome: (annual-tax)/12 };
  }, [incomes]);

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Earnings</p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>Income</h1>
        </div>

        {loading && <LoadingSpinner message="Loading income…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Summary hero */}
            <SoftCard variant="gold" style={{ marginBottom:"14px",textAlign:"center" }} noAnimate>
              <p style={{ fontSize:"11px",fontWeight:700,color:colors.goldDeep,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"4px" }}>Est. Monthly Take-Home</p>
              <p style={{ fontFamily:typography.fontDisplay,fontSize:"38px",fontWeight:700,
                color:colors.goldDeep,letterSpacing:"-0.03em",lineHeight:1 }}>
                {fmt(totals.monthlyTakeHome)}
              </p>
              <p style={{ fontSize:"12px",color:colors.gold,marginTop:"4px" }}>after estimated tax</p>
            </SoftCard>

            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px" }}>
              {[
                { label:"Gross Monthly", value:fmt(totals.monthly),       color:colors.gold,     emoji:"💛" },
                { label:"Est. Annual",   value:fmt(totals.annual),         color:colors.goldDeep, emoji:"📊" },
                { label:"Est. Tax",      value:fmt(totals.tax/12)+"/mo",   color:colors.pink,     emoji:"🏛️" },
                { label:"Take-Home/yr",  value:fmt(totals.takeHome),       color:colors.teal,     emoji:"✅" },
              ].map(({label,value,color,emoji})=>(
                <SoftCard key={label} variant="base" padding="14px 12px" noAnimate style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"18px",marginBottom:"4px" }}>{emoji}</div>
                  <div style={{ fontSize:"10px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"2px" }}>{label}</div>
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"16px",fontWeight:700,color }}>{value}</div>
                </SoftCard>
              ))}
            </div>

            {/* Income sources */}
            <h2 style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,
              letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"12px",
              display:"flex",alignItems:"center",gap:"8px" }}>
              Income Sources
              <span style={{ flex:1,height:"1px",backgroundColor:colors.border }} />
            </h2>

            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              {incomes.length===0 ? (
                <SoftCard variant="ghost" style={{ textAlign:"center",padding:"32px",color:colors.textFaint,fontSize:"13px" }} noAnimate>
                  No income sources found.
                </SoftCard>
              ) : incomes.map((income,i) => {
                const monthly    = estimateMonthly(income);
                const isExpanded = expanded===i;
                const color      = income.color || colors.gold;
                const shifts     = income.dailyShifts ?? [];
                const workedShifts = shifts.filter(s=>s.worked);
                const totalGross = workedShifts.reduce((s,sh)=>s+(Number(sh.gross)||0),0);

                return (
                  <SoftCard key={income.id??i} variant="base" animDelay={i*0.06}
                    onClick={()=>setExpanded(isExpanded?null:i)}>
                    <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                      <div style={{ width:"44px",height:"44px",borderRadius:radii.xl,flexShrink:0,
                        backgroundColor:color+"20",border:`2px solid ${color}40`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"20px" }}>
                        {income.type==="shift"?"⏱️":"💼"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"15px",fontWeight:700,color:colors.text,
                          fontFamily:typography.fontDisplay,letterSpacing:"-0.01em",marginBottom:"2px" }}>
                          {income.label}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                          <span style={{ fontSize:"11px",color:colors.textMuted,textTransform:"capitalize" }}>
                            {income.type} · {income.frequency}
                          </span>
                          {income.type==="shift" && income.hourlyRate && (
                            <span style={{ fontSize:"11px",color:color,fontWeight:600 }}>
                              ${income.hourlyRate}/hr
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontFamily:typography.fontDisplay,fontSize:"18px",
                          fontWeight:700,color,letterSpacing:"-0.02em",lineHeight:1 }}>
                          {fmt(monthly)}
                        </div>
                        <div style={{ fontSize:"10px",color:colors.textMuted }}>est./mo</div>
                      </div>
                    </div>

                    {/* Expanded: shifts */}
                    {isExpanded && (
                      <div style={{ marginTop:"14px",paddingTop:"14px",
                        borderTop:`1px dashed ${colors.border}` }}>

                        {income.type==="shift" && (
                          <>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"12px" }}>
                              {[
                                { label:"Hours/wk",  value:`${income.hoursPerWeek}h` },
                                { label:"Shifts",    value:workedShifts.length },
                                { label:"Gross",     value:fmt(totalGross) },
                              ].map(({label,value})=>(
                                <div key={label} style={{ backgroundColor:colors.bgDeep,borderRadius:radii.md,
                                  padding:"8px",textAlign:"center" }}>
                                  <div style={{ fontSize:"9px",color:colors.textMuted,fontWeight:700,
                                    letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"2px" }}>{label}</div>
                                  <div style={{ fontSize:"13px",fontWeight:700,color:colors.text }}>{value}</div>
                                </div>
                              ))}
                            </div>

                            {shifts.slice(0,5).map((sh,si)=>(
                              <div key={si} style={{ display:"flex",justifyContent:"space-between",
                                alignItems:"center",padding:"8px 10px",
                                backgroundColor:sh.worked?colors.tealPale:colors.bgDeep,
                                borderRadius:radii.md,marginBottom:"4px" }}>
                                <span style={{ fontSize:"12px",color:colors.textSoft }}>
                                  {sh.date} · {sh.startTime}–{sh.endTime}
                                </span>
                                <span style={{ fontSize:"12px",fontWeight:700,
                                  color:sh.worked?colors.tealDeep:colors.textMuted }}>
                                  {sh.worked ? fmtDec(sh.gross||0) : "Scheduled"}
                                </span>
                              </div>
                            ))}
                            {shifts.length>5 && (
                              <p style={{ fontSize:"11px",color:colors.textMuted,textAlign:"center",marginTop:"4px" }}>
                                +{shifts.length-5} more shifts
                              </p>
                            )}
                          </>
                        )}

                        {income.type==="manual" && (
                          <div style={{ fontSize:"13px",color:colors.textSoft,lineHeight:1.6 }}>
                            <strong style={{ color:colors.text }}>Monthly amount: </strong>{fmtDec(income.amount||0)}<br/>
                            <strong style={{ color:colors.text }}>Next date: </strong>{income.nextDate || "—"}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ textAlign:"right",marginTop:"8px" }}>
                      <span style={{ fontSize:"10px",color:colors.textFaint }}>{isExpanded?"▲ less":"▼ details"}</span>
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
