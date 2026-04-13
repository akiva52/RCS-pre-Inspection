
import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Setup() {
  const router = useRouter()
  const [facilityName, setFacilityName] = useState('')
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [wings, setWings] = useState([])
  const [showAddWing, setShowAddWing] = useState(false)
  const [newWingName, setNewWingName] = useState('')
  const [newWingFloors, setNewWingFloors] = useState('1')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  async function handleAddressChange(val) {
    setAddress(val)
    if (val.length < 4) { setSuggestions([]); setShowSuggestions(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(val)}&countrycodes=us`)
        const data = await res.json()
        setSuggestions(data.map(d => d.display_name))
        setShowSuggestions(data.length > 0)
      } catch { setSuggestions([]); setShowSuggestions(false) }
    }, 400)
  }

  function selectSuggestion(val) {
    setAddress(val)
    setSuggestions([])
    setShowSuggestions(false)
  }

  function addWing() {
    if (!newWingName.trim()) return
    setWings([...wings, { name: newWingName.trim(), floors: parseInt(newWingFloors) || 1 }])
    setNewWingName('')
    setNewWingFloors('1')
    setShowAddWing(false)
  }

  function removeWing(idx) {
    setWings(wings.filter((_, i) => i !== idx))
  }

  async function startInspection() {
    if (!facilityName.trim()) { alert('Please enter a facility name.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('inspections').insert({
      facility_name: facilityName.trim(),
      address: address.trim(),
      inspection_date: inspectionDate,
      wings: wings,
      status: 'active',
      issue_count: 0,
    }).select().single()

    if (error) { alert('Error creating inspection. Please try again.'); setSaving(false); return }
    router.push(`/inspection/${data.id}`)
  }

  return (
    <>
      <Head><title>New Inspection — RCS</title></Head>
      <div className="app-container">
        <div className="app-header">
          <div className="header-top">
            <div className="rcs-badge">rcs</div>
            <span className="header-title">New Inspection</span>
          </div>
        </div>

        <div className="setup-screen">
          <div className="setup-title">Facility Setup</div>
          <div className="setup-sub">Enter the facility details and configure wings and floors before you start walking.</div>

          <div className="form-group">
            <label className="form-label">Facility Name *</label>
            <input className="form-input" value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="e.g. Sunrise Senior Living" />
          </div>

          <div className="form-group" style={{position:'relative'}}>
            <label className="form-label">Address</label>
            <input
              className="form-input"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Start typing address..."
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position:'absolute', top:'100%', left:0, right:0,
                background:'#fff', border:'1px solid var(--border)',
                borderRadius:'10px', zIndex:50, boxShadow:'0 4px 16px rgba(0,0,0,0.1)',
                maxHeight:'200px', overflowY:'auto'
              }}>
                {suggestions.map((s, i) => (
                  <div key={i}
                    onMouseDown={() => selectSuggestion(s)}
                    style={{
                      padding:'10px 14px', fontSize:'12px', color:'var(--text)',
                      borderBottom: i < suggestions.length-1 ? '1px solid var(--border)' : 'none',
                      cursor:'pointer', lineHeight:'1.4'
                    }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Inspection Date</label>
            <input className="form-input" type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
          </div>

          <div className="divider" />

          <div className="section-label">Wings & Floors</div>
          <div style={{marginBottom:'8px', fontSize:'12px', color:'var(--muted)'}}>
            Add each wing or section of the building and how many floors it has.
          </div>

          {wings.map((wing, idx) => (
            <div key={idx} className="wing-card">
              <div className="wing-card-left">
                <div className="wing-name">{wing.name}</div>
                <div className="wing-floors">{wing.floors} floor{wing.floors > 1 ? 's' : ''}</div>
              </div>
              <button className="wing-delete-btn" onClick={() => removeWing(idx)}>✕</button>
            </div>
          ))}

          {showAddWing ? (
            <div style={{background:'var(--white)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px', marginBottom:'8px'}}>
              <div className="form-group">
                <label className="form-label">Wing / Section Name</label>
                <input className="form-input" value={newWingName} onChange={e => setNewWingName(e.target.value)} placeholder="e.g. North Wing, Building A, Memory Care" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Floors</label>
                <select className="form-select" value={newWingFloors} onChange={e => setNewWingFloors(e.target.value)}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} floor{n>1?'s':''}</option>)}
                </select>
              </div>
              <div style={{display:'flex', gap:'8px'}}>
                <button className="save-btn" style={{flex:1}} onClick={addWing}>Add Wing</button>
                <button className="modal-btn cancel" style={{flex:1}} onClick={() => setShowAddWing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="add-wing-btn" onClick={() => setShowAddWing(true)}>+ Add Wing / Section</button>
          )}

          <div className="divider" />

          <button className="start-btn" onClick={startInspection} disabled={saving}>
            {saving ? 'Creating...' : 'Start Inspection →'}
          </button>
          <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => router.push('/')}>Cancel</button>
        </div>
      </div>
    </>
  )
}
