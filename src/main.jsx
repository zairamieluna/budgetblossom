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
    await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}`,
      {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
      }
    )
  } catch (e) {
    console.warn('Supabase upsert failed:', e)
  }
}

async function initSync() {
  // ALWAYS load from Supabase first on every app open
  const cloudData = await supabaseGet()
  if (cloudData) {
    // Clear local storage first, then load cloud data
    window.localStorage.clear()
    Object.entries(cloudData).forEach(([key, value]) => {
      window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    })
  }

  // Watch for any changes and save to Supabase
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

  // Also save when user closes/leaves the app
  window.addEventListener('beforeunload', () => {
    const snapshot = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      snapshot[k] = window.localStorage.getItem(k)
    }
    supabaseUpsert(snapshot)
  })

  // Save when app goes to background on mobile
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const snapshot = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        snapshot[k] = window.localStorage.getItem(k)
      }
      supabaseUpsert(snapshot)
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
