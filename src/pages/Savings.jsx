/**
 * Savings.jsx
 * Named savings buckets — contributions appear in Expenses automatically.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import ProgressBar from "../components/common/ProgressBar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const fmt  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
const fmtF = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2}).format(n);

const BUCKET_COLORS = [
  "#FF6B9D","#9B7AEA","#52C97D","#FFB347","#4EC9E1","#F97066","#A78BFA","#34D399",
];

const inp = {
  width:"100%", padding:"9px 11px",
  background:"#fff5f9", border:"1.5px solid #fce7f3",
  borderRadius:"9px", fontFamily:"'DM Sans',sans-serif",
  fontSize:"14px", color:"#1a0f1e", outline:"none",
  boxSizing:"border-box",
};

function Label({ children }) {
  return (
    <div style={{ fontSize:"0.62rem", fontWeight:700, textTransform:"uppercase",
      letterSpacing:"0.07em", color:"#9b6b8a", margin:"10px 0 4px" }}>
      {children}
    </div>
  );
}

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
    }}>{msg}</div>
  );
}

export default function Savings() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState(null);

  const blank = { name:"", monthly:"", target:"", color: BUCKET_COLORS[0], note:"" };
  const [form, setForm] = useState(blank);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error:e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (dead) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob==="string"?JSON.parse(blob):blob??null);
      } catch(err) { if(!dead) setError(err.message||"Failed to load"); }
      finally      { if(!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  // ── Save to Supabase ────────────────────────────────────────────────────────
  const persist = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { data: row } = await supabase.from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("id", row.id);
      setRawData(updated);
    } catch { setToast("❌ Save failed"); }
    finally  { setSaving(false); }
  }, []);

  const buckets  = useMemo(() => rawData?.savings ?? [], [rawData]);
  const expenses = useMemo(() => rawData?.expenses ?? [], [rawData]);

  const totalSaved      = useMemo(() => buckets.reduce((s,b)=>s+(Number(b.saved)||0),0), [buckets]);
  const totalMonthly    = useMemo(() => buckets.reduce((s,b)=>s+(Number(b.monthly)||0),0), [buckets]);

  // ── Sync bucket → expenses (upsert a recurring expense per bucket) ──────────
  function syncExpense(updatedBuckets, updatedExpenses) {
    let exps = [...updatedExpenses];
    updatedBuckets.forEach(b => {
      const expId = `savings_${b.id}`;
      const existing = exps.findIndex(e => e.id === expId);
      const expEntry = {
        id:      expId,
        name:    `💰 ${b.name}`,
        amt:     Number(b.monthly) || 0,
        due:     null,
        cat:     "savings",
        card:    "",
        payType: "banking",
        recur:   "monthly",
        paid:    false,
        isSavingsBucket: true,
        savingsId: b.id,
      };
      if (existing >= 0) exps[existing] = { ...exps[existing], ...expEntry, paid: exps[existing].paid };
      else exps.push(expEntry);
    });
    // Remove expenses for deleted buckets
    exps = exps.filter(e =>
      !e.isSavingsBucket ||
      updatedBuckets.some(b => `savings_${b.id}` === e.id)
    );
    return exps;
  }

  // ── Add / Edit bucket ───────────────────────────────────────────────────────
  function submitForm() {
    if (!form.name.trim() || !form.monthly) { setToast("⚠️ Name and monthly amount required"); return; }

    let updatedBuckets;
    if (editId) {
      updatedBuckets = buckets.map(b => b.id === editId
        ? { ...b, name:form.name.trim(), monthly:parseFloat(form.monthly), target:parseFloat(form.target)||0, color:form.color, note:form.note }
        : b
      );
    } else {
      const newBucket = {
        id:      "s" + Date.now(),
        name:    form.name.trim(),
        monthly: parseFloat(form.monthly),
        target:  parseFloat(form.target) || 0,
        saved:   0,
        color:   form.color,
        note:    form.note,
        createdAt: new Date().toISOString(),
      };
      updatedBuckets = [...buckets, newBucket];
    }

    const updatedExpenses = syncExpense(updatedBuckets, expenses);
    persist({ ...rawData, savings: updatedBuckets, expenses: updatedExpenses });
    setForm(blank);
    setShowAdd(false);
    setEditId(null);
    setToast(editId ? "✅ Savings bucket updated!" : "✅ Savings bucket created!");
  }

  // ── Delete bucket ───────────────────────────────────────────────────────────
  function deleteBucket(id) {
    const updatedBuckets  = buckets.filter(b => b.id !== id);
    const updatedExpenses = syncExpense(updatedBuckets, expenses);
    persist({ ...rawData, savings: updatedBuckets, expenses: updatedExpenses });
    setToast("🗑 Bucket removed");
  }

  // ── Mark contribution paid → add to saved balance ───────────────────────────
  function markPaid(bucketId, paid) {
    const bucket = buckets.find(b => b.id === bucketId);
    if (!bucket) return;
    const delta = paid ? Number(bucket.monthly) : -Number(bucket.monthly);
    const updatedBuckets = buckets.map(b =>
      b.id === bucketId ? { ...b, saved: Math.max(0, (Number(b.saved)||0) + delta) } : b
    );
    const updatedExpenses = expenses.map(e =>
      e.id === `savings_${bucketId}` ? { ...e, paid } : e
    );
    persist({ ...rawData, savings: updatedBuckets, expenses: updatedExpenses });
    setToast(paid ? "💰 Contribution saved!" : "↩ Contribution undone");
  }

  function startEdit(b) {
    setForm({ name:b.name, monthly:String(b.monthly), target:String(b.target||""), color:b.color||BUCKET_COLORS[0], note:b.note||"" });
    setEditId(b.id);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior:"smooth" });
  }

  return (
    <div style={{ minHeight:"100vh", backgroundColor:colors.bg, fontFamily:typography.fontBody,
      color:colors.text, paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px", margin:"0 auto", padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <p style={{ fontSize:"11px", fontWeight:700, color:colors.textMuted,
                letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>Goals</p>
              <h1 style={{ fontFamily:typography.fontDisplay, fontSize:"30px", fontWeight:700,
                color:colors.text, letterSpacing:"-0.03em", lineHeight:1.1 }}>Savings</h1>
            </div>
            <button onClick={() => { setShowAdd(s=>!s); setEditId(null); setForm(blank); }}
              style={{ marginTop:"8px", padding:"8px 16px", borderRadius:radii.full,
                background: showAdd ? colors.bgDeep : colors.pinkDeep,
                border:"none", color: showAdd ? colors.textMuted : "#fff",
                fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
              {showAdd ? "✕ Cancel" : "+ New Bucket"}
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading savings…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px", color:colors.pinkDeep, fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Summary */}
            {buckets.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"20px" }}>
                <SoftCard variant="teal" padding="16px" noAnimate>
                  <div style={{ fontSize:"10px", fontWeight:700, color:colors.tealDeep,
                    letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Total Saved</div>
                  <div style={{ fontFamily:typography.fontDisplay, fontSize:"24px", fontWeight:700,
                    color:colors.tealDeep, letterSpacing:"-0.02em" }}>{fmt(totalSaved)}</div>
                </SoftCard>
                <SoftCard variant="base" padding="16px" noAnimate>
                  <div style={{ fontSize:"10px", fontWeight:700, color:colors.textMuted,
                    letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Per Month</div>
                  <div style={{ fontFamily:typography.fontDisplay, fontSize:"24px", fontWeight:700,
                    color:colors.pink, letterSpacing:"-0.02em" }}>{fmt(totalMonthly)}</div>
                </SoftCard>
              </div>
            )}

            {/* Add / Edit form */}
            {showAdd && (
              <SoftCard variant="highlight" style={{ marginBottom:"20px" }} noAnimate>
                <div style={{ fontFamily:typography.fontDisplay, fontSize:"15px", fontWeight:700,
                  marginBottom:"4px", color:colors.pinkDeep }}>
                  {editId ? "✏️ Edit Bucket" : "✨ New Savings Bucket"}
                </div>
                <p style={{ fontSize:"12px", color:colors.textMuted, marginBottom:"4px" }}>
                  This will automatically appear as a recurring expense.
                </p>

                <Label>Bucket Name</Label>
                <input style={inp} placeholder="e.g. Emergency Fund, Japan Trip, New Laptop"
                  value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                  <div>
                    <Label>Monthly ($)</Label>
                    <input style={inp} type="number" placeholder="50" step="0.01"
                      value={form.monthly} onChange={e=>setForm(f=>({...f,monthly:e.target.value}))} />
                  </div>
                  <div>
                    <Label>Goal Target ($)</Label>
                    <input style={inp} type="number" placeholder="optional"
                      value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} />
                  </div>
                </div>

                <Label>Note (optional)</Label>
                <input style={inp} placeholder="What is this for?"
                  value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} />

                <Label>Color</Label>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"4px" }}>
                  {BUCKET_COLORS.map(c => (
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{ width:"28px", height:"28px", borderRadius:"50%", background:c,
                        border: form.color===c ? "3px solid #1a0f1e" : "3px solid transparent",
                        cursor:"pointer", padding:0 }} />
                  ))}
                </div>

                <button onClick={submitForm}
                  style={{ width:"100%", marginTop:"14px", padding:"10px", borderRadius:"9px",
                    background:"#db2777", border:"none", color:"#fff",
                    fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
                  {editId ? "Save Changes" : "Create Bucket"}
                </button>
              </SoftCard>
            )}

            {/* Bucket list */}
            {buckets.length === 0 ? (
              <SoftCard variant="ghost" style={{ textAlign:"center", padding:"48px 20px" }} noAnimate>
                <div style={{ fontSize:"40px", marginBottom:"12px" }}>🫙</div>
                <div style={{ fontSize:"14px", fontWeight:600, color:colors.textMuted, marginBottom:"6px" }}>No savings buckets yet</div>
                <div style={{ fontSize:"12px", color:colors.textFaint }}>Create one above to start saving!</div>
              </SoftCard>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {buckets.map((b, i) => {
                  const pct     = b.target > 0 ? Math.min(100, Math.round((b.saved / b.target) * 100)) : null;
                  const expEntry = expenses.find(e => e.id === `savings_${b.id}`);
                  const isPaid   = expEntry?.paid ?? false;

                  return (
                    <SoftCard key={b.id} variant="base" animDelay={i * 0.06}
                      style={{ borderLeft:`4px solid ${b.color||colors.pink}` }}>

                      {/* Top row */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:typography.fontDisplay, fontSize:"16px",
                            fontWeight:700, color:colors.text, marginBottom:"2px" }}>
                            {b.name}
                          </div>
                          {b.note && <div style={{ fontSize:"11px", color:colors.textMuted }}>{b.note}</div>}
                        </div>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <button onClick={()=>startEdit(b)}
                            style={{ background:"none", border:"none", cursor:"pointer",
                              fontSize:"14px", color:colors.textFaint, padding:"2px 4px" }}>✏️</button>
                          <button onClick={()=>deleteBucket(b.id)}
                            style={{ background:"none", border:"none", cursor:"pointer",
                              fontSize:"14px", color:colors.textFaint, padding:"2px 4px" }}>🗑</button>
                        </div>
                      </div>

                      {/* Saved amount */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"8px" }}>
                        <span style={{ fontFamily:typography.fontDisplay, fontSize:"24px",
                          fontWeight:700, color:b.color||colors.pinkDeep, letterSpacing:"-0.02em" }}>
                          {fmt(b.saved)}
                        </span>
                        {b.target > 0 && (
                          <span style={{ fontSize:"11px", color:colors.textMuted }}>
                            of {fmt(b.target)} goal
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {pct !== null && (
                        <>
                          <ProgressBar pct={pct} color={b.color||colors.pink} animDelay="0.2s" />
                          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"3px", marginBottom:"10px" }}>
                            <span style={{ fontSize:"10px", color:colors.textMuted }}>{pct}% saved</span>
                            <span style={{ fontSize:"10px", color:colors.textMuted }}>
                              {fmt(Math.max(0, b.target - b.saved))} to go
                            </span>
                          </div>
                        </>
                      )}

                      {/* Monthly contribution + paid toggle */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        paddingTop:"10px", borderTop:`1px dashed ${colors.border}` }}>
                        <div>
                          <div style={{ fontSize:"10px", color:colors.textMuted, fontWeight:700,
                            textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"2px" }}>Monthly</div>
                          <div style={{ fontSize:"14px", fontWeight:700, color:colors.text }}>
                            {fmtF(b.monthly)}
                          </div>
                        </div>
                        <button onClick={()=>markPaid(b.id, !isPaid)}
                          style={{ padding:"7px 14px", borderRadius:radii.full,
                            border:`1.5px solid ${isPaid ? colors.teal : colors.border}`,
                            background: isPaid ? colors.tealPale : colors.bgCard,
                            color: isPaid ? colors.tealDeep : colors.textMuted,
                            fontSize:"11px", fontWeight:700, cursor:"pointer",
                            transition:`all ${transitions.base}` }}>
                          {isPaid ? "✓ Contributed" : "Mark Contributed"}
                        </button>
                      </div>
                    </SoftCard>
                  );
                })}
              </div>
            )}

            {/* Footer note */}
            {buckets.length > 0 && (
              <div style={{ marginTop:"24px", padding:"14px 16px",
                backgroundColor:colors.bgWarm, border:`1px dashed ${colors.border}`,
                borderRadius:radii.xl, fontSize:"12px", color:colors.textMuted,
                lineHeight:1.6, textAlign:"center" }}>
                Each bucket auto-appears in Expenses as a recurring item. Mark it contributed here or there — both sync! 💕
              </div>
            )}
          </>
        )}
      </div>
      <Toast msg={toast} onDone={()=>setToast("")} />
    </div>
  );
}
