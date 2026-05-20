// ═══════════════════════════════════════════════════════════
//  BudgetsBloom — main.jsx
//  UPDATED: Supabase sync always loads cloud first
//  UPDATED: Monthly section rebuilt to match original HTML style
//  UPDATED: Expenses section matches original HTML grouping/layout
//  FIXED:   Credit card payments now reduce balance + save correctly
//  NEW:     Carryover feature — remaining balance carries to next period
//  KEPT:    Salary cards design unchanged
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'

// ── SUPABASE CONFIG ──────────────────────────────────────────
const SUPABASE_URL = 'https://njdivqtxzjuorlueqxrf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZGl2cXR4emp1b3JsdWVxeHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDU5MTEsImV4cCI6MjA5NDc4MTkxMX0.I4PUAdJctFalUe_HMMP9jzXiq7YWdmCVbsLjbMP4pr4'
const USER_ID = 'zaira-ariel'
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function supabaseGet() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}&select=data,updated_at`,
      { headers: HEADERS }
    )
    const rows = await res.json()
    return rows && rows.length > 0 ? rows[0] : null
  } catch (e) {
    console.warn('Supabase get failed:', e)
    return null
  }
}

async function supabaseSave(appState) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: USER_ID,
        data: { budgetsbloom: JSON.stringify(appState) },
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('Supabase save failed:', e)
  }
}

// ── INIT SYNC — cloud always wins ────────────────────────────
async function initSync() {
  const row = await supabaseGet()
  if (row && row.data && row.data.budgetsbloom) {
    try {
      const cloudState = JSON.parse(row.data.budgetsbloom)
      console.log('✅ Loaded from cloud — overwriting local')
      window.localStorage.setItem('budgetsbloom', JSON.stringify(cloudState))
    } catch (e) {
      console.warn('Failed to parse cloud state:', e)
    }
  } else {
    const localRaw = window.localStorage.getItem('budgetsbloom')
    if (localRaw) {
      console.log('No cloud data — pushing local to cloud')
      await supabaseSave(JSON.parse(localRaw))
    }
  }

  // Intercept localStorage writes to auto-save to cloud
  const _orig = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (key, value) {
    _orig(key, value)
    if (key === 'budgetsbloom') {
      clearTimeout(window._supabaseSaveTimer)
      window._supabaseSaveTimer = setTimeout(() => {
        try { supabaseSave(JSON.parse(value)); console.log('💾 Saved to cloud') } catch {}
      }, 1500)
    }
  }

  // Save when app is backgrounded (iPhone home screen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const raw = window.localStorage.getItem('budgetsbloom')
      if (raw) { try { supabaseSave(JSON.parse(raw)) } catch {} }
    }
  })
}

// ── HELPERS ──────────────────────────────────────────────────
const fmt = n => (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtShort = n => '$' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const today = () => new Date().toISOString().split('T')[0]
const daysDiff = (dateStr) => {
  const d = new Date(dateStr)
  const t = new Date(); t.setHours(0,0,0,0)
  return Math.ceil((d - t) / 86400000)
}

// ── DEFAULT STATE ─────────────────────────────────────────────
const DEFAULT_STATE = () => ({
  // Pay periods — semi-monthly (1–15 and 16–end)
  periods: [
    { id: 'p1', label: 'May 1–15',  start: '2025-05-01', end: '2025-05-15', payday: '2025-05-07',  salary: 2000 },
    { id: 'p2', label: 'May 16–31', start: '2025-05-16', end: '2025-05-31', payday: '2025-05-22',  salary: 2000 },
    { id: 'p3', label: 'Jun 1–15',  start: '2025-06-01', end: '2025-06-15', payday: '2025-06-07',  salary: 2000 },
    { id: 'p4', label: 'Jun 16–30', start: '2025-06-16', end: '2025-06-30', payday: '2025-06-22',  salary: 2000 },
  ],
  activePeriodId: 'p1',

  // Expenses — each linked to a period
  expenses: [
    { id: 'e1', periodId: 'p1', name: 'Rent',          cat: 'rent',          amt: 900,  due: '2025-05-01', paid: false, card: '',   payType: 'etransfer', recur: 'monthly' },
    { id: 'e2', periodId: 'p1', name: 'Netflix',        cat: 'subscriptions', amt: 18,   due: '2025-05-05', paid: false, card: '',   payType: 'auto',     recur: 'monthly' },
    { id: 'e3', periodId: 'p1', name: 'Hydro',          cat: 'utilities',     amt: 85,   due: '2025-05-10', paid: false, card: '',   payType: 'banking',  recur: 'monthly' },
    { id: 'e4', periodId: 'p2', name: 'Car Insurance',  cat: 'transport',     amt: 160,  due: '2025-05-20', paid: false, card: '',   payType: 'auto',     recur: 'monthly' },
    { id: 'e5', periodId: 'p2', name: 'Phone Bill',     cat: 'phone',         amt: 75,   due: '2025-05-22', paid: false, card: '',   payType: 'banking',  recur: 'monthly' },
    { id: 'e6', periodId: 'p2', name: 'Internet',       cat: 'internet',      amt: 60,   due: '2025-05-25', paid: false, card: '',   payType: 'auto',     recur: 'monthly' },
    { id: 'e7', periodId: 'p2', name: 'Savings',        cat: 'savings',       amt: 200,  due: '2025-05-22', paid: false, card: '',   payType: 'etransfer',recur: 'biweekly' },
  ],

  // Credit cards
  cards: [
    { id: 'cc1', name: 'Visa Rewards',    owner: 'Zai',   balance: 3200, limit: 5000, minPct: 2,  due: '2025-05-18', color: 0, payments: [] },
    { id: 'cc2', name: 'Mastercard Gold', owner: 'Ariel', balance: 870,  limit: 3000, minPct: 2,  due: '2025-05-22', color: 1, payments: [] },
    { id: 'cc3', name: 'Cash Back',       owner: 'Zai',   balance: 150,  limit: 2000, minPct: 2,  due: '2025-05-30', color: 2, payments: [] },
  ],

  // Salary history per period
  salary: {
    p1: { zai: 2000, ariel: 0 },
    p2: { zai: 2000, ariel: 0 },
  },

  // NEW: Carryover per period — { use: bool, amt: number, locked: bool }
  carryover: {},

  // Custom dropdowns
  customPaySources: [],
  customPayTypes: [],
})

// ── LOAD STATE ────────────────────────────────────────────────
function loadState() {
  try {
    const raw = window.localStorage.getItem('budgetsbloom')
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge with defaults for any missing keys (migration-safe)
      const def = DEFAULT_STATE()
      return {
        ...def,
        ...parsed,
        carryover: parsed.carryover || {},
        customPaySources: parsed.customPaySources || [],
        customPayTypes: parsed.customPayTypes || [],
      }
    }
  } catch {}
  return DEFAULT_STATE()
}

function saveState(state) {
  window.localStorage.setItem('budgetsbloom', JSON.stringify(state))
}

// ═══════════════════════════════════════════════════════════
//  MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
function App() {
  const [state, setStateRaw] = useState(loadState)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState(null)

  // Persist every state change
  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveState(next)
      return next
    })
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Derived: active period
  const activePeriod = state.periods.find(p => p.id === state.activePeriodId) || state.periods[0]

  // NEW: Calculate carryover for a period
  const getCarryover = (periodId) => {
    const co = state.carryover[periodId]
    if (co && co.use === false) return 0
    if (co && co.amt != null) return co.amt
    // Auto-calculate from previous period
    const periods = state.periods
    const idx = periods.findIndex(p => p.id === periodId)
    if (idx <= 0) return 0
    const prevId = periods[idx - 1].id
    const prevPeriod = periods[idx - 1]
    const prevExps = state.expenses.filter(e => e.periodId === prevId)
    const prevIncome = (state.salary[prevId]?.zai || 0) + (state.salary[prevId]?.ariel || 0) || prevPeriod.salary || 0
    const prevCarryover = getCarryover(prevId)
    const prevTotal = prevIncome + prevCarryover
    const prevSpent = prevExps.reduce((s, e) => s + e.amt, 0)
    return Math.max(0, prevTotal - prevSpent)
  }

  const tabs = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'expenses',  label: '💸 Expenses' },
    { id: 'monthly',   label: '📅 Monthly' },
    { id: 'cards',     label: '💳 Cards' },
    { id: 'salary',    label: '💰 Salary' },
    { id: 'goals',     label: '🎯 Goals' },
    { id: 'settings',  label: '⚙️ Settings' },
  ]

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: '#fff5f9', minHeight: '100vh', paddingBottom: 80 }}>
      {/* HEADER */}
      <Header activePeriod={activePeriod} state={state} setState={setState} getCarryover={getCarryover} />

      {/* TAB BAR */}
      <nav style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #fce7f3', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flexShrink: 0, padding: '10px 14px', border: 'none', background: 'none',
              fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: activeTab === t.id ? '#db2777' : '#9b6b8a',
              borderBottom: activeTab === t.id ? '2.5px solid #db2777' : '2.5px solid transparent',
              whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* PAGES */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: 14 }}>
        {activeTab === 'overview'  && <OverviewTab  state={state} setState={setState} activePeriod={activePeriod} getCarryover={getCarryover} showToast={showToast} />}
        {activeTab === 'expenses'  && <ExpensesTab  state={state} setState={setState} activePeriod={activePeriod} getCarryover={getCarryover} showToast={showToast} />}
        {activeTab === 'monthly'   && <MonthlyTab   state={state} setState={setState} showToast={showToast} getCarryover={getCarryover} />}
        {activeTab === 'cards'     && <CardsTab     state={state} setState={setState} showToast={showToast} />}
        {activeTab === 'salary'    && <SalaryTab    state={state} setState={setState} activePeriod={activePeriod} showToast={showToast} />}
        {activeTab === 'goals'     && <GoalsTab     state={state} setState={setState} showToast={showToast} />}
        {activeTab === 'settings'  && <SettingsTab  state={state} setState={setState} showToast={showToast} />}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#4a2040', color: '#fff', padding: '10px 20px',
          borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </div>
  )
}

// ── HEADER ────────────────────────────────────────────────────
// KEPT: same header style, just added period selector
function Header({ activePeriod, state, setState, getCarryover }) {
  const [showPicker, setShowPicker] = useState(false)
  const income = (state.salary[activePeriod.id]?.zai || 0) + (state.salary[activePeriod.id]?.ariel || 0) || activePeriod.salary || 0
  const carryover = getCarryover(activePeriod.id)
  const pool = income + carryover

  return (
    <div style={{ background: '#4a2040', color: '#f6f2ec', position: 'sticky', top: 0, zIndex: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px 9px' }}>
        <div style={{ fontFamily: 'serif', fontSize: '1.3rem', fontWeight: 700 }}>
          🌸 <em style={{ fontStyle: 'italic', color: '#f472b6' }}>BudgetsBloom</em>
        </div>
        <button onClick={() => setShowPicker(true)}
          style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#f6f2ec', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: 'pointer' }}>
          📅 {activePeriod.label}
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 9px', fontSize: 12, color: 'rgba(246,242,236,.5)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <span>Payday {activePeriod.payday}</span>
        <span>Pool: <strong style={{ color: '#86efac', fontWeight: 700 }}>${fmt(pool)}</strong></span>
      </div>

      {/* Period Picker Modal */}
      {showPicker && (
        <div onClick={() => setShowPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(24,20,15,.65)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontFamily: 'serif', marginBottom: 14 }}>Select Pay Period</h3>
            {state.periods.map(p => (
              <div key={p.id} onClick={() => { setState(s => ({ ...s, activePeriodId: p.id })); setShowPicker(false) }}
                style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: state.activePeriodId === p.id ? '#4a2040' : '#f6f2ec',
                  color: state.activePeriodId === p.id ? '#fff' : '#4a2040',
                }}>
                <span>{p.label}</span>
                <span style={{ opacity: .6, fontSize: 12 }}>Payday: {p.payday}</span>
              </div>
            ))}
            <button onClick={() => setShowPicker(false)} style={btnStyle('#f6f2ec','#4a2040')}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── OVERVIEW TAB ──────────────────────────────────────────────
function OverviewTab({ state, activePeriod, getCarryover, showToast }) {
  const income = (state.salary[activePeriod.id]?.zai || 0) + (state.salary[activePeriod.id]?.ariel || 0) || activePeriod.salary || 0
  const carryover = getCarryover(activePeriod.id)
  const pool = income + carryover
  const exps = state.expenses.filter(e => e.periodId === activePeriod.id)
  const totalBudgeted = exps.reduce((s, e) => s + e.amt, 0)
  const totalPaid = exps.filter(e => e.paid).reduce((s, e) => s + e.amt, 0)
  const remaining = pool - totalBudgeted
  const pct = pool > 0 ? Math.min(100, totalPaid / pool * 100) : 0
  const totMin = state.cards.reduce((s, c) => s + Math.max(10, c.balance * (c.minPct || 2) / 100), 0)

  return (
    <div>
      {/* HERO CARD — KEPT existing style */}
      <div style={{ background: '#2d2820', borderRadius: 13, padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden', color: '#f6f2ec' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(246,242,236,.45)', marginBottom: 6 }}>
          {activePeriod.label.toUpperCase()} · PAYDAY {activePeriod.payday}
        </div>
        <div style={{ fontFamily: 'serif', fontSize: '2.2rem', fontWeight: 700, color: '#86efac', lineHeight: 1 }}>
          ${fmt(pool)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(246,242,236,.4)', margin: '4px 0 16px' }}>Available this period (income + carryover)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { val: income, lbl: 'Income',    col: '#86efac' },
            { val: carryover, lbl: 'Carryover', col: '#fde68a' },
            { val: totalBudgeted, lbl: 'Budgeted',  col: '#fca5a5' },
            { val: remaining, lbl: 'Remaining', col: remaining >= 0 ? '#86efac' : '#fca5a5' },
          ].map(({ val, lbl, col }) => (
            <div key={lbl} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: col }}>${fmt(val)}</div>
              <div style={{ fontSize: 11, color: 'rgba(246,242,236,.4)', marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="card-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>Expense Progress</span>
          <span style={{ color: '#9b6b8a' }}>${fmt(totalPaid)} / ${fmt(totalBudgeted)}</span>
        </div>
        <ProgBar pct={pct} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9b6b8a', marginTop: 3 }}>
          <span>{exps.filter(e => e.paid).length} paid ✓</span>
          <span>{exps.filter(e => !e.paid).length} pending · ${fmt(totalBudgeted - totalPaid)}</span>
        </div>
      </div>

      {/* Carryover status */}
      {carryover > 0 && (
        <div style={{ background: '#eaf3ee', border: '1px solid #9ecab0', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#72aa88', marginBottom: 2 }}>Carryover from last period</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#3a6b4e' }}>${fmt(carryover)}</div>
          </div>
          <span style={{ background: '#eaf3ee', color: '#3a6b4e', border: '1px solid #9ecab0', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>✓ Applied</span>
        </div>
      )}

      {/* CC Min Payments */}
      {totMin > 0 && (
        <div className="card-box">
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>💳 CC Min Payments Due</div>
          {state.cards.map(c => {
            const min = Math.max(10, c.balance * (c.minPct || 2) / 100)
            const diff = daysDiff(c.due)
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #fce7f3', fontSize: 13 }}>
                <span>{c.name} <span style={{ color: '#9b6b8a', fontSize: 11 }}>{c.owner}</span></span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#d97706' }}>${fmt(min)}</span>
                  <span style={{ fontSize: 11, color: diff < 0 ? '#dc2626' : diff <= 3 ? '#d97706' : '#9b6b8a' }}>
                    {diff < 0 ? 'Overdue' : diff === 0 ? 'Due today' : `${diff}d`}
                  </span>
                </span>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontWeight: 700, fontSize: 14 }}>
            <span>Total Min Payments</span><span style={{ color: '#db2777' }}>${fmt(totMin)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  EXPENSES TAB
//  UPDATED: matches original HTML grouped layout with carryover bar
// ═══════════════════════════════════════════════════════════
function ExpensesTab({ state, setState, activePeriod, getCarryover, showToast }) {
  const [form, setForm] = useState({ name: '', amt: '', due: '', cat: 'rent', card: '', payType: 'banking', recur: 'no' })
  const [filterCat, setFilterCat] = useState('all')
  const [expPeriodId, setExpPeriodId] = useState(activePeriod.id)

  const expPeriod = state.periods.find(p => p.id === expPeriodId) || activePeriod
  const expIdx = state.periods.findIndex(p => p.id === expPeriodId)

  const income = (state.salary[expPeriodId]?.zai || 0) + (state.salary[expPeriodId]?.ariel || 0) || expPeriod.salary || 0
  const carryover = getCarryover(expPeriodId)
  const pool = income + carryover
  const allExps = state.expenses.filter(e => e.periodId === expPeriodId)
  const exps = filterCat === 'all' ? allExps : allExps.filter(e => e.cat === filterCat)
  const totalBudgeted = allExps.reduce((s, e) => s + e.amt, 0)
  const totalPaid = allExps.filter(e => e.paid).reduce((s, e) => s + e.amt, 0)
  const remaining = pool - totalBudgeted

  const CAT_ICON = { rent:'🏠',utilities:'💡',groceries:'🛒',transport:'🚌',phone:'📱',internet:'🌐',subscriptions:'📺',dining:'🍜',health:'💊',savings:'💰',remittance:'🇵🇭',credit:'💳',other:'📦' }
  const CAT_LBL  = { rent:'Rent',utilities:'Utilities',groceries:'Groceries',transport:'Transport',phone:'Phone',internet:'Internet',subscriptions:'Subs',dining:'Dining',health:'Health',savings:'Savings',remittance:'Remittance',credit:'CC Bill',other:'Other' }
  const cats = [...new Set(allExps.map(e => e.cat))]

  const addExp = () => {
    if (!form.name || !form.amt) return showToast('⚠️ Name and amount required')
    const newExp = { id: 'e' + Date.now(), periodId: expPeriodId, name: form.name, amt: parseFloat(form.amt), due: form.due || expPeriod.payday, cat: form.cat, card: form.card, payType: form.payType, recur: form.recur, paid: false }
    setState(s => ({ ...s, expenses: [...s.expenses, newExp] }))
    setForm({ name: '', amt: '', due: '', cat: 'rent', card: '', payType: 'banking', recur: 'no' })
    showToast('✅ Expense added!')
  }

  const togglePaid = (id) => {
    setState(s => ({
      ...s,
      expenses: s.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e)
    }))
  }

  const delExp = (id) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }))
    showToast('🗑 Removed')
  }

  const moveExp = (dir) => {
    const newIdx = expIdx + dir
    if (newIdx < 0 || newIdx >= state.periods.length) return
    setExpPeriodId(state.periods[newIdx].id)
  }

  return (
    <div>
      {/* CARRYOVER BAR — NEW */}
      {carryover > 0 && (
        <div style={{ background: '#eaf3ee', border: '1px solid #9ecab0', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#72aa88' }}>Carryover from previous period</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#3a6b4e' }}>${fmt(carryover)}</div>
          </div>
          <div style={{ fontSize: 12, color: '#3a6b4e', fontWeight: 600 }}>
            Pool: ${fmt(pool)}
          </div>
        </div>
      )}

      {/* PERIOD NAV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <button onClick={() => moveExp(-1)} style={pnavBtn}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', background: '#fff', border: '1.5px solid #fce7f3', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600 }}>
          {expPeriod.label} · Payday {expPeriod.payday}
        </div>
        <button onClick={() => moveExp(1)} style={pnavBtn}>›</button>
      </div>

      {/* ADD EXPENSE FORM */}
      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>+ Add Expense</div>
        <InputRow label="Name"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Hydro, Rent, Netflix" style={inputStyle} /></InputRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
          <InputRow label="Budget ($)"><input type="number" value={form.amt} onChange={e => setForm(f=>({...f,amt:e.target.value}))} placeholder="0.00" style={inputStyle} /></InputRow>
          <InputRow label="Due Date"><input type="date" value={form.due} onChange={e => setForm(f=>({...f,due:e.target.value}))} style={inputStyle} /></InputRow>
        </div>
        <InputRow label="Category">
          <select value={form.cat} onChange={e => setForm(f=>({...f,cat:e.target.value}))} style={inputStyle}>
            {Object.entries(CAT_ICON).map(([k,icon]) => <option key={k} value={k}>{icon} {CAT_LBL[k]}</option>)}
          </select>
        </InputRow>
        <InputRow label="Charge To (Card / Source)">
          <select value={form.card} onChange={e => setForm(f=>({...f,card:e.target.value}))} style={inputStyle}>
            <option value="">Cash / Debit / Chequing</option>
            {state.cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.owner})</option>)}
            {(state.customPaySources||[]).map((src,i) => <option key={i} value={src}>{src}</option>)}
          </select>
        </InputRow>
        <InputRow label="Pay Type">
          <select value={form.payType} onChange={e => setForm(f=>({...f,payType:e.target.value}))} style={inputStyle}>
            <option value="banking">🏦 Online Banking</option>
            <option value="etransfer">📲 e-Transfer</option>
            <option value="auto">🔁 Auto-Pay</option>
            <option value="debit">💳 Debit</option>
            <option value="cash">💵 Cash</option>
            <option value="cheque">📝 Cheque</option>
            {(state.customPayTypes||[]).map((t,i) => <option key={i} value={t}>{t}</option>)}
          </select>
        </InputRow>
        <InputRow label="Recurring?">
          <select value={form.recur} onChange={e => setForm(f=>({...f,recur:e.target.value}))} style={inputStyle}>
            <option value="no">One-time only</option>
            <option value="monthly">Monthly (same due date)</option>
            <option value="biweekly">Every pay period</option>
          </select>
        </InputRow>
        <button onClick={addExp} style={{ ...btnStyle('#db2777','#fff'), width: '100%', marginTop: 10, padding: '10px 0', fontSize: 14 }}>+ Add Expense</button>
      </div>

      {/* CATEGORY FILTER CHIPS */}
      {cats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {['all', ...cats].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ padding: '4px 11px', borderRadius: 15, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1.5px solid', background: filterCat === c ? '#4a2040' : '#fff', color: filterCat === c ? '#fff' : '#9b6b8a', borderColor: filterCat === c ? '#4a2040' : '#fce7f3' }}>
              {c === 'all' ? 'All' : `${CAT_ICON[c]||'📦'} ${CAT_LBL[c]||c}`}
            </button>
          ))}
        </div>
      )}

      {/* EXPENSES LIST */}
      <div className="card-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            Expenses <span style={{ color: '#9b6b8a', fontSize: 12, fontWeight: 400 }}>{expPeriod.label}</span>
          </div>
          <span style={{ fontWeight: 700, color: '#db2777' }}>${fmt(totalBudgeted)}</span>
        </div>

        {exps.length === 0 && <p style={{ color: '#9b6b8a', fontSize: 13 }}>No expenses for this period.</p>}
        {exps.map(e => <ExpRow key={e.id} e={e} state={state} onToggle={() => togglePaid(e.id)} onDel={() => delExp(e.id)} CAT_ICON={CAT_ICON} />)}

        {/* SUMMARY CALC BOX */}
        <div style={{ background: '#f6f2ec', border: '1px solid #e8e2d8', borderRadius: 8, padding: 13, marginTop: 12 }}>
          {[
            { label: 'Income this period', val: income, col: '#3a6b4e' },
            { label: 'Carryover', val: carryover, col: '#a67c20' },
            { label: 'Total budgeted', val: -totalBudgeted, col: '#c24b1a' },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: '#9a9088' }}>{label}</span>
              <span style={{ fontWeight: 600, color: col }}>{val < 0 ? '-' : ''}${fmt(Math.abs(val))}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, paddingTop: 8, borderTop: '1px solid #e8e2d8' }}>
            <span>Remaining</span>
            <span style={{ color: remaining >= 0 ? '#3a6b4e' : '#c24b1a' }}>{remaining < 0 ? '-' : ''}${fmt(Math.abs(remaining))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Individual expense row — matches original HTML exp-row style
function ExpRow({ e, state, onToggle, onDel, CAT_ICON }) {
  const card = state.cards.find(c => c.id === e.card)
  const diff = e.due ? daysDiff(e.due) : null
  const isOverdue = diff !== null && diff < 0 && !e.paid
  const isDueSoon = diff !== null && diff >= 0 && diff <= 3 && !e.paid
  const PAY_TYPE_LBL = { banking: 'Online Banking', etransfer: 'e-Transfer', auto: 'Auto-Pay', debit: 'Debit', cash: 'Cash', cheque: 'Cheque' }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0',
      borderBottom: '1px solid #fce7f3', opacity: e.paid ? .5 : 1,
    }}>
      <input type="checkbox" checked={!!e.paid} onChange={onToggle}
        style={{ width: 17, height: 17, flexShrink: 0, accentColor: '#3a6b4e', cursor: 'pointer' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: e.paid ? 'line-through' : 'none' }}>
          {CAT_ICON[e.cat] || '📦'} {e.name}
          {card && <span style={{ fontSize: 11, background: '#eaf1f9', color: '#2860a0', padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginLeft: 5 }}>{card.name}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#9a9088', marginTop: 1 }}>
          Due {e.due} · {PAY_TYPE_LBL[e.payType] || e.payType}
          {isOverdue && <span style={{ color: '#c24b1a', fontWeight: 700, marginLeft: 4 }}>· OVERDUE</span>}
          {isDueSoon && !isOverdue && <span style={{ color: '#a67c20', fontWeight: 700, marginLeft: 4 }}>· Due soon</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>${fmt(e.amt)}</div>
        <button onClick={onDel} style={{ background: 'none', border: 'none', color: '#c8c0b4', fontSize: 14, cursor: 'pointer', padding: '2px 4px' }}>🗑</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MONTHLY TAB
//  UPDATED: rebuilt to match original HTML monthly layout
//  Grouped by date, color-coded, status badges, summary grid
// ═══════════════════════════════════════════════════════════
function MonthlyTab({ state, setState, showToast, getCarryover }) {
  const [monthDate, setMonthDate] = useState(new Date())
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const year  = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`

  // All expenses whose due date falls in this month
  const monthExps = state.expenses.filter(e => e.due && e.due.startsWith(monthStr))

  // Also get periods that overlap this month (for income/carryover per period)
  const monthPeriods = state.periods.filter(p =>
    p.start?.startsWith(monthStr) || p.end?.startsWith(monthStr) || p.payday?.startsWith(monthStr)
  )

  // Totals
  const totalDue    = monthExps.reduce((s,e) => s + e.amt, 0)
  const totalPaid   = monthExps.filter(e=>e.paid).reduce((s,e) => s + e.amt, 0)
  const totalUnpaid = totalDue - totalPaid
  const overdue     = monthExps.filter(e => !e.paid && e.due && daysDiff(e.due) < 0).length

  // Group by due date
  const groups = {}
  monthExps.forEach(e => {
    const k = e.due || 'No date'
    if (!groups[k]) groups[k] = []
    groups[k].push(e)
  })
  const sortedDates = Object.keys(groups).sort()

  const getStatus = (e) => {
    if (e.paid) return 'paid'
    const d = daysDiff(e.due)
    if (d < 0)  return 'overdue'
    if (d <= 3) return 'due-soon'
    return 'upcoming'
  }

  const STATUS_COLOR = { paid: '#3a6b4e', overdue: '#e03030', 'due-soon': '#d4900a', upcoming: '#2860a0' }
  const STATUS_BG    = { paid: '#eaf3ee', overdue: '#fdf3f3', 'due-soon': '#fffaed', upcoming: '#eaf1f9' }
  const STATUS_LBL   = { paid: 'Paid ✓', overdue: 'Overdue', 'due-soon': 'Due soon', upcoming: 'Upcoming' }
  const STATUS_BORDER= { paid: '#3a6b4e', overdue: '#e03030', 'due-soon': '#d4900a', upcoming: '#2860a0' }

  const togglePaid = (id) => {
    setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e) }))
  }

  // Build period-level summary rows for this month
  const periodRows = monthPeriods.map(p => {
    const pExps = state.expenses.filter(e => e.periodId === p.id)
    const pIncome = (state.salary[p.id]?.zai||0) + (state.salary[p.id]?.ariel||0) || p.salary || 0
    const pCarry  = getCarryover(p.id)
    const pBudg   = pExps.reduce((s,e)=>s+e.amt,0)
    const pRem    = pIncome + pCarry - pBudg
    return { ...p, income: pIncome, carryover: pCarry, budgeted: pBudg, remaining: pRem }
  })

  return (
    <div>
      {/* MONTH NAV */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} style={pnavBtn}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', background: '#fff', border: '1.5px solid #fce7f3', borderRadius: 8, padding: '7px 10px', fontSize: 14, fontWeight: 700 }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} style={pnavBtn}>›</button>
      </div>

      {/* LEGEND */}
      <div style={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, fontWeight: 600 }}>
        {Object.entries(STATUS_COLOR).map(([k,col]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: col, display: 'inline-block' }}></span>
            {STATUS_LBL[k]}
          </span>
        ))}
      </div>

      {/* SUMMARY GRID — 4 boxes like original HTML */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { id: 'total',  label: 'Total Due',  val: `$${fmt(totalDue)}`,    col: '#c24b1a' },
          { id: 'paid',   label: 'Paid',        val: `$${fmt(totalPaid)}`,   col: '#3a6b4e' },
          { id: 'unpaid', label: 'Still Owed',  val: `$${fmt(totalUnpaid)}`, col: '#a67c20' },
          { id: 'over',   label: 'Overdue',     val: overdue,                col: '#9e3648' },
        ].map(({ id, label, val, col }) => (
          <div key={id} style={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 10, padding: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(219,39,119,.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: col }}>{val}</div>
            <div style={{ fontSize: 11, color: '#9b6b8a', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* PERIOD BUDGET STRIPS — paycheck planner feel */}
      {periodRows.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {periodRows.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1.5px solid #fce7f3', borderRadius: 10, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(219,39,119,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#db2777' }}>🌸 {p.label}</div>
                  <div style={{ fontSize: 11, color: '#9b6b8a' }}>Payday {p.payday}</div>
                </div>
                <span style={{ background: p.remaining >= 0 ? '#eaf3ee' : '#fdf3f3', color: p.remaining >= 0 ? '#3a6b4e' : '#c24b1a', fontWeight: 800, fontSize: 12, padding: '3px 9px', borderRadius: 20 }}>
                  {p.remaining >= 0 ? '+' : ''}{fmtShort(p.remaining)} {p.remaining >= 0 ? 'left' : 'over'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9b6b8a' }}>
                <span>Income: <strong style={{color:'#4a2040'}}>{fmtShort(p.income)}</strong></span>
                {p.carryover > 0 && <span>Carry: <strong style={{color:'#a67c20'}}>{fmtShort(p.carryover)}</strong></span>}
                <span>Bills: <strong style={{color:'#c24b1a'}}>{fmtShort(p.budgeted)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAYMENT SCHEDULE — grouped by date */}
      <div style={{ background: '#fff', border: '1px solid #fce7f3', borderRadius: 10, padding: 14, boxShadow: '0 2px 8px rgba(219,39,119,.05)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📅 Payment Schedule</div>

        {sortedDates.length === 0 && <p style={{ color: '#9b6b8a', fontSize: 13 }}>No expenses found for this month.</p>}

        {sortedDates.map((date, i) => {
          const isToday = date === today()
          return (
            <div key={date}>
              {/* Date heading */}
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
                color: isToday ? '#c24b1a' : '#9a9088',
                padding: i === 0 ? '0 0 6px' : '10px 0 6px',
                borderTop: i === 0 ? 'none' : '1px solid #fce7f3',
                marginTop: i === 0 ? 0 : 6,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', weekday: 'short' })}
                {isToday && <span style={{ background: '#fce7f3', color: '#db2777', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>TODAY</span>}
              </div>

              {groups[date].map(e => {
                const status = getStatus(e)
                return (
                  <div key={e.id} onClick={() => togglePaid(e.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 11px', borderRadius: 8, marginBottom: 5,
                      fontSize: 13, borderLeft: `3px solid ${STATUS_BORDER[status]}`,
                      background: STATUS_BG[status], cursor: 'pointer',
                      transition: 'background .15s',
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status], flexShrink: 0 }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, textDecoration: e.paid ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: '#9a9088', marginTop: 1 }}>{e.cat}</div>
                    </div>
                    <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>${fmt(e.amt)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: STATUS_BG[status], color: STATUS_COLOR[status], border: `1px solid ${STATUS_BORDER[status]}`, flexShrink: 0 }}>
                      {STATUS_LBL[status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  CARDS TAB
//  FIXED: payments now reduce balance, save to state, show history
// ═══════════════════════════════════════════════════════════
function CardsTab({ state, setState, showToast }) {
  const [payModal, setPayModal]   = useState(null) // { ccId }
  const [balModal, setBalModal]   = useState(null) // { ccId }
  const [addModal, setAddModal]   = useState(false)
  const [payAmt, setPayAmt]       = useState('')
  const [newBal, setNewBal]       = useState('')
  const [newCard, setNewCard]     = useState({ name: '', owner: 'Zai', limit: '', minPct: '2', due: '' })

  const CC_COLORS = [
    'linear-gradient(135deg,#C24B1A,#7A2808)',
    'linear-gradient(135deg,#3A6B4E,#1C3A28)',
    'linear-gradient(135deg,#2860A0,#123060)',
    'linear-gradient(135deg,#A67C20,#5A4010)',
    'linear-gradient(135deg,#7B2D8B,#4A1A5A)',
  ]

  // FIXED: Apply payment — reduces balance, saves payment history
  const doPayment = () => {
    const amt = parseFloat(payAmt)
    if (!amt || amt <= 0) return showToast('⚠️ Enter a valid amount')
    const cc = state.cards.find(c => c.id === payModal)
    if (!cc) return
    const newBalance = Math.max(0, cc.balance - amt)
    const payRecord = { id: Date.now(), date: today(), amount: amt }
    setState(s => ({
      ...s,
      cards: s.cards.map(c => c.id === payModal
        ? { ...c, balance: newBalance, payments: [payRecord, ...(c.payments||[])].slice(0,10) }
        : c
      )
    }))
    setPayModal(null); setPayAmt('')
    showToast(`✅ $${fmt(amt)} payment applied to ${cc.name}!`)
  }

  // FIXED: Update balance directly
  const doUpdateBalance = () => {
    const bal = parseFloat(newBal)
    if (isNaN(bal) || bal < 0) return showToast('⚠️ Enter a valid balance')
    setState(s => ({
      ...s,
      cards: s.cards.map(c => c.id === balModal ? { ...c, balance: bal } : c)
    }))
    setBalModal(null); setNewBal('')
    showToast('✅ Balance updated!')
  }

  const addCard = () => {
    if (!newCard.name || !newCard.limit) return showToast('⚠️ Name and limit required')
    const card = { id: 'cc' + Date.now(), name: newCard.name, owner: newCard.owner, balance: 0, limit: parseFloat(newCard.limit), minPct: parseFloat(newCard.minPct)||2, due: newCard.due, color: state.cards.length % CC_COLORS.length, payments: [] }
    setState(s => ({ ...s, cards: [...s.cards, card] }))
    setAddModal(false); setNewCard({ name:'',owner:'Zai',limit:'',minPct:'2',due:'' })
    showToast('✅ Card added!')
  }

  const delCard = (id) => {
    if (!window.confirm('Delete this card?')) return
    setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }))
    showToast('🗑 Card removed')
  }

  const totalDebt = state.cards.reduce((s,c) => s + c.balance, 0)
  const totMin    = state.cards.reduce((s,c) => s + Math.max(10, c.balance*(c.minPct||2)/100), 0)

  return (
    <div>
      {/* TOTAL DEBT SUMMARY */}
      <div style={{ background: '#2d2820', color: '#f6f2ec', borderRadius: 13, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(246,242,236,.4)', marginBottom: 4 }}>TOTAL CREDIT CARD DEBT</div>
        <div style={{ fontFamily: 'serif', fontSize: '2rem', fontWeight: 700, color: '#fca5a5' }}>${fmt(totalDebt)}</div>
        <div style={{ fontSize: 12, color: 'rgba(246,242,236,.4)', marginTop: 4 }}>{state.cards.length} cards · Total min payments: ${fmt(totMin)}/period</div>
      </div>

      {/* CARDS */}
      {state.cards.map(cc => {
        const min  = Math.max(10, cc.balance*(cc.minPct||2)/100)
        const pct  = cc.limit > 0 ? Math.min(100, cc.balance/cc.limit*100) : 0
        const diff = cc.due ? daysDiff(cc.due) : null
        const isOverdue = diff !== null && diff < 0
        const isDueSoon = diff !== null && diff >= 0 && diff <= 3

        return (
          <div key={cc.id} style={{ marginBottom: 12 }}>
            {/* CARD VISUAL — matches original HTML cc-card style */}
            <div style={{ borderRadius: 13, padding: 16, background: CC_COLORS[cc.color||0], color: '#fff', position: 'relative', overflow: 'hidden', minHeight: 100, marginBottom: 0 }}>
              <div style={{ position: 'absolute', bottom: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }}></div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{cc.name}</div>
              <div style={{ fontSize: 11, opacity: .65, marginTop: 1 }}>{cc.owner}</div>
              <div style={{ fontFamily: 'serif', fontSize: '1.6rem', fontWeight: 700, margin: '10px 0 2px' }}>${fmt(cc.balance)}</div>
              <div style={{ fontSize: 11, opacity: .6 }}>Limit: ${fmt(cc.limit)} · Min: ${fmt(min)} · Due: {cc.due || '—'}</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, overflow: 'hidden', margin: '8px 0 10px' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'rgba(255,255,255,.75)', width: `${pct}%` }}></div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setPayModal(cc.id); setPayAmt(String(min.toFixed(2))) }}
                  style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', color: '#fff', borderRadius: 6, fontSize: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>
                  💳 Pay
                </button>
                <button onClick={() => { setBalModal(cc.id); setNewBal(String(cc.balance)) }}
                  style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', color: '#fff', borderRadius: 6, fontSize: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>
                  ✏️ Update Bal
                </button>
                <button onClick={() => delCard(cc.id)}
                  style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)', borderRadius: 6, fontSize: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 700, padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto' }}>
                  🗑
                </button>
              </div>
            </div>

            {/* MIN PAYMENT BOX */}
            <div style={{ background: '#faf5e6', border: '1px solid #dcca84', borderRadius: '0 0 10px 10px', padding: '11px 13px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#a67c20', marginBottom: 7 }}>💰 Payment Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#9a9088' }}>Balance owing</span><span style={{ fontWeight: 600 }}>${fmt(cc.balance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#9a9088' }}>Min payment ({cc.minPct||2}%)</span><span style={{ fontWeight: 600 }}>${fmt(min)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#9a9088' }}>Due date</span>
                <span style={{ fontWeight: 700, color: isOverdue ? '#c24b1a' : isDueSoon ? '#d4900a' : '#4a2040' }}>
                  {cc.due || '—'} {isOverdue ? '⚠ OVERDUE' : isDueSoon ? '⚠ Soon' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 6, borderTop: '1px solid #dcca84', fontWeight: 700 }}>
                <span>Utilization</span><span style={{ color: pct > 70 ? '#c24b1a' : pct > 40 ? '#a67c20' : '#3a6b4e' }}>{pct.toFixed(0)}%</span>
              </div>

              {/* PAYMENT HISTORY — FIXED */}
              {(cc.payments||[]).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9088', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Recent Payments</div>
                  {(cc.payments||[]).slice(0,5).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #e8e2d8' }}>
                      <span style={{ color: '#9a9088' }}>{p.date}</span>
                      <span style={{ fontWeight: 700, color: '#3a6b4e' }}>-${fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      <button onClick={() => setAddModal(true)} style={{ ...btnStyle('#f6f2ec','#4a2040'), width: '100%', padding: '10px 0', border: '1.5px solid #fce7f3', marginTop: 4 }}>+ Add Credit Card</button>

      {/* PAY MODAL */}
      {payModal && (() => {
        const cc = state.cards.find(c => c.id === payModal)
        return (
          <Modal title={`💳 Pay ${cc?.name}`} onClose={() => setPayModal(null)}>
            <p style={{ color: '#9b6b8a', fontSize: 13, marginBottom: 12 }}>Current balance: ${fmt(cc?.balance)}</p>
            <InputRow label="Amount Paid ($)">
              <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="0.00" step=".01" style={inputStyle} autoFocus />
            </InputRow>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setPayModal(null)} style={{ ...btnStyle('#f6f2ec','#4a2040'), flex: 1, border: '1.5px solid #fce7f3' }}>Cancel</button>
              <button onClick={doPayment} style={{ ...btnStyle('#3a6b4e','#fff'), flex: 1 }}>✓ Record Payment</button>
            </div>
          </Modal>
        )
      })()}

      {/* BALANCE MODAL */}
      {balModal && (() => {
        const cc = state.cards.find(c => c.id === balModal)
        return (
          <Modal title={`✏️ Update ${cc?.name} Balance`} onClose={() => setBalModal(null)}>
            <InputRow label="Current Balance Owing ($)">
              <input type="number" value={newBal} onChange={e => setNewBal(e.target.value)} placeholder="0.00" step=".01" style={inputStyle} autoFocus />
            </InputRow>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setBalModal(null)} style={{ ...btnStyle('#f6f2ec','#4a2040'), flex: 1, border: '1.5px solid #fce7f3' }}>Cancel</button>
              <button onClick={doUpdateBalance} style={{ ...btnStyle('#db2777','#fff'), flex: 1 }}>Update</button>
            </div>
          </Modal>
        )
      })()}

      {/* ADD CARD MODAL */}
      {addModal && (
        <Modal title="+ Add Credit Card" onClose={() => setAddModal(false)}>
          <InputRow label="Card Name"><input value={newCard.name} onChange={e => setNewCard(n=>({...n,name:e.target.value}))} placeholder="e.g. Visa Rewards" style={inputStyle} /></InputRow>
          <InputRow label="Owner">
            <select value={newCard.owner} onChange={e => setNewCard(n=>({...n,owner:e.target.value}))} style={inputStyle}>
              <option>Zai</option><option>Ariel</option><option>Joint</option>
            </select>
          </InputRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputRow label="Credit Limit ($)"><input type="number" value={newCard.limit} onChange={e => setNewCard(n=>({...n,limit:e.target.value}))} placeholder="5000" style={inputStyle} /></InputRow>
            <InputRow label="Min Payment %"><input type="number" value={newCard.minPct} onChange={e => setNewCard(n=>({...n,minPct:e.target.value}))} placeholder="2" style={inputStyle} /></InputRow>
          </div>
          <InputRow label="Due Date (Day of month)"><input type="date" value={newCard.due} onChange={e => setNewCard(n=>({...n,due:e.target.value}))} style={inputStyle} /></InputRow>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setAddModal(false)} style={{ ...btnStyle('#f6f2ec','#4a2040'), flex: 1, border: '1.5px solid #fce7f3' }}>Cancel</button>
            <button onClick={addCard} style={{ ...btnStyle('#db2777','#fff'), flex: 1 }}>+ Add Card</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SALARY TAB — KEPT current design, improved period linking ─
function SalaryTab({ state, setState, activePeriod, showToast }) {
  const [form, setForm] = useState({ periodId: activePeriod.id, zai: '', ariel: '', note: '' })

  const logSalary = () => {
    if (!form.zai && !form.ariel) return showToast('⚠️ Enter at least one salary amount')
    setState(s => ({
      ...s,
      salary: {
        ...s.salary,
        [form.periodId]: {
          zai:   parseFloat(form.zai) || 0,
          ariel: parseFloat(form.ariel) || 0,
          note:  form.note,
          date:  today(),
        }
      }
    }))
    showToast('✅ Salary logged!')
  }

  return (
    <div>
      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>💰 Log Salary / Income</div>
        <InputRow label="Pay Period">
          <select value={form.periodId} onChange={e => setForm(f=>({...f,periodId:e.target.value}))} style={inputStyle}>
            {state.periods.map(p => <option key={p.id} value={p.id}>{p.label} · Payday {p.payday}</option>)}
          </select>
        </InputRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputRow label="Zai's Income ($)"><input type="number" value={form.zai} onChange={e => setForm(f=>({...f,zai:e.target.value}))} placeholder="0.00" style={inputStyle} /></InputRow>
          <InputRow label="Ariel's Income ($)"><input type="number" value={form.ariel} onChange={e => setForm(f=>({...f,ariel:e.target.value}))} placeholder="0.00" style={inputStyle} /></InputRow>
        </div>
        <InputRow label="Note (optional)"><input value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. includes overtime" style={inputStyle} /></InputRow>
        <button onClick={logSalary} style={{ ...btnStyle('#db2777','#fff'), width: '100%', marginTop: 10, padding: '10px 0' }}>💾 Log Salary</button>
      </div>

      {/* Salary history per period */}
      {state.periods.map(p => {
        const sal = state.salary[p.id]
        if (!sal) return null
        const total = (sal.zai||0) + (sal.ariel||0)
        return (
          <div key={p.id} className="card-box" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🌸 {p.label}</div>
              <span style={{ background: '#eaf3ee', color: '#3a6b4e', fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 20 }}>${fmt(total)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#9b6b8a', marginBottom: 2 }}>Payday: {p.payday}</div>
            {sal.zai > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #fce7f3' }}><span>Zai</span><span style={{ fontWeight: 700, color: '#3a6b4e' }}>${fmt(sal.zai)}</span></div>}
            {sal.ariel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}><span>Ariel</span><span style={{ fontWeight: 700, color: '#3a6b4e' }}>${fmt(sal.ariel)}</span></div>}
            {sal.note && <div style={{ fontSize: 11, color: '#9b6b8a', marginTop: 5 }}>📝 {sal.note}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── CARRYOVER in Goals tab for now ────────────────────────────
// NEW: Carryover management per period
function GoalsTab({ state, setState, showToast }) {
  const [goal, setGoal] = useState({ name: '', icon: '🎯', target: '', saved: '' })

  const addGoal = () => {
    if (!goal.name || !goal.target) return showToast('⚠️ Name and target required')
    const g = { id: Date.now(), name: goal.name, icon: goal.icon, target: parseFloat(goal.target), saved: parseFloat(goal.saved)||0 }
    setState(s => ({ ...s, goals: [...(s.goals||[]), g] }))
    setGoal({ name:'',icon:'🎯',target:'',saved:'' }); showToast('🎯 Goal added!')
  }

  const addToGoal = (id, amt) => {
    setState(s => ({
      ...s,
      goals: (s.goals||[]).map(g => g.id === id ? { ...g, saved: Math.min(g.target, (g.saved||0)+amt) } : g)
    }))
    showToast('✅ Saved!')
  }

  const delGoal = (id) => {
    setState(s => ({ ...s, goals: (s.goals||[]).filter(g => g.id !== id) }))
  }

  // NEW: Carryover settings per period
  const setCarryover = (periodId, field, value) => {
    setState(s => ({
      ...s,
      carryover: {
        ...s.carryover,
        [periodId]: { ...(s.carryover[periodId]||{}), [field]: value }
      }
    }))
  }

  return (
    <div>
      {/* NEW: CARRYOVER SECTION */}
      <div className="card-box" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🔄 Carryover Settings</div>
        <p style={{ fontSize: 12, color: '#9b6b8a', marginBottom: 12 }}>Remaining balance from each period can carry into the next. Toggle or manually set the amount below.</p>
        {state.periods.map((p, i) => {
          if (i === 0) return null // first period has no previous
          const co = state.carryover[p.id] || {}
          const useCarry = co.use !== false
          return (
            <div key={p.id} style={{ background: useCarry ? '#eaf3ee' : '#f6f2ec', border: `1px solid ${useCarry ? '#9ecab0' : '#e8e2d8'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: useCarry ? 8 : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, color: '#9b6b8a' }}>{useCarry ? 'On' : 'Off'}</span>
                  <div onClick={() => setCarryover(p.id, 'use', !useCarry)}
                    style={{ width: 36, height: 20, borderRadius: 10, background: useCarry ? '#3a6b4e' : '#e8e2d8', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: useCarry ? 18 : 3, transition: 'left .2s' }}></div>
                  </div>
                </label>
              </div>
              {useCarry && (
                <div>
                  <div style={{ fontSize: 11, color: '#3a6b4e', marginBottom: 5 }}>Manual override (leave blank = auto-calculated)</div>
                  <input type="number" placeholder="Auto-calculated"
                    value={co.amt != null ? co.amt : ''}
                    onChange={e => setCarryover(p.id, 'amt', e.target.value === '' ? null : parseFloat(e.target.value))}
                    style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* SAVINGS GOALS */}
      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🎯 Add Savings Goal</div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, marginBottom: 8 }}>
          <InputRow label="Icon"><input value={goal.icon} onChange={e => setGoal(g=>({...g,icon:e.target.value}))} style={inputStyle} /></InputRow>
          <InputRow label="Goal Name"><input value={goal.name} onChange={e => setGoal(g=>({...g,name:e.target.value}))} placeholder="e.g. Emergency Fund" style={inputStyle} /></InputRow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputRow label="Target ($)"><input type="number" value={goal.target} onChange={e => setGoal(g=>({...g,target:e.target.value}))} placeholder="0.00" style={inputStyle} /></InputRow>
          <InputRow label="Already Saved ($)"><input type="number" value={goal.saved} onChange={e => setGoal(g=>({...g,saved:e.target.value}))} placeholder="0.00" style={inputStyle} /></InputRow>
        </div>
        <button onClick={addGoal} style={{ ...btnStyle('#db2777','#fff'), width:'100%', marginTop:10, padding:'10px 0' }}>+ Add Goal</button>
      </div>

      {(state.goals||[]).map(g => {
        const pct = g.target > 0 ? Math.min(100, (g.saved||0)/g.target*100) : 0
        const left = g.target - (g.saved||0)
        const done = pct >= 100
        const [adding, setAdding] = useState(false)
        const [addAmt, setAddAmt] = useState('')
        return (
          <div key={g.id} style={{ background: done ? '#eaf3ee' : '#fff', border: `1px solid ${done ? '#9ecab0' : '#fce7f3'}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{g.icon} {g.name} {done && <span style={{ background: '#eaf3ee', color: '#3a6b4e', fontSize: 11, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>✓ Done!</span>}</div>
                <div style={{ fontSize: 12, color: '#9b6b8a', marginTop: 2 }}>Target: ${fmt(g.target)}</div>
              </div>
              <button onClick={() => delGoal(g.id)} style={{ background: 'none', border: 'none', color: '#c8c0b4', fontSize: 16, cursor: 'pointer' }}>🗑</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span>Saved: <strong style={{ color: '#3a6b4e' }}>${fmt(g.saved||0)}</strong></span>
              <span style={{ color: '#9b6b8a' }}>${fmt(left)} left</span>
            </div>
            <ProgBar pct={pct} color={done ? '#3a6b4e' : '#db2777'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9b6b8a', marginTop: 3, marginBottom: 10 }}>
              <span>{pct.toFixed(0)}% complete</span>
              {!done && <span>~${fmt(left/2)}/period</span>}
            </div>
            {!done && (
              adding ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="Amount" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} autoFocus />
                  <button onClick={() => { addToGoal(g.id, parseFloat(addAmt)||0); setAdding(false); setAddAmt('') }} style={btnStyle('#3a6b4e','#fff')}>+ Add</button>
                  <button onClick={() => setAdding(false)} style={btnStyle('#f6f2ec','#4a2040')}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} style={{ ...btnStyle('#eaf3ee','#3a6b4e'), width: '100%', border: '1px solid #9ecab0' }}>+ Add to Savings</button>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ state, setState, showToast }) {
  const [newPeriod, setNewPeriod] = useState({ label:'',start:'',end:'',payday:'',salary:'2000' })
  const [newSrc, setNewSrc]       = useState('')
  const [newType, setNewType]     = useState('')

  const addPeriod = () => {
    if (!newPeriod.label || !newPeriod.payday) return showToast('⚠️ Label and payday required')
    const p = { id: 'p' + Date.now(), ...newPeriod, salary: parseFloat(newPeriod.salary)||2000 }
    setState(s => ({ ...s, periods: [...s.periods, p] }))
    setNewPeriod({ label:'',start:'',end:'',payday:'',salary:'2000' })
    showToast('✅ Pay period added!')
  }

  const delPeriod = (id) => {
    if (state.periods.length <= 1) return showToast('⚠️ Need at least one period')
    setState(s => ({ ...s, periods: s.periods.filter(p => p.id !== id), activePeriodId: s.activePeriodId === id ? s.periods[0].id : s.activePeriodId }))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `budgetsbloom-backup-${today()}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    showToast('📥 Backup downloaded!')
  }

  const resetAll = () => {
    if (!window.confirm('⚠️ This will delete ALL your data. Are you sure?')) return
    if (!window.confirm('Last chance — reset everything?')) return
    setState(DEFAULT_STATE())
    showToast('✅ Data cleared')
  }

  return (
    <div>
      {/* PAY PERIODS */}
      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📅 Pay Periods</div>
        {state.periods.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #fce7f3', fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{p.label}</span>
              <span style={{ color: '#9b6b8a', marginLeft: 8, fontSize: 11 }}>Payday {p.payday}</span>
            </div>
            <button onClick={() => delPeriod(p.id)} style={{ background: 'none', border: 'none', color: '#c8c0b4', cursor: 'pointer', fontSize: 14 }}>🗑</button>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#9b6b8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>+ Add Period</div>
          <InputRow label="Label (e.g. Jun 1–15)"><input value={newPeriod.label} onChange={e => setNewPeriod(p=>({...p,label:e.target.value}))} placeholder="Jun 1–15" style={inputStyle} /></InputRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputRow label="Start Date"><input type="date" value={newPeriod.start} onChange={e => setNewPeriod(p=>({...p,start:e.target.value}))} style={inputStyle} /></InputRow>
            <InputRow label="End Date"><input type="date" value={newPeriod.end} onChange={e => setNewPeriod(p=>({...p,end:e.target.value}))} style={inputStyle} /></InputRow>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputRow label="Payday"><input type="date" value={newPeriod.payday} onChange={e => setNewPeriod(p=>({...p,payday:e.target.value}))} style={inputStyle} /></InputRow>
            <InputRow label="Default Salary ($)"><input type="number" value={newPeriod.salary} onChange={e => setNewPeriod(p=>({...p,salary:e.target.value}))} placeholder="2000" style={inputStyle} /></InputRow>
          </div>
          <button onClick={addPeriod} style={{ ...btnStyle('#db2777','#fff'), width:'100%', marginTop: 8, padding:'9px 0' }}>+ Add Period</button>
        </div>
      </div>

      {/* CUSTOM DROPDOWNS */}
      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>💳 Custom Payment Sources</div>
        {(state.customPaySources||[]).map((src,i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #fce7f3' }}>
            <span>{src}</span>
            <button onClick={() => setState(s => ({ ...s, customPaySources: s.customPaySources.filter((_,j)=>j!==i) }))} style={{ background: 'none', border: 'none', color: '#c8c0b4', cursor: 'pointer' }}>🗑</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={newSrc} onChange={e => setNewSrc(e.target.value)} placeholder="e.g. TD Chequing, GCash" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          <button onClick={() => { if (newSrc.trim()) { setState(s => ({ ...s, customPaySources: [...(s.customPaySources||[]), newSrc.trim()] })); setNewSrc(''); showToast('✅ Added!') } }} style={btnStyle('#db2777','#fff')}>Add</button>
        </div>
      </div>

      <div className="card-box" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🔄 Custom Pay Types</div>
        {(state.customPayTypes||[]).map((t,i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #fce7f3' }}>
            <span>{t}</span>
            <button onClick={() => setState(s => ({ ...s, customPayTypes: s.customPayTypes.filter((_,j)=>j!==i) }))} style={{ background: 'none', border: 'none', color: '#c8c0b4', cursor: 'pointer' }}>🗑</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="e.g. GCash, Interac" style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          <button onClick={() => { if (newType.trim()) { setState(s => ({ ...s, customPayTypes: [...(s.customPayTypes||[]), newType.trim()] })); setNewType(''); showToast('✅ Added!') } }} style={btnStyle('#db2777','#fff')}>Add</button>
        </div>
      </div>

      {/* TOOLS */}
      <div className="card-box">
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>⚙️ Data & Tools</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={exportData} style={{ ...btnStyle('#eaf3ee','#3a6b4e'), border: '1px solid #9ecab0', padding: '10px 0', width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }}>📥 Export / Download Backup (JSON)</button>
          <button onClick={resetAll} style={{ ...btnStyle('#fdf3f3','#c24b1a'), border: '1px solid #edbc9e', padding: '10px 0', width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }}>🗑 Reset All Data</button>
        </div>
      </div>
    </div>
  )
}

// ── SHARED UI COMPONENTS ──────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(24,20,15,.65)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 16px 60px rgba(24,20,15,.2)' }}>
        <h3 style={{ fontFamily: 'serif', fontSize: 18, marginBottom: 14 }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function ProgBar({ pct, color }) {
  const col = color || (pct > 80 ? '#c24b1a' : pct > 60 ? '#a67c20' : '#3a6b4e')
  return (
    <div style={{ height: 7, background: '#e8e2d8', borderRadius: 4, overflow: 'hidden', margin: '5px 0' }}>
      <div style={{ height: '100%', borderRadius: 4, background: col, width: `${pct}%`, transition: 'width .5s' }}></div>
    </div>
  )
}

function InputRow({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9a9088', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

// ── SHARED STYLES ─────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '9px 11px', background: '#f6f2ec', border: '1.5px solid #e8e2d8',
  borderRadius: 8, fontFamily: "'Nunito',sans-serif", fontSize: 14, color: '#18140f',
  WebkitAppearance: 'none', marginBottom: 0,
}
const pnavBtn = {
  background: '#fff', border: '1.5px solid #fce7f3', borderRadius: 8, padding: '7px 14px',
  fontSize: 16, fontWeight: 700, color: '#9b6b8a', cursor: 'pointer', flexShrink: 0,
  fontFamily: "'Nunito',sans-serif",
}
const btnStyle = (bg, col) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '9px 16px', border: 'none', borderRadius: 8,
  fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13,
  background: bg, color: col, cursor: 'pointer', transition: 'all .15s',
})

// Inject global card-box style
const style = document.createElement('style')
style.textContent = `
  .card-box { background:#fff; border:1px solid #fce7f3; border-radius:13px; padding:16px; margin-bottom:12px; box-shadow:0 2px 12px rgba(219,39,119,.06); }
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
`
document.head.appendChild(style)

// ── BOOT ──────────────────────────────────────────────────────
initSync().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
