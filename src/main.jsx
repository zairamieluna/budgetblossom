import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

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

// TRUE upsert — creates the row if missing, updates if exists
async function supabaseUpsert(data) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/user_data`,
      {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: USER_ID,
          data,
          updated_at: new Date().toISOString(),
        }),
      }
    )
  } catch (e) {
    console.warn('Supabase upsert failed:', e)
  }
}

function getLocalSnapshot() {
  const snapshot = {}
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    snapshot[k] = window.localStorage.getItem(k)
  }
  return snapshot
}

function getLocalTimestamp() {
  return window.localStorage.getItem('_lastSaved') || '2000-01-01T00:00:00.000Z'
}

async function initSync() {
  const row = await supabaseGet()

  if (row && row.data) {
    const cloudTime = new Date(row.updated_at || 0).getTime()
    const localTime = new Date(getLocalTimestamp()).getTime()

    if (cloudTime > localTime) {
      const cloudData = row.data
      const localRaw = window.localStorage.getItem('budgetsbloom')
      const localState = localRaw ? JSON.parse(localRaw) : null
      let cloudState = null
      try {
        const v = cloudData['budgetsbloom']
        cloudState = v ? JSON.parse(typeof v === 'string' ? v : JSON.stringify(v)) : null
      } catch {}

      if (localState && cloudState) {
        // Smart merge: preserve local paid status on expenses
        const mergedExpenses = (cloudState.expenses || []).map(cloudExp => {
          const localExp = (localState.expenses || []).find(e => e.id === cloudExp.id)
          if (localExp) return { ...cloudExp, paid: localExp.paid }
          return cloudExp
        })
        const merged = { ...cloudState, expenses: mergedExpenses }
        const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
        originalSetItem('budgetsbloom', JSON.stringify(merged))
        supabaseUpsert({ ...cloudData, budgetsbloom: JSON.stringify(merged) })
      } else {
        const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
        Object.entries(cloudData).forEach(([key, value]) => {
          originalSetItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        })
      }
    } else {
      supabaseUpsert(getLocalSnapshot())
    }
  } else {
    // No cloud row yet — create it from local data
    supabaseUpsert(getLocalSnapshot())
  }

  // Watch for changes and save to Supabase
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (key, value) {
    originalSetItem(key, value)
    originalSetItem('_lastSaved', new Date().toISOString())
    clearTimeout(window._supabaseSaveTimer)
    window._supabaseSaveTimer = setTimeout(() => {
      supabaseUpsert(getLocalSnapshot())
    }, 2000)
  }

  // Save when app goes to background on mobile
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      supabaseUpsert(getLocalSnapshot())
    }
  })
}

initSync().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
