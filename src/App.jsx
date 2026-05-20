import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─── THEME ──────────────────────────────────────────────────────────────────
const THEMES = {
  pink: {
    bg: "#FFF0F5", card: "#FFFFFF", accent: "#FF6B9D", accent2: "#FFB3D1",
    text: "#3D1A2E", muted: "#9B7B8A", border: "#FFD6E7",
    gradient: "linear-gradient(135deg, #FF6B9D 0%, #FF9DC7 100%)",
    sidebar: "#FFE4EF", sidebarText: "#9B3B6A",
  },
  lavender: {
    bg: "#F5F0FF", card: "#FFFFFF", accent: "#9B7AEA", accent2: "#C9B8FF",
    text: "#2D1B5E", muted: "#7B6A9B", border: "#DDD6FF",
    gradient: "linear-gradient(135deg, #9B7AEA 0%, #C9B8FF 100%)",
    sidebar: "#EDE8FF", sidebarText: "#6B4EC8",
  },
  dark: {
    bg: "#1A1025", card: "#241936", accent: "#FF6B9D", accent2: "#9B7AEA",
    text: "#F0E6FF", muted: "#8A7A9B", border: "#3D2B5E",
    gradient: "linear-gradient(135deg, #FF6B9D 0%, #9B7AEA 100%)",
    sidebar: "#1E1430", sidebarText: "#C9B8FF",
  },
  cozy: {
    bg: "#FDF6EE", card: "#FFFFFF", accent: "#D4885A", accent2: "#F0C49B",
    text: "#3D2A1A", muted: "#8A6A4A", border: "#F0DCC8",
    gradient: "linear-gradient(135deg, #D4885A 0%, #F0C49B 100%)",
    sidebar: "#FFF0E0", sidebarText: "#A0603A",
  },
  minimal: {
    bg: "#F8F8F8", card: "#FFFFFF", accent: "#333333", accent2: "#888888",
    text: "#111111", muted: "#888888", border: "#E0E0E0",
    gradient: "linear-gradient(135deg, #333 0%, #888 100%)",
    sidebar: "#F0F0F0", sidebarText: "#444444",
  },
};

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const initState = {
  theme: "pink",
  onboarded: false,
  profile: { name: "Zaira", partnerName: "Ariel" },
  incomes: [
    { id: 1, label: "Zaira - A&W", type: "shift", hourlyRate: 17.75, hoursPerWeek: 24, frequency: "biweekly", nextDate: "2026-05-23", color: "#FF6B9D", dailyShifts: [], received: [] },
    { id: 2, label: "Ariel - Building Super", type: "manual", amount: 2600, frequency: "monthly", nextDate: "2026-05-30", color: "#9B7AEA", dailyShifts: [], received: [] },
  ],
  expenses: [
    { id: 1, label: "Rent", category: "Fixed", amount: 1550, dueMonth: null, dueDay: 1, paid: false, recurring: true, priority: "high", notes: "" },
    { id: 2, label: "Hydro", category: "Fixed", amount: 80, dueMonth: null, dueDay: 15, paid: false, recurring: true, priority: "high", notes: "" },
    { id: 3, label: "Internet", category: "Fixed", amount: 65, dueMonth: null, dueDay: 20, paid: true, recurring: true, priority: "medium", notes: "" },
    { id: 4, label: "Phone Bill", category: "Fixed", amount: 55, dueMonth: null, dueDay: 5, paid: false, recurring: true, priority: "medium", notes: "" },
    { id: 5, label: "Groceries", category: "Variable", amount: 400, dueMonth: null, dueDay: null, paid: false, recurring: false, priority: "high", notes: "" },
    { id: 6, label: "Transit", category: "Variable", amount: 156, dueMonth: null, dueDay: null, paid: true, recurring: true, priority: "high", notes: "" },
    { id: 7, label: "Skincare & Beauty", category: "Variable", amount: 80, dueMonth: null, dueDay: null, paid: false, recurring: false, priority: "low", notes: "" },
    { id: 8, label: "Eating Out", category: "Variable", amount: 120, dueMonth: null, dueDay: null, paid: false, recurring: false, priority: "low", notes: "" },
  ],
  debts: [
    { id: 1, label: "Credit Card A", balance: 1200, rate: 19.99, minPayment: 35, dueDay: 18, color: "#FF6B9D" },
    { id: 2, label: "Credit Card B", balance: 650, rate: 22.99, minPayment: 25, dueDay: 25, color: "#9B7AEA" },
  ],
  cards: [
    { id: 1, label: "RBC Avion", limit: 3000, balance: 1200, statementDay: 12, dueDay: 18, apr: 19.99, minPayment: 35 },
    { id: 2, label: "TD Cash Back", limit: 2000, balance: 650, statementDay: 19, dueDay: 25, apr: 22.99, minPayment: 25 },
  ],
  installments: [
    { id: 1, label: "Laptop", total: 1500, monthly: 120, paid: 480, startDate: "2026-01-01" },
  ],
  goals: [
    { id: 1, label: "Emergency Fund", target: 5000, saved: 1200, targetDate: "2026-12-31", color: "#FF6B9D" },
    { id: 2, label: "Vacation", target: 2000, saved: 450, targetDate: "2026-08-01", color: "#9B7AEA" },
  ],
  todos: [
    { id: 1, text: "Pay hydro bill", done: false, dueDate: "2026-05-15", priority: "high" },
    { id: 2, text: "Grocery shopping", done: false, dueDate: "2026-05-20", priority: "medium" },
    { id: 3, text: "Book dentist appointment", done: false, dueDate: "2026-05-30", priority: "low" },
  ],
  moods: [
    { date: "2026-05-17", emoji: "😌", note: "Productive day!" },
    { date: "2026-05-16", emoji: "😴", note: "Tired from work" },
    { date: "2026-05-15", emoji: "😀", note: "Got paid!" },
    { date: "2026-05-14", emoji: "😡", note: "Bills stress" },
  ],
  meds: [
    { id: 1, name: "Vitamin D", dosage: "1000 IU", times: ["08:00", "21:00"], taken: { "08:00": false, "21:00": false } },
    { id: 2, name: "Iron", dosage: "65mg", times: ["09:00"], taken: { "09:00": true } },
  ],
  debtMethod: "snowball",
  openAIKey: "",
  aiInsights: null,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
const fmtD = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n || 0);
const today = new Date().toISOString().split("T")[0];
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── ONTARIO STAT HOLIDAYS ───────────────────────────────────────────────────
function getOntarioStatHolidays(year) {
  const y = year;
  // Helper: nth weekday of a month (1=Mon…7=Sun, nth 1-based)
  function nthWeekday(month, weekday, nth) {
    const d = new Date(y, month - 1, 1);
    let count = 0;
    while (d.getMonth() === month - 1) {
      if (d.getDay() === weekday % 7) { // JS: 0=Sun,1=Mon…6=Sat; pass 1-7 where 7=Sun
        count++;
        if (count === nth) return d.toISOString().split("T")[0];
      }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }
  // Last weekday of month
  function lastWeekday(month, weekday) {
    const d = new Date(y, month, 0); // last day of month
    while (d.getDay() !== weekday % 7) d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  // Easter Sunday (Anonymous Gregorian algorithm)
  function easterSunday() {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d2 = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d2 - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const easter = easterSunday();
  const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
  const victoriaDay = lastWeekday(5, 1); // last Monday before May 25
  // Victoria Day: last Monday on or before May 24
  function victoriaDayCalc() {
    const d = new Date(y, 4, 24);
    while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  return new Set([
    `${y}-01-01`,                          // New Year's Day
    nthWeekday(2, 1, 3),                   // Family Day – 3rd Monday Feb
    goodFriday.toISOString().split("T")[0],// Good Friday
    victoriaDayCalc(),                     // Victoria Day
    `${y}-07-01`,                          // Canada Day (or Jul 2 if Sun)
    nthWeekday(8, 1, 1),                   // Civic Holiday – 1st Monday Aug
    nthWeekday(9, 1, 1),                   // Labour Day – 1st Monday Sep
    nthWeekday(10, 1, 2),                  // Thanksgiving – 2nd Monday Oct
    `${y}-12-25`,                          // Christmas Day
    `${y}-12-26`,                          // Boxing Day
  ].filter(Boolean));
}

function isStatHoliday(dateStr) {
  if (!dateStr) return false;
  const year = parseInt(dateStr.slice(0, 4));
  return getOntarioStatHolidays(year).has(dateStr);
}

function getStatHolidayName(dateStr) {
  if (!dateStr) return null;
  const year = parseInt(dateStr.slice(0, 4));
  const holidays = getOntarioStatHolidays(year);
  if (!holidays.has(dateStr)) return null;
  const names = {
    "01-01": "New Year's Day",
    "07-01": "Canada Day",
    "07-02": "Canada Day (observed)",
    "12-25": "Christmas Day",
    "12-26": "Boxing Day",
  };
  const mmdd = dateStr.slice(5);
  if (names[mmdd]) return names[mmdd];
  const d = new Date(dateStr + "T12:00:00");
  const mon = d.getMonth() + 1;
  const day = d.getDate();
  if (mon === 2) return "Family Day";
  if (mon === 5) return "Victoria Day";
  if (mon === 8) return "Civic Holiday";
  if (mon === 9) return "Labour Day";
  if (mon === 10) return "Thanksgiving";
  // Good Friday detection: not easy by date alone, check proximity to Easter
  return "Statutory Holiday";
}

// Stat holiday pay for Ontario: regular pay + stat pay (avg daily earnings based on 4-week lookback)
// Simplified: if worked on stat, pays 1.5x for hours worked + regular stat entitlement
function computeStatPay(hourlyRate, hoursWorked, regularDailyAvg) {
  const statEntitlement = regularDailyAvg || (hourlyRate * 8); // fallback to 8hr avg
  const premiumPay = hoursWorked * hourlyRate * 1.5;
  return { statEntitlement, premiumPay, total: statEntitlement + premiumPay };
}

function computeShiftPay(hourlyRate, hoursPerWeek, frequency) {
  const periodsPerYear = frequency === "weekly" ? 52 : frequency === "biweekly" ? 26 : 12;
  const annualGross = hourlyRate * hoursPerWeek * (frequency === "biweekly" ? 2 : frequency === "weekly" ? 1 : 4.33);
  const grossPerPeriod = hourlyRate * hoursPerWeek * (frequency === "biweekly" ? 2 : frequency === "weekly" ? 1 : 4.33);
  const cpp = Math.min(grossPerPeriod * 0.0595, 3867.5 / periodsPerYear);
  const ei = Math.min(grossPerPeriod * 0.0166, 1049.12 / periodsPerYear);
  const taxable = grossPerPeriod - cpp - ei;
  const fed = taxable > 0 ? taxable * 0.15 : 0;
  const prov = taxable > 0 ? taxable * 0.0505 : 0;
  const netPay = grossPerPeriod - cpp - ei - fed - prov;
  return { grossPerPeriod, cpp, ei, fed, prov, netPay };
}

function monthlyIncome(incomes) {
  return incomes.reduce((sum, inc) => {
    if (inc.type === "shift") {
      const { netPay } = computeShiftPay(inc.hourlyRate, inc.hoursPerWeek, inc.frequency);
      const perMonth = inc.frequency === "weekly" ? netPay * 4.33 : inc.frequency === "biweekly" ? netPay * 2.17 : netPay;
      return sum + perMonth;
    }
    const perMonth = inc.frequency === "weekly" ? inc.amount * 4.33 : inc.frequency === "biweekly" ? inc.amount * 2.17 : inc.amount;
    return sum + perMonth;
  }, 0);
}

function totalExpenses(expenses) { return expenses.reduce((s, e) => s + e.amount, 0); }
function paidExpenses(expenses) { return expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0); }
function totalDebt(debts) { return debts.reduce((s, d) => s + d.balance, 0); }

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function useStore() {
  const [state, setState] = useState(() => {
    try { const s = localStorage.getItem("budgetsbloom"); return s ? JSON.parse(s) : initState; } catch { return initState; }
  });
  useEffect(() => { localStorage.setItem("budgetsbloom", JSON.stringify(state)); }, [state]);
  const update = useCallback((patch) => setState(s => ({ ...s, ...patch })), []);
  return [state, update];
}

// ─── ICON COMPONENTS ─────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color }) => {
  const icons = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    income: "M12 2v20 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    expense: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    debt: "M20 12V22H4V12 M22 7H2 M12 22V7 M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
    card: "M1 4h22v16H1z M1 10h22",
    goal: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
    ai: "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 8v4 M12 16h.01",
    todo: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    mood: "M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01 M12 2a10 10 0 100 20A10 10 0 0012 2z",
    med: "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z M12 8v8 M8 12h8",
    calendar: "M3 4h18v18H3z M3 9h18 M9 3v6 M15 3v6",
    chart: "M18 20V10 M12 20V4 M6 20v-6",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    plus: "M12 5v14 M5 12h14",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18 M6 6l12 12",
    warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    installment: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
    forecast: "M2 20h20 M5 20V8l7-6 7 6v12",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(icons[name] || "").split(" M").map((d, i) => (
        <path key={i} d={(i === 0 ? d : "M" + d)} />
      ))}
    </svg>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, height = 10, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100)) || 0;
  return (
    <div>
      {label && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>}
      <div style={{ background: "#E8E8E8", borderRadius: 99, height, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || "var(--accent)", borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style, onClick, className }) {
  return (
    <div onClick={onClick} className={className} style={{
      background: "var(--card)", borderRadius: 20, padding: "18px 20px",
      boxShadow: "0 2px 20px rgba(0,0,0,0.06)", border: "1px solid var(--border)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: onClick ? "pointer" : "default",
      ...style
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.1)"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.06)"; } }}
    >
      {children}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ children, color }) {
  return <span style={{ background: color + "22", color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{children}</span>;
}

// ─── STAT WIDGET ──────────────────────────────────────────────────────────────
function StatWidget({ label, value, sub, icon, color, style }) {
  return (
    <Card style={{ ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ background: (color || "var(--accent)") + "22", borderRadius: 14, padding: 10, flexShrink: 0 }}>
          <Icon name={icon} size={22} color={color || "var(--accent)"} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.2, marginTop: 2 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "var(--border)", border: "none", borderRadius: 99, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="x" size={16} color="var(--muted)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = "text", placeholder, style, min }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
    </div>
  );
}

function Select({ label, value, onChange, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}>
        {children}
      </select>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Zaira");
  const [partner, setPartner] = useState("Ariel");
  const [goal, setGoal] = useState("");

  const steps = [
    { title: "Welcome to BudgetsBloom 🌸", sub: "Your cute money bestie is here!", content: (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🌸</div>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>BudgetsBloom helps you track your money, crush debt, and reach your goals — all in a cozy, beautiful space.</p>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Let's set things up for you in 3 quick steps!</p>
      </div>
    )},
    { title: "Who are we budgeting for? 💕", sub: "Tell us your names", content: (
      <div>
        <Input label="Your name" value={name} onChange={setName} placeholder="e.g. Zaira" />
        <Input label="Partner's name (optional)" value={partner} onChange={setPartner} placeholder="e.g. Ariel" />
      </div>
    )},
    { title: "What's your #1 money goal? 🎯", sub: "Pick what matters most right now", content: (
      <div style={{ display: "grid", gap: 10 }}>
        {["💸 Pay off debt", "🏠 Save for a home", "✈️ Fund a vacation", "🏦 Build emergency savings", "📈 Grow investments"].map(g => (
          <button key={g} onClick={() => setGoal(g)} style={{ padding: "14px 18px", borderRadius: 14, border: `2px solid ${goal === g ? "var(--accent)" : "var(--border)"}`, background: goal === g ? "var(--accent)" + "22" : "var(--bg)", color: "var(--text)", fontSize: 15, cursor: "pointer", textAlign: "left", fontWeight: goal === g ? 700 : 400, fontFamily: "inherit" }}>{g}</button>
        ))}
      </div>
    )},
    { title: "You're all set! 🎉", sub: "Let's start blooming", content: (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🌺</div>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Welcome, <strong>{name}</strong>! Your personalized budget dashboard is ready.</p>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>We've pre-loaded some sample data so you can explore. Edit everything to match your real finances!</p>
      </div>
    )},
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>BudgetsBloom</div>
        </div>
        <Card style={{ padding: "32px 28px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
            {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "var(--accent)" : "var(--border)", transition: "background 0.3s" }} />)}
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>{steps[step].title}</h2>
          <p style={{ margin: "0 0 24px", color: "var(--muted)", fontSize: 14 }}>{steps[step].sub}</p>
          {steps[step].content}
          <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onDone({ name, partner, goal })}
            style={{ width: "100%", marginTop: 20, padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {step === steps.length - 1 ? "Start Blooming 🌸" : "Continue →"}
          </button>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 14, border: "none", background: "transparent", color: "var(--muted)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>}
        </Card>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ state, update }) {
  const income = monthlyIncome(state.incomes);
  const expenses = totalExpenses(state.expenses);
  const remaining = income - expenses;
  const debt = totalDebt(state.debts);
  const unpaid = state.expenses.filter(e => !e.paid);
  const todayMood = state.moods.find(m => m.date === today);

  const spendingData = [
    { name: "Fixed", value: state.expenses.filter(e => e.category === "Fixed").reduce((s, e) => s + e.amount, 0) },
    { name: "Variable", value: state.expenses.filter(e => e.category === "Variable").reduce((s, e) => s + e.amount, 0) },
    { name: "Remaining", value: Math.max(0, remaining) },
  ];
  const COLORS = ["var(--accent)", "var(--accent2)", "#88E0A0"];

  const forecastData = Array.from({ length: 4 }, (_, i) => ({
    name: `Week ${i + 1}`,
    income: income / 4,
    expenses: expenses / 4,
    balance: remaining / 4 * (i + 1),
  }));

  const moods = ["😀", "😭", "😡", "😴", "😌", "🤒", "❤️"];
  const [moodNote, setMoodNote] = useState("");
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900 }}>Hey {state.profile.name}! 🌸</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>Here's your money bloom for today</p>
      </div>

      {/* Key Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <StatWidget label="Monthly Income" value={fmt(income)} sub="Combined take-home" icon="income" color="#FF6B9D" />
        <StatWidget label="Total Expenses" value={fmt(expenses)} sub={`${state.expenses.length} items`} icon="expense" color="#9B7AEA" />
        <StatWidget label="Money Left" value={fmt(remaining)} sub={remaining >= 0 ? "You're good! 🌟" : "Overspent ⚠️"} icon="star" color={remaining >= 0 ? "#52C97D" : "#FF6B6B"} />
        <StatWidget label="Total Debt" value={fmt(debt)} sub={`${state.debts.length} accounts`} icon="debt" color="#F4A261" />
      </div>

      {/* Mood + Meds row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card onClick={() => setShowMoodPicker(true)}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Mood Today</div>
          {todayMood ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36 }}>{todayMood.emoji}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{todayMood.note}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>🤔</div>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 6, fontWeight: 700 }}>Tap to log mood</div>
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Meds Today</div>
          {state.meds.map(med => (
            <div key={med.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{med.name}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                {med.times.map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: med.taken[t] ? "#88E0A022" : "var(--accent)22", color: med.taken[t] ? "#52C97D" : "var(--accent)", fontWeight: 700 }}>{t} {med.taken[t] ? "✓" : ""}</span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Spending Pie */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>💸 Where's your money going?</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={spendingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
              {spendingData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Bills Due Soon */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>🏠 Bills Due Soon</div>
        {unpaid.slice(0, 4).map(e => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.dueDay || e.dueMonth ? `Due: ${dueDateLabel ? dueDateLabel(e) : (e.dueDay ? `Day ${e.dueDay}` : "")}` : "Variable"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{fmt(e.amount)}</span>
              <Badge color={e.priority === "high" ? "#FF6B6B" : e.priority === "medium" ? "#F4A261" : "#52C97D"}>{e.priority}</Badge>
            </div>
          </div>
        ))}
      </Card>

      {/* Goals quick view */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>🎯 Savings Goals</div>
        {state.goals.map(g => (
          <div key={g.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{g.label}</span>
              <span style={{ color: "var(--muted)" }}>{fmt(g.saved)} / {fmt(g.target)}</span>
            </div>
            <ProgressBar value={g.saved} max={g.target} color={g.color} />
          </div>
        ))}
      </Card>

      {/* Forecast */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 4, fontSize: 16 }}>📈 4-Week Forecast</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>At current spending rate</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B9D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B9D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9B7AEA" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9B7AEA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => fmt(v)} />
            <Area type="monotone" dataKey="income" stroke="#FF6B9D" fill="url(#incGrad)" name="Income" />
            <Area type="monotone" dataKey="expenses" stroke="#9B7AEA" fill="url(#expGrad)" name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 14, background: remaining >= 0 ? "#88E0A022" : "#FF6B6B22" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: remaining >= 0 ? "#52C97D" : "#FF6B6B" }}>
            {remaining >= 0 ? `✅ Projected end-of-month: ${fmt(remaining)}` : `⚠️ Warning: You may go negative by ${fmt(Math.abs(remaining))}`}
          </div>
        </div>
      </Card>

      {/* Todos quick */}
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>📝 Upcoming Tasks</div>
        {state.todos.filter(t => !t.done).slice(0, 4).map(todo => (
          <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid var(--border)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{todo.text}</div>
              {todo.dueDate && <div style={{ fontSize: 11, color: "var(--muted)" }}>Due {todo.dueDate}</div>}
            </div>
            <Badge color={todo.priority === "high" ? "#FF6B6B" : todo.priority === "medium" ? "#F4A261" : "#52C97D"}>{todo.priority}</Badge>
          </div>
        ))}
      </Card>

      {/* Mood picker modal */}
      <Modal open={showMoodPicker} onClose={() => setShowMoodPicker(false)} title="How are you feeling today? 💭">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {moods.map(m => (
            <button key={m} onClick={() => {
              const newMoods = state.moods.filter(x => x.date !== today);
              update({ moods: [{ date: today, emoji: m, note: moodNote }, ...newMoods] });
              setShowMoodPicker(false);
            }} style={{ fontSize: 36, padding: "12px", borderRadius: 14, border: "2px solid var(--border)", background: "var(--bg)", cursor: "pointer" }}>{m}</button>
          ))}
        </div>
        <Input label="Add a note (optional)" value={moodNote} onChange={setMoodNote} placeholder="e.g. Feeling stressed about bills..." />
      </Modal>
    </div>
  );
}

