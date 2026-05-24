/**
 * Expenses.jsx
 * Expenses page — exact V2 spec, connected to Supabase.
 *
 * ADDED: Carry Forward panel — when leftover > 0, user picks where it goes:
 *   • Next period balance (default carryover)
 *   • Savings jar
 *   • Debt payment
 *   • Sinking fund
 *   • Custom label
 * Choice is saved to rawData.carryovers[periodKey] and persists.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

// ── Period engine ─────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildPeriods() {
  const out = [];
  const year = 2026;
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    out.push({ k:`${String(year).slice(2)}${m}a`, lbl:`${MONTHS[m]} 1–15`,          s:new Date(year,m,1),  e:new Date(year,m,15,23,59,59),        pd:new Date(year,m,7)  });
    out.push({ k:`${String(year).slice(2)}${m}b`, lbl:`${MONTHS[m]} 16–${lastDay}`, s:new Date(year,m,16), e:new Date(year,m,lastDay,23,59,59),   pd:new Date(year,m,22) });
  }
  return out;
}
const PERIODS = buildPeriods();

function currentPeriodIdx() {
  const now = new Date();
  const idx = PERIODS.findIndex(p => now >= p.s && now <= p.e);
  return idx >= 0 ? idx : Math.max(0, PERIODS.findIndex(p => p.s > now) - 1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat("en-CA", { style:"currency", currency:"CAD", minimumFractionDigits:2 })
    .format(n ?? 0).replace("CA$","$");

const todayStr = () => new Date().toISOString().split("T")[0];

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.ceil((d - t) / 86400000);
}

const CATEGORIES = [
  { value:"rent",          label:"🏠 Rent / Housing" },
  { value:"utilities",     label:"💡 Utilities" },
  { value:"groceries",     label:"🛒 Groceries" },
  { value:"transport",     label:"🚌 Transport" },
  { value:"phone",         label:"📱 Phone" },
  { value:"internet",      label:"🌐 Internet" },
  { value:"subscriptions", label:"📺 Subscriptions" },
  { value:"dining",        label:"🍜 Dining" },
  { value:"health",        label:"💊 Health" },
  { value:"savings",       label:"💰 Savings" },
  { value:"remittance",    label:"🇵🇭 Remittance" },
  { value:"school",        label:"📚 School" },
  { value:"credit",        label:"💳 CC Bill" },
  { value:"installment",   label:"📦 Installment" },
  { value:"other",         label:"🗂 Other" },
];

const CAT_ICON = c => ({
  rent:"🏠",utilities:"💡",groceries:"🛒",transport:"🚌",phone:"📱",
  internet:"🌐",subscriptions:"📺",dining:"🍜",health:"💊",savings:"💰",
  remittance:"🇵🇭",school:"📚",credit:"💳",installment:"📦",other:"🗂",
}[c] ?? "🗂");

const PAY_TYPES  = [
  { value:"banking",   label:"🏦 Online Banking" },
  { value:"etransfer", label:"📲 e-Transfer" },
  { value:"auto",      label:"🔁 Auto-Pay" },
  { value:"debit",     label:"💳 Debit" },
  { value:"cash",      label:"💵 Cash" },
  { value:"cheque",    label:"📝 Cheque" },
];
const RECUR_OPTS = [
  { value:"no",        label:"One-time only" },
  { value:"monthly",   label:"Monthly" },
  { value:"biweekly",  label:"Every pay period" },
];

// ── Carry Forward destinations ────────────────────────────────────────────────
const CF_OPTIONS = [
  { value:"next",     label:"➡️ Carry to next period",   desc:"Adds to next period's available balance" },
  { value:"savings",  label:"🫙 Add to Savings Jar",      desc:"Choose a jar to top up" },
  { value:"debt",     label:"💳 Extra Debt Payment",       desc:"Apply to a credit card balance" },
  { value:"sinking",  label:"🪣 Sinking Fund",             desc:"Save for a future irregular expense" },
  { value:"custom",   label:"✏️ Custom Category",          desc:"Label it yourself" },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle = {
  background:"#ffffff", border:"1px solid #fce7f3", borderRadius:"14px",
  padding:"16px", marginBottom:"12px",
  boxShadow:"0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)",
};
const inp = {
  width:"100%", padding:"9px 11px", background:"#fff5f9",
  border:"1.5px solid #fce7f3", borderRadius:"9px",
  fontFamily:"'DM Sans',sans-serif", fontSize:"14px",
  color:"#1a0f1e", outline:"none", transition:"border-color .15s",
  WebkitAppearance:"none",
};

function Label({ children }) {
  return <div style={{ fontSize:"0.62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9b6b8a", margin:"11px 0 4px" }}>{children}</div>;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{ position:"fixed",bottom:"90px",left:"50%",transform:"translateX(-50%)",background:"#1a0f1e",color:"#f6f2ec",borderRadius:"99px",padding:"9px 20px",fontSize:"13px",fontWeight:600,zIndex:700,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.25)",animation:"fadeUp .2s ease both" }}>
      {msg}
    </div>
  );
}

// ── CarryForwardPanel ─────────────────────────────────────────────────────────
function CarryForwardPanel({ remaining, periodKey, nextPeriodLbl, rawData, onSave, saving }) {
  const existing    = rawData?.carryovers?.[periodKey];
  const goals       = rawData?.goals   ?? [];
  const cards       = rawData?.cards   ?? [];

  const [dest,      setDest]      = useState(existing?.dest      ?? "next");
  const [jarId,     setJarId]     = useState(existing?.jarId     ?? (goals[0]?.id ?? ""));
  const [cardId,    setCardId]    = useState(existing?.cardId    ?? (cards[0]?.id ?? ""));
  const [sinkLabel, setSinkLabel] = useState(existing?.sinkLabel ?? "");
  const [customLbl, setCustomLbl] = useState(existing?.customLbl ?? "");
  const [amt,       setAmt]       = useState(existing?.amt       ?? remaining);
  const [enabled,   setEnabled]   = useState(existing?.use !== false);

  // Keep amount in sync with remaining when user hasn't overridden
  useEffect(() => {
    if (!existing) setAmt(remaining);
  }, [remaining]);

  function buildCarryoverRecord() {
    return {
      use:        enabled,
      dest,
      amt:        enabled ? Math.min(parseFloat(amt)||0, remaining) : 0,
      jarId:      dest==="savings" ? jarId  : null,
      cardId:     dest==="debt"    ? cardId : null,
      sinkLabel:  dest==="sinking" ? sinkLabel : null,
      customLbl:  dest==="custom"  ? customLbl : null,
      savedAt:    todayStr(),
    };
  }

  function handleSave() {
    const co = buildCarryoverRecord();
    // If savings jar selected, also top up the jar's saved amount
    let updated = {
      ...rawData,
      carryovers: { ...(rawData.carryovers ?? {}), [periodKey]: co },
    };
    if (co.use && dest === "savings" && jarId) {
      const addAmt = co.amt;
      updated = {
        ...updated,
        goals: (rawData.goals ?? []).map(g =>
          String(g.id) === String(jarId)
            ? { ...g, saved: (Number(g.saved)||0) + addAmt }
            : g
        ),
      };
    }
    // If debt payment selected, reduce card balance
    if (co.use && dest === "debt" && cardId) {
      const addAmt = co.amt;
      updated = {
        ...updated,
        cards: (rawData.cards ?? []).map(c =>
          String(c.id) === String(cardId)
            ? { ...c, balance: Math.max(0, (c.balance ?? c.bal ?? 0) - addAmt), bal: Math.max(0, (c.balance ?? c.bal ?? 0) - addAmt) }
            : c
        ),
      };
    }
    onSave(updated);
  }

  const cfLabel = dest === "next"    ? `Rolls into ${nextPeriodLbl || "next period"}`
                : dest === "savings" ? (goals.find(g=>String(g.id)===String(jarId))?.label ?? "Savings Jar")
                : dest === "debt"    ? (cards.find(c=>String(c.id)===String(cardId))?.label ?? "Credit Card")
                : dest === "sinking" ? (sinkLabel || "Sinking Fund")
                : (customLbl || "Custom");

  return (
    <div style={{ ...cardStyle, borderColor: remaining > 0 ? "#9ecab0" : "#fce7f3", background: remaining > 0 ? "#f0faf4" : "#fff5f9" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
        <div style={{ fontFamily:typography?.fontDisplay, fontSize:"0.97rem", fontWeight:700, color:"#1a0f1e" }}>
          💚 Carry Forward
        </div>
        {/* Enable toggle */}
        <label style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" }}>
          <span style={{ fontSize:"0.72rem", color:"#9b6b8a", fontWeight:600 }}>{enabled ? "On" : "Off"}</span>
          <div
            onClick={() => setEnabled(e => !e)}
            style={{ width:"38px", height:"22px", borderRadius:"11px", position:"relative", cursor:"pointer",
              background: enabled ? "#3a6b4e" : "#d4b8c4", transition:"background .2s" }}>
            <div style={{ position:"absolute", top:"3px", left: enabled?"17px":"3px", width:"16px", height:"16px",
              borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
        </label>
      </div>

      {/* Leftover summary */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#eaf3ee", border:"1px solid #9ecab0", borderRadius:"9px",
        padding:"10px 14px", marginBottom:"12px" }}>
        <span style={{ fontSize:"0.81rem", color:"#3a6b4e", fontWeight:600 }}>
          {remaining >= 0 ? "Leftover this period" : "Over budget"}
        </span>
        <span style={{ fontFamily:typography?.fontDisplay, fontSize:"1.1rem", fontWeight:700,
          color: remaining >= 0 ? "#3a6b4e" : "#c24b1a" }}>
          {remaining >= 0 ? fmt(remaining) : `-${fmt(Math.abs(remaining))}`}
        </span>
      </div>

      {!enabled ? (
        <p style={{ fontSize:"0.75rem", color:"#9b6b8a", textAlign:"center", padding:"8px 0" }}>
          Carry Forward is off. Leftover money won't be tracked.
        </p>
      ) : (
        <>
          {/* Amount to carry */}
          <Label>Amount to Carry Forward</Label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",color:"#9b6b8a",fontWeight:700 }}>$</span>
            <input style={{ ...inp, paddingLeft:"24px" }} type="number" min="0" step="0.01"
              max={remaining} value={amt}
              onChange={e => setAmt(e.target.value)} />
          </div>
          {parseFloat(amt) > remaining && remaining > 0 && (
            <div style={{ fontSize:"0.67rem", color:"#c24b1a", marginTop:"3px" }}>⚠ Can't carry more than your leftover ({fmt(remaining)})</div>
          )}

          {/* Destination */}
          <Label>Where should it go?</Label>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"10px" }}>
            {CF_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display:"flex", alignItems:"flex-start", gap:"10px",
                padding:"10px 12px", borderRadius:"9px", cursor:"pointer",
                background: dest===opt.value ? "#eaf3ee" : "#fff5f9",
                border:`1.5px solid ${dest===opt.value ? "#9ecab0" : "#fce7f3"}`,
                transition:"all .15s" }}>
                <input type="radio" name={`cf-dest-${periodKey}`} value={opt.value}
                  checked={dest===opt.value} onChange={()=>setDest(opt.value)}
                  style={{ marginTop:"2px", accentColor:"#3a6b4e", flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:"0.81rem", fontWeight:700, color:"#1a0f1e" }}>{opt.label}</div>
                  <div style={{ fontSize:"0.67rem", color:"#9b6b8a" }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Sub-options based on destination */}
          {dest === "savings" && goals.length > 0 && (
            <>
              <Label>Which Savings Jar?</Label>
              <select style={inp} value={jarId} onChange={e=>setJarId(e.target.value)}>
                {goals.map(g => <option key={g.id} value={g.id}>{g.label} ({fmt(g.saved||0)} saved)</option>)}
              </select>
            </>
          )}
          {dest === "savings" && goals.length === 0 && (
            <p style={{ fontSize:"0.72rem", color:"#9b6b8a", marginTop:"6px" }}>No savings jars found. Add goals in Settings first.</p>
          )}
          {dest === "debt" && cards.length > 0 && (
            <>
              <Label>Which Credit Card?</Label>
              <select style={inp} value={cardId} onChange={e=>setCardId(e.target.value)}>
                {cards.map(c => <option key={c.id} value={c.id}>{c.label ?? c.name} (Balance: {fmt(c.balance ?? c.bal ?? 0)})</option>)}
              </select>
            </>
          )}
          {dest === "debt" && cards.length === 0 && (
            <p style={{ fontSize:"0.72rem", color:"#9b6b8a", marginTop:"6px" }}>No credit cards found. Add cards first.</p>
          )}
          {dest === "sinking" && (
            <>
              <Label>Sinking Fund Name</Label>
              <input style={inp} placeholder="e.g. Car repairs, Christmas gifts" value={sinkLabel} onChange={e=>setSinkLabel(e.target.value)} />
            </>
          )}
          {dest === "custom" && (
            <>
              <Label>Custom Label</Label>
              <input style={inp} placeholder="e.g. Extra groceries budget" value={customLbl} onChange={e=>setCustomLbl(e.target.value)} />
            </>
          )}

          {/* Summary line */}
          <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"9px",
            padding:"10px 14px", margin:"12px 0", fontSize:"0.79rem", color:"#1a0f1e" }}>
            <strong>{fmt(Math.min(parseFloat(amt)||0, Math.max(remaining,0)))}</strong>
            <span style={{ color:"#9b6b8a" }}> → </span>
            <strong style={{ color:"#3a6b4e" }}>{cfLabel}</strong>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width:"100%", padding:"10px", borderRadius:"9px", border:"none",
              background: saving ? "#d4b8c4" : "#3a6b4e", color:"#fff",
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px",
              cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "✓ Save Carry Forward Choice"}
          </button>
        </>
      )}

      {/* Show saved choice if already set */}
      {existing?.savedAt && (
        <div style={{ marginTop:"8px", fontSize:"0.67rem", color:"#9b6b8a", textAlign:"center" }}>
          Last saved: {existing.savedAt}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Expenses() {
  const [rawData,  setRawData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState("");
  const [expIdx,   setExpIdx]   = useState(currentPeriodIdx);

  const blank = { name:"", amt:"", due:"", cat:"rent", card:"", payType:"banking", recur:"no" };
  const [form, setForm] = useState(blank);

  // ── Load ──────────────────────────────────────────────────────────────────
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
      } catch(err) { if(!dead) setError(err.message??"Failed to load"); }
      finally      { if(!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { data:row } = await supabase.from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data:{ budgetsbloom:JSON.stringify(updated) } })
        .eq("id", row.id);
      setRawData(updated);
    } catch(e) {
      setToast("❌ Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allExpenses = useMemo(() => rawData?.expenses ?? [], [rawData]);
  const cards       = useMemo(() => rawData?.cards    ?? [], [rawData]);
  const sentMap     = useMemo(() => rawData?.sent     ?? {}, [rawData]);

  const period    = PERIODS[expIdx];
  const periodKey = period?.k ?? "";
  const nextPeriod = PERIODS[expIdx + 1];

  const periodExpenses = useMemo(() => {
    if (!period) return [];
    return allExpenses.filter(e => {
      if (!e.due) return false;
      const d = new Date(e.due + "T12:00:00");
      return d >= period.s && d <= period.e;
    }).sort((a,b) => new Date(a.due)-new Date(b.due));
  }, [allExpenses, period]);

  const getCarryover = useCallback((pidx) => {
    if (pidx <= 0) return 0;
    const k  = PERIODS[pidx]?.k;
    const co = rawData?.carryovers?.[k];
    if (co && co.use === false) return 0;
    if (co && co.amt != null)  return co.amt;
    const prevK    = PERIODS[pidx-1].k;
    const prevSent = (sentMap[prevK]??[]).reduce((s,x)=>s+(x.amt??0),0);
    const prevCo   = getCarryover(pidx-1);
    const prevExps = allExpenses.filter(e=>{
      if(!e.due) return false;
      const d = new Date(e.due+"T12:00:00");
      return d>=PERIODS[pidx-1].s && d<=PERIODS[pidx-1].e;
    }).reduce((s,e)=>s+(e.amt??0),0);
    return Math.max(0, prevSent+prevCo-prevExps);
  }, [rawData, sentMap, allExpenses]);

  const carryover  = useMemo(() => getCarryover(expIdx), [getCarryover, expIdx]);
  const income     = useMemo(() => (sentMap[periodKey]??[]).reduce((s,x)=>s+(x.amt??0),0), [sentMap,periodKey]);
  const totalAmt   = useMemo(() => periodExpenses.reduce((s,e)=>s+(e.amt??0),0), [periodExpenses]);
  const paidAmt    = useMemo(() => periodExpenses.filter(e=>e.paid).reduce((s,e)=>s+(e.amt??0),0), [periodExpenses]);
  const paidCount  = useMemo(() => periodExpenses.filter(e=>e.paid).length, [periodExpenses]);
  const pool       = income + carryover;
  const remaining  = pool - totalAmt;

  // ── Actions ───────────────────────────────────────────────────────────────
  function addExpense() {
    if (!form.name.trim() || !form.amt) { setToast("⚠️ Name and amount required"); return; }
    const due = form.due || period.pd.toISOString().split("T")[0];
    const expense = { id:"e"+Date.now(), name:form.name.trim(), amt:parseFloat(form.amt), due, cat:form.cat, card:form.card, payType:form.payType, recur:form.recur, paid:false };
    save({ ...rawData, expenses:[...allExpenses, expense] });
    setForm(f=>({...blank,cat:f.cat,payType:f.payType,recur:f.recur}));
    setToast("✅ Expense added!");
  }

  function togglePaid(id, val) {
    save({ ...rawData, expenses:allExpenses.map(e=>e.id===id?{...e,paid:val}:e) });
    if (val) setToast("✅ Marked as paid!");
  }

  function delExpense(id) {
    save({ ...rawData, expenses:allExpenses.filter(e=>e.id!==id) });
    setToast("🗑 Removed");
  }

  function moveExp(dir) {
    setExpIdx(i=>Math.max(0,Math.min(PERIODS.length-1,i+dir)));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"#fdf6f8",fontFamily:"'DM Sans',sans-serif",color:"#1a0f1e",paddingBottom:"80px" }}>
      <div style={{ maxWidth:"640px",margin:"0 auto",padding:"14px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"28px 0 14px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:"#9b6b8a",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Budget</p>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
            <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"28px",fontWeight:700,color:"#1a0f1e",letterSpacing:"-0.02em",lineHeight:1.1 }}>Expenses</h1>
            {saving && <span style={{ fontSize:"11px",color:"#9b6b8a" }}>Saving…</span>}
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading expenses…" />}
        {error   && <div style={{ background:"#fdedf1",border:"1px solid #f4a0b4",borderRadius:"14px",padding:"14px",marginBottom:"12px",color:"#c94d6a",fontSize:"13px" }}>⚠ {error}</div>}

        {!loading && !error && (
          <>
            {/* Carryover bar */}
            {carryover > 0 && (
              <div style={{ background:"#eaf3ee",border:"1px solid #9ecab0",borderRadius:"9px",padding:"10px 14px",marginBottom:"10px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"0.61rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#3a6b4e" }}>Carryover from last period</div>
                  <div style={{ fontWeight:700,fontSize:"0.97rem",color:"#3a6b4e" }}>{fmt(carryover)}</div>
                </div>
                <span style={{ fontSize:"0.72rem",color:"#3a6b4e" }}>✓ Included in pool</span>
              </div>
            )}

            {/* Period navigator */}
            <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"12px" }}>
              <button onClick={()=>moveExp(-1)} disabled={expIdx===0} style={{ background:"#ffffff",border:"1.5px solid #f0dce4",borderRadius:"9px",padding:"7px 12px",fontWeight:700,color:"#9b6b8a",cursor:expIdx===0?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",opacity:expIdx===0?0.4:1 }}>‹</button>
              <div style={{ flex:1,textAlign:"center",background:"#ffffff",border:"1.5px solid #f0dce4",borderRadius:"9px",padding:"7px 10px",fontFamily:typography.fontDisplay,fontWeight:700,fontSize:"14px" }}>
                {period?.lbl}
              </div>
              <button onClick={()=>moveExp(1)} disabled={expIdx===PERIODS.length-1} style={{ background:"#ffffff",border:"1.5px solid #f0dce4",borderRadius:"9px",padding:"7px 12px",fontWeight:700,color:"#9b6b8a",cursor:expIdx===PERIODS.length-1?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",opacity:expIdx===PERIODS.length-1?0.4:1 }}>›</button>
            </div>

            {/* Yellow alert */}
            <div style={{ background:"#faf5e6",border:"1px solid #dcca84",borderRadius:"9px",padding:"10px 14px",marginBottom:"12px",fontSize:"0.79rem",color:"#7a5010",lineHeight:1.5 }}>
              💸 Paydays are the <strong>7th & 22nd</strong>. Expenses shown by due date within the period.
            </div>

            {/* Add Expense form */}
            <div style={cardStyle}>
              <div style={{ fontFamily:typography.fontDisplay,fontSize:"0.97rem",fontWeight:700,marginBottom:"4px" }}>+ Add Expense</div>
              <Label>Name</Label>
              <input style={inp} placeholder="e.g. Rent, Hydro, Netflix" value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addExpense()} />
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
                <div><Label>Amount ($)</Label><input style={inp} type="number" placeholder="0.00" step="0.01" value={form.amt} onChange={e=>setForm(f=>({...f,amt:e.target.value}))} /></div>
                <div><Label>Due Date</Label><input style={inp} type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))} /></div>
              </div>
              <Label>Category</Label>
              <select style={inp} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <Label>Charge To</Label>
              <select style={inp} value={form.card} onChange={e=>setForm(f=>({...f,card:e.target.value}))}>
                <option value="">Cash / Debit / Chequing</option>
                {cards.map(c=><option key={c.id} value={c.id}>{(c.label??c.name)} ({c.owner})</option>)}
              </select>
              <Label>Pay Type</Label>
              <select style={inp} value={form.payType} onChange={e=>setForm(f=>({...f,payType:e.target.value}))}>
                {PAY_TYPES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <Label>Recurring?</Label>
              <select style={inp} value={form.recur} onChange={e=>setForm(f=>({...f,recur:e.target.value}))}>
                {RECUR_OPTS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={addExpense} style={{ width:"100%",marginTop:"10px",padding:"10px",borderRadius:"9px",background:"#db2777",border:"none",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:"14px",cursor:"pointer" }}>+ Add Expense</button>
            </div>

            {/* Expense list */}
            <div style={cardStyle}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                <div style={{ fontFamily:typography.fontDisplay,fontSize:"0.97rem",fontWeight:700 }}>
                  Expenses <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"0.7rem",fontWeight:400,color:"#9b6b8a",marginLeft:"4px" }}>— {period?.lbl}</span>
                </div>
                <span style={{ fontWeight:700,color:"#db2777",fontSize:"0.85rem" }}>{fmt(totalAmt)}</span>
              </div>
              {periodExpenses.length===0 ? (
                <p style={{ color:"#9b6b8a",fontSize:"0.75rem" }}>No expenses for this period. Add one above!</p>
              ) : (
                periodExpenses.map((e,i) => {
                  const diff    = daysDiff(e.due);
                  const overdue = diff!==null && diff<0 && !e.paid;
                  const soon    = diff!==null && diff>=0 && diff<=3 && !e.paid;
                  const linked  = cards.find(c=>c.id===e.card);
                  return (
                    <div key={e.id} style={{ display:"flex",alignItems:"center",gap:"9px",padding:"9px 0",borderBottom:i<periodExpenses.length-1?"1px solid #fce7f3":"none",opacity:e.paid?0.42:1 }}>
                      <input type="checkbox" checked={!!e.paid} onChange={ev=>togglePaid(e.id,ev.target.checked)}
                        style={{ width:"17px",height:"17px",flexShrink:0,cursor:"pointer",accentColor:"#3a6b4e" }} />
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"0.83rem",fontWeight:600,textDecoration:e.paid?"line-through":"none" }}>
                          {CAT_ICON(e.cat)} {e.name}
                          {linked && <span style={{ background:"#eaf1f9",color:"#2860a0",fontSize:"0.57rem",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"2px 7px",borderRadius:"5px",marginLeft:"5px" }}>{linked.label??linked.name}</span>}
                          {e.recur!=="no" && <span style={{ background:"#f5f0ff",color:"#7c3aed",fontSize:"0.57rem",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",padding:"2px 7px",borderRadius:"5px",marginLeft:"4px" }}>{e.recur==="monthly"?"Monthly":"Biweekly"}</span>}
                        </div>
                        <div style={{ fontSize:"0.67rem",color:"#9b6b8a",marginTop:"1px" }}>
                          Due {e.due}
                          {overdue && <strong style={{ color:"#c24b1a",marginLeft:"4px" }}>OVERDUE</strong>}
                          {soon    && <span  style={{ color:"#a67c20",marginLeft:"4px" }}>· Due soon</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontSize:"0.85rem",fontWeight:700 }}>{fmt(e.amt)}</div>
                        <button onClick={()=>delExpense(e.id)}
                          style={{ background:"none",border:"none",cursor:"pointer",color:"#d4b8c4",fontSize:"0.95rem",padding:"0 2px",transition:"color .15s" }}
                          onMouseEnter={e2=>e2.target.style.color="#c24b1a"}
                          onMouseLeave={e2=>e2.target.style.color="#d4b8c4"}>🗑</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Period Summary */}
            <div style={cardStyle}>
              <div style={{ fontFamily:typography.fontDisplay,fontSize:"0.97rem",fontWeight:700,marginBottom:"10px" }}>📊 Period Summary</div>
              <div style={{ background:"#fff5f9",border:"1px solid #fce7f3",borderRadius:"9px",padding:"13px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.81rem",marginBottom:"6px" }}>
                  <span style={{ color:"#9b6b8a" }}>Income this period</span>
                  <span style={{ fontWeight:700,color:"#3a6b4e" }}>{fmt(income)}</span>
                </div>
                {carryover>0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.81rem",marginBottom:"6px" }}>
                    <span style={{ color:"#9b6b8a" }}>Carryover</span>
                    <span style={{ fontWeight:700,color:"#a67c20" }}>{fmt(carryover)}</span>
                  </div>
                )}
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.81rem",marginBottom:"6px" }}>
                  <span style={{ color:"#9b6b8a" }}>Total budgeted</span>
                  <span style={{ fontWeight:700,color:"#db2777" }}>{fmt(totalAmt)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.81rem",marginBottom:"6px" }}>
                  <span style={{ color:"#9b6b8a" }}>Paid so far ({paidCount}/{periodExpenses.length})</span>
                  <span style={{ fontWeight:700,color:"#3a6b4e" }}>{fmt(paidAmt)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.81rem",paddingTop:"8px",borderTop:"1px solid #fce7f3",fontWeight:700 }}>
                  <span>Remaining</span>
                  <span style={{ fontSize:"1.05rem",color:remaining>=0?"#3a6b4e":"#c24b1a" }}>
                    {remaining>=0?fmt(remaining):`-${fmt(Math.abs(remaining))}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {totalAmt>0 && (
              <div style={{ ...cardStyle,padding:"14px 16px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.83rem",fontWeight:600,marginBottom:"6px" }}>
                  <span>Expense Progress</span>
                  <span style={{ color:"#9b6b8a",fontSize:"0.72rem" }}>{fmt(paidAmt)} / {fmt(totalAmt)}</span>
                </div>
                <div style={{ height:"7px",background:"#fce7f3",borderRadius:"4px",overflow:"hidden",marginBottom:"6px" }}>
                  <div style={{ height:"100%",width:`${totalAmt>0?(paidAmt/totalAmt*100):0}%`,background:"#db2777",borderRadius:"4px",transition:`width 0.6s ${transitions.spring}` }} />
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.67rem",color:"#9b6b8a" }}>
                  <span>{paidCount} paid ✓</span>
                  <span>{periodExpenses.length-paidCount} pending · {fmt(totalAmt-paidAmt)}</span>
                </div>
              </div>
            )}

            {/* ── CARRY FORWARD PANEL ── */}
            <CarryForwardPanel
              remaining={remaining}
              periodKey={periodKey}
              nextPeriodLbl={nextPeriod?.lbl}
              rawData={rawData}
              onSave={save}
              saving={saving}
            />
          </>
        )}
      </div>
      <Toast msg={toast} onDone={()=>setToast("")} />
    </div>
  );
}
