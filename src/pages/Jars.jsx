/**
 * Jars.jsx
 * Savings jars page — connected to Supabase user_data.
 *
 * FIX: Added "Edit Saved Amount" per jar so you can enter what you already have.
 * Tapping the ✏️ icon opens an inline input to set the current saved amount.
 * Saves to Supabase and persists after refresh.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii } from "../ui/designTokens";

const fmt    = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const fmtFull = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2}).format(n);

const JAR_EMOJIS = ["🫙","💰","🏦","✈️","🏠","🎓","🚗","💊","🎁","🌴"];

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:"90px", left:"50%", transform:"translateX(-50%)",
      background:"#1a0f1e", color:"#f6f2ec", borderRadius:"99px",
      padding:"9px 20px", fontSize:"13px", fontWeight:600,
      zIndex:700, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
      animation:"fadeUp .2s ease both",
    }}>{msg}</div>
  );
}

// ── EditSavedInline ───────────────────────────────────────────────────────────
// Small inline panel that appears below a jar when ✏️ is tapped.
function EditSavedInline({ goal, onSave, onCancel }) {
  const [val, setVal] = useState(String(goal.saved ?? 0));

  function submit() {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) { alert("Please enter a valid amount (0 or more)."); return; }
    onSave(goal.id, n);
  }

  return (
    <div style={{
      marginTop:"12px", padding:"12px 14px",
      background:"#fff5f9", border:"1.5px solid #fce7f3",
      borderRadius:"10px",
    }}>
      <div style={{ fontSize:"0.67rem", fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.07em", color:"#9b6b8a", marginBottom:"8px" }}>
        ✏️ Current Saved Amount
      </div>
      <div style={{ fontSize:"0.72rem", color:"#9b6b8a", marginBottom:"10px", lineHeight:1.5 }}>
        Enter how much you already have saved in this jar right now.
      </div>
      <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1 }}>
          <span style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)",
            fontSize:"14px", color:"#9b6b8a", fontWeight:700 }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            autoFocus
            style={{
              width:"100%", padding:"9px 11px 9px 24px",
              background:"#ffffff", border:"1.5px solid #f0dce4",
              borderRadius:"9px", fontFamily:"'DM Sans',sans-serif",
              fontSize:"15px", fontWeight:700, color:"#1a0f1e",
              outline:"none", boxSizing:"border-box",
            }}
          />
        </div>
        <button
          onClick={submit}
          style={{ padding:"9px 16px", borderRadius:"9px", border:"none",
            background:"#3a6b4e", color:"#fff", fontFamily:"'DM Sans',sans-serif",
            fontWeight:700, fontSize:"13px", cursor:"pointer", whiteSpace:"nowrap" }}
        >✓ Save</button>
        <button
          onClick={onCancel}
          style={{ padding:"9px 12px", borderRadius:"9px",
            border:"1.5px solid #f0dce4", background:"#fff",
            color:"#9b6b8a", fontFamily:"'DM Sans',sans-serif",
            fontWeight:700, fontSize:"13px", cursor:"pointer" }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Jars() {
  const [rawData,   setRawData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [toast,     setToast]     = useState("");
  const [editingId, setEditingId] = useState(null); // which jar is being edited

  // ── Load ──────────────────────────────────────────────────────────────────
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

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const saveData = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { data: row } = await supabase.from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("id", row.id);
      setRawData(updated);
    } catch(e) {
      setToast("❌ Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Update saved amount for one goal ─────────────────────────────────────
  function handleSaveSaved(goalId, newAmount) {
    const goals = rawData?.goals ?? [];
    const updated = {
      ...rawData,
      goals: goals.map(g =>
        g.id === goalId ? { ...g, saved: newAmount } : g
      ),
    };
    saveData(updated);
    setEditingId(null);
    setToast("✅ Saved amount updated!");
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const goals = useMemo(() => rawData?.goals ?? [], [rawData]);

  const totalSaved  = goals.reduce((s,g) => s+(Number(g.saved)||0), 0);
  const totalTarget = goals.reduce((s,g) => s+(Number(g.target)||0), 0);
  const overallPct  = totalTarget>0 ? Math.round(totalSaved/totalTarget*100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", backgroundColor:colors.bg, fontFamily:typography.fontBody,
      color:colors.text, paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px", margin:"0 auto", padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"11px", fontWeight:700, color:colors.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>Savings</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <h1 style={{ fontFamily:typography.fontDisplay, fontSize:"30px", fontWeight:700,
              color:colors.text, letterSpacing:"-0.03em", lineHeight:1.1 }}>Jars 🫙</h1>
            {saving && <span style={{ fontSize:"11px", color:colors.textMuted }}>Saving…</span>}
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading jars…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px", color:colors.pinkDeep, fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Overall summary */}
            <SoftCard variant="teal" style={{ marginBottom:"16px", textAlign:"center" }} noAnimate>
              <p style={{ fontSize:"11px", fontWeight:700, color:colors.tealDeep, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Total Saved</p>
              <p style={{ fontFamily:typography.fontDisplay, fontSize:"36px", fontWeight:700,
                color:colors.tealDeep, letterSpacing:"-0.03em", lineHeight:1 }}>
                {fmt(totalSaved)}
              </p>
              <p style={{ fontSize:"12px", color:colors.teal, marginTop:"4px", marginBottom:"12px" }}>of {fmt(totalTarget)} goal</p>
              <ProgressBar pct={overallPct} color={colors.teal} height="8px" showLabel animDelay="0.3s" />
            </SoftCard>

            {/* Jar cards */}
            {goals.length === 0 ? (
              <SoftCard variant="ghost" style={{ textAlign:"center", padding:"40px", color:colors.textFaint, fontSize:"13px" }} noAnimate>
                No savings goals yet. Add goals in Settings.
              </SoftCard>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {goals.map((goal, i) => {
                  const saved      = Number(goal.saved) || 0;
                  const target     = Number(goal.target) || 0;
                  const pct        = target > 0 ? Math.min(100, Math.round(saved/target*100)) : 0;
                  const jarColor   = goal.color || colors.pink;
                  const remaining  = Math.max(0, target - saved);
                  const targetDate = goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString("en-CA",{month:"short",year:"numeric"})
                    : null;
                  const isEditing  = editingId === goal.id;

                  return (
                    <SoftCard key={goal.id??i} variant="base" animDelay={i*0.07} noAnimate={isEditing}>
                      {/* Top row: emoji + name + edit button */}
                      <div style={{ display:"flex", alignItems:"flex-start", gap:"14px", marginBottom:"14px" }}>
                        <div style={{ width:"48px", height:"48px", borderRadius:radii.xl, flexShrink:0,
                          backgroundColor:jarColor+"20", border:`2px solid ${jarColor}40`,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px" }}>
                          {JAR_EMOJIS[i % JAR_EMOJIS.length]}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"16px", fontWeight:700, color:colors.text,
                            fontFamily:typography.fontDisplay, letterSpacing:"-0.01em", marginBottom:"2px" }}>
                            {goal.label}
                          </div>
                          {targetDate && (
                            <div style={{ fontSize:"11px", color:colors.textMuted }}>Target: {targetDate}</div>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
                          <div style={{ fontFamily:typography.fontDisplay, fontSize:"20px", fontWeight:700,
                            color:jarColor, letterSpacing:"-0.02em", lineHeight:1 }}>
                            {pct}%
                          </div>
                          {/* Edit saved amount button */}
                          <button
                            onClick={() => setEditingId(isEditing ? null : goal.id)}
                            title="Edit saved amount"
                            style={{
                              background: isEditing ? colors.pinkPale : colors.bgDeep,
                              border: `1.5px solid ${isEditing ? colors.pink : colors.border}`,
                              borderRadius:"7px", padding:"4px 8px",
                              cursor:"pointer", fontSize:"13px",
                              color: isEditing ? colors.pinkDeep : colors.textMuted,
                              transition:"all .15s",
                            }}
                          >✏️</button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <ProgressBar pct={pct} color={jarColor} height="8px" animDelay={`${0.2+i*0.05}s`} />

                      {/* Stats grid */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginTop:"12px" }}>
                        {[
                          { label:"Saved",     value:fmt(saved),     color:colors.tealDeep },
                          { label:"Goal",      value:fmt(target),    color:colors.textSoft },
                          { label:"Remaining", value:fmt(remaining), color:colors.pinkDeep },
                        ].map(({label,value,color}) => (
                          <div key={label} style={{ backgroundColor:colors.bgDeep, borderRadius:radii.md,
                            padding:"8px", textAlign:"center" }}>
                            <div style={{ fontSize:"9px", color:colors.textMuted, fontWeight:700,
                              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"2px" }}>{label}</div>
                            <div style={{ fontSize:"13px", fontWeight:700, color }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Inline edit panel */}
                      {isEditing && (
                        <EditSavedInline
                          goal={goal}
                          onSave={handleSaveSaved}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </SoftCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
