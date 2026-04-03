import '../styles/globals.css'
import { useState, useEffect } from 'react'
import PinLogin from '../components/PinLogin'

const SESSION_KEY = 'orangs_unlocked'
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours

export default function MyApp({ Component, pageProps }) {
  // Start locked — PIN screen shows immediately, no blank flash
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    // After mount, skip PIN if already unlocked this session
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
  }, [])

  function handleUnlock() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }))
    } catch (e) {}
    setUnlocked(true)
  }

  if (!unlocked) return <PinLogin onUnlock={handleUnlock} />
  return <Component {...pageProps} />
}
