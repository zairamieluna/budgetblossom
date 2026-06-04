import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const SUPABASE_URL = 'https://njdivqtxzjuorlueqxrf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZGl2cXR4emp1b3JsdWVxeHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDU5MTEsImV4cCI6MjA5NDc4MTkxMX0.I4PUAdJctFalUe_HMMP9jzXiq7YWdmCVbsLjbMP4pr4'
const USER_ID = 'zaira-ariel'
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }

async function initSync() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${USER_ID}&select=data`, { headers: HEADERS })
    const rows = await res.json()
    if (rows?.[0]?.data?.budgetsbloom) {
      console.log('✅ Loaded from cloud')
      localStorage.setItem('budgetsbloom', rows[0].data.budgetsbloom)
    }
  } catch (e) { console.warn('Supabase load failed:', e) }

  const _orig = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function(key, value) {
    _orig(key, value)
    if (key === 'budgetsbloom') {
      clearTimeout(window._saveTimer)
      window._saveTimer = setTimeout(() => {
        fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
          method: 'POST',
          headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: USER_ID, data: { budgetsbloom: value }, updated_at: new Date().toISOString() })
        }).catch(() => {})
      }, 1500)
    }
  }
}

initSync().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><App /></React.StrictMode>
  )
})
