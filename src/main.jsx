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
      `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}&select=data`,
      { headers: HEADERS }
    )
    const rows = await res.json()
    return rows && rows.length > 0 ? rows[0].data : null
  } catch (e) {
    console.warn('Supabase get failed:', e)
    return null
  }
}

async function supabaseUpsert(data) {
  try {
    // Try PATCH first (update existing row)
    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}`,
      {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
      }
    )
    // If no row existed, insert instead
    if (patch.status === 404 || patch.headers.get('content-range') === '*/0') {
      await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: USER_ID, data, updated_at: new Date().toISOString() }),
      })
    }
  } catch (e) {
    console.warn('Supabase upsert failed:', e)
  }
}

async function initSync() {
  const cloudData = await supabaseGet()
  if (cloudData) {
    Object.entries(cloudData).forEach(([key, value]) => {
      window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    })
  }

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (key, value) {
    originalSetItem(key, value)
    clearTimeout(window._supabaseSaveTimer)
    window._supabaseSaveTimer = setTimeout(() => {
      const snapshot = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        snapshot[k] = window.localStorage.getItem(k)
      }
      supabaseUpsert(snapshot)
    }, 2000)
  }
}

initSync().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
