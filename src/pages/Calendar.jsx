/**
 * Calendar.jsx
 * Monthly financial calendar — connected to Supabase user_data.
 */

import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { generateCalendarEvents } from "../finance/calendar/calendarEngine";
import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const TYPE_META = {
  income:       { color: colors.gold,     bg: "#fef6e4", border: "#c0781040", label: "Income",       emoji: "💛" },
  debt:         { color: colors.rose,     bg: "#fdedf1", border: "#f0608040", label: "Debt",         emoji: "💳" },
  bill:         { color: colors.pink,     bg: colors.pinkPale, border: "#e8708a40", label: "Bill",   emoji: "📄" },
  subscription: { color: colors.mauve,    bg: colors.mauvePale, border: "#c890b840", label: "Sub",  emoji: "🔄" },
  holiday:      { color: colors.textMuted,bg: colors.bgDeep, border: colors.border, label: "Holiday",emoji: "🍁" },
};

const fmt     = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n);
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date(toLocalDateStr(new Date()));
  return Math.ceil(diff / 86400000);
}

// Adapt budgetsbloom data to engine inputs
function adaptData(raw, rangeStart, rangeEnd) {
  if (!raw) return { shifts:[], debts:[], expenses:[], subscriptions:[] };
  const incomes      = raw.incomes      ?? [];
  const rawDebts     = []; // debts removed from app
  const rawExpenses  = raw.expenses     ?? [];
  const installments = raw.installments ?? [];

  const shifts = [];
  for (const inc of incomes) {
    if (inc.type === "shift") {
      for (const ds of (inc.dailyShifts ?? [])) {
        if (ds.date) shifts.push({ id: ds.id, date: ds.date, title: inc.label || "Payday",
          amount: ds.gross ?? (ds.hoursWorked * (inc.hourlyRate ?? 0)) });
      }
      if (!inc.dailyShifts?.length && inc.nextDate)
        shifts.push({ id: inc.id, date: inc.nextDate, title: inc.label || "Payday",
          hours: inc.hoursPerWeek, rate: inc.hourlyRate });
    } else if (inc.type === "manual" && inc.nextDate) {
      const day = new Date(inc.nextDate).getDate();
      const rs = new Date(rangeStart), re = new Date(rangeEnd);
      let c = new Date(rs.getFullYear(), rs.getMonth(), day);
      while (c <= re) {
        if (c >= rs) shifts.push({ id:`${inc.id}-${toLocalDateStr(c)}`, date: toLocalDateStr(c),
          title: inc.label || "Income", amount: inc.amount ?? 0 });
        c = new Date(c.getFullYear(), c.getMonth()+1, day);
      }
    }
  }

  const debts = rawDebts.filter(d=>d.dueDay).map(d => {
    const rs = new Date(rangeStart), y = rs.getFullYear(), m = rs.getMonth();
    const day = Math.min(d.dueDay, new Date(y, m+1, 0).getDate());
    const base = new Date(y, m, day);
    return { id:d.id, name:d.label, amount:d.minPayment??0,
      dueDate: toLocalDateStr(base>=rs?base:new Date(y,m+1,Math.min(d.dueDay,new Date(y,m+2,0).getDate()))),
      recurring:true, frequency:"monthly", rangeStart, rangeEnd };
  });

  const expenses = [
    ...rawExpenses.filter(e=>e.dueDay||e.dueDate||e.date).map(e => {
      const rs = new Date(rangeStart), y = rs.getFullYear(), m = rs.getMonth();
      const day = e.dueDay ? Math.min(e.dueDay, new Date(y,m+1,0).getDate()) : null;
      const base = day ? new Date(y,m,day) : null;
      const dateStr = e.dueDate || e.date || (base ? toLocalDateStr(base>=rs?base:new Date(y,m+1,Math.min(e.dueDay,new Date(y,m+2,0).getDate()))) : null);
      if (!dateStr) return null;
      return { id:e.id, name:e.label, amount:e.amount??0, date:dateStr, dueDate:dateStr,
        recurring:e.recurring??false, frequency:"monthly", rangeStart, rangeEnd };
    }).filter(Boolean),
    ...installments.filter(i=>i.monthly&&i.startDate).map(i => ({
      id:`inst-${i.id}`, name:i.label, amount:i.monthly, dueDate:i.startDate,
      recurring:true, frequency:"monthly", rangeStart, rangeEnd })),
  ];

  return { shifts, debts, expenses, subscriptions:[] };
}

function EventPill({ event, compact=false }) {
  const meta = TYPE_META[event.type] || TYPE_META.bill;
  return (
    <div title={`${event.title}${event.amount?" — "+fmt(event.amount):""}`}
      style={{ display:"flex",alignItems:"center",gap:"3px",
        padding: compact?"2px 5px":"3px 7px", borderRadius:"5px",
        backgroundColor:meta.bg, border:`1px solid ${meta.border}`,
        fontSize: compact?"9px":"11px", color:meta.color, fontWeight:600,
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        maxWidth:"100%", lineHeight:1.3 }}>
      <span style={{ flexShrink:0 }}>{meta.emoji}</span>
      <span style={{ overflow:"hidden",textOverflow:"ellipsis" }}>
        {compact ? event.title.split(" ")[0] : event.title}
      </span>
    </div>
  );
}

