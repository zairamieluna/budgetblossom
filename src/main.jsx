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

async function supabaseSave(appState) {
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
          data: { budgetsbloom: JSON.stringify(appState) },
          updated_at: new Date().toISOString(),
        }),
      }
    )
  } catch (e) {
    console.warn('Supabase save failed:', e)
  }
}

async function initSync() {
  // ALWAYS load from Supabase first — cloud is always the source of truth
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
    // Nothing in cloud yet — push whatever local data exists up
    const localRaw = window.localStorage.getItem('budgetsbloom')
    if (localRaw) {
      console.log('No cloud data — pushing local to cloud')
      await supabaseSave(JSON.parse(localRaw))
    }
  }

  // Watch for app state changes and save to Supabase
  const _originalSetItem = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (key, value) {
    _originalSetItem(key, value)
    if (key === 'budgetsbloom') {
      clearTimeout(window._supabaseSaveTimer)
      window._supabaseSaveTimer = setTimeout(() => {
        try {
          const state = JSON.parse(value)
          supabaseSave(state)
          console.log('💾 Saved to cloud')
        } catch {}
      }, 1500)
    }
  }

  // Save immediately when app is backgrounded (closing iPhone app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const raw = window.localStorage.getItem('budgetsbloom')
      if (raw) {
        try { supabaseSave(JSON.parse(raw)) } catch {}
      }
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
