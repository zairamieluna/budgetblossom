/**
 * Jars.jsx
 * Savings jars page — connected to Supabase user_data.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii } from "../ui/designTokens";

const fmt = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);

const JAR_EMOJIS = ["🫙","💰","🏦","✈️","🏠","🎓","🚗","💊","🎁","🌴"];

export default function Jars() {
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

  const goals     = useMemo(() => rawData?.goals ?? [], [rawData]);
  const totalSaved  = goals.reduce((s,g)=>s+(Number(g.saved)||0),0);
  const totalTarget = goals.reduce((s,g)=>s+(Number(g.target)||0),0);
  const overallPct  = totalTarget>0 ? Math.round(totalSaved/totalTarget*100) : 0;

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Savings</p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>
            Jars 🫙
          </h1>
        </div>

        {loading && <LoadingSpinner message="Loading jars…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Overall */}
            <SoftCard variant="teal" style={{ marginBottom:"16px",textAlign:"center" }} noAnimate>
              <p style={{ fontSize:"11px",fontWeight:700,color:colors.tealDeep,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"4px" }}>Total Saved</p>
              <p style={{ fontFamily:typography.fontDisplay,fontSize:"36px",fontWeight:700,color:colors.tealDeep,letterSpacing:"-0.03em",lineHeight:1 }}>
                {fmt(totalSaved)}
              </p>
              <p style={{ fontSize:"12px",color:colors.teal,marginTop:"4px",marginBottom:"12px" }}>of {fmt(totalTarget)} goal</p>
              <ProgressBar pct={overallPct} color={colors.teal} height="8px" showLabel animDelay="0.3s" />
            </SoftCard>

            {/* Jar cards */}
            {goals.length===0 ? (
              <SoftCard variant="ghost" style={{ textAlign:"center",padding:"40px",color:colors.textFaint,fontSize:"13px" }} noAnimate>
                No savings goals yet. Add goals in Settings.
              </SoftCard>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
                {goals.map((goal,i) => {
                  const pct     = Math.min(100,Math.round((Number(goal.saved)||0)/(Number(goal.target)||1)*100));
                  const jarColor = goal.color || colors.pink;
                  const remaining = Math.max(0,(Number(goal.target)||0)-(Number(goal.saved)||0));
                  const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString("en-CA",{month:"short",year:"numeric"}) : null;
                  return (
                    <SoftCard key={goal.id??i} variant="base" animDelay={i*0.07}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:"14px",marginBottom:"14px" }}>
                        <div style={{ width:"48px",height:"48px",borderRadius:radii.xl,flexShrink:0,
                          backgroundColor:jarColor+"20",border:`2px solid ${jarColor}40`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px" }}>
                          {JAR_EMOJIS[i % JAR_EMOJIS.length]}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:"16px",fontWeight:700,color:colors.text,
                            fontFamily:typography.fontDisplay,letterSpacing:"-0.01em",marginBottom:"2px" }}>
                            {goal.label}
                          </div>
                          {targetDate && (
                            <div style={{ fontSize:"11px",color:colors.textMuted }}>Target: {targetDate}</div>
                          )}
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          <div style={{ fontFamily:typography.fontDisplay,fontSize:"20px",fontWeight:700,
                            color:jarColor,letterSpacing:"-0.02em",lineHeight:1 }}>
                            {pct}%
                          </div>
                        </div>
                      </div>

                      <ProgressBar pct={pct} color={jarColor} height="8px" animDelay={`${0.2+i*0.05}s`} />

                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"12px" }}>
                        {[
                          { label:"Saved",     value:fmt(goal.saved||0),   color:colors.tealDeep },
                          { label:"Goal",      value:fmt(goal.target||0),  color:colors.textSoft },
                          { label:"Remaining", value:fmt(remaining),       color:colors.pinkDeep },
                        ].map(({label,value,color})=>(
                          <div key={label} style={{ backgroundColor:colors.bgDeep,borderRadius:radii.md,
                            padding:"8px",textAlign:"center" }}>
                            <div style={{ fontSize:"9px",color:colors.textMuted,fontWeight:700,
                              letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"2px" }}>{label}</div>
                            <div style={{ fontSize:"13px",fontWeight:700,color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </SoftCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
