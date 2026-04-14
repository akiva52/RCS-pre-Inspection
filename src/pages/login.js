import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const CORRECT_PIN = '5207'
const SESSION_KEY = 'rcs_auth'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours

export default function Login() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    // Check if already logged in
    const session = localStorage.getItem(SESSION_KEY)
    if (session) {
      const { timestamp } = JSON.parse(session)
      if (Date.now() - timestamp < SESSION_DURATION) {
        router.replace('/')
      }
    }
  }, [])

  function handleDigit(digit) {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    setError(false)
    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 100)
    }
  }

  function checkPin(p) {
    if (p === CORRECT_PIN) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }))
      router.replace('/')
    } else {
      setShake(true)
      setError(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  function handleDelete() {
    setPin(pin.slice(0, -1))
    setError(false)
  }

  const digits = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫']
  ]

  return (
    <>
      <Head><title>RCS Pre-Inspection</title></Head>
      <div style={{
        minHeight: '100vh', background: '#3d3c3a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: '20px'
      }}>
        {/* Logo */}
        <div style={{marginBottom: '40px', textAlign: 'center'}}>
          <div style={{
            background: '#e8e4df', color: '#2a2a2a',
            fontSize: '28px', fontWeight: '700',
            padding: '8px 18px', borderRadius: '8px',
            fontFamily: "'DM Mono', monospace",
            display: 'inline-block', marginBottom: '10px'
          }}>rcs</div>
          <div style={{color: '#c8c4be', fontSize: '13px', letterSpacing: '0.05em'}}>
            Pre-Inspection Program
          </div>
        </div>

        {/* PIN dots */}
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '12px',
          animation: shake ? 'shake 0.4s ease' : 'none'
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: `2px solid ${error ? '#e74c3c' : '#c8c4be'}`,
              background: pin.length > i ? (error ? '#e74c3c' : '#c8c4be') : 'transparent',
              transition: 'all 0.15s ease'
            }} />
          ))}
        </div>

        {/* Error message */}
        <div style={{
          height: '20px', marginBottom: '24px',
          color: '#e74c3c', fontSize: '13px',
          opacity: error ? 1 : 0, transition: 'opacity 0.2s'
        }}>
          Incorrect PIN. Try again.
        </div>

        {/* Keypad */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {digits.map((row, ri) => (
            <div key={ri} style={{display: 'flex', gap: '12px'}}>
              {row.map((d, di) => (
                <button key={di} onClick={() => {
                  if (d === '⌫') handleDelete()
                  else if (d !== '') handleDigit(d)
                }} style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: d === '' ? 'none' : '1px solid rgba(200,196,190,0.3)',
                  background: d === '' ? 'transparent' : 'rgba(255,255,255,0.08)',
                  color: '#e8e4df', fontSize: d === '⌫' ? '20px' : '24px',
                  fontWeight: '400', fontFamily: "'DM Sans', sans-serif",
                  cursor: d === '' ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                  {d}
                </button>
              ))}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-8px); }
            80% { transform: translateX(4px); }
          }
        `}</style>
      </div>
    </>
  )
}