function DayCell({ date, isCurrentMonth, isToday, events, isSelected, onSelect }) {
  const dateStr   = toLocalDateStr(date);
  const hasEvents = events.length > 0;
  const visible   = events.slice(0, 2);
  const overflow  = events.length - 2;
  return (
    <div onClick={() => hasEvents && onSelect(dateStr)}
      style={{ minHeight:"80px", padding:"6px", borderRadius:radii.lg,
        backgroundColor: isSelected?"#fff0f4":isToday?"#fff4f7":isCurrentMonth?colors.bgCard:"#faf4f6",
        border:`1.5px solid ${isSelected?colors.pink:isToday?colors.pinkLight:colors.borderSoft}`,
        cursor:hasEvents?"pointer":"default",
        opacity:isCurrentMonth?1:0.4,
        transition:`all ${transitions.base}`,
        display:"flex",flexDirection:"column",gap:"3px",
        boxShadow:isToday?`0 0 0 2px ${colors.pinkPale}`:isSelected?"0 2px 12px rgba(232,112,138,0.15)":"none",
      }}>
      <span style={{ fontSize:"11px",fontWeight:isToday?700:400,lineHeight:1,
        color:isToday?colors.pinkDeep:isCurrentMonth?colors.textSoft:colors.textFaint }}>
        {date.getDate()}
      </span>
      {visible.map(ev=><EventPill key={ev.id} event={ev} compact />)}
      {overflow>0 && <span style={{ fontSize:"9px",color:colors.textMuted,paddingLeft:"4px" }}>+{overflow}</span>}
    </div>
  );
}

