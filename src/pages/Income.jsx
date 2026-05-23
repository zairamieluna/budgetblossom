/**
 * Income.jsx  (Salary / Shifts page)
 * Rebuilt from V2 HTML source + existing Income.jsx.
 *
 * Changes from the previous Income.jsx:
 *  - Period navigator extracted to its own <PeriodNav> component
 *  - Pooled income card extracted to <PooledIncomeCard>
 *  - JobCard: after addShift, only time/type reset (date kept for fast multi-entry)
 *  - "No shifts logged yet" empty state added per job card
 *  - DividerLabel replaces the raw inline "— Or Enter Actual —" string
 *  - All Supabase load/save logic, bottom-sheet AddJobModal, Toast unchanged
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { typography } from "../ui/designTokens";

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildPeriods() {
  const out = [];
  const year = 2026;
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    out.push({
      k:  `26${m}a`,
      lbl:`${MO[m]} 1–15`,
      s:  new Date(year, m, 1),
      e:  new Date(year, m, 15, 23, 59, 59),
      pd: new Date(year, m, 7),
    });
    out.push({
      k:  `26${m}b`,
      lbl:`${MO[m]} 16–${lastDay}`,
      s:  new Date(year, m, 16),
      e:  new Date(year, m, lastDay, 23, 59, 59),
      pd: new Date(year, m, 22),
    });
  }
  return out;
}
const PERIODS = buildPeriods();

function currentPeriodIdx() {
  const now = new Date();
  const idx = PERIODS.findIndex(p => now >= p.s && now <= p.e);
  return idx >= 0 ? idx : Math.max(0, PERIODS.findIndex(p => p.s > now) - 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANADIAN HOLIDAYS 2026
// ─────────────────────────────────────────────────────────────────────────────
const HOLS = [
  { d:"2026-01-01", n:"New Year's Day" },
  { d:"2026-02-16", n:"Family Day (ON)" },
  { d:"2026-04-03", n:"Good Friday" },
  { d:"2026-04-06", n:"Easter Monday" },
  { d:"2026-05-18", n:"Victoria Day" },
  { d:"2026-07-01", n:"Canada Day" },
  { d:"2026-08-03", n:"Civic Holiday (ON)" },
  { d:"2026-09-07", n:"Labour Day" },
  { d:"2026-10-12", n:"Thanksgiving" },
  { d:"2026-11-11", n:"Remembrance Day" },
  { d:"2026-12-25", n:"Christmas Day" },
  { d:"2026-12-26", n:"Boxing Day" },
];
const getHol = d => HOLS.find(h => h.d === d) ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = n =>
  new Intl.NumberFormat("en-CA", { style:"currency", currency:"CAD", minimumFractionDigits:2 })
    .format(n ?? 0).replace("CA$","$");

const fd = d => d.toLocaleDateString("en-CA", { month:"short", day:"numeric" });
const todayStr = () => new Date().toISOString().split("T")[0];

function calcHrs(inT, outT, brk) {
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  let m = (oh * 60 + om) - (ih * 60 + im);
  if (m < 0) m += 1440;
  return Math.max(0, (m - brk) / 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_JOBS = [
  { id:"j1", person:"Zai",   title:"A&W",     employer:"A&W Canada",       rate:17.75, otRate:26.63, ded:5.29,  color:0 },
  { id:"j2", person:"Zai",   title:"Loblaws", employer:"Loblaw Companies", rate:17.70, otRate:26.55, ded:14.7,  color:1 },
  { id:"j3", person:"Ariel", title:"INGERV",  employer:"INGERV Cleaner",   rate:20.50, otRate:30.75, ded:8.70,  color:2 },
];

const JOB_COLORS = ["#db2777","#3a6b4e","#2860a0","#a67c20","#7c3aed"];
const CORE_IDS   = ["j1","j2","j3"];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const cardStyle = {
  background: "#ffffff",
  border: "1px solid #fce7f3",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "12px",
  boxShadow: "0 1px 4px rgba(26,15,30,.07),0 4px 18px rgba(26,15,30,.07)",
};

const inp = {
  width: "100%",
  padding: "9px 11px",
  background: "#fff5f9",
  border: "1.5px solid #fce7f3",
  borderRadius: "9px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#1a0f1e",
  outline: "none",
  transition: "border-color .15s",
  WebkitAppearance: "none",
  boxSizing: "border-box",
};

function Lbl({ children }) {
  return (
    <div style={{
      fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "#9b6b8a", margin: "11px 0 4px",
    }}>
      {children}
    </div>
  );
}

function DividerLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.06em", color: "#9b6b8a", textAlign: "center",
      borderTop: "1px solid #fce7f3", paddingTop: "12px",
      marginTop: "12px", marginBottom: "10px",
    }}>
      — {children} —
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: "90px", left: "50%",
      transform: "translateX(-50%)",
      background: "#1a0f1e", color: "#f6f2ec",
      borderRadius: "99px", padding: "9px 20px",
      fontSize: "13px", fontWeight: 600, zIndex: 700,
      whiteSpace: "nowrap",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      animation: "fadeUp .2s ease both",
    }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
function PeriodNav({ pidx, period, onChange }) {
  const navBtn = (disabled) => ({
    background: "#fff", border: "1.5px solid #f0dce4", borderRadius: "9px",
    padding: "7px 12px", fontWeight: 700, color: "#9b6b8a",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"12px" }}>
      <button
        style={navBtn(pidx === 0)}
        disabled={pidx === 0}
        onClick={() => onChange(Math.max(0, pidx - 1))}
      >‹</button>
      <div style={{
        flex: 1, textAlign: "center", background: "#fff",
        border: "1.5px solid #f0dce4", borderRadius: "9px",
        padding: "7px 10px", fontFamily: typography.fontDisplay,
        fontWeight: 700, fontSize: "14px",
      }}>
        {period?.lbl}
      </div>
      <button
        style={navBtn(pidx === PERIODS.length - 1)}
        disabled={pidx === PERIODS.length - 1}
        onClick={() => onChange(Math.min(PERIODS.length - 1, pidx + 1))}
      >›</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD JOB MODAL  (bottom-sheet)
// ─────────────────────────────────────────────────────────────────────────────
function AddJobModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({
    person: "Zai", title: "", employer: "", rate: "", ded: "5.29",
  });

  if (!open) return null;

  function submit() {
    const rate = parseFloat(form.rate);
    if (!form.title.trim() || !rate) { alert("Title and rate required"); return; }
    onAdd({
      id:       "j" + Date.now(),
      person:   form.person,
      title:    form.title.trim(),
      employer: form.employer.trim() || "—",
      rate,
      otRate:   +(rate * 1.5).toFixed(2),
      ded:      parseFloat(form.ded) || 5.29,
      color:    Math.floor(Math.random() * 5),
    });
    setForm({ person:"Zai", title:"", employer:"", rate:"", ded:"5.29" });
    onClose();
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        background: "rgba(26,9,30,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#ffffff", borderRadius: "20px 20px 0 0",
        padding: "22px 18px 34px",
        width: "100%", maxWidth: "520px",
        boxShadow: "0 -8px 40px rgba(26,9,30,.18)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <h3 style={{ fontFamily: typography.fontDisplay, fontSize:"17px", fontWeight:700, color:"#1a0f1e" }}>
            + Add Job
          </h3>
          <button
            onClick={onClose}
            style={{ background:"#fff5f9", border:"none", borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"13px", color:"#9b6b8a" }}
          >✕</button>
        </div>

        <Lbl>For</Lbl>
        <select style={inp} value={form.person} onChange={e => set("person", e.target.value)}>
          <option>Zai</option>
          <option>Ariel</option>
        </select>

        <Lbl>Job Title</Lbl>
        <input style={inp} placeholder="e.g. Tim Hortons Barista" value={form.title} onChange={e => set("title", e.target.value)} />

        <Lbl>Employer</Lbl>
        <input style={inp} placeholder="e.g. Tim Hortons Inc." value={form.employer} onChange={e => set("employer", e.target.value)} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div>
            <Lbl>Hourly Rate ($)</Lbl>
            <input style={inp} type="number" placeholder="17.00" value={form.rate} onChange={e => set("rate", e.target.value)} />
          </div>
          <div>
            <Lbl>Deduction % (est)</Lbl>
            <input style={inp} type="number" placeholder="5.29" step="0.1" value={form.ded} onChange={e => set("ded", e.target.value)} />
          </div>
        </div>

        <div style={{ display:"flex", gap:"10px", marginTop:"14px" }}>
          <button
            onClick={onClose}
            style={{ flex:1, padding:"11px", borderRadius:"9px", border:"1.5px solid #f0dce4", background:"#fff", color:"#3a2430", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" }}
          >Cancel</button>
          <button
            onClick={submit}
            style={{ flex:1, padding:"11px", borderRadius:"9px", border:"none", background:"#db2777", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" }}
          >Add Job</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB CARD
// ─────────────────────────────────────────────────────────────────────────────
function JobCard({ job, periodKey, shifts, onAddShift, onRmShift, onSendShifts, onSendActual, onRemoveJob }) {
  const [date,    setDate]    = useState(todayStr());
  const [inT,     setInT]     = useState("09:00");
  const [outT,    setOutT]    = useState("17:00");
  const [brk,     setBrk]     = useState("30");
  const [type,    setType]    = useState("reg");
  const [holNote, setHolNote] = useState("");
  const [actualN, setActualN] = useState("");
  const [actualG, setActualG] = useState("");

  const accentColor = JOB_COLORS[job.color ?? 0];

  const totH  = shifts.reduce((s, x) => s + (x.hrs   ?? 0), 0);
  const gross = shifts.reduce((s, x) => s + (x.gross ?? 0), 0);
  const ded   = gross * (job.ded / 100);
  const net   = gross - ded;

  function handleDateChange(val) {
    setDate(val);
    const h = getHol(val);
    if (h) { setHolNote(`🎉 ${h.n} — Stat pay rate auto-selected below.`); setType("stat"); }
    else    { setHolNote(""); }
  }

  function getPayRate() {
    if (type === "ot")         return job.otRate;
    if (type === "stat")       return +(job.rate * 1.5).toFixed(2);
    if (type === "holiday_ot") return +(job.rate * 2).toFixed(2);
    return job.rate;
  }

  function handleAddShift() {
    if (!date || !inT || !outT) { alert("Enter date, time in, and time out"); return; }
    const hrs  = calcHrs(inT, outT, parseInt(brk) || 30);
    const rate = getPayRate();
    const grss = +(hrs * rate).toFixed(2);
    const hol  = getHol(date);
    onAddShift(job.id, {
      id: Date.now(),
      date, inT, outT,
      brk:  parseInt(brk) || 30,
      type,
      hrs:  +hrs.toFixed(4),
      rate, gross: grss,
      hol:  hol?.n ?? null,
    });
    // Keep date (useful for multi-shift days), reset everything else
    setInT("09:00"); setOutT("17:00"); setBrk("30"); setType("reg"); setHolNote("");
  }

  function handleSendActual() {
    const n = parseFloat(actualN);
    const g = parseFloat(actualG) || n;
    if (!n || n <= 0) { alert("Enter actual net amount"); return; }
    onSendActual(job.id, n, g);
    setActualN(""); setActualG("");
  }

  const payTypeOptions = [
    { v:"reg",        l:`Regular — ${fmt(job.rate)}/hr` },
    { v:"ot",         l:`Overtime — ${fmt(job.otRate)}/hr` },
    { v:"stat",       l:`⭐ Stat Pay 1.5× — ${fmt(+(job.rate * 1.5).toFixed(2))}/hr` },
    { v:"holiday_ot", l:`🎉 Holiday OT 2× — ${fmt(+(job.rate * 2).toFixed(2))}/hr` },
  ];

  return (
    <div style={cardStyle}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div>
          <div style={{ fontFamily: typography.fontDisplay, fontSize:"1.05rem", fontWeight:700, color:"#1a0f1e", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <span style={{ background: accentColor, color:"#fff", fontSize:"0.6rem", fontWeight:700, padding:"2px 8px", borderRadius:"5px", letterSpacing:"0.04em" }}>
              {job.person}
            </span>
            {job.title}
          </div>
          <div style={{ fontSize:"0.72rem", color:"#9b6b8a", marginTop:"2px" }}>
            {fmt(job.rate)}/hr · OT {fmt(job.otRate)}/hr · ~{job.ded}% deduction
          </div>
        </div>
        {!CORE_IDS.includes(job.id) && (
          <button
            onClick={() => onRemoveJob(job.id)}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#d4b8c4", fontSize:"0.85rem", padding:"0 2px", lineHeight:1 }}
            onMouseEnter={e => e.target.style.color = "#c24b1a"}
            onMouseLeave={e => e.target.style.color = "#d4b8c4"}
          >✕</button>
        )}
      </div>

      {/* Holiday note */}
      {holNote && (
        <div style={{ background:"#faf5e6", border:"1px solid #dcca84", borderRadius:"9px", padding:"8px 12px", marginBottom:"10px", fontSize:"0.75rem", color:"#7a5010", fontWeight:600 }}>
          {holNote}
        </div>
      )}

      {/* Stat / holiday OT note */}
      {(type === "stat" || type === "holiday_ot") && (
        <div style={{ background:"#faf5e6", border:"1px solid #dcca84", borderRadius:"9px", padding:"8px 12px", marginBottom:"10px", fontSize:"0.72rem", color:"#7a5010" }}>
          ⭐ {type === "stat"
            ? "Stat pay = hours × rate × 1.5."
            : "Holiday OT = hours × rate × 2."
          } Added on top of regular pay.
        </div>
      )}

      {/* Log Shift form */}
      <div style={{ borderTop:"1px solid #fce7f3", paddingTop:"12px", marginBottom:"10px" }}>
        <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#9b6b8a", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"8px" }}>
          Log Shift
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div>
            <Lbl>Date</Lbl>
            <input style={inp} type="date" value={date} onChange={e => handleDateChange(e.target.value)} />
          </div>
          <div>
            <Lbl>Break (mins)</Lbl>
            <input style={inp} type="number" min="0" placeholder="30" value={brk} onChange={e => setBrk(e.target.value)} />
          </div>
          <div>
            <Lbl>Time In</Lbl>
            <input style={inp} type="time" value={inT} onChange={e => setInT(e.target.value)} />
          </div>
          <div>
            <Lbl>Time Out</Lbl>
            <input style={inp} type="time" value={outT} onChange={e => setOutT(e.target.value)} />
          </div>
        </div>

        <Lbl>Pay Type</Lbl>
        <select style={inp} value={type} onChange={e => setType(e.target.value)}>
          {payTypeOptions.map(o => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>

        <button
          onClick={handleAddShift}
          style={{ width:"100%", marginTop:"10px", padding:"10px", borderRadius:"9px", background:"#db2777", border:"none", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" }}
        >
          + Add Shift
        </button>
      </div>

      {/* Shift rows */}
      {shifts.length > 0 ? (
        <div style={{ marginBottom:"12px" }}>
          {shifts.map(s => (
            <div key={s.id} style={{ background:"#fff5f9", borderRadius:"9px", padding:"9px 11px", marginBottom:"6px", display:"flex", alignItems:"flex-start", gap:"8px" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.83rem", fontWeight:600 }}>
                  {s.date}
                  {s.hol && (
                    <span style={{ color:"#a67c20", fontSize:"0.65rem", marginLeft:"5px" }}>🎉 {s.hol}</span>
                  )}
                </div>
                <div style={{ fontSize:"0.67rem", color:"#9b6b8a", marginTop:"1px" }}>
                  {s.inT}–{s.outT} · {s.hrs.toFixed(2)} hrs · {s.type} @ {fmt(s.rate)}/hr
                </div>
              </div>
              <div style={{ fontWeight:700, color:"#3a6b4e", fontSize:"0.85rem", whiteSpace:"nowrap" }}>
                {fmt(s.gross)}
              </div>
              <button
                onClick={() => onRmShift(job.id, s.id)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#d4b8c4", fontSize:"0.95rem", padding:"0 2px", transition:"color .15s", lineHeight:1, flexShrink:0 }}
                onMouseEnter={e => e.target.style.color = "#c24b1a"}
                onMouseLeave={e => e.target.style.color = "#d4b8c4"}
              >✕</button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize:"0.77rem", color:"#9b6b8a", marginBottom:"12px" }}>
          No shifts logged yet.
        </p>
      )}

      {/* Pay summary box */}
      <div style={{ background:"#fff5f9", border:"1px solid #fce7f3", borderRadius:"9px", padding:"13px", marginBottom:"12px" }}>
        {[
          { l:"Total Hours",                   v:`${totH.toFixed(2)} hrs`, c:"#1a0f1e" },
          { l:"Gross Pay",                      v: fmt(gross),              c:"#3a6b4e" },
          { l:`Est. Deductions (${job.ded}%)`,  v:`−${fmt(ded)}`,           c:"#9b6b8a" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.81rem", marginBottom:"6px" }}>
            <span style={{ color:"#9b6b8a" }}>{l}</span>
            <span style={{ fontWeight:700, color:c }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.81rem", paddingTop:"8px", borderTop:"1px solid #fce7f3", fontWeight:700 }}>
          <span>Est. Net Pay</span>
          <span style={{ fontSize:"1.05rem", color:"#db2777" }}>{fmt(net)}</span>
        </div>
      </div>

      {/* Send from shifts */}
      <button
        onClick={() => onSendShifts(job.id)}
        disabled={shifts.length === 0}
        style={{
          width:"100%", padding:"11px", borderRadius:"9px",
          background: shifts.length > 0 ? "#3a6b4e" : "#d4b8c4",
          border:"none", color:"#fff",
          fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px",
          cursor: shifts.length > 0 ? "pointer" : "not-allowed",
          marginBottom:"12px", transition:"background .2s",
        }}
      >
        ✓ Send to Budget Pool
      </button>

      {/* Or enter actual */}
      <DividerLabel>Or Enter Actual</DividerLabel>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"8px" }}>
        <div>
          <Lbl>Net Received ($)</Lbl>
          <input style={inp} type="number" placeholder="0.00" step="0.01" value={actualN} onChange={e => setActualN(e.target.value)} />
        </div>
        <div>
          <Lbl>Gross (optional)</Lbl>
          <input style={inp} type="number" placeholder="0.00" step="0.01" value={actualG} onChange={e => setActualG(e.target.value)} />
        </div>
      </div>
      <button
        onClick={handleSendActual}
        style={{ width:"100%", padding:"10px", borderRadius:"9px", background:"#eaf1f9", border:"1px solid #9cc0e4", color:"#2860a0", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" }}
      >
        ✓ Send Actual to Budget Pool
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POOLED INCOME CARD
// ─────────────────────────────────────────────────────────────────────────────
function PooledIncomeCard({ periodSent, periodLabel, totalPool }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: typography.fontDisplay, fontSize:"0.97rem", fontWeight:700, marginBottom:"12px" }}>
        💰 Pooled Income — {periodLabel}
      </div>

      {periodSent.length === 0 ? (
        <p style={{ color:"#9b6b8a", fontSize:"0.75rem" }}>No salary sent yet this period.</p>
      ) : (
        <>
          {periodSent.map((s, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #fce7f3", fontSize:"0.81rem", gap:6 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700 }}>{s.src}</div>
                <div style={{ fontSize:"0.67rem", color:"#9b6b8a" }}>
                  {s.date} · Gross: {fmt(s.gross ?? s.amt)}
                </div>
              </div>
              <span style={{ background:"#eaf3ee", color:"#3a6b4e", fontSize:"0.57rem", fontWeight:700, padding:"2px 6px", borderRadius:"5px", margin:"0 8px", letterSpacing:"0.04em", flexShrink:0 }}>
                SENT
              </span>
              <div style={{ fontWeight:700, color:"#3a6b4e", flexShrink:0 }}>
                {fmt(s.amt)}
              </div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"10px", fontWeight:700, fontSize:"0.9rem", borderTop:"1px solid #fce7f3", marginTop:"4px" }}>
            <span>Total Pool</span>
            <span style={{ color:"#3a6b4e" }}>{fmt(totalPool)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Income
// ─────────────────────────────────────────────────────────────────────────────
export default function Income() {
  const [rawData,    setRawData]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState("");
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [pidx,       setPidx]       = useState(currentPeriodIdx);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase
          .from("user_data").select("data").limit(1).single();
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

  // ── Save ────────────────────────────────────────────────────────────────
  const save = useCallback(async (updated) => {
    setSaving(true);
    try {
      const { data: row } = await supabase
        .from("user_data").select("id").limit(1).single();
      await supabase.from("user_data")
        .update({ data: { budgetsbloom: JSON.stringify(updated) } })
        .eq("id", row.id);
      setRawData(updated);
    } catch {
      setToast("❌ Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const jobs   = useMemo(() => rawData?.jobs   ?? DEFAULT_JOBS, [rawData]);
  const shifts = useMemo(() => rawData?.shifts ?? {}, [rawData]);
  const sent   = useMemo(() => rawData?.sent   ?? {}, [rawData]);

  const period     = PERIODS[pidx];
  const periodKey  = period?.k ?? "";
  const periodSent = useMemo(() => sent[periodKey] ?? [], [sent, periodKey]);
  const totalPool  = useMemo(() => periodSent.reduce((s, x) => s + (x.amt ?? 0), 0), [periodSent]);

  // ── Actions ─────────────────────────────────────────────────────────────
  function handleAddShift(jid, shift) {
    const sk  = `${jid}|${periodKey}`;
    const cur = shifts[sk] ?? [];
    save({ ...rawData, shifts: { ...shifts, [sk]: [...cur, shift] } });
    setToast("✅ Shift added!");
  }

  function handleRmShift(jid, sid) {
    const sk  = `${jid}|${periodKey}`;
    const cur = (shifts[sk] ?? []).filter(s => s.id !== sid);
    save({ ...rawData, shifts: { ...shifts, [sk]: cur } });
    setToast("🗑 Shift removed");
  }

  function handleSendShifts(jid) {
    const job = jobs.find(j => j.id === jid);
    if (!job) return;
    const sk      = `${jid}|${periodKey}`;
    const jshifts = shifts[sk] ?? [];
    if (!jshifts.length) { setToast("⚠️ No shifts to send"); return; }
    const gross = jshifts.reduce((s, x) => s + (x.gross ?? 0), 0);
    const net   = +(gross * (1 - job.ded / 100)).toFixed(2);
    const entry = {
      src:    `${job.person} — ${job.title}`,
      amt:    net, gross,
      date:   todayStr(),
      person: job.person,
    };
    save({
      ...rawData,
      shifts: { ...shifts, [sk]: [] },
      sent:   { ...sent, [periodKey]: [...(sent[periodKey] ?? []), entry] },
    });
    setToast(`✅ ${fmt(net)} from ${job.title} → Budget Pool!`);
  }

  function handleSendActual(jid, net, gross) {
    const job = jobs.find(j => j.id === jid);
    if (!job) return;
    const entry = {
      src:    `${job.person} — ${job.title} (actual)`,
      amt:    net, gross,
      date:   todayStr(),
      person: job.person,
    };
    save({
      ...rawData,
      sent: { ...sent, [periodKey]: [...(sent[periodKey] ?? []), entry] },
    });
    setToast(`✅ ${fmt(net)} actual → Budget Pool!`);
  }

  function handleAddJob(job) {
    save({ ...rawData, jobs: [...jobs, job] });
    setToast("✅ Job added!");
  }

  function handleRemoveJob(jid) {
    if (!window.confirm("Remove this job?")) return;
    save({ ...rawData, jobs: jobs.filter(j => j.id !== jid) });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#fdf6f8", fontFamily:"'DM Sans',sans-serif", color:"#1a0f1e", paddingBottom:"80px" }}>
      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"14px" }}>

        {/* Page header */}
        <div className="fade-up" style={{ padding:"28px 0 14px", display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
          <div>
            <p style={{ fontSize:"11px", fontWeight:700, color:"#9b6b8a", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>
              Salary
            </p>
            <h1 style={{ fontFamily: typography.fontDisplay, fontSize:"28px", fontWeight:700, color:"#1a0f1e", letterSpacing:"-0.02em", lineHeight:1.1 }}>
              Income & Shifts
            </h1>
          </div>
          {saving && <span style={{ fontSize:"11px", color:"#9b6b8a" }}>Saving…</span>}
        </div>

        {loading && <LoadingSpinner message="Loading salary data…" />}

        {error && (
          <div style={{ background:"#fdedf1", border:"1px solid #f4a0b4", borderRadius:"14px", padding:"14px", marginBottom:"12px", color:"#c94d6a", fontSize:"13px" }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <PeriodNav pidx={pidx} period={period} onChange={setPidx} />

            <div style={{ background:"#fdf2f8", border:"1px solid #f9a8c9", borderRadius:"9px", padding:"10px 14px", marginBottom:"12px", fontSize:"0.83rem", color:"#db2777", fontWeight:500 }}>
              💰 Period: <strong>{period?.lbl}</strong> · Payday <strong>{period ? fd(period.pd) : "—"}</strong>
            </div>

            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                periodKey={periodKey}
                shifts={shifts[`${job.id}|${periodKey}`] ?? []}
                onAddShift={handleAddShift}
                onRmShift={handleRmShift}
                onSendShifts={handleSendShifts}
                onSendActual={handleSendActual}
                onRemoveJob={handleRemoveJob}
              />
            ))}

            <PooledIncomeCard
              periodSent={periodSent}
              periodLabel={period?.lbl}
              totalPool={totalPool}
            />

            <button
              onClick={() => setAddJobOpen(true)}
              style={{ width:"100%", padding:"12px", background:"#fff", border:"1.5px solid #f0dce4", borderRadius:"14px", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:"13px", color:"#9b6b8a", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}
            >
              + Add Another Job
            </button>
          </>
        )}
      </div>

      <AddJobModal open={addJobOpen} onClose={() => setAddJobOpen(false)} onAdd={handleAddJob} />
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