// ─── INCOME ───────────────────────────────────────────────────────────────────
function IncomeTracker({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", type: "shift", hourlyRate: 17.75, hoursPerWeek: 24, amount: 0, frequency: "biweekly", nextDate: "" });
  const [showBreakdown, setShowBreakdown] = useState(null);
  const [showShifts, setShowShifts] = useState(null);
  const [showReceived, setShowReceived] = useState(null);
  // Shift form
  const [shiftForm, setShiftForm] = useState({ date: today, startTime: "09:00", endTime: "17:00", breakMins: 30, tips: 0, worked: true });
  // Received form
  const [receivedForm, setReceivedForm] = useState({ date: today, amount: 0, note: "" });

  const income = monthlyIncome(state.incomes);

  function addIncome() {
    update({ incomes: [...state.incomes, { ...form, id: Date.now(), color: ["#FF6B9D","#9B7AEA","#52C97D","#F4A261"][state.incomes.length % 4], dailyShifts: [], received: [] }] });
    setShowAdd(false);
  }
  function removeIncome(id) { update({ incomes: state.incomes.filter(i => i.id !== id) }); }

  function addShift(incId) {
    const { startTime, endTime, breakMins, tips, date, worked } = shiftForm;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const totalMins = (eh * 60 + em) - (sh * 60 + sm) - Number(breakMins);
    const hoursWorked = Math.max(0, totalMins / 60);
    const inc = state.incomes.find(i => i.id === incId);
    const rate = inc?.hourlyRate || 0;

    // Stat holiday detection
    const statHoliday = isStatHoliday(date);
    const statName = statHoliday ? getStatHolidayName(date) : null;

    // Gross: if stat, use 1.5x premium for hours worked + stat entitlement (avg daily = rate * 8)
    let gross, statDetails;
    if (statHoliday && worked) {
      const { statEntitlement, premiumPay, total } = computeStatPay(rate, hoursWorked, rate * 8);
      gross = total + Number(tips);
      statDetails = { statEntitlement: parseFloat(statEntitlement.toFixed(2)), premiumPay: parseFloat(premiumPay.toFixed(2)) };
    } else if (statHoliday && !worked) {
      // Didn't work on stat — entitled to stat pay only (avg daily earnings)
      gross = rate * 8 + Number(tips);
      statDetails = { statEntitlement: parseFloat((rate * 8).toFixed(2)), premiumPay: 0 };
    } else {
      gross = hoursWorked * rate + Number(tips);
      statDetails = null;
    }

    const { netPay: perPeriodNet } = computeShiftPay(rate, hoursWorked || 8, "weekly");
    const netEst = perPeriodNet + Number(tips);

    const newShift = {
      id: Date.now(), date, startTime, endTime,
      breakMins: Number(breakMins), tips: Number(tips),
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      gross: parseFloat(gross.toFixed(2)),
      netEst: parseFloat(netEst.toFixed(2)),
      worked,
      statHoliday,
      statName,
      statDetails,
    };
    update({ incomes: state.incomes.map(i => i.id === incId ? { ...i, dailyShifts: [...(i.dailyShifts || []), newShift].sort((a, b) => b.date.localeCompare(a.date)) } : i) });
    setShiftForm({ date: today, startTime: "09:00", endTime: "17:00", breakMins: 30, tips: 0, worked: true });
  }

  function toggleShiftWorked(incId, shiftId) {
    update({ incomes: state.incomes.map(i => i.id === incId ? { ...i, dailyShifts: i.dailyShifts.map(s => s.id === shiftId ? { ...s, worked: !s.worked } : s) } : i) });
  }

  function removeShift(incId, shiftId) {
    update({ incomes: state.incomes.map(i => i.id === incId ? { ...i, dailyShifts: i.dailyShifts.filter(s => s.id !== shiftId) } : i) });
  }

  function addReceived(incId) {
    const entry = { id: Date.now(), date: receivedForm.date, amount: parseFloat(receivedForm.amount) || 0, note: receivedForm.note };
    update({ incomes: state.incomes.map(i => i.id === incId ? { ...i, received: [...(i.received || []), entry].sort((a, b) => b.date.localeCompare(a.date)) } : i) });
    setReceivedForm({ date: today, amount: 0, note: "" });
  }

  function removeReceived(incId, recId) {
    update({ incomes: state.incomes.map(i => i.id === incId ? { ...i, received: i.received.filter(r => r.id !== recId) } : i) });
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💰 Income</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      <Card style={{ marginBottom: 16, background: "var(--gradient)", border: "none" }}>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 700 }}>Monthly Take-Home (Combined)</div>
        <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, marginTop: 4 }}>{fmt(income)}</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>{state.incomes.length} income sources</div>
      </Card>

      {state.incomes.map(inc => {
        const { grossPerPeriod, cpp, ei, fed, prov, netPay } = inc.type === "shift"
          ? computeShiftPay(inc.hourlyRate, inc.hoursPerWeek, inc.frequency)
          : { grossPerPeriod: inc.amount, cpp: 0, ei: 0, fed: 0, prov: 0, netPay: inc.amount };

        const perMonth = inc.frequency === "weekly" ? netPay * 4.33 : inc.frequency === "biweekly" ? netPay * 2.17 : netPay;
        const shifts = inc.dailyShifts || [];
        const received = inc.received || [];

        // This pay period stats
        const workedShifts = shifts.filter(s => s.worked);
        const totalHoursLogged = workedShifts.reduce((s, sh) => s + sh.hoursWorked, 0);
        const totalGrossLogged = workedShifts.reduce((s, sh) => s + sh.gross, 0);
        const totalReceivedAmt = received.reduce((s, r) => s + r.amount, 0);

        // Expected based on logged hours
        const expectedFromShifts = inc.type === "shift" && totalHoursLogged > 0
          ? computeShiftPay(inc.hourlyRate, totalHoursLogged, "weekly").netPay
          : null;

        return (
          <Card key={inc.id} style={{ marginBottom: 14 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: inc.color }} />
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{inc.label}</span>
                  <Badge color={inc.color}>{inc.frequency}</Badge>
                </div>
                {inc.type === "shift"
                  ? <div style={{ fontSize: 13, color: "var(--muted)" }}>${inc.hourlyRate}/hr · {inc.hoursPerWeek}hrs/wk expected</div>
                  : <div style={{ fontSize: 13, color: "var(--muted)" }}>Fixed: {fmt(inc.amount)}</div>
                }
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{fmt(netPay)}</span>
                  <span style={{ color: "var(--muted)" }}> expected {inc.frequency} → {fmt(perMonth)}/mo</span>
                </div>
              </div>
              <button onClick={() => removeIncome(inc.id)} style={{ padding: 6, borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer" }}>
                <Icon name="trash" size={14} color="var(--muted)" />
              </button>
            </div>

            {/* Quick stats row */}
            {inc.type === "shift" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 12, background: "var(--bg)" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Hrs Logged</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "var(--accent)" }}>{totalHoursLogged.toFixed(1)}</div>
                </div>
                <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 12, background: "var(--bg)" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Expected</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#52C97D" }}>{expectedFromShifts != null ? fmt(expectedFromShifts) : fmt(netPay)}</div>
                </div>
                <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 12, background: "var(--bg)" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Received</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: totalReceivedAmt > 0 ? "#52C97D" : "var(--muted)" }}>{fmt(totalReceivedAmt)}</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowBreakdown(showBreakdown === inc.id ? null : inc.id)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700, fontFamily: "inherit" }}>
                📊 Breakdown
              </button>
              {inc.type === "shift" && (
                <button onClick={() => { setShowShifts(showShifts === inc.id ? null : inc.id); setShowReceived(null); }}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--border)", background: showShifts === inc.id ? "var(--accent)22" : "transparent", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700, fontFamily: "inherit" }}>
                  🕐 Shifts ({shifts.length})
                </button>
              )}
              <button onClick={() => { setShowReceived(showReceived === inc.id ? null : inc.id); setShowShifts(null); }}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid var(--border)", background: showReceived === inc.id ? "#52C97D22" : "transparent", cursor: "pointer", fontSize: 12, color: "#52C97D", fontWeight: 700, fontFamily: "inherit" }}>
                💵 Received ({received.length})
              </button>
            </div>

            {/* Pay breakdown */}
            {showBreakdown === inc.id && inc.type === "shift" && (
              <div style={{ marginTop: 12, padding: "14px", borderRadius: 14, background: "var(--bg)", fontSize: 13 }}>
                <div style={{ fontWeight: 800, marginBottom: 10, color: "var(--accent)" }}>📊 Pay Breakdown ({inc.frequency})</div>
                <div style={{ fontFamily: "monospace", display: "grid", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>{inc.hoursPerWeek}hrs × ${inc.hourlyRate}/hr × {inc.frequency === "biweekly" ? 2 : 1}wks</span><span style={{ fontWeight: 700 }}>{fmtD(grossPerPeriod)}</span></div>
                  <div style={{ height: 1, background: "var(--border)", margin: "3px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#FF6B6B" }}><span>− CPP (5.95%)</span><span>−{fmtD(cpp)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#FF6B6B" }}><span>− EI (1.66%)</span><span>−{fmtD(ei)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#FF6B6B" }}><span>− Federal Tax (~15%)</span><span>−{fmtD(fed)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#FF6B6B" }}><span>− Ontario Tax (~5%)</span><span>−{fmtD(prov)}</span></div>
                  <div style={{ height: 1, background: "var(--border)", margin: "3px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, color: "#52C97D" }}><span>= Take-Home Pay</span><span>{fmtD(netPay)}</span></div>
                </div>
              </div>
            )}

            {/* Daily Shifts panel */}
            {showShifts === inc.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: "var(--accent)" }}>🕐 Daily Shifts</div>

                {/* Add shift form */}
                <div style={{ padding: "14px", borderRadius: 14, background: "var(--bg)", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Log a Shift</div>
                  <Input label="Date" value={shiftForm.date} onChange={v => setShiftForm(f => ({ ...f, date: v }))} type="date" style={{ marginBottom: 10 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Input label="Start Time" value={shiftForm.startTime} onChange={v => setShiftForm(f => ({ ...f, startTime: v }))} type="time" style={{ marginBottom: 0 }} />
                    <Input label="End Time" value={shiftForm.endTime} onChange={v => setShiftForm(f => ({ ...f, endTime: v }))} type="time" style={{ marginBottom: 0 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <Input label="Break (mins)" value={shiftForm.breakMins} onChange={v => setShiftForm(f => ({ ...f, breakMins: v }))} type="number" style={{ marginBottom: 0 }} />
                    <Input label="Tips ($)" value={shiftForm.tips} onChange={v => setShiftForm(f => ({ ...f, tips: v }))} type="number" style={{ marginBottom: 0 }} />
                  </div>
                  {/* Stat holiday preview */}
                  {isStatHoliday(shiftForm.date) && (
                    <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "#F4A26122", fontSize: 13, fontWeight: 700, color: "#F4A261" }}>
                      🎉 {getStatHolidayName(shiftForm.date)} — Stat pay applies! (1.5x if worked + stat entitlement)
                    </div>
                  )}
                  {/* Preview */}
                  {(() => {
                    const [sh, sm] = shiftForm.startTime.split(":").map(Number);
                    const [eh, em] = shiftForm.endTime.split(":").map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm) - Number(shiftForm.breakMins);
                    const hrs = Math.max(0, mins / 60);
                    const isStat = isStatHoliday(shiftForm.date);
                    let gross;
                    if (isStat && hrs > 0) {
                      const { total } = computeStatPay(inc.hourlyRate, hrs, inc.hourlyRate * 8);
                      gross = total + Number(shiftForm.tips);
                    } else {
                      gross = hrs * inc.hourlyRate + Number(shiftForm.tips);
                    }
                    return hrs > 0 ? (
                      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "var(--accent)15", fontSize: 13 }}>
                        <span style={{ color: "var(--accent)", fontWeight: 700 }}>Preview: {hrs.toFixed(2)} hrs · Gross ~{fmtD(gross)}{isStat ? " 🎉 stat rate" : ""}</span>
                      </div>
                    ) : null;
                  })()}
                  <button onClick={() => addShift(inc.id)} style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>+ Log Shift</button>
                </div>

                {/* Shift list */}
                {shifts.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "10px 0" }}>No shifts logged yet</div>}
                {shifts.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg)", marginBottom: 8 }}>
                    {/* Worked checkbox */}
                    <button onClick={() => toggleShiftWorked(inc.id, s.id)}
                      style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${s.worked ? "#52C97D" : "var(--border)"}`, background: s.worked ? "#52C97D" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                      {s.worked && <Icon name="check" size={13} color="#fff" />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.worked ? "var(--text)" : "var(--muted)", textDecoration: s.worked ? "none" : "line-through" }}>
                          {s.date} · {s.startTime}–{s.endTime}
                        </span>
                        {s.statHoliday && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#F4A26122", color: "#F4A261", fontWeight: 700 }}>🎉 {s.statName || "STAT"}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {s.hoursWorked}hrs{s.tips > 0 ? ` · Tips: ${fmtD(s.tips)}` : ""} · Gross: {fmtD(s.gross)}
                        {s.statDetails && <span style={{ color: "#F4A261" }}> (stat: {fmtD(s.statDetails.statEntitlement)} + {fmtD(s.statDetails.premiumPay)} premium)</span>}
                      </div>
                      </div>
                    </div>
                    <button onClick={() => removeShift(inc.id, s.id)} style={{ padding: 3, border: "none", background: "transparent", cursor: "pointer" }}>
                      <Icon name="trash" size={13} color="var(--muted)" />
                    </button>
                  </div>
                ))}

                {/* Period summary */}
                {shifts.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "#52C97D15", marginTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#52C97D" }}>
                      ✅ {workedShifts.length} shifts worked · {totalHoursLogged.toFixed(1)} hrs · ~{fmtD(totalGrossLogged)} gross
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Received panel */}
            {showReceived === inc.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: "#52C97D" }}>💵 Received Payments</div>

                <div style={{ padding: "14px", borderRadius: 14, background: "var(--bg)", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Log a Payment Received</div>
                  <Input label="Date" value={receivedForm.date} onChange={v => setReceivedForm(f => ({ ...f, date: v }))} type="date" style={{ marginBottom: 10 }} />
                  <Input label="Amount Received ($)" value={receivedForm.amount} onChange={v => setReceivedForm(f => ({ ...f, amount: v }))} type="number" style={{ marginBottom: 10 }} />
                  <Input label="Note (optional)" value={receivedForm.note} onChange={v => setReceivedForm(f => ({ ...f, note: v }))} placeholder="e.g. Biweekly pay, tips included" style={{ marginBottom: 10 }} />
                  <button onClick={() => addReceived(inc.id)} style={{ width: "100%", padding: "10px", borderRadius: 12, border: "none", background: "#52C97D", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>+ Log Received</button>
                </div>

                {received.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>No payments logged yet</div>}
                {received.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--bg)", marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>💵</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#52C97D" }}>{fmt(r.amount)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.date}{r.note ? ` · ${r.note}` : ""}</div>
                    </div>
                    <button onClick={() => removeReceived(inc.id, r.id)} style={{ padding: 3, border: "none", background: "transparent", cursor: "pointer" }}>
                      <Icon name="trash" size={13} color="var(--muted)" />
                    </button>
                  </div>
                ))}

                {received.length > 0 && (
                  <div style={{ padding: "10px 14px", borderRadius: 12, background: "#52C97D15" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#52C97D" }}>Total Received: {fmt(totalReceivedAmt)}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Income Source">
        <Input label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Zaira - A&W" />
        <Select label="Type" value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}>
          <option value="shift">Shift-Based (Hourly)</option>
          <option value="manual">Manual / Salary</option>
        </Select>
        {form.type === "shift" ? (
          <>
            <Input label="Hourly Rate ($)" value={form.hourlyRate} onChange={v => setForm(f => ({ ...f, hourlyRate: parseFloat(v) || 0 }))} type="number" />
            <Input label="Expected Hours Per Week" value={form.hoursPerWeek} onChange={v => setForm(f => ({ ...f, hoursPerWeek: parseFloat(v) || 0 }))} type="number" />
          </>
        ) : (
          <Input label="Amount ($)" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: parseFloat(v) || 0 }))} type="number" />
        )}
        <Select label="Pay Frequency" value={form.frequency} onChange={v => setForm(f => ({ ...f, frequency: v }))}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly (every 2 weeks)</option>
          <option value="monthly">Monthly</option>
        </Select>
        <Input label="Next Payday" value={form.nextDate} onChange={v => setForm(f => ({ ...f, nextDate: v }))} type="date" />
        <button onClick={addIncome} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Income Source 🌸</button>
      </Modal>
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function dueDateLabel(exp) {
  if (!exp.dueDay && !exp.dueMonth) return null;
  if (exp.dueMonth && exp.dueDay) return `${MONTH_LABELS[exp.dueMonth - 1]} ${exp.dueDay}`;
  if (exp.dueDay) return `Every month — Day ${exp.dueDay}`;
  return null;
}

function ExpenseTracker({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const blankForm = { label: "", category: "Fixed", amount: "", dueMonth: "", dueDay: "", paid: false, recurring: false, priority: "medium", notes: "" };
  const [form, setForm] = useState(blankForm);

  const CATS = ["All", "Fixed", "Variable", "Custom"];
  const filtered = filter === "All" ? state.expenses : state.expenses.filter(e => e.category === filter);

  function openAdd() { setForm(blankForm); setEditId(null); setShowAdd(true); }
  function openEdit(exp) {
    setForm({ label: exp.label, category: exp.category, amount: exp.amount, dueMonth: exp.dueMonth || "", dueDay: exp.dueDay || "", paid: exp.paid, recurring: exp.recurring, priority: exp.priority, notes: exp.notes || "" });
    setEditId(exp.id); setShowAdd(true);
  }

  function togglePaid(id) {
    update({ expenses: state.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e) });
  }
  function removeExp(id) { update({ expenses: state.expenses.filter(e => e.id !== id) }); }

  function saveExp() {
    const parsed = {
      ...form,
      amount: parseFloat(form.amount) || 0,
      dueMonth: form.dueMonth ? parseInt(form.dueMonth) : null,
      dueDay: form.dueDay ? parseInt(form.dueDay) : null,
    };
    if (editId) {
      update({ expenses: state.expenses.map(e => e.id === editId ? { ...e, ...parsed } : e) });
    } else {
      update({ expenses: [...state.expenses, { ...parsed, id: Date.now() }] });
    }
    setShowAdd(false); setEditId(null);
  }

  const totalPaid = paidExpenses(state.expenses);
  const total = totalExpenses(state.expenses);

  // Overdue check: if dueDay is set and today's day is past it and not paid
  const todayDay = new Date().getDate();
  const todayMonth = new Date().getMonth() + 1;
  function isOverdue(exp) {
    if (exp.paid) return false;
    if (exp.dueMonth && exp.dueDay) {
      if (exp.dueMonth < todayMonth) return true;
      if (exp.dueMonth === todayMonth && exp.dueDay < todayDay) return true;
      return false;
    }
    if (!exp.dueMonth && exp.dueDay) return exp.dueDay < todayDay;
    return false;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💸 Expenses</h2>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Bills</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>{fmt(total)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Paid So Far</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#52C97D" }}>{fmt(totalPaid)}</div>
        </Card>
      </div>

      <ProgressBar value={totalPaid} max={total} color="#52C97D" label="Payment Progress" />
      <div style={{ height: 16 }} />

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ flexShrink: 0, padding: "6px 16px", borderRadius: 99, border: `1.5px solid ${filter === c ? "var(--accent)" : "var(--border)"}`, background: filter === c ? "var(--accent)" : "transparent", color: filter === c ? "#fff" : "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{c}</button>
        ))}
      </div>

      {filtered.map(exp => {
        const overdue = isOverdue(exp);
        const dueLabel = dueDateLabel(exp);
        return (
          <Card key={exp.id} style={{ marginBottom: 10, borderColor: overdue ? "#FF6B6B55" : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Paid checkbox */}
              <button onClick={() => togglePaid(exp.id)} style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${exp.paid ? "#52C97D" : overdue ? "#FF6B6B" : "var(--border)"}`, background: exp.paid ? "#52C97D" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                {exp.paid && <Icon name="check" size={14} color="#fff" />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, textDecoration: exp.paid ? "line-through" : "none", color: exp.paid ? "var(--muted)" : "var(--text)" }}>{exp.label}</span>
                  <Badge color={exp.category === "Fixed" ? "#9B7AEA" : exp.category === "Variable" ? "#FF6B9D" : "#F4A261"}>{exp.category}</Badge>
                  {exp.recurring && <Badge color="#52C97D">↻ recurring</Badge>}
                  {overdue && <Badge color="#FF6B6B">overdue!</Badge>}
                </div>
                {dueLabel && (
                  <div style={{ fontSize: 12, marginTop: 3, color: overdue ? "#FF6B6B" : "var(--muted)", fontWeight: overdue ? 700 : 400 }}>
                    📅 Due: {dueLabel}
                  </div>
                )}
                {exp.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{exp.notes}</div>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{fmt(exp.amount)}</span>
                <button onClick={() => openEdit(exp)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                  <Icon name="edit" size={14} color="var(--muted)" />
                </button>
                <button onClick={() => removeExp(exp.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                  <Icon name="trash" size={14} color="var(--muted)" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Add / Edit Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "Edit Expense ✏️" : "Add Expense 🌸"}>
        <Input label="Label" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Hydro, Groceries" />
        <Select label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))}>
          <option value="Fixed">Fixed — same every month (rent, hydro)</option>
          <option value="Variable">Variable — changes (groceries, eating out)</option>
          <option value="Custom">Custom</option>
        </Select>
        <Input label="Amount ($)" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} type="number" placeholder="0.00" />

        {/* Due Date: Month + Day */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Due Date <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — pick month and/or day)</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.dueMonth} onChange={e => setForm(f => ({ ...f, dueMonth: e.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg)", color: form.dueMonth ? "var(--text)" : "var(--muted)", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
              <option value="">Month (optional)</option>
              {MONTH_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg)", color: form.dueDay ? "var(--text)" : "var(--muted)", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
              <option value="">Day (optional)</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(form.dueMonth || form.dueDay) && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
              📅 Due: {form.dueMonth && form.dueDay ? `${MONTH_LABELS[form.dueMonth - 1]} ${form.dueDay}` : form.dueDay ? `Every month — Day ${form.dueDay}` : `${MONTH_LABELS[form.dueMonth - 1]} (day TBD)`}
            </div>
          )}
        </div>

        <Select label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))}>
          <option value="high">🔴 High — must pay</option>
          <option value="medium">🟡 Medium — important</option>
          <option value="low">🟢 Low — nice to have</option>
        </Select>

        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} style={{ width: 16, height: 16 }} />
            Recurring monthly
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} style={{ width: 16, height: 16 }} />
            Already paid ✓
          </label>
        </div>

        <Input label="Notes (optional)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Any extra notes..." />
        <button onClick={saveExp} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {editId ? "Save Changes ✓" : "Add Expense 🌸"}
        </button>
      </Modal>
    </div>
  );
}

