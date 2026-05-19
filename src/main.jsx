import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// ── Supabase config ──────────────────────────────────────────
const SUPABASE_URL = 'https://njdivqtxzjuorlueqxrf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZGl2cXR4emp1b3JsdWVxeHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDU5MTEsImV4cCI6MjA5NDc4MTkxMX0.I4PUAdJctFalUe_HMMP9jzXiq7YWdmCVbsLjbMP4pr4'

// Tiny Supabase REST helper (no npm package needed)
const USER_ID = 'zaira-ariel' // shared ID so both of you see same data

async function supabaseGet() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}&select=data`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )
    const rows = await res.json()
    if (rows && rows.length > 0 && rows[0].data) {
      return rows[0].data
    }
    return null
  } catch (e) {
    console.warn('Supabase get failed:', e)
    return null
  }
}

async function supabaseSet(data) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: USER_ID, data, updated_at: new Date().toISOString() }),
    })
  } catch (e) {
    console.warn('Supabase set failed:', e)
  }
}

// ── Sync localStorage ↔ Supabase ─────────────────────────────
async function initSync() {
  // 1. Load from Supabase and merge into localStorage
  const cloudData = await supabaseGet()
  if (cloudData) {
    Object.entries(cloudData).forEach(([key, value]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
    })
  }

  // 2. Watch localStorage changes and push to Supabase
  const originalSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value)
    // Debounce saves to avoid too many requests
    clearTimeout(window._supabaseSaveTimer)
    window._supabaseSaveTimer = setTimeout(() => {
      const snapshot = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        snapshot[k] = localStorage.getItem(k)
      }
      supabaseSet(snapshot)
    }, 2000)
  }
}

// Init sync then render app
initSync().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
