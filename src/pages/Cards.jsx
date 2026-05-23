/**
 * Cards.jsx
 * Credit cards page — exact V2 spec implementation.
 * Gradients, spacing, typography, calcMin, all modals, Supabase save.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 })
    .format(n ?? 0)
    .replace("CA$", "$");

const todayStr = () => new Date().toISOString().split("T")[0];

// V2 exact calcMin: Math.max(10, bal * minPct / 100)
const calcMin = c => {
  const bal = c.balance ?? c.bal ?? 0;
  const pct = c.minPct ?? 2.5;
  return Math.max(10, +(bal * (pct / 100)).toFixed(2));
};

// Utilization color — exact V2 thresholds
const utilColor = pct => pct > 70 ? "#c94d6a" : pct > 40 ? "#e8a840" : "#60b8a8";

// Days until due (negative = overdue)
function daysDiff(dueDay) {
  if (!dueDay) return null;
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (due < now) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// V2 exact card gradients
const CC_GRADIENTS = [
  "linear-gradient(135deg,#db2777,#7c1d4e)",
  "linear-gradient(135deg,#3a6b4e,#1c3a28)",
  "linear-gradient(135deg,#2860a0,#123060)",
  "linear-gradient(135deg,#a67c20,#5a4010)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
];

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:"fixed", inset:0, zIndex:600,
        background:"rgba(26,9,30,0.5)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"flex-end", justifyContent:"center",
      }}
    >
      <div className="scale-in" style={{
        background:"#ffffff",
        borderRadius:"20px 20px 0 0",
        padding:"22px 18px 34px",
        width:"100%", maxWidth:"520px",
        maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 -8px 40px rgba(26,9,30,0.18)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <h3 style={{ fontFamily:typography.fontDisplay, fontSize:"17px", fontWeight:700, color:colors.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:colors.bgDeep, border:"none", borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"13px", color:colors.textMuted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Input field label + input wrapper
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <div style={{ fontSize:"10px", fontWeight:700, color:"#9b6b8a", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"4px" }}>{label}</div>
      {children}
    </div>
  );
}

const inp = {
  width:"100%", padding:"9px 11px",
  background:"#fff5f9", border:"1.5px solid #fce7f3",
  borderRadius:"9px", fontFamily:"'DM Sans',sans-serif",
  fontSize:"14px", color:"#1a0f1e", outline:"none",
  transition:"border-color .15s",
};

// ── Credit Card Visual ────────────────────────────────────────────────────────
function CCCard({ card, index, onPay, onBalance, onDelete }) {
  const [histOpen, setHistOpen] = useState(false);
  const bal      = card.balance ?? card.bal ?? 0;
  const limit    = card.limit ?? 0;
  const pct      = limit > 0 ? Math.min(100, (bal / limit) * 100) : 0;
  const avail    = limit - bal;
  const min      = calcMin(card);
  const diff     = daysDiff(card.dueDay ?? null);
  const overdue  = diff !== null && diff < 0;
  const soon     = diff !== null && diff >= 0 && diff <= 3;
  const recentPays = (card.payments ?? []).slice(0, 3);

  return (
    <div style={{ marginBottom:"10px" }}>
      {/* ── Colorful card face ── */}
      <div style={{
        background:    CC_GRADIENTS[index % 5],
        borderRadius:  "13px",
        padding:       "18px",
        position:      "relative",
        overflow:      "hidden",
        color:         "#fff",
        minHeight:     "110px",
        // no explicit shadow — gradient provides elevation
      }}>
        {/* Decorative circle (V2 ::before equivalent) */}
        <div style={{
          position:"absolute", bottom:"-35px", right:"-35px",
          width:"120px", height:"120px", borderRadius:"50%",
          background:"rgba(255,255,255,0.07)", pointerEvents:"none",
        }} />

        {/* Row 1: name + status badge */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"2px" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"0.9rem", color:"#fff" }}>{card.label ?? card.name}</div>
            {card.owner && <div style={{ fontSize:"0.67rem", opacity:0.65, marginTop:"1px" }}>{card.owner}</div>}
          </div>
          {overdue && (
            <span style={{ background:"rgba(220,50,50,0.85)", color:"#fff", fontSize:"0.57rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", padding:"2px 7px", borderRadius:"5px" }}>OVERDUE</span>
          )}
          {!overdue && soon && (
            <span style={{ background:"rgba(200,150,0,0.7)", color:"#fff", fontSize:"0.57rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", padding:"2px 7px", borderRadius:"5px" }}>Due Soon</span>
          )}
        </div>

        {/* Balance — Playfair Display, 1.7rem */}
        <div style={{ fontFamily:typography.fontDisplay, fontSize:"1.7rem", fontWeight:700, margin:"10px 0 2px", color:"#fff" }}>
          {fmt(bal)}
        </div>

        {/* Info line */}
        <div style={{ fontSize:"0.66rem", opacity:0.6, marginBottom:"8px" }}>
          Limit {fmt(limit)} · Available {fmt(avail)} · {card.apr ?? "19.99"}% APR
        </div>

        {/* Utilization bar — 4px, white on white */}
        <div style={{ height:"4px", background:"rgba(255,255,255,0.2)", borderRadius:"2px", overflow:"hidden", marginBottom:"10px" }}>
          <div style={{ height:"100%", width:`${pct.toFixed(1)}%`, background:"rgba(255,255,255,0.75)", borderRadius:"2px", transition:`width 0.6s ${transitions.spring}` }} />
        </div>

        {/* Action buttons — frosted glass */}
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {[
            { label:"💳 Pay",      fn: () => onPay(card) },
            { label:"✏️ Balance",  fn: () => onBalance(card) },
            { label:"🗑",          fn: () => onDelete(card) },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} style={{
              background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.28)",
              color:"#fff", borderRadius:"6px", fontSize:"0.67rem",
              fontFamily:"'DM Sans',sans-serif", fontWeight:700,
              padding:"5px 11px", cursor:"pointer", transition:"background .15s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Min Payment box — pulls up -12px to attach to card ── */}
      <div style={{
        background:"#faf5e6",
        border:"1px solid #dcca84",
        borderRadius:"0 0 14px 14px",
        padding:"12px 14px",
        marginTop:"-12px",
      }}>
        {/* Label */}
        <div style={{ fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"#a67c20", marginBottom:"7px" }}>
          💰 Payment Summary
        </div>

        {/* Rows */}
        {[
          { label:"Balance Owing",            val: fmt(bal),                        bold:false },
          { label:`Min Payment (${card.minPct ?? 2.5}%)`, val: fmt(min),            bold:false },
          { label:"Due Date",                 val: card.dueDay ? `Day ${card.dueDay}` : "—",
            style:{ color: overdue ? "#c24b1a" : soon ? "#a67c20" : "#1a0f1e" } },
          { label:"Utilization",              val: `${pct.toFixed(0)}%`,
            style:{ color: utilColor(pct) },  bold:true },
          { label:"Available Credit",         val: fmt(avail),
            style:{ color: "#3a6b4e" },        bold:false },
        ].map(({ label, val, bold, style }) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.79rem", marginBottom:"3px" }}>
            <span style={{ color:"#9b6b8a" }}>{label}</span>
            <strong style={{ fontWeight: bold ? 700 : 500, color:"#1a0f1e", ...style }}>{val}</strong>
          </div>
        ))}

        {/* Recent payments */}
        {recentPays.length > 0 && (
          <div style={{ marginTop:"6px" }}>
            <button
              onClick={() => setHistOpen(h => !h)}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.67rem", color:"#9b6b8a", padding:0, fontFamily:"'DM Sans',sans-serif" }}
            >
              {histOpen ? "▲" : "▼"} Recent payments ({recentPays.length})
            </button>
            {histOpen && recentPays.map(p => (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.68rem", marginTop:"3px", borderTop:"1px solid #dcca84", paddingTop:"3px" }}>
                <span style={{ color:"#9b6b8a" }}>{p.date}</span>
                <strong style={{ color:"#3a6b4e" }}>-{fmt(p.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Installment Card ──────────────────────────────────────────────────────────
function InstCard({ item, index, onDelete }) {
  const monthsPaid  = item.paid ?? 0;
  const totalMonths = item.months ?? 1;
  const monthly     = item.amt ?? item.monthly ?? 0;
  const paidPct     = Math.round((monthsPaid / totalMonths) * 100);
  const paidAmt     = monthsPaid * monthly;
  const totalAmt    = totalMonths * monthly;
  const remaining   = totalAmt - paidAmt;
  const monthsLeft  = totalMonths - monthsPaid;

  return (
    <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"14px", padding:"16px", marginBottom:"10px", boxShadow:"0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)", animation:"fadeUp .22s ease both", animationDelay:`${index*0.07}s` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
        <div>
          <div style={{ fontFamily:typography.fontDisplay, fontWeight:700, fontSize:"0.97rem", color:colors.text }}>{item.label ?? item.name}</div>
          {(item.start ?? item.startDate) && (
            <div style={{ fontSize:"0.67rem", color:"#9b6b8a", marginTop:"2px" }}>
              Started {new Date((item.start ?? item.startDate) + "T00:00").toLocaleDateString("en-CA",{month:"short",year:"numeric"})}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          <span style={{ background:"#f5f0ff", color:"#7c3aed", fontSize:"0.57rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", padding:"2px 7px", borderRadius:"5px" }}>INST</span>
          <button onClick={() => onDelete(item)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d4b8c4", fontSize:"0.95rem", padding:"0 2px" }}>🗑</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", marginBottom:"4px" }}>
        <span style={{ color:"#9b6b8a" }}>Progress</span>
        <span style={{ fontWeight:700, color:"#7c3aed" }}>{paidPct}%</span>
      </div>
      <div style={{ height:"7px", background:"#fce7f3", borderRadius:"4px", overflow:"hidden", margin:"0 0 10px" }}>
        <div style={{ height:"100%", width:`${paidPct}%`, background:"linear-gradient(90deg,#7c3aed,#c890b8)", borderRadius:"4px", transition:`width 0.6s ${transitions.spring}` }} />
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"8px" }}>
        {[
          { l:"Total",     v:fmt(totalAmt),   c:"#1a0f1e" },
          { l:"Paid",      v:fmt(paidAmt),    c:"#3a6b4e" },
          { l:"Remaining", v:fmt(remaining),  c:"#c94d6a" },
        ].map(({ l,v,c }) => (
          <div key={l} style={{ background:"#fff5f9", borderRadius:"9px", padding:"8px 10px", textAlign:"center" }}>
            <div style={{ fontSize:"0.6rem", color:"#9b6b8a", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"2px" }}>{l}</div>
            <div style={{ fontSize:"0.79rem", fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:"0.72rem", color:"#9b6b8a", textAlign:"center" }}>
        {monthsLeft > 0 ? `${monthsLeft} month${monthsLeft!==1?"s":""} left · ${fmt(monthly)}/mo` : "🎉 Fully paid!"}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Cards() {
  const [rawData,  setRawData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState("cards"); // "cards" | "crusher" | "installments"

  // Modals
  const [payCard,   setPayCard]   = useState(null);
  const [balCard,   setBalCard]   = useState(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [delTarget, setDelTarget] = useState(null); // { type, item }

  // Form values
  const [payAmt,  setPayAmt]  = useState("");
  const [newBal,  setNewBal]  = useState("");
  const [nc, setNc] = useState({ label:"", owner:"Zai", limit:"", balance:"", apr:"19.99", minPct:"2.5", dueDay:"" });
  const [ni, setNi] = useState({ label:"", amt:"", months:"", paid:"0", start:"" });

  // Debt crusher
  const [crushMethod, setCrushMethod] = useState("snowball");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (dead) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob === "string" ? JSON.parse(blob) : blob ?? null);
      } catch (err) {
        if (!dead) setError(err.message ?? "Failed to load");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { data: rows } = await supabase.from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("id", rows.id);
      setRawData(updated);
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const cards   = useMemo(() => rawData?.cards ?? [], [rawData]);
  const installs = useMemo(() => rawData?.installments ?? [], [rawData]);

  const totalDebt  = useMemo(() => cards.reduce((s,c) => s + (c.balance ?? c.bal ?? 0), 0), [cards]);
  const totalLimit = useMemo(() => cards.reduce((s,c) => s + (c.limit ?? 0), 0), [cards]);
  const totMin     = useMemo(() => cards.reduce((s,c) => s + calcMin(c), 0), [cards]);
  const overallPct = totalLimit > 0 ? Math.min(100, (totalDebt / totalLimit) * 100) : 0;

  // Crusher sorted
  const crusherCards = useMemo(() => {
    const withBal = cards.filter(c => (c.balance ?? c.bal ?? 0) > 0);
    return crushMethod === "snowball"
      ? [...withBal].sort((a,b) => (a.balance??a.bal??0) - (b.balance??b.bal??0))
      : [...withBal].sort((a,b) => (b.apr??0) - (a.apr??0));
  }, [cards, crushMethod]);

  const extraBudget = 200;
  const estMonths   = totMin > 0 ? Math.ceil(totalDebt / (totMin + extraBudget)) : 0;
  const debtFreeDate = (() => { const d = new Date(); d.setMonth(d.getMonth() + estMonths); return d; })();

  // ── Actions ───────────────────────────────────────────────────────────────
  function openPay(card) { setPayAmt(calcMin(card).toFixed(2)); setPayCard(card); }

  function doPay() {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    const updated = { ...rawData, cards: cards.map(c => {
      if (c.id !== payCard.id) return c;
      const newB = Math.max(0, (c.balance ?? c.bal ?? 0) - amt);
      const payments = [{ id: Date.now(), date: todayStr(), amount: amt }, ...(c.payments ?? [])].slice(0, 20);
      return { ...c, balance: newB, bal: newB, payments };
    })};
    save(updated); setPayCard(null);
  }

  function openBal(card) { setNewBal(String(card.balance ?? card.bal ?? 0)); setBalCard(card); }

  function doBal() {
    const val = parseFloat(newBal);
    if (isNaN(val) || val < 0) { alert("Invalid amount"); return; }
    const updated = { ...rawData, cards: cards.map(c =>
      c.id !== balCard.id ? c : { ...c, balance: val, bal: val }
    )};
    save(updated); setBalCard(null);
  }

  function doDelete() {
    if (!delTarget) return;
    const updated = delTarget.type === "card"
      ? { ...rawData, cards: cards.filter(c => c.id !== delTarget.item.id) }
      : { ...rawData, installments: installs.filter(i => i.id !== delTarget.item.id) };
    save(updated); setDelTarget(null);
  }

  function doAddCard() {
    if (!nc.label.trim()) { alert("Card name is required"); return; }
    const bal = parseFloat(nc.balance) || 0;
    const card = {
      id: "c" + Date.now(),
      label: nc.label.trim(), owner: nc.owner,
      limit: parseFloat(nc.limit) || 0,
      balance: bal, bal,
      apr: parseFloat(nc.apr) || 19.99,
      minPct: parseFloat(nc.minPct) || 2.5,
      dueDay: parseInt(nc.dueDay) || null,
      payments: [],
    };
    save({ ...rawData, cards: [...cards, card] });
    setNc({ label:"", owner:"Zai", limit:"", balance:"", apr:"19.99", minPct:"2.5", dueDay:"" });
    setAddOpen(false);
  }

  function doAddInstall() {
    if (!ni.label.trim() || !ni.amt || !ni.months) { alert("Name, amount, and months required"); return; }
    const inst = {
      id: "i" + Date.now(),
      label: ni.label.trim(),
      amt: parseFloat(ni.amt),
      months: parseInt(ni.months),
      paid: parseInt(ni.paid) || 0,
      start: ni.start, active: true,
    };
    save({ ...rawData, installments: [...installs, inst] });
    setNi({ label:"", amt:"", months:"", paid:"0", start:"" });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const TABS = [
    { id:"cards",        label:"Cards" },
    { id:"crusher",      label:"Debt Crusher" },
    { id:"installments", label:"Installments" },
  ];

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      flex:"0 0 auto", padding:"10px 14px",
      background:"none", border:"none",
      borderBottom: tab===id ? "2px solid #db2777" : "2px solid transparent",
      color: tab===id ? "#db2777" : "#9b6b8a",
      fontFamily:"'DM Sans',sans-serif", fontSize:"0.64rem",
      fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
      whiteSpace:"nowrap", cursor:"pointer", transition:"color .18s,border-color .18s",
    }}>{label}</button>
  );

  const actionBtn = (label, onClick, primary) => (
    <button onClick={onClick} style={{
      flex:1, padding:"11px", borderRadius:"9px",
      border: primary ? "none" : `1.5px solid #f0dce4`,
      background: primary ? "#db2777" : "#ffffff",
      color: primary ? "#fff" : "#3a2430",
      fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:700, cursor:"pointer",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#fdf6f8", fontFamily:"'DM Sans',sans-serif", color:"#1a0f1e", paddingBottom:"80px" }}>
      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"14px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"28px 0 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <p style={{ fontSize:"11px", fontWeight:700, color:"#9b6b8a", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>Credit Cards</p>
            <h1 style={{ fontFamily:typography.fontDisplay, fontSize:"28px", fontWeight:700, color:"#1a0f1e", letterSpacing:"-0.02em", lineHeight:1.1 }}>Your Cards</h1>
          </div>
          {saving && <span style={{ fontSize:"11px", color:"#9b6b8a" }}>Saving…</span>}
        </div>

        {loading && <LoadingSpinner message="Loading cards…" />}
        {error   && <div style={{ background:"#fdedf1", border:"1px solid #f4a0b4", borderRadius:"14px", padding:"14px 16px", marginBottom:"16px", color:"#c94d6a", fontSize:"13px" }}>⚠ {error}</div>}

        {!loading && !error && (
          <>
            {/* Total CC Debt summary card — uses .card style */}
            <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"14px", padding:"16px", marginBottom:"12px", boxShadow:"0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)", animation:"fadeUp .22s ease both" }}>
              <div style={{ fontFamily:typography.fontDisplay, fontSize:"0.97rem", fontWeight:700, marginBottom:"10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>💳 Total CC Debt</span>
              </div>
              <div style={{ fontFamily:typography.fontDisplay, fontSize:"2rem", fontWeight:700, color:"#db2777", marginBottom:"4px" }}>
                {fmt(totalDebt)}
              </div>
              <div style={{ fontSize:"0.72rem", color:"#9b6b8a", marginBottom:"10px" }}>
                {cards.length} card{cards.length!==1?"s":""} · Total min payments: {fmt(totMin)}
              </div>
              {/* Overall utilization bar */}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.67rem", color:"#9b6b8a", marginBottom:"4px" }}>
                <span>Overall Utilization</span>
                <span style={{ fontWeight:700, color:utilColor(overallPct) }}>{overallPct.toFixed(0)}% of {fmt(totalLimit)}</span>
              </div>
              <div style={{ height:"7px", background:"#fce7f3", borderRadius:"4px", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${overallPct}%`, background:"linear-gradient(90deg,#db2777,#f472b6)", borderRadius:"4px", transition:`width 0.6s ${transitions.spring}` }} />
              </div>
            </div>

            {/* Sub-tab bar */}
            <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none", background:"#fff", borderBottom:"1px solid #fce7f3", marginBottom:"12px", borderRadius:"14px 14px 0 0" }}>
              {TABS.map(t => tabBtn(t.id, t.label))}
            </div>

            {/* ── CARDS TAB ── */}
            {tab === "cards" && (
              <div>
                {cards.length === 0 && (
                  <div style={{ background:"#fff", border:"1.5px dashed #f0dce4", borderRadius:"14px", padding:"40px", textAlign:"center", color:"#b899a8", fontSize:"13px", marginBottom:"10px" }}>
                    No cards yet. Add one below!
                  </div>
                )}
                {cards.map((card, i) => (
                  <CCCard
                    key={card.id ?? card.label}
                    card={card}
                    index={i}
                    onPay={openPay}
                    onBalance={openBal}
                    onDelete={c => setDelTarget({ type:"card", item:c })}
                  />
                ))}
                <button
                  onClick={() => setAddOpen(true)}
                  style={{
                    width:"100%", marginTop:"4px", padding:"12px",
                    background:"#fff", border:"1.5px solid #f0dce4",
                    borderRadius:"14px", fontFamily:"'DM Sans',sans-serif",
                    fontWeight:700, fontSize:"13px", color:"#9b6b8a",
                    cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                  }}
                >
                  + Add Credit Card
                </button>
              </div>
            )}

            {/* ── DEBT CRUSHER TAB ── */}
            {tab === "crusher" && (
              <div>
                {/* Method toggle */}
                <div style={{ display:"flex", background:"#fff5f9", border:"1.5px solid #f0dce4", borderRadius:"10px", overflow:"hidden", marginBottom:"14px" }}>
                  {[["snowball","❄️ Snowball"],["avalanche","🏔 Avalanche"]].map(([m,l]) => (
                    <button key={m} onClick={() => setCrushMethod(m)} style={{
                      flex:1, padding:"10px 0", border:"none",
                      background: crushMethod===m ? "#db2777" : "none",
                      color: crushMethod===m ? "#fff" : "#9b6b8a",
                      fontFamily:"'DM Sans',sans-serif", fontWeight:700,
                      fontSize:"0.77rem", cursor:"pointer", transition:"all .2s",
                    }}>{l}</button>
                  ))}
                </div>

                {crusherCards.length === 0 ? (
                  <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"14px", padding:"20px", textAlign:"center", color:"#9b6b8a" }}>🎉 No debt! You're debt-free.</div>
                ) : (
                  <>
                    {/* Summary card */}
                    <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"14px", padding:"16px", marginBottom:"12px", boxShadow:"0 1px 4px rgba(26,15,30,.07)" }}>
                      <div style={{ fontFamily:typography.fontDisplay, fontWeight:700, fontSize:"0.97rem", marginBottom:"10px" }}>
                        🎯 {crushMethod==="snowball"?"❄️ Snowball":"🏔 Avalanche"} Strategy
                      </div>
                      <p style={{ fontSize:"0.79rem", color:"#9b6b8a", marginBottom:"12px", lineHeight:1.6 }}>
                        {crushMethod==="snowball"
                          ? "Pay minimums on all cards, put extra money on the smallest balance first. Great for motivation!"
                          : "Pay minimums on all, put extra money on the highest interest rate first. Saves the most money!"}
                      </p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                        {[
                          { v:fmt(totalDebt), l:"Total Debt",       bg:"#fdf2f8", bdr:"#f9a8c9", c:"#db2777" },
                          { v:`${estMonths} mo`, l:"Est. Payoff",    bg:"#eaf3ee", bdr:"#9ecab0", c:"#3a6b4e" },
                          { v:fmt(totMin),    l:"Min Payments/mo",   bg:"#faf5e6", bdr:"#dcca84", c:"#a67c20" },
                          { v:debtFreeDate.toLocaleDateString("en-CA",{month:"short",year:"numeric"}), l:"Est. Debt-Free", bg:"#eaf1f9", bdr:"#9cc0e4", c:"#2860a0" },
                        ].map(({ v,l,bg,bdr,c }) => (
                          <div key={l} style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:"8px", padding:"10px", textAlign:"center" }}>
                            <div style={{ fontWeight:700, fontSize:"1.1rem", color:c }}>{v}</div>
                            <div style={{ fontSize:"0.62rem", color:"#9b6b8a", marginTop:"2px" }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ordered debt cards */}
                    {crusherCards.map((c,i) => {
                      const bal  = c.balance ?? c.bal ?? 0;
                      const pct  = c.limit>0 ? Math.min(100, (1-bal/c.limit)*100) : 0;
                      const isFirst = i===0;
                      return (
                        <div key={c.id} style={{ background:"#fff", border:`1px solid ${isFirst?"#f9a8c9":"#fce7f3"}`, borderRadius:"14px", overflow:"hidden", marginBottom:"10px", boxShadow:"0 1px 4px rgba(26,15,30,.07)" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"14px 16px 10px" }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:"0.9rem" }}>{c.label??c.name} <span style={{ background:"#eaf1f9", color:"#2860a0", fontSize:"0.55rem", fontWeight:700, padding:"2px 7px", borderRadius:"5px" }}>{c.owner}</span></div>
                              <div style={{ fontSize:"0.67rem", color:"#9b6b8a", marginTop:"2px" }}>Priority #{i+1} {isFirst?"← Focus here first!":""}</div>
                            </div>
                            {isFirst
                              ? <span style={{ background:"#fdf2f8", color:"#db2777", fontSize:"0.58rem", fontWeight:700, padding:"2px 7px", borderRadius:"5px" }}>🎯 FOCUS</span>
                              : <span style={{ background:"#eaf1f9", color:"#2860a0", fontSize:"0.58rem", fontWeight:700, padding:"2px 7px", borderRadius:"5px" }}>#{i+1}</span>
                            }
                          </div>
                          <div style={{ padding:"0 16px 14px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.85rem", marginBottom:"4px" }}>
                              <span style={{ fontWeight:700 }}>{fmt(bal)}</span>
                              <span style={{ color:"#9b6b8a" }}>{c.apr}% APR</span>
                            </div>
                            <div style={{ background:"#fce7f3", borderRadius:"4px", height:"8px", overflow:"hidden", marginBottom:"4px" }}>
                              <div style={{ height:"100%", width:`${pct}%`, borderRadius:"4px", background:"linear-gradient(90deg,#3a6b4e,#72aa88)", transition:"width .6s" }} />
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.67rem", color:"#9b6b8a", marginBottom:"6px" }}>
                              <span>{pct.toFixed(0)}% paid off</span>
                              <span>{fmt(c.limit-(bal||0))} paid</span>
                            </div>
                            <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", fontSize:"0.74rem", color:"#9b6b8a" }}>
                              <span>Min: <strong style={{ color:"#1a0f1e" }}>{fmt(calcMin(c))}</strong></span>
                              <span>Due: <strong style={{ color:"#1a0f1e" }}>Day {c.dueDay||"—"}</strong></span>
                              <span>Limit: <strong style={{ color:"#1a0f1e" }}>{fmt(c.limit)}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── INSTALLMENTS TAB ── */}
            {tab === "installments" && (
              <div>
                {/* Add form */}
                <div style={{ background:"#fff", border:"1px solid #fce7f3", borderRadius:"14px", padding:"16px", marginBottom:"12px", boxShadow:"0 1px 4px rgba(26,15,30,.07)" }}>
                  <div style={{ fontFamily:typography.fontDisplay, fontWeight:700, fontSize:"0.97rem", marginBottom:"12px" }}>+ Add Installment</div>
                  <Field label="Item Name"><input style={inp} placeholder="e.g. Laptop, Phone" value={ni.label} onChange={e=>setNi(p=>({...p,label:e.target.value}))} /></Field>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                    <Field label="Monthly Payment ($)"><input style={inp} type="number" placeholder="120.00" value={ni.amt} onChange={e=>setNi(p=>({...p,amt:e.target.value}))} /></Field>
                    <Field label="Total Months"><input style={inp} type="number" placeholder="12" value={ni.months} onChange={e=>setNi(p=>({...p,months:e.target.value}))} /></Field>
                    <Field label="Months Paid"><input style={inp} type="number" placeholder="0" value={ni.paid} onChange={e=>setNi(p=>({...p,paid:e.target.value}))} /></Field>
                    <Field label="Start Date"><input style={inp} type="date" value={ni.start} onChange={e=>setNi(p=>({...p,start:e.target.value}))} /></Field>
                  </div>
                  <button onClick={doAddInstall} style={{ width:"100%", marginTop:"8px", padding:"10px", borderRadius:"9px", background:"#db2777", border:"none", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" }}>+ Add Installment</button>
                </div>

                {installs.length === 0 && (
                  <div style={{ background:"#fff", border:"1.5px dashed #f0dce4", borderRadius:"14px", padding:"32px", textAlign:"center", color:"#b899a8", fontSize:"13px" }}>No installments yet. Add one above!</div>
                )}
                {installs.map((item,i) => (
                  <InstCard key={item.id??item.label} item={item} index={i} onDelete={it=>setDelTarget({type:"installment",item:it})} />
                ))}
              </div>
            )}

            <div style={{ marginTop:"20px", padding:"12px 14px", background:"#fff8fa", border:"1px dashed #f0dce4", borderRadius:"14px", fontSize:"12px", color:"#9b6b8a", lineHeight:1.6, textAlign:"center" }}>
              Keep utilization under 30% for a healthy credit score. 💕
            </div>
          </>
        )}
      </div>

      {/* ── Pay Modal ── */}
      <Modal open={!!payCard} onClose={() => setPayCard(null)} title="💳 Record CC Payment">
        {payCard && <>
          <p style={{ fontSize:"13px", color:"#9b6b8a", marginBottom:"14px" }}>
            {payCard.label??payCard.name} — Balance: {fmt(payCard.balance??payCard.bal??0)}
          </p>
          <Field label="Amount Paid ($)">
            <input style={inp} type="number" step="0.01" value={payAmt} onChange={e=>setPayAmt(e.target.value)} />
          </Field>
          <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>{actionBtn("Cancel",()=>setPayCard(null),false)}{actionBtn("✓ Record",doPay,true)}</div>
        </>}
      </Modal>

      {/* ── Balance Modal ── */}
      <Modal open={!!balCard} onClose={() => setBalCard(null)} title="✏️ Update Balance">
        {balCard && <>
          <p style={{ fontSize:"13px", color:"#9b6b8a", marginBottom:"14px" }}>
            {balCard.label??balCard.name} — Current: {fmt(balCard.balance??balCard.bal??0)}
          </p>
          <Field label="New Balance ($)">
            <input style={inp} type="number" step="0.01" value={newBal} onChange={e=>setNewBal(e.target.value)} />
          </Field>
          <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>{actionBtn("Cancel",()=>setBalCard(null),false)}{actionBtn("✓ Update",doBal,true)}</div>
        </>}
      </Modal>

      {/* ── Add Card Modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="+ Add Credit Card">
        <Field label="Card Name"><input style={inp} placeholder="e.g. RBC Avion" value={nc.label} onChange={e=>setNc(p=>({...p,label:e.target.value}))} /></Field>
        <Field label="Owner">
          <select style={inp} value={nc.owner} onChange={e=>setNc(p=>({...p,owner:e.target.value}))}>
            <option>Zai</option><option>Ariel</option><option>Joint</option>
          </select>
        </Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <Field label="Credit Limit ($)"><input style={inp} type="number" placeholder="5000" value={nc.limit} onChange={e=>setNc(p=>({...p,limit:e.target.value}))} /></Field>
          <Field label="Current Balance ($)"><input style={inp} type="number" placeholder="0.00" value={nc.balance} onChange={e=>setNc(p=>({...p,balance:e.target.value}))} /></Field>
          <Field label="APR (%)"><input style={inp} type="number" placeholder="19.99" step="0.01" value={nc.apr} onChange={e=>setNc(p=>({...p,apr:e.target.value}))} /></Field>
          <Field label="Min Payment (%)"><input style={inp} type="number" placeholder="2.5" step="0.1" value={nc.minPct} onChange={e=>setNc(p=>({...p,minPct:e.target.value}))} /></Field>
          <Field label="Due Day (1–31)"><input style={inp} type="number" placeholder="18" min="1" max="31" value={nc.dueDay} onChange={e=>setNc(p=>({...p,dueDay:e.target.value}))} /></Field>
        </div>
        <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>{actionBtn("Cancel",()=>setAddOpen(false),false)}{actionBtn("+ Add Card",doAddCard,true)}</div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="🗑 Confirm Delete">
        {delTarget && <>
          <p style={{ fontSize:"13px", color:"#9b6b8a", marginBottom:"20px" }}>
            Delete <strong style={{ color:"#1a0f1e" }}>{delTarget.item.label??delTarget.item.name}</strong>? This cannot be undone.
          </p>
          <div style={{ display:"flex", gap:"10px" }}>{actionBtn("Cancel",()=>setDelTarget(null),false)}{actionBtn("Delete",doDelete,true)}</div>
        </>}
      </Modal>
    </div>
  );
}
