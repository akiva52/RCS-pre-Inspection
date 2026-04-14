import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
 
const SESSION_KEY = 'rcs_auth'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours
 
export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
 
  useEffect(() => {
    if (router.pathname === '/login') { setChecking(false); return }
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      const { timestamp } = JSON.parse(session)
      if (Date.now() - timestamp < SESSION_DURATION) {
        setChecking(false)
        return
      }
    }
    router.replace('/login')
  }, [router.pathname])
 
  if (checking && router.pathname !== '/login') return null
 
  return <Component {...pageProps} />
}
