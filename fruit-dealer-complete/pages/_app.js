import '../styles/globals.css'
import { useState, useEffect } from 'react'
import PinLogin from '../components/PinLogin'

const SESSION_KEY = 'orangs_unlocked'
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours

export default function MyApp({ Component, pageProps }) {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const { ts } = JSON.parse(raw)
        if (Date.now() - ts < SESSION_TTL) {
          setUnlocked(true)
        } else {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (e) {}
    setChecking(false)
  }, [])

  function handleUnlock() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }))
    setUnlocked(true)
  }

  if (checking) return null
  if (!unlocked) return <PinLogin onUnlock={handleUnlock} />
  return <Component {...pageProps} />
}