// ─── DEBT CRUSHER ─────────────────────────────────────────────────────────────
function DebtCrusher({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", balance: 0, rate: 19.99, minPayment: 25, dueDay: 1, color: "#FF6B9D" });

  const sorted = [...state.debts].sort((a, b) => state.debtMethod === "snowball" ? a.balance - b.balance : b.rate - a.rate);
  const totalDebtAmt = totalDebt(state.debts);
  const origDebt = 3000; // baseline
  const pct = Math.min(100, Math.round(((origDebt - totalDebtAmt) / origDebt) * 100));

  function addDebt() {
    update({ debts: [...state.debts, { ...form, id: Date.now(), balance: parseFloat(form.balance), rate: parseFloat(form.rate), minPayment: parseFloat(form.minPayment) }] });
    setShowAdd(false);
  }
  function removeDebt(id) { update({ debts: state.debts.filter(d => d.id !== id) }); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💪 Debt Crusher</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      {/* Progress hero */}
      <Card style={{ background: "var(--gradient)", border: "none", marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Debt Crushed So Far 💥</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#fff" }}>{pct}%</div>
        <div style={{ marginTop: 8, background: "rgba(255,255,255,0.3)", borderRadius: 99, height: 10 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 99 }} />
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 8 }}>{fmt(totalDebtAmt)} remaining</div>
      </Card>

      {/* Strategy toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["snowball", "avalanche"].map(m => (
          <button key={m} onClick={() => update({ debtMethod: m })} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `2px solid ${state.debtMethod === m ? "var(--accent)" : "var(--border)"}`, background: state.debtMethod === m ? "var(--accent)22" : "transparent", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit", textTransform: "capitalize" }}>
            {m === "snowball" ? "❄️ Snowball" : "🏔️ Avalanche"}
          </button>
        ))}
      </div>
      <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {state.debtMethod === "snowball"
            ? "❄️ Snowball: Pay the smallest balance first. Builds momentum and motivation!"
            : "🏔️ Avalanche: Pay highest interest first. Saves the most money over time!"}
        </div>
      </Card>

      {sorted.map((d, i) => {
        const monthsLeft = Math.ceil(d.balance / d.minPayment);
        return (
          <Card key={d.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i === 0 && <span style={{ fontSize: 16 }}>🎯</span>}
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{d.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>APR: {d.rate}% • Min: {fmt(d.minPayment)}/mo • Due: Day {d.dueDay}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: 18, color: "var(--accent)" }}>{fmt(d.balance)}</span>
                <button onClick={() => removeDebt(d.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                  <Icon name="trash" size={14} color="var(--muted)" />
                </button>
              </div>
            </div>
            <ProgressBar value={origDebt - d.balance} max={origDebt} color={d.color} />
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>~{monthsLeft} months at minimum payments</div>
            {i === 0 && <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "var(--accent)22", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>⭐ Focus on this one next!</div>}
          </Card>
        );
      })}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
        <Input label="Debt Name" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. RBC Credit Card" />
        <Input label="Current Balance ($)" value={form.balance} onChange={v => setForm(f => ({ ...f, balance: v }))} type="number" />
        <Input label="Interest Rate (APR %)" value={form.rate} onChange={v => setForm(f => ({ ...f, rate: v }))} type="number" />
        <Input label="Minimum Monthly Payment ($)" value={form.minPayment} onChange={v => setForm(f => ({ ...f, minPayment: v }))} type="number" />
        <Input label="Due Day (of month)" value={form.dueDay} onChange={v => setForm(f => ({ ...f, dueDay: v }))} type="number" />
        <button onClick={addDebt} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Debt 💪</button>
      </Modal>
    </div>
  );
}

// ─── CREDIT CARDS ─────────────────────────────────────────────────────────────
function CreditCards({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", limit: 0, balance: 0, statementDay: 1, dueDay: 15, apr: 19.99, minPayment: 25 });

  function addCard() {
    update({ cards: [...state.cards, { ...form, id: Date.now(), limit: parseFloat(form.limit), balance: parseFloat(form.balance), apr: parseFloat(form.apr), minPayment: parseFloat(form.minPayment) }] });
    setShowAdd(false);
  }
  function removeCard(id) { update({ cards: state.cards.filter(c => c.id !== id) }); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💳 Credit Cards</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      {state.cards.map(card => {
        const util = Math.round((card.balance / card.limit) * 100);
        const utilColor = util >= 70 ? "#FF6B6B" : util >= 30 ? "#F4A261" : "#52C97D";
        return (
          <Card key={card.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{card.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>APR {card.apr}% • Min {fmt(card.minPayment)}</div>
              </div>
              <button onClick={() => removeCard(card.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                <Icon name="trash" size={14} color="var(--muted)" />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
              <span>Balance: <strong>{fmt(card.balance)}</strong></span>
              <span>Limit: <strong>{fmt(card.limit)}</strong></span>
            </div>
            <ProgressBar value={card.balance} max={card.limit} color={utilColor} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span style={{ color: utilColor, fontWeight: 700 }}>Utilization: {util}% {util >= 70 ? "⚠️ Too high!" : util >= 30 ? "🟡 Moderate" : "✅ Great!"}</span>
            </div>
            {util >= 70 && (
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "#FF6B6B22", fontSize: 13, color: "#FF6B6B", fontWeight: 700 }}>
                ⚠️ High utilization hurts your credit score. Try to pay this below {fmt(card.limit * 0.3)}.
              </div>
            )}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "8px 12px", borderRadius: 12, background: "var(--bg)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>STATEMENT DATE</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Day {card.statementDay}</div>
              </div>
              <div style={{ flex: 1, padding: "8px 12px", borderRadius: 12, background: "var(--bg)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>PAYMENT DUE</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Day {card.dueDay}</div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Utilization chart */}
      {state.cards.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Credit Utilization Overview</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={state.cards.map(c => ({ name: c.label.split(" ")[0], util: Math.round((c.balance / c.limit) * 100) }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="util" name="Utilization %" radius={[8, 8, 0, 0]}>
                {state.cards.map((c, i) => <Cell key={i} fill={Math.round((c.balance / c.limit) * 100) >= 70 ? "#FF6B6B" : "#52C97D"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>💡 Keep utilization below 30% for a healthy credit score</div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Credit Card">
        <Input label="Card Name" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. RBC Avion Visa" />
        <Input label="Credit Limit ($)" value={form.limit} onChange={v => setForm(f => ({ ...f, limit: v }))} type="number" />
        <Input label="Current Balance ($)" value={form.balance} onChange={v => setForm(f => ({ ...f, balance: v }))} type="number" />
        <Input label="APR (%)" value={form.apr} onChange={v => setForm(f => ({ ...f, apr: v }))} type="number" />
        <Input label="Minimum Payment ($)" value={form.minPayment} onChange={v => setForm(f => ({ ...f, minPayment: v }))} type="number" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Statement Day" value={form.statementDay} onChange={v => setForm(f => ({ ...f, statementDay: v }))} type="number" />
          <Input label="Due Day" value={form.dueDay} onChange={v => setForm(f => ({ ...f, dueDay: v }))} type="number" />
        </div>
        <button onClick={addCard} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Card 💳</button>
      </Modal>
    </div>
  );
}

// ─── INSTALLMENTS ─────────────────────────────────────────────────────────────
function Installments({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", total: 0, monthly: 0, paid: 0, startDate: today });

  function addInst() {
    update({ installments: [...state.installments, { ...form, id: Date.now(), total: parseFloat(form.total), monthly: parseFloat(form.monthly), paid: parseFloat(form.paid) }] });
    setShowAdd(false);
  }
  function removeInst(id) { update({ installments: state.installments.filter(i => i.id !== id) }); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📦 Installments</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      {state.installments.map(inst => {
        const remaining = inst.total - inst.paid;
        const months = Math.ceil(remaining / inst.monthly);
        const pct = Math.min(100, Math.round((inst.paid / inst.total) * 100));
        return (
          <Card key={inst.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{inst.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{fmt(inst.monthly)}/month</div>
              </div>
              <button onClick={() => removeInst(inst.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                <Icon name="trash" size={14} color="var(--muted)" />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[["Total", fmt(inst.total)], ["Paid", fmt(inst.paid)], ["Left", fmt(remaining)]].map(([l, v]) => (
                <div key={l} style={{ textAlign: "center", padding: "8px", borderRadius: 12, background: "var(--bg)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={inst.paid} max={inst.total} color="var(--accent)" label={`${pct}% Complete`} />
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>~{months} months remaining</div>
          </Card>
        );
      })}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Installment">
        <Input label="Item Name" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Laptop, iPhone" />
        <Input label="Total Amount ($)" value={form.total} onChange={v => setForm(f => ({ ...f, total: v }))} type="number" />
        <Input label="Monthly Payment ($)" value={form.monthly} onChange={v => setForm(f => ({ ...f, monthly: v }))} type="number" />
        <Input label="Already Paid ($)" value={form.paid} onChange={v => setForm(f => ({ ...f, paid: v }))} type="number" />
        <Input label="Start Date" value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} type="date" />
        <button onClick={addInst} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Installment 📦</button>
      </Modal>
    </div>
  );
}

// ─── GOALS ────────────────────────────────────────────────────────────────────
function Goals({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", target: 0, saved: 0, targetDate: "", color: "#FF6B9D" });

  function addGoal() {
    update({ goals: [...state.goals, { ...form, id: Date.now(), target: parseFloat(form.target), saved: parseFloat(form.saved) }] });
    setShowAdd(false);
  }
  function removeGoal(id) { update({ goals: state.goals.filter(g => g.id !== id) }); }
  function updateSaved(id, v) {
    update({ goals: state.goals.map(g => g.id === id ? { ...g, saved: parseFloat(v) || 0 } : g) });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>🎯 Goals & Savings</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      {state.goals.map(goal => {
        const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
        const remaining = goal.target - goal.saved;
        const daysLeft = goal.targetDate ? Math.max(0, Math.round((new Date(goal.targetDate) - new Date()) / 86400000)) : null;
        const weeklySuggestion = daysLeft ? (remaining / (daysLeft / 7)).toFixed(0) : null;

        return (
          <Card key={goal.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{goal.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Target: {fmt(goal.target)} {goal.targetDate ? `by ${goal.targetDate}` : ""}</div>
              </div>
              <button onClick={() => removeGoal(goal.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
                <Icon name="trash" size={14} color="var(--muted)" />
              </button>
            </div>
            <ProgressBar value={goal.saved} max={goal.target} color={goal.color} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
              <span style={{ color: "var(--muted)" }}>{fmt(goal.saved)} saved</span>
              <span style={{ color: goal.color, fontWeight: 700 }}>{pct}% 🌸</span>
            </div>
            {weeklySuggestion && (
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: goal.color + "22", fontSize: 13, color: goal.color, fontWeight: 700 }}>
                💡 Save {fmt(weeklySuggestion)}/week to hit your goal in {daysLeft} days
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <Input label="Update saved amount ($)" value={goal.saved} onChange={v => updateSaved(goal.id, v)} type="number" style={{ marginBottom: 0 }} />
            </div>
          </Card>
        );
      })}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Savings Goal 🎯">
        <Input label="Goal Name" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="e.g. Emergency Fund" />
        <Input label="Target Amount ($)" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} type="number" />
        <Input label="Already Saved ($)" value={form.saved} onChange={v => setForm(f => ({ ...f, saved: v }))} type="number" />
        <Input label="Target Date (optional)" value={form.targetDate} onChange={v => setForm(f => ({ ...f, targetDate: v }))} type="date" />
        <Select label="Color" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))}>
          <option value="#FF6B9D">Pink 🌸</option>
          <option value="#9B7AEA">Lavender 💜</option>
          <option value="#52C97D">Green 🌿</option>
          <option value="#F4A261">Orange 🍊</option>
        </Select>
        <button onClick={addGoal} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Goal 🌸</button>
      </Modal>
    </div>
  );
}

// ─── AI COACH ─────────────────────────────────────────────────────────────────
function AICoach({ state, update }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(state.aiInsights);
  const [apiKey, setApiKey] = useState(state.openAIKey || "");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const income = monthlyIncome(state.incomes);
  const expenses = totalExpenses(state.expenses);
  const remaining = income - expenses;
  const debt = totalDebt(state.debts);

  async function getInsights() {
    if (!apiKey) { setShowKeyInput(true); return; }
    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: "You are a friendly, supportive financial coach for a young couple. Be encouraging, simple, and practical. Use emojis. Never be judgmental."
          }, {
            role: "user",
            content: `My finances: Monthly income: $${income.toFixed(0)}, Monthly expenses: $${expenses.toFixed(0)}, Remaining: $${remaining.toFixed(0)}, Total debt: $${debt.toFixed(0)}, Savings goals: ${state.goals.map(g => g.label).join(", ")}. Give me 5 personalized tips, what I'm doing well, what to improve, and weekly spending recommendations. Be specific with dollar amounts.`
          }],
          max_tokens: 500
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "Could not get insights.";
      setInsights(text);
      update({ aiInsights: text, openAIKey: apiKey });
    } catch (e) {
      setInsights("Could not connect to AI. Check your API key and try again.");
    }
    setLoading(false);
  }

  async function askQuestion() {
    if (!apiKey || !question.trim()) return;
    const newMsg = { role: "user", text: question };
    setChatHistory(h => [...h, newMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a friendly financial coach. Be simple, supportive, and use emojis. Monthly income: $" + income.toFixed(0) + ", expenses: $" + expenses.toFixed(0) + ", debt: $" + debt.toFixed(0) },
            ...chatHistory.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: question }
          ],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, couldn't get a response.";
      setChatHistory(h => [...h, { role: "assistant", text: reply }]);
    } catch { setChatHistory(h => [...h, { role: "assistant", text: "Connection error. Please try again." }]); }
    setLoading(false);
  }

  // Built-in insights (no API needed)
  const builtIn = useMemo(() => {
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
    const debtToIncome = income > 0 ? (debt / income * 100) : 0;
    const wantsAmt = state.expenses.filter(e => ["Eating Out", "Coffee", "Shopping", "Skincare & Beauty", "Beauty"].includes(e.label)).reduce((s, e) => s + e.amount, 0);
    const wantsPct = income > 0 ? (wantsAmt / income * 100) : 0;
    const tips = [];

    if (savingsRate >= 20) tips.push({ type: "good", text: `🌟 You're saving ${savingsRate.toFixed(0)}% of your income — that's excellent! The goal is 20%+.` });
    else if (savingsRate > 0) tips.push({ type: "warn", text: `📊 Your savings rate is ${savingsRate.toFixed(0)}%. Try to reach 20% — that's ${fmt(income * 0.2)}/month.` });
    else tips.push({ type: "bad", text: `⚠️ You're spending more than you earn. Let's find cuts to get back on track!` });

    if (wantsPct > 30) tips.push({ type: "warn", text: `🧾 You're spending ${wantsPct.toFixed(0)}% on "wants". The ideal is under 30%. Try cutting ${fmt(wantsAmt - income * 0.3)} this month.` });
    if (debt > income * 2) tips.push({ type: "warn", text: `💳 Your debt is ${(debtToIncome / 100).toFixed(1)}× your monthly income. Focus extra income on the ${state.debtMethod === "snowball" ? "smallest balance" : "highest rate"} first.` });
    if (state.goals.length > 0) tips.push({ type: "good", text: `🎯 You have ${state.goals.length} active savings goals. Keep going — consistency is everything!` });

    const weekly = (income - expenses) / 4;
    tips.push({ type: "info", text: `💡 Based on your income and bills, you can safely spend ${fmt(Math.max(0, weekly))} per week on extras.` });
    tips.push({ type: "info", text: `📅 ${state.expenses.filter(e => !e.paid).length} bills are still unpaid this month totaling ${fmt(state.expenses.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0))}. Don't forget them!` });

    return tips;
  }, [state]);

  const typeStyle = { good: "#52C97D", warn: "#F4A261", bad: "#FF6B6B", info: "var(--accent)" };

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900 }}>🤖 AI Financial Coach</h2>
      <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 14 }}>Your personal money advisor — supportive, simple, and smart</p>

      {/* Built-in Insights (always visible) */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>📊 Auto Analysis</div>
        {builtIn.map((tip, i) => (
          <div key={i} style={{ padding: "10px 14px", borderRadius: 12, background: typeStyle[tip.type] + "15", borderLeft: `3px solid ${typeStyle[tip.type]}`, marginBottom: 8, fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>
            {tip.text}
          </div>
        ))}
      </Card>

      {/* Finance snapshot */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>📋 Your Finance Snapshot</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            ["Monthly Income", fmt(income), "#52C97D"],
            ["Monthly Expenses", fmt(expenses), "#FF6B6B"],
            ["What's Left", fmt(remaining), remaining >= 0 ? "#52C97D" : "#FF6B6B"],
            ["Total Debt", fmt(debt), "#F4A261"],
            ["Savings Rate", `${income > 0 ? ((remaining / income) * 100).toFixed(0) : 0}%`, "var(--accent)"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "var(--bg)" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Chat (OpenAI) */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 16 }}>💬 Ask Your AI Coach</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Powered by OpenAI — add your API key to unlock</div>

        {showKeyInput ? (
          <div>
            <Input label="OpenAI API Key" value={apiKey} onChange={setApiKey} placeholder="sk-..." type="password" />
            <button onClick={() => { update({ openAIKey: apiKey }); setShowKeyInput(false); }} style={{ width: "100%", padding: "10px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save Key & Continue</button>
          </div>
        ) : (
          <>
            {chatHistory.length > 0 && (
              <div style={{ maxHeight: 250, overflowY: "auto", marginBottom: 12, display: "grid", gap: 8 }}>
                {chatHistory.map((m, i) => (
                  <div key={i} style={{ padding: "10px 14px", borderRadius: 14, background: m.role === "user" ? "var(--accent)22" : "var(--bg)", fontSize: 13, alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}>
                    {m.text}
                  </div>
                ))}
              </div>
            )}
            {insights && !chatHistory.length && (
              <div style={{ padding: "14px", borderRadius: 14, background: "var(--bg)", fontSize: 14, lineHeight: 1.7, marginBottom: 12, whiteSpace: "pre-wrap" }}>{insights}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askQuestion()} placeholder="Ask anything about your money..." style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
              <button onClick={askQuestion} disabled={loading} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {loading ? "..." : "→"}
              </button>
            </div>
            {!apiKey && (
              <button onClick={() => setShowKeyInput(true)} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 12, border: "1.5px dashed var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>🔑 Add OpenAI API Key to enable chat</button>
            )}
            {apiKey && !insights && (
              <button onClick={getInsights} disabled={loading} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {loading ? "Analyzing... 🌸" : "Get Full AI Analysis ✨"}
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ─── TODO LIST ────────────────────────────────────────────────────────────────
function TodoList({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ text: "", dueDate: "", priority: "medium" });

  function addTodo() {
    update({ todos: [...state.todos, { ...form, id: Date.now(), done: false }] });
    setShowAdd(false); setForm({ text: "", dueDate: "", priority: "medium" });
  }
  function toggle(id) { update({ todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) }); }
  function remove(id) { update({ todos: state.todos.filter(t => t.id !== id) }); }

  const active = state.todos.filter(t => !t.done);
  const done = state.todos.filter(t => t.done);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📝 To-Do List</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Active ({active.length})</div>
      {active.map(todo => (
        <Card key={todo.id} style={{ marginBottom: 8, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => toggle(todo.id)} style={{ width: 22, height: 22, borderRadius: 7, border: "2.5px solid var(--border)", background: "transparent", cursor: "pointer", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{todo.text}</div>
              {todo.dueDate && <div style={{ fontSize: 12, color: "var(--muted)" }}>📅 {todo.dueDate}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge color={todo.priority === "high" ? "#FF6B6B" : todo.priority === "medium" ? "#F4A261" : "#52C97D"}>{todo.priority}</Badge>
              <button onClick={() => remove(todo.id)} style={{ padding: 3, border: "none", background: "transparent", cursor: "pointer" }}>
                <Icon name="trash" size={13} color="var(--muted)" />
              </button>
            </div>
          </div>
        </Card>
      ))}

      {done.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 10px" }}>Done ({done.length}) ✅</div>
          {done.map(todo => (
            <Card key={todo.id} style={{ marginBottom: 8, padding: "10px 16px", opacity: 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => toggle(todo.id)} style={{ width: 22, height: 22, borderRadius: 7, border: "none", background: "#52C97D", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={13} color="#fff" />
                </button>
                <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: 14 }}>{todo.text}</span>
              </div>
            </Card>
          ))}
        </>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Task 📝">
        <Input label="Task" value={form.text} onChange={v => setForm(f => ({ ...f, text: v }))} placeholder="e.g. Pay hydro bill" />
        <Input label="Due Date (optional)" value={form.dueDate} onChange={v => setForm(f => ({ ...f, dueDate: v }))} type="date" />
        <Select label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))}>
          <option value="high">🔴 High — urgent</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low — whenever</option>
        </Select>
        <button onClick={addTodo} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Task 🌸</button>
      </Modal>
    </div>
  );
}

// ─── MOOD TRACKER ──────────────────────────────────────────────────────────────
function MoodTracker({ state, update }) {
  const MOODS = ["😀", "😭", "😡", "😴", "😌", "🤒", "❤️", "🥰", "😤", "🤗"];
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);

  function logMood() {
    if (!selected) return;
    const filtered = state.moods.filter(m => m.date !== date);
    update({ moods: [{ date, emoji: selected, note }, ...filtered].sort((a, b) => b.date.localeCompare(a.date)) });
    setSelected(""); setNote("");
  }

  const last30 = state.moods.slice(0, 30);
  const moodCounts = MOODS.reduce((acc, m) => ({ ...acc, [m]: last30.filter(x => x.emoji === m).length }), {});

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900 }}>😊 Mood Tracker</h2>
      <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 14 }}>Track how you feel — and discover spending patterns!</p>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>How are you feeling? 💭</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
          {MOODS.map(m => (
            <button key={m} onClick={() => setSelected(m)} style={{ fontSize: 30, padding: "10px", borderRadius: 14, border: `2.5px solid ${selected === m ? "var(--accent)" : "var(--border)"}`, background: selected === m ? "var(--accent)22" : "transparent", cursor: "pointer", transform: selected === m ? "scale(1.15)" : "scale(1)", transition: "all 0.2s" }}>{m}</button>
          ))}
        </div>
        <Input label="Date" value={date} onChange={setDate} type="date" />
        <Input label="Note (optional)" value={note} onChange={setNote} placeholder="What's on your mind?" />
        <button onClick={logMood} disabled={!selected} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: selected ? "var(--gradient)" : "var(--border)", color: selected ? "#fff" : "var(--muted)", fontWeight: 700, cursor: selected ? "pointer" : "default", fontFamily: "inherit" }}>Log Mood {selected}</button>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Recent Mood Log</div>
        {state.moods.slice(0, 10).map(m => (
          <div key={m.date} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 24 }}>{m.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.date}</div>
              {m.note && <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.note}</div>}
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Mood Frequency</div>
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(moodCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
            <div key={emoji} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
              <div style={{ flex: 1, background: "var(--border)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${(count / last30.length) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)", width: 20, textAlign: "right" }}>{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── MED TRACKER ──────────────────────────────────────────────────────────────
function MedTracker({ state, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", dosage: "", times: ["08:00"] });
  const [newTime, setNewTime] = useState("08:00");

  function addMed() {
    const taken = form.times.reduce((acc, t) => ({ ...acc, [t]: false }), {});
    update({ meds: [...state.meds, { ...form, id: Date.now(), taken }] });
    setShowAdd(false);
  }

  function toggleTaken(medId, time) {
    update({ meds: state.meds.map(m => m.id === medId ? { ...m, taken: { ...m.taken, [time]: !m.taken[time] } } : m) });
  }

  function removeMed(id) { update({ meds: state.meds.filter(m => m.id !== id) }); }

  const allTaken = state.meds.every(m => Object.values(m.taken).every(Boolean));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>💊 Medication Tracker</h2>
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", background: "var(--gradient)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
          <Icon name="plus" size={16} color="#fff" /> Add
        </button>
      </div>

      {allTaken && state.meds.length > 0 && (
        <Card style={{ marginBottom: 16, background: "#52C97D22", border: "1.5px solid #52C97D" }}>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 800, color: "#52C97D" }}>✅ All medications taken today! Great job! 🌸</div>
        </Card>
      )}

      {state.meds.map(med => (
        <Card key={med.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>💊 {med.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{med.dosage}</div>
            </div>
            <button onClick={() => removeMed(med.id)} style={{ padding: 4, border: "none", background: "transparent", cursor: "pointer" }}>
              <Icon name="trash" size={14} color="var(--muted)" />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {med.times.map(time => (
              <button key={time} onClick={() => toggleTaken(med.id, time)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: `2px solid ${med.taken[time] ? "#52C97D" : "var(--border)"}`, background: med.taken[time] ? "#52C97D22" : "var(--bg)", cursor: "pointer", fontWeight: 700, fontSize: 14, color: med.taken[time] ? "#52C97D" : "var(--text)", fontFamily: "inherit" }}>
                {med.taken[time] ? "✓" : "○"} {time}
              </button>
            ))}
          </div>
        </Card>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Medication 💊">
        <Input label="Medication Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Vitamin D" />
        <Input label="Dosage" value={form.dosage} onChange={v => setForm(f => ({ ...f, dosage: v }))} placeholder="e.g. 1000 IU" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" }}>Reminder Times</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {form.times.map(t => (
              <span key={t} style={{ padding: "4px 12px", borderRadius: 99, background: "var(--accent)22", color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>{t} <button onClick={() => setForm(f => ({ ...f, times: f.times.filter(x => x !== t) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0, marginLeft: 4 }}>×</button></span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }} />
            <button onClick={() => { if (!form.times.includes(newTime)) setForm(f => ({ ...f, times: [...f.times, newTime] })); }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add</button>
          </div>
        </div>
        <button onClick={addMed} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--gradient)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add Medication 💊</button>
      </Modal>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ state }) {
  const income = monthlyIncome(state.incomes);
  const expenses = totalExpenses(state.expenses);

  const categoryData = Object.entries(
    state.expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = months.slice(0, 6).map((m, i) => ({
    name: m,
    income: income * (0.9 + Math.random() * 0.2),
    expenses: expenses * (0.85 + Math.random() * 0.3),
  }));

  const debtData = state.debts.map(d => ({ name: d.label.split(" ")[0], balance: d.balance, rate: d.rate }));

  const COLORS = ["#FF6B9D", "#9B7AEA", "#52C97D", "#F4A261", "#45B7D1"];

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 900 }}>📊 Analytics</h2>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Spending Breakdown</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={categoryData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
              {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Income vs Expenses (6 months)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(1)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#52C97D" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#FF6B9D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Debt Balances</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={debtData} layout="vertical">
            <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="balance" name="Balance" fill="var(--accent)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Goals Progress</div>
        {state.goals.map(g => (
          <div key={g.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{g.label}</span>
              <span style={{ color: g.color, fontWeight: 800 }}>{fmt(g.saved)} / {fmt(g.target)}</span>
            </div>
            <ProgressBar value={g.saved} max={g.target} color={g.color} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ state, update }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 900 }}>⚙️ Settings</h2>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 14 }}>🎨 Theme</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(THEMES).map(([key, theme]) => (
            <button key={key} onClick={() => update({ theme: key })} style={{ padding: "14px", borderRadius: 14, border: `2.5px solid ${state.theme === key ? theme.accent : "var(--border)"}`, background: theme.bg, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: theme.accent }} />
              <span style={{ fontWeight: 700, color: theme.text, fontSize: 14, textTransform: "capitalize" }}>{key}</span>
              {state.theme === key && <span style={{ marginLeft: "auto", color: theme.accent }}>✓</span>}
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 14 }}>👤 Profile</div>
        <Input label="Your Name" value={state.profile.name} onChange={v => update({ profile: { ...state.profile, name: v } })} />
        <Input label="Partner's Name" value={state.profile.partnerName} onChange={v => update({ profile: { ...state.profile, partnerName: v } })} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 14 }}>🤖 AI Settings</div>
        <Input label="OpenAI API Key (for AI Coach)" value={state.openAIKey} onChange={v => update({ openAIKey: v })} type="password" placeholder="sk-..." />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Your key is stored locally on your device only. Never shared.</div>
      </Card>

      <Card>
        <div style={{ fontWeight: 800, marginBottom: 14, color: "#FF6B6B" }}>⚠️ Data</div>
        <button onClick={() => { if (window.confirm("Reset all data? This cannot be undone.")) { localStorage.removeItem("budgetsbloom"); window.location.reload(); } }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #FF6B6B", background: "#FF6B6B22", color: "#FF6B6B", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Reset All Data</button>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Home", icon: "home" },
  { id: "income", label: "Income", icon: "income" },
  { id: "expenses", label: "Expenses", icon: "expense" },
  { id: "debt", label: "Debt", icon: "debt" },
  { id: "cards", label: "Cards", icon: "card" },
  { id: "installments", label: "Payments", icon: "installment" },
  { id: "goals", label: "Goals", icon: "goal" },
  { id: "ai", label: "AI Coach", icon: "ai" },
  { id: "todo", label: "Tasks", icon: "todo" },
  { id: "mood", label: "Mood", icon: "mood" },
  { id: "meds", label: "Meds", icon: "med" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default function App() {
  const [state, update] = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = THEMES[state.theme] || THEMES.pink;

  const cssVars = {
    "--bg": theme.bg, "--card": theme.card, "--accent": theme.accent,
    "--accent2": theme.accent2, "--text": theme.text, "--muted": theme.muted,
    "--border": theme.border, "--gradient": theme.gradient,
    "--sidebar": theme.sidebar, "--sidebar-text": theme.sidebarText,
  };

  if (!state.onboarded) {
    return (
      <div style={{ ...cssVars, fontFamily: "'Georgia', serif", color: "var(--text)", background: "var(--bg)" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <Onboarding onDone={({ name, partner }) => update({ onboarded: true, profile: { name, partnerName: partner } })} />
      </div>
    );
  }

  const PAGE = {
    dashboard: <Dashboard state={state} update={update} />,
    income: <IncomeTracker state={state} update={update} />,
    expenses: <ExpenseTracker state={state} update={update} />,
    debt: <DebtCrusher state={state} update={update} />,
    cards: <CreditCards state={state} update={update} />,
    installments: <Installments state={state} update={update} />,
    goals: <Goals state={state} update={update} />,
    ai: <AICoach state={state} update={update} />,
    todo: <TodoList state={state} update={update} />,
    mood: <MoodTracker state={state} update={update} />,
    meds: <MedTracker state={state} update={update} />,
    analytics: <Analytics state={state} />,
    settings: <Settings state={state} update={update} />,
  };

  return (
    <div style={{ ...cssVars, fontFamily: "'Georgia', serif", color: "var(--text)", background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input, select, button { font-family: inherit; }
      `}</style>

      {/* Sidebar overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />}

      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, zIndex: 100, background: "var(--sidebar)", borderRight: "1px solid var(--border)", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s cubic-bezier(.4,0,.2,1)", overflowY: "auto", padding: "20px 0 40px" }}>
        <div style={{ padding: "16px 20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, background: theme.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>BudgetsBloom</div>
          <div style={{ fontSize: 13, color: "var(--sidebar-text)", marginTop: 2 }}>🌸 {state.profile.name} & {state.profile.partnerName}</div>
        </div>
        {NAV.map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", border: "none", background: activeTab === item.id ? theme.accent + "22" : "transparent", color: activeTab === item.id ? theme.accent : theme.sidebarText, fontWeight: activeTab === item.id ? 800 : 500, cursor: "pointer", textAlign: "left", fontSize: 14, borderLeft: activeTab === item.id ? `3px solid ${theme.accent}` : "3px solid transparent", fontFamily: "inherit" }}>
            <Icon name={item.icon} size={17} color={activeTab === item.id ? theme.accent : theme.sidebarText} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(12px)" }}>
        <button onClick={() => setSidebarOpen(true)} style={{ padding: "8px", borderRadius: 12, border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 18, height: 2, background: "var(--text)", borderRadius: 99 }} />)}
          </div>
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>{NAV.find(n => n.id === activeTab)?.label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, background: theme.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🌸</div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 120px", maxWidth: 520, margin: "0 auto", animation: "fadeIn 0.3s ease" }} key={activeTab}>
        {PAGE[activeTab]}
      </div>

      {/* Bottom Nav (mobile) */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "var(--card)", borderTop: "1px solid var(--border)", padding: "8px 4px env(safe-area-inset-bottom)", display: "flex", justifyContent: "space-around", backdropFilter: "blur(12px)" }}>
        {["dashboard","income","expenses","ai","settings"].map(id => {
          const item = NAV.find(n => n.id === id);
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", color: activeTab === id ? theme.accent : theme.muted, fontFamily: "inherit" }}>
              <Icon name={item.icon} size={20} color={activeTab === id ? theme.accent : theme.muted} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