export default function Calendar() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState(null);
  const [rawData,   setRawData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

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

  const { rangeStart, rangeEnd } = useMemo(() => {
    const s = new Date(viewYear, viewMonth-1, 1);
    const e = new Date(viewYear, viewMonth+2, 0);
    return { rangeStart: toLocalDateStr(s), rangeEnd: toLocalDateStr(e) };
  }, [viewYear, viewMonth]);

  const { shifts, debts, expenses, subscriptions } = useMemo(
    () => adaptData(rawData, rangeStart, rangeEnd),
    [rawData, rangeStart, rangeEnd]
  );

  const allEvents = useMemo(() => generateCalendarEvents({
    shifts, debts, expenses, subscriptions,
    options: { includeStatHolidays:true, rangeStart, rangeEnd },
  }), [shifts, debts, expenses, subscriptions, rangeStart, rangeEnd]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of allEvents) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [allEvents]);

  const gridDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const days = []; const c = new Date(start);
    for (let i=0; i<42; i++) { days.push(new Date(c)); c.setDate(c.getDate()+1); }
    return days;
  }, [viewYear, viewMonth]);

  const todayStr       = toLocalDateStr(today);
  const selectedEvents = selected ? (eventsByDate[selected]||[]) : [];

  const upcoming = useMemo(() => allEvents
    .filter(e=>e.date>=todayStr&&e.type!=="holiday")
    .slice(0,10), [allEvents, todayStr]);

  function prevMonth() { if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); }
  function nextMonth() { if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); }

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>

      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        {/* Header */}
        <div className="fade-up" style={{ padding:"40px 0 20px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>
            Financial
          </p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,
            color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>
            Calendar
          </h1>
        </div>

        {loading && <LoadingSpinner message="Loading calendar…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && (
          <>
            {/* Nav */}
            <SoftCard variant="base" style={{ marginBottom:"16px" }} noAnimate>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <button onClick={prevMonth} style={{ width:"34px",height:"34px",borderRadius:radii.md,
                  border:`1.5px solid ${colors.border}`,backgroundColor:colors.bgWarm,
                  color:colors.textSoft,fontSize:"16px",cursor:"pointer",fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>

                <h2 style={{ fontFamily:typography.fontDisplay,fontSize:"20px",fontWeight:600,
                  color:colors.text,letterSpacing:"-0.02em",textAlign:"center" }}>
                  {MONTH_NAMES[viewMonth]} <span style={{ color:colors.textMuted,fontWeight:400 }}>{viewYear}</span>
                </h2>

                <button onClick={nextMonth} style={{ width:"34px",height:"34px",borderRadius:radii.md,
                  border:`1.5px solid ${colors.border}`,backgroundColor:colors.bgWarm,
                  color:colors.textSoft,fontSize:"16px",cursor:"pointer",fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
              </div>
            </SoftCard>

            {/* Grid */}
            <SoftCard variant="base" padding="12px" style={{ marginBottom:"16px" }} noAnimate>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"4px" }}>
                {DAY_LABELS.map(d=>(
                  <div key={d} style={{ textAlign:"center",fontSize:"9px",fontWeight:700,
                    color:colors.textFaint,letterSpacing:"0.08em",textTransform:"uppercase",padding:"4px 0" }}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px" }}>
                {gridDays.map((date,i)=>(
                  <DayCell key={i} date={date}
                    isCurrentMonth={date.getMonth()===viewMonth}
                    isToday={toLocalDateStr(date)===todayStr}
                    isSelected={toLocalDateStr(date)===selected}
                    events={eventsByDate[toLocalDateStr(date)]||[]}
                    onSelect={setSelected} />
                ))}
              </div>

              {/* Legend */}
              <div style={{ display:"flex",gap:"10px",flexWrap:"wrap",marginTop:"12px",paddingTop:"12px",
                borderTop:`1px solid ${colors.borderSoft}` }}>
                {Object.entries(TYPE_META).filter(([k])=>k!=="holiday").map(([type,meta])=>(
                  <div key={type} style={{ display:"flex",alignItems:"center",gap:"4px" }}>
                    <span style={{ width:"8px",height:"8px",borderRadius:"2px",
                      backgroundColor:meta.color,flexShrink:0 }} />
                    <span style={{ fontSize:"10px",color:colors.textMuted,fontWeight:500 }}>{meta.label}</span>
                  </div>
                ))}
              </div>
            </SoftCard>

            {/* Selected day */}
            {selected && selectedEvents.length>0 && (
              <SoftCard variant="soft" style={{ marginBottom:"16px" }} noAnimate>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
                  <span style={{ fontSize:"13px",fontWeight:600,color:colors.textSoft }}>
                    {new Date(...selected.split("-").map((v,i)=>i===1?v-1:+v))
                      .toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric"})}
                  </span>
                  <button onClick={()=>setSelected(null)}
                    style={{ background:"none",border:"none",color:colors.textMuted,
                      cursor:"pointer",fontSize:"18px",lineHeight:1,padding:"0 4px" }}>×</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                  {selectedEvents.map(ev=>{
                    const meta=TYPE_META[ev.type]||TYPE_META.bill;
                    return (
                      <div key={ev.id} style={{ display:"flex",alignItems:"center",gap:"12px",
                        padding:"10px 14px",borderRadius:radii.lg,
                        backgroundColor:meta.bg,border:`1px solid ${meta.border}` }}>
                        <span style={{ fontSize:"18px" }}>{meta.emoji}</span>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:"13px",fontWeight:600,color:colors.text }}>{ev.title}</div>
                          <div style={{ fontSize:"10px",color:meta.color,fontWeight:600,
                            textTransform:"uppercase",letterSpacing:"0.06em" }}>{meta.label}</div>
                        </div>
                        {ev.amount>0 && (
                          <span style={{ fontFamily:typography.fontDisplay,fontSize:"15px",
                            fontWeight:700,color:meta.color }}>{fmt(ev.amount)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SoftCard>
            )}

            {/* Upcoming */}
            <div className="fade-up" style={{ animationDelay:"0.15s" }}>
              <h2 style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,
                letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"12px",
                display:"flex",alignItems:"center",gap:"8px" }}>
                Upcoming Deadlines
                <span style={{ flex:1,height:"1px",backgroundColor:colors.border }} />
              </h2>

              {upcoming.length===0 ? (
                <SoftCard variant="ghost" style={{ textAlign:"center",padding:"32px",color:colors.textFaint,fontSize:"13px" }} noAnimate>
                  No upcoming events.
                </SoftCard>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                  {upcoming.map(ev=>{
                    const meta  = TYPE_META[ev.type]||TYPE_META.bill;
                    const days  = daysUntil(ev.date);
                    const daysLabel = days===0?"Today":days===1?"Tomorrow":`${days}d`;
                    const urgent    = days <= 3;
                    return (
                      <SoftCard key={ev.id} variant="base" padding="12px 16px" noAnimate
                        style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                        <div style={{ width:"36px",height:"36px",borderRadius:radii.md,flexShrink:0,
                          backgroundColor:meta.bg,border:`1px solid ${meta.border}`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px" }}>
                          {meta.emoji}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:"13px",fontWeight:600,color:colors.text,marginBottom:"2px" }}>{ev.title}</div>
                          <div style={{ fontSize:"10px",color:meta.color,fontWeight:600,
                            textTransform:"uppercase",letterSpacing:"0.06em" }}>{meta.label}</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          {ev.amount>0 && (
                            <div style={{ fontFamily:typography.fontDisplay,fontSize:"15px",
                              fontWeight:700,color:meta.color,lineHeight:1,marginBottom:"2px" }}>
                              {fmt(ev.amount)}
                            </div>
                          )}
                          <div style={{ fontSize:"11px",fontWeight:700,
                            color:urgent?colors.pinkDeep:colors.textMuted,
                            padding:"2px 7px",borderRadius:radii.full,
                            backgroundColor:urgent?colors.pinkPale:"transparent" }}>
                            {daysLabel}
                          </div>
                        </div>
                      </SoftCard>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
