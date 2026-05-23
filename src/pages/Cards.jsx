/**
 * Cards.jsx
 * Credit cards dashboard — V2 design, full CRUD, connected to Supabase.
 * Features: Add Card, Record Payment, Update Balance, Delete, Payment History, Installments
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, shadows, transitions } from "../ui/designTokens";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n ?? 0);

const today = () => new Date().toISOString().split("T")[0];

function calcMin(card) {
  const pct = card.minPct ?? 2.5;
  const bal = card.balance ?? card.bal ?? 0;
  return Math.max(10, +(bal * (pct / 100)).toFixed(2));
}

function utilizationColor(pct) {
  if (pct >= 70) return colors.pinkDeep;
  if (pct >= 40) return colors.gold;
  return colors.teal;
}

function dueDayStatus(dueDay) {
  if (!dueDay) return null;
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) due.setMonth(due.getMonth() + 1);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: "Overdue",    color: colors.pinkDeep, bg: "#fce0e8", icon: "🚨" };
  if (diff <= 3) return { label: "Due Soon",   color: colors.gold,     bg: colors.goldPale, icon: "⚠️" };
  return           { label: `Due in ${diff}d`, color: colors.teal,     bg: colors.tealPale, icon: "✓" };
}

const CARD_GRADIENTS = [
  "linear-gradient(135deg,#c0336a 0%,#e8557a 60%,#f07090 100%)",
  "linear-gradient(135deg,#1a5c3a 0%,#2d7a52 60%,#3a9060 100%)",
  "linear-gradient(135deg,#2a3580 0%,#4455b0 60%,#6070d0 100%)",
  "linear-gradient(135deg,#a67c20 0%,#c89830 60%,#deb84a 100%)",
  "linear-gradient(135deg,#7c3aed 0%,#9050c8 60%,#b070e0 100%)",
];

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(58,36,48,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 0 0",
      }}
    >
      <div className="scale-in" style={{
        background: colors.bgCard, borderRadius: `${radii["2xl"]} ${radii["2xl"]} 0 0`,
        padding: "24px 20px 32px", width: "100%", maxWidth: "520px",
        boxShadow: shadows.xl, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h3 style={{ fontFamily: typography.fontDisplay, fontSize: "18px", fontWeight: 700, color: colors.text }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: colors.bgDeep, border: "none", borderRadius: radii.full,
            width: "30px", height: "30px", cursor: "pointer", fontSize: "14px", color: colors.textMuted,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: colors.bg, border: `1.5px solid ${colors.border}`,
  borderRadius: radii.md, fontFamily: typography.fontBody,
  fontSize: "14px", color: colors.text, outline: "none",
  transition: `border-color ${transitions.base}`,
};

// ── CreditCardFace ────────────────────────────────────────────────────────────
function CreditCardFace({ card, index, onPay, onUpdateBal, onDelete }) {
  const [showHistory, setShowHistory] = useState(false);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const bal = card.balance ?? card.bal ?? 0;
  const utilPct = card.limit > 0 ? Math.round((bal / card.limit) * 100) : 0;
  const status = dueDayStatus(card.dueDay ?? card.dueDay);
  const minAmt = calcMin(card);
  const recentPays = (card.payments ?? []).slice(0, 3);

  return (
    <div className="fade-up" style={{ animationDelay: `${index * 0.08}s`, marginBottom: "4px" }}>
      {/* Card face */}
      <div style={{
        background: gradient, borderRadius: `${radii["2xl"]} ${radii["2xl"]} 0 0`,
        padding: "20px 18px 16px", position: "relative", overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute",right:"-28px",bottom:"-28px",width:"130px",height:"130px",borderRadius:"50%",background:"rgba(255,255,255,0.07)" }} />
        <div style={{ position:"absolute",right:"28px",bottom:"-48px",width:"90px",height:"90px",borderRadius:"50%",background:"rgba(255,255,255,0.05)" }} />

        {/* Header row */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
          <div>
            <div style={{ fontSize:"13px",fontWeight:700,color:"rgba(255,255,255,0.95)",marginBottom:"2px" }}>{card.label ?? card.name}</div>
            {card.owner && <div style={{ fontSize:"10px",color:"rgba(255,255,255,0.6)" }}>{card.owner}</div>}
          </div>
          {/* Chip */}
          <div style={{ width:"28px",height:"22px",borderRadius:"4px",background:"linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.15))",border:"1px solid rgba(255,255,255,0.3)" }} />
        </div>

        {/* Balance */}
        <div style={{ fontFamily:typography.fontDisplay,fontSize:"28px",fontWeight:700,color:"#ffffff",letterSpacing:"-0.02em",lineHeight:1,marginBottom:"4px" }}>
          {fmt(bal)}
        </div>
        <div style={{ fontSize:"10px",color:"rgba(255,255,255,0.6)",marginBottom:"12px" }}>
          Limit {fmt(card.limit)} · Available {fmt((card.limit ?? 0) - bal)} · {card.apr ?? card.apr}% APR
        </div>

        {/* Utilization bar */}
        <div style={{ height:"3px",borderRadius:"99px",background:"rgba(255,255,255,0.2)",marginBottom:"14px",overflow:"hidden" }}>
          <div style={{
            height:"100%",width:`${utilPct}%`,borderRadius:"99px",
            background: utilPct>=70?"#ffb0b0":utilPct>=40?"#ffd080":"#80ffcc",
            transition:`width 0.6s ${transitions.spring}`,
          }} />
        </div>

        {/* Actions */}
        <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
          <button onClick={() => onPay(card)} style={{
            padding:"6px 14px",borderRadius:radii.full,
            background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",
            color:"#ffffff",fontSize:"11px",fontWeight:700,cursor:"pointer",letterSpacing:"0.02em",
          }}>💳 Pay</button>
          <button onClick={() => onUpdateBal(card)} style={{
            padding:"6px 14px",borderRadius:radii.full,
            background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",
            color:"#ffffff",fontSize:"11px",fontWeight:700,cursor:"pointer",letterSpacing:"0.02em",
          }}>✏️ Balance</button>
          <button onClick={() => onDelete(card)} style={{
            padding:"6px 10px",borderRadius:radii.full,
            background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
            color:"rgba(255,255,255,0.7)",fontSize:"11px",cursor:"pointer",
          }}>🗑</button>
          {/* Due + Min chips */}
          <div style={{ marginLeft:"auto",display:"flex",gap:"5px" }}>
            <div style={{ padding:"3px 9px",borderRadius:radii.full,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.25)",textAlign:"center" }}>
              <div style={{ fontSize:"8px",color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Due</div>
              <div style={{ fontSize:"12px",fontWeight:700,color:"#fff",lineHeight:1.2 }}>{card.dueDay ?? "—"}</div>
            </div>
            <div style={{ padding:"3px 9px",borderRadius:radii.full,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.25)",textAlign:"center" }}>
              <div style={{ fontSize:"8px",color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Min</div>
              <div style={{ fontSize:"12px",fontWeight:700,color:"#fff",lineHeight:1.2 }}>${minAmt}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary panel */}
      <div style={{
        background:colors.goldPale, border:`1px solid ${colors.goldLight}40`,
        borderRadius:`0 0 ${radii.xl} ${radii.xl}`, padding:"12px 18px", marginBottom:"20px",
      }}>
        <div style={{ fontSize:"9px",fontWeight:800,color:colors.gold,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px",display:"flex",alignItems:"center",gap:"4px" }}>
          {status?.icon ?? "💰"} PAYMENT SUMMARY
        </div>
        {[
          { label:"Balance Owing",     value: fmt(bal) },
          { label:`Min Payment (${card.minPct ?? 2.5}%)`, value: fmt(minAmt) },
          { label:"Due Date",          value: card.dueDay ? `Day ${card.dueDay}` : "—" },
          { label:"Utilization",       value: `${utilPct}%`, color: utilizationColor(utilPct) },
          { label:"Available Credit",  value: fmt((card.limit ?? 0) - bal), color: colors.teal },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${colors.goldLight}30` }}>
            <span style={{ fontSize:"12px",color:colors.textSoft }}>{label}</span>
            <span style={{ fontSize:"12px",fontWeight:600,color:color??colors.text }}>{value}</span>
          </div>
        ))}

        {/* Status badge */}
        {status && (
          <div style={{ marginTop:"8px",display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",borderRadius:radii.full,background:status.bg,border:`1px solid ${status.color}30` }}>
            <span style={{ fontSize:"10px" }}>{status.icon}</span>
            <span style={{ fontSize:"10px",fontWeight:700,color:status.color }}>{status.label}</span>
          </div>
        )}

        {/* Payment history toggle */}
        {recentPays.length > 0 && (
          <div style={{ marginTop:"8px" }}>
            <button onClick={() => setShowHistory(h => !h)} style={{
              background:"none",border:"none",cursor:"pointer",
              fontSize:"10px",fontWeight:700,color:colors.textMuted,padding:0,
              letterSpacing:"0.04em",
            }}>
              {showHistory ? "▲" : "▼"} Recent Payments ({recentPays.length})
            </button>
            {showHistory && (
              <div style={{ marginTop:"6px" }}>
                {recentPays.map(p => (
                  <div key={p.id} style={{ display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:"11px" }}>
                    <span style={{ color:colors.textSoft }}>{p.date}</span>
                    <span style={{ fontWeight:700,color:colors.teal }}>-{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── InstallmentCard ───────────────────────────────────────────────────────────
function InstallmentCard({ item, index, onDelete }) {
  const monthsPaid = item.paid ?? 0;
  const totalMonths = item.months ?? 1;
  const paidPct = Math.round((monthsPaid / totalMonths) * 100);
  const paidAmt = monthsPaid * (item.amt ?? item.monthly ?? 0);
  const totalAmt = totalMonths * (item.amt ?? item.monthly ?? 0);
  const remaining = totalAmt - paidAmt;
  const monthsLeft = totalMonths - monthsPaid;

  return (
    <SoftCard variant="base" animDelay={index * 0.08} padding="18px 20px">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
        <div>
          <div style={{ fontFamily:typography.fontDisplay,fontSize:"15px",fontWeight:700,color:colors.text,marginBottom:"2px" }}>{item.label ?? item.name}</div>
          {item.start ?? item.startDate
            ? <div style={{ fontSize:"10px",color:colors.textMuted }}>Started {new Date((item.start ?? item.startDate) + "T00:00:00").toLocaleDateString("en-CA",{month:"short",year:"numeric"})}</div>
            : null}
        </div>
        <div style={{ display:"flex",gap:"6px",alignItems:"center" }}>
          <div style={{ padding:"4px 10px",borderRadius:radii.full,background:colors.mauvePale,border:`1px solid ${colors.mauve}40` }}>
            <span style={{ fontSize:"10px",fontWeight:700,color:colors.mauve }}>INST</span>
          </div>
          <button onClick={() => onDelete(item)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"14px",color:colors.textFaint,padding:"0" }}>🗑</button>
        </div>
      </div>
      <div style={{ marginBottom:"10px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
          <span style={{ fontSize:"11px",color:colors.textMuted }}>Progress</span>
          <span style={{ fontSize:"11px",fontWeight:700,color:colors.mauve }}>{paidPct}% paid</span>
        </div>
        <div style={{ height:"6px",background:colors.bgDeep,borderRadius:"99px",overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${paidPct}%`,background:`linear-gradient(90deg,${colors.mauve},${colors.pinkLight})`,borderRadius:"99px",transition:`width 0.6s ${transitions.spring}` }} />
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"8px" }}>
        {[
          { label:"Total",     value:fmt(totalAmt) },
          { label:"Paid",      value:fmt(paidAmt), color:colors.teal },
          { label:"Remaining", value:fmt(remaining), color:colors.pinkDeep },
        ].map(({ label,value,color }) => (
          <div key={label} style={{ background:colors.bgDeep,borderRadius:radii.md,padding:"8px 10px",textAlign:"center" }}>
            <div style={{ fontSize:"9px",color:colors.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px" }}>{label}</div>
            <div style={{ fontSize:"12px",fontWeight:700,color:color??colors.text }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:"11px",color:colors.textMuted,textAlign:"center" }}>
        {monthsLeft > 0 ? `${monthsLeft} month${monthsLeft!==1?"s":""} left · ${fmt(item.amt ?? item.monthly)}/mo` : "🎉 Fully paid!"}
      </div>
    </SoftCard>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cards() {
  const [rawData,   setRawData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);
  const [tab,       setTab]       = useState("cards");

  // Modals
  const [payModal,    setPayModal]    = useState(null); // card object
  const [balModal,    setBalModal]    = useState(null); // card object
  const [addModal,    setAddModal]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(null); // {type, item}

  // Form state
  const [payAmt,  setPayAmt]  = useState("");
  const [newBal,  setNewBal]  = useState("");
  const [newCard, setNewCard] = useState({ label:"", owner:"Zai", limit:"", balance:"", apr:"19.99", minPct:"2.5", dueDay:"" });
  const [newInst, setNewInst] = useState({ label:"", amt:"", months:"", paid:"0", start:"" });

  // ── Load ────────────────────────────────────────────────────────────────────
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

  // ── Save helper ─────────────────────────────────────────────────────────────
  const saveData = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { error: e } = await supabase
        .from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "zaira-ariel");
      if (e) throw e;
      setRawData(updated);
    } catch (err) {
      // fallback: update without user_id filter
      try {
        const rows = await supabase.from("user_data").select("id").limit(1).single();
        await supabase.from("user_data").update({ data: { budgetsbloom: JSON.stringify(updated) } }).eq("id", rows.data.id);
        setRawData(updated);
      } catch (e2) {
        alert("Save failed: " + e2.message);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const cards        = useMemo(() => rawData?.cards ?? [], [rawData]);
  const installments = useMemo(() => rawData?.installments ?? [], [rawData]);
  const totalBalance = useMemo(() => cards.reduce((s,c)=>s+(c.balance??c.bal??0),0), [cards]);
  const totalLimit   = useMemo(() => cards.reduce((s,c)=>s+(c.limit??0),0), [cards]);
  const totalMin     = useMemo(() => cards.reduce((s,c)=>s+calcMin(c),0), [cards]);
  const overallUtil  = totalLimit > 0 ? Math.round((totalBalance/totalLimit)*100) : 0;

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handlePay(card) {
    setPayAmt(calcMin(card).toFixed(2));
    setPayModal(card);
  }

  function confirmPay() {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    const updated = { ...rawData, cards: cards.map(c => {
      if (c.id !== payModal.id) return c;
      const newBal = Math.max(0, (c.balance ?? c.bal ?? 0) - amt);
      const payments = [{ id: Date.now(), date: today(), amount: amt }, ...(c.payments ?? [])].slice(0, 20);
      return { ...c, balance: newBal, bal: newBal, payments };
    })};
    saveData(updated);
    setPayModal(null);
  }

  function handleUpdateBal(card) {
    setNewBal(String(card.balance ?? card.bal ?? 0));
    setBalModal(card);
  }

  function confirmUpdateBal() {
    const val = parseFloat(newBal);
    if (isNaN(val) || val < 0) { alert("Invalid amount"); return; }
    const updated = { ...rawData, cards: cards.map(c =>
      c.id !== balModal.id ? c : { ...c, balance: val, bal: val }
    )};
    saveData(updated);
    setBalModal(null);
  }

  function handleDelete({ type, item }) {
    if (type === "card") {
      saveData({ ...rawData, cards: cards.filter(c => c.id !== item.id) });
    } else {
      saveData({ ...rawData, installments: installments.filter(i => i.id !== item.id) });
    }
    setConfirmDel(null);
  }

  function handleAddCard() {
    const { label, owner, limit, balance, apr, minPct, dueDay } = newCard;
    if (!label) { alert("Card name is required"); return; }
    const card = {
      id: "c" + Date.now(),
      label, owner,
      limit: parseFloat(limit) || 0,
      balance: parseFloat(balance) || 0,
      bal: parseFloat(balance) || 0,
      apr: parseFloat(apr) || 19.99,
      minPct: parseFloat(minPct) || 2.5,
      dueDay: parseInt(dueDay) || null,
      minPayment: Math.max(10, (parseFloat(balance)||0) * ((parseFloat(minPct)||2.5)/100)),
      payments: [],
    };
    saveData({ ...rawData, cards: [...cards, card] });
    setNewCard({ label:"", owner:"Zai", limit:"", balance:"", apr:"19.99", minPct:"2.5", dueDay:"" });
    setAddModal(false);
  }

  function handleAddInstall() {
    const { label, amt, months, paid, start } = newInst;
    if (!label || !amt || !months) { alert("Name, amount, and months are required"); return; }
    const inst = {
      id: "i" + Date.now(),
      label, amt: parseFloat(amt), months: parseInt(months),
      paid: parseInt(paid) || 0, start, active: true,
    };
    saveData({ ...rawData, installments: [...installments, inst] });
    setNewInst({ label:"", amt:"", months:"", paid:"0", start:"" });
  }

  const TABS = [{ id:"cards",label:"CARDS" },{ id:"installments",label:"INSTALLMENTS" }];

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,color:colors.text,paddingBottom:"80px" }}>
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden" }}>
        <div style={{ position:"absolute",top:"-60px",right:"-60px",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(circle,#f4c0d018 0%,transparent 70%)" }} />
      </div>

      <div style={{ position:"relative",zIndex:1,maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
          <div>
            <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>Credit Cards</p>
            <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>Your Cards</h1>
          </div>
          {saving && <span style={{ fontSize:"11px",color:colors.textMuted }}>Saving…</span>}
        </div>

        {loading && <LoadingSpinner message="Loading cards…" />}
        {error && <SoftCard variant="highlight" style={{ marginBottom:"20px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && !error && (
          <>
            {/* Total Summary */}
            <SoftCard variant="base" padding="20px 22px" style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px" }}>
                <span style={{ fontSize:"16px" }}>💳</span>
                <span style={{ fontSize:"13px",fontWeight:600,color:colors.textSoft }}>Total CC Debt</span>
              </div>
              <div style={{ fontFamily:typography.fontDisplay,fontSize:"32px",fontWeight:700,color:colors.pinkDeep,letterSpacing:"-0.03em",lineHeight:1,marginBottom:"5px" }}>
                {fmt(totalBalance)}
              </div>
              <div style={{ fontSize:"11px",color:colors.textMuted,marginBottom:"10px" }}>
                {cards.length} card{cards.length!==1?"s":""} · Total min payments: {fmt(totalMin)}
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                <span style={{ fontSize:"10px",color:colors.textMuted }}>Overall Utilization</span>
                <span style={{ fontSize:"10px",fontWeight:700,color:utilizationColor(overallUtil) }}>{overallUtil}% of {fmt(totalLimit)}</span>
              </div>
              <div style={{ height:"5px",background:colors.bgDeep,borderRadius:"99px",overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${overallUtil}%`,background:`linear-gradient(90deg,${colors.pink},${colors.pinkDeep})`,borderRadius:"99px",transition:`width 0.6s ${transitions.spring}` }} />
              </div>
            </SoftCard>

            {/* Tabs */}
            <div style={{ display:"flex",marginBottom:"20px",borderBottom:`1.5px solid ${colors.border}` }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding:"10px 18px",border:"none",background:"transparent",
                  fontSize:"11px",fontWeight:800,letterSpacing:"0.1em",
                  color:tab===t.id?colors.pink:colors.textMuted,
                  borderBottom:tab===t.id?`2px solid ${colors.pink}`:"2px solid transparent",
                  marginBottom:"-1.5px",cursor:"pointer",transition:`all ${transitions.base}`,
                }}>{t.label}</button>
              ))}
            </div>

            {/* CARDS TAB */}
            {tab === "cards" && (
              <div>
                {cards.length === 0
                  ? <SoftCard variant="ghost" style={{ textAlign:"center",padding:"40px",color:colors.textFaint,fontSize:"13px" }}>No cards yet. Add one below!</SoftCard>
                  : cards.map((card, i) => (
                    <CreditCardFace
                      key={card.id ?? card.label}
                      card={card}
                      index={i}
                      onPay={handlePay}
                      onUpdateBal={handleUpdateBal}
                      onDelete={c => setConfirmDel({ type:"card",item:c })}
                    />
                  ))
                }
                <button onClick={() => setAddModal(true)} style={{
                  width:"100%",padding:"13px",borderRadius:radii.xl,
                  border:`1.5px dashed ${colors.border}`,background:colors.bgCard,
                  color:colors.textMuted,fontSize:"13px",fontWeight:700,
                  cursor:"pointer",transition:`all ${transitions.base}`,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",
                }}>
                  + Add Credit Card
                </button>
              </div>
            )}

            {/* INSTALLMENTS TAB */}
            {tab === "installments" && (
              <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
                {/* Add form */}
                <SoftCard variant="base" padding="18px 20px">
                  <div style={{ fontFamily:typography.fontDisplay,fontSize:"15px",fontWeight:700,color:colors.text,marginBottom:"14px" }}>+ Add Installment</div>
                  <Field label="Item Name">
                    <input style={inputStyle} placeholder="e.g. Laptop, Phone" value={newInst.label} onChange={e=>setNewInst(p=>({...p,label:e.target.value}))} />
                  </Field>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
                    <Field label="Monthly Payment ($)">
                      <input style={inputStyle} type="number" placeholder="120.00" value={newInst.amt} onChange={e=>setNewInst(p=>({...p,amt:e.target.value}))} />
                    </Field>
                    <Field label="Total Months">
                      <input style={inputStyle} type="number" placeholder="12" value={newInst.months} onChange={e=>setNewInst(p=>({...p,months:e.target.value}))} />
                    </Field>
                    <Field label="Months Paid">
                      <input style={inputStyle} type="number" placeholder="0" value={newInst.paid} onChange={e=>setNewInst(p=>({...p,paid:e.target.value}))} />
                    </Field>
                    <Field label="Start Date">
                      <input style={inputStyle} type="date" value={newInst.start} onChange={e=>setNewInst(p=>({...p,start:e.target.value}))} />
                    </Field>
                  </div>
                  <button onClick={handleAddInstall} style={{
                    width:"100%",padding:"12px",borderRadius:radii.xl,
                    background:colors.pink,border:"none",color:"#fff",
                    fontSize:"13px",fontWeight:700,cursor:"pointer",marginTop:"4px",
                  }}>+ Add Installment</button>
                </SoftCard>

                {installments.length === 0
                  ? <SoftCard variant="ghost" style={{ textAlign:"center",padding:"40px",color:colors.textFaint,fontSize:"13px" }}>No installments yet.</SoftCard>
                  : installments.map((item,i) => (
                    <InstallmentCard
                      key={item.id ?? item.label}
                      item={item}
                      index={i}
                      onDelete={it => setConfirmDel({ type:"installment",item:it })}
                    />
                  ))
                }
              </div>
            )}

            <div style={{ marginTop:"28px",padding:"14px 16px",backgroundColor:colors.bgWarm,border:`1px dashed ${colors.border}`,borderRadius:radii.xl,fontSize:"12px",color:colors.textMuted,lineHeight:1.6,textAlign:"center" }}>
              Keep utilization under 30% for a healthy credit score. 💕
            </div>
          </>
        )}
      </div>

      {/* ── Pay Modal ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="💳 Record CC Payment">
        {payModal && <>
          <p style={{ fontSize:"13px",color:colors.textSoft,marginBottom:"16px" }}>
            {payModal.label ?? payModal.name} — Balance: {fmt(payModal.balance ?? payModal.bal ?? 0)}
          </p>
          <Field label="Amount Paid ($)">
            <input style={inputStyle} type="number" step="0.01" value={payAmt} onChange={e=>setPayAmt(e.target.value)} />
          </Field>
          <div style={{ display:"flex",gap:"10px",marginTop:"8px" }}>
            <button onClick={() => setPayModal(null)} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:`1.5px solid ${colors.border}`,background:colors.bgCard,color:colors.textSoft,fontSize:"13px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
            <button onClick={confirmPay} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:"none",background:colors.teal,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>✓ Record</button>
          </div>
        </>}
      </Modal>

      {/* ── Balance Modal ── */}
      <Modal open={!!balModal} onClose={() => setBalModal(null)} title="✏️ Update Balance">
        {balModal && <>
          <p style={{ fontSize:"13px",color:colors.textSoft,marginBottom:"16px" }}>
            {balModal.label ?? balModal.name} — Current: {fmt(balModal.balance ?? balModal.bal ?? 0)}
          </p>
          <Field label="New Balance ($)">
            <input style={inputStyle} type="number" step="0.01" value={newBal} onChange={e=>setNewBal(e.target.value)} />
          </Field>
          <div style={{ display:"flex",gap:"10px",marginTop:"8px" }}>
            <button onClick={() => setBalModal(null)} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:`1.5px solid ${colors.border}`,background:colors.bgCard,color:colors.textSoft,fontSize:"13px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
            <button onClick={confirmUpdateBal} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:"none",background:colors.pink,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>✓ Update</button>
          </div>
        </>}
      </Modal>

      {/* ── Add Card Modal ── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="+ Add Credit Card">
        <Field label="Card Name">
          <input style={inputStyle} placeholder="e.g. RBC Avion, TD Cash Back" value={newCard.label} onChange={e=>setNewCard(p=>({...p,label:e.target.value}))} />
        </Field>
        <Field label="Owner">
          <select style={inputStyle} value={newCard.owner} onChange={e=>setNewCard(p=>({...p,owner:e.target.value}))}>
            <option value="Zai">Zai</option>
            <option value="Ariel">Ariel</option>
            <option value="Joint">Joint</option>
          </select>
        </Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
          <Field label="Credit Limit ($)">
            <input style={inputStyle} type="number" placeholder="5000" value={newCard.limit} onChange={e=>setNewCard(p=>({...p,limit:e.target.value}))} />
          </Field>
          <Field label="Current Balance ($)">
            <input style={inputStyle} type="number" placeholder="0.00" value={newCard.balance} onChange={e=>setNewCard(p=>({...p,balance:e.target.value}))} />
          </Field>
          <Field label="APR (%)">
            <input style={inputStyle} type="number" placeholder="19.99" step="0.01" value={newCard.apr} onChange={e=>setNewCard(p=>({...p,apr:e.target.value}))} />
          </Field>
          <Field label="Min Payment (%)">
            <input style={inputStyle} type="number" placeholder="2.5" step="0.1" value={newCard.minPct} onChange={e=>setNewCard(p=>({...p,minPct:e.target.value}))} />
          </Field>
          <Field label="Due Day (1–31)">
            <input style={inputStyle} type="number" placeholder="18" min="1" max="31" value={newCard.dueDay} onChange={e=>setNewCard(p=>({...p,dueDay:e.target.value}))} />
          </Field>
        </div>
        <div style={{ display:"flex",gap:"10px",marginTop:"8px" }}>
          <button onClick={() => setAddModal(false)} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:`1.5px solid ${colors.border}`,background:colors.bgCard,color:colors.textSoft,fontSize:"13px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
          <button onClick={handleAddCard} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:"none",background:colors.pink,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>+ Add Card</button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="🗑 Confirm Delete">
        {confirmDel && <>
          <p style={{ fontSize:"13px",color:colors.textSoft,marginBottom:"20px" }}>
            Delete <strong>{confirmDel.item.label ?? confirmDel.item.name}</strong>? This cannot be undone.
          </p>
          <div style={{ display:"flex",gap:"10px" }}>
            <button onClick={() => setConfirmDel(null)} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:`1.5px solid ${colors.border}`,background:colors.bgCard,color:colors.textSoft,fontSize:"13px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
            <button onClick={() => handleDelete(confirmDel)} style={{ flex:1,padding:"12px",borderRadius:radii.xl,border:"none",background:colors.pinkDeep,color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>Delete</button>
          </div>
        </>}
      </Modal>
    </div>
  );
}
