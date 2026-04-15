import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Head from 'next/head'

const CATEGORIES = ['Interior', 'Exterior', 'Missing Paperwork', 'Possible Critical Issues']
const CAT_SHORT = ['Interior', 'Exterior', 'Paperwork', 'Critical']

export default function Inspection() {
  const router = useRouter()
  const { id } = router.query
  const [inspection, setInspection] = useState(null)
  const [issues, setIssues] = useState([])
  const [activeCategory, setActiveCategory] = useState('Interior')
  const [activeWing, setActiveWing] = useState('')
  const [activeFloor, setActiveFloor] = useState('')
  const [loading, setLoading] = useState(true)
  const [menuIssue, setMenuIssue] = useState(null)
  const [showLocationModal, setShowLocationModal] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const { data: insp } = await supabase.from('inspections').select('*').eq('id', id).single()
    if (insp) {
      setInspection(insp)
      if (initialLoad.current && insp.wings?.length > 0) {
        const savedWing = sessionStorage.getItem('rcs_wing')
        const savedFloor = sessionStorage.getItem('rcs_floor')
        const wingExists = savedWing && insp.wings.find(w => w.name === savedWing)
        if (wingExists) {
          setActiveWing(savedWing)
          setActiveFloor(savedFloor || 'Floor 1')
        } else {
          setActiveWing(insp.wings[0].name)
          setActiveFloor('Floor 1')
          sessionStorage.setItem('rcs_wing', insp.wings[0].name)
          sessionStorage.setItem('rcs_floor', 'Floor 1')
        }
        initialLoad.current = false
      }
    }
    const { data: iss } = await supabase.from('issues').select('*').eq('inspection_id', id).order('created_at', { ascending: true })
    setIssues(iss || [])
    setLoading(false)
  }

  async function deleteIssue(issueId) {
    await supabase.from('issues').delete().eq('id', issueId)
    setIssues(issues.filter(i => i.id !== issueId))
    await updateIssueCount(issues.length - 1)
    setMenuIssue(null)
  }

  async function updateIssueCount(count) {
    await supabase.from('inspections').update({ issue_count: count }).eq('id', id)
  }

  const filteredIssues = issues.filter(i => {
    if (showSearch && searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        (i.issue_type || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q) ||
        (i.space_type || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q) ||
        (i.wing || '').toLowerCase().includes(q)
      )
    }
    return i.category === activeCategory
  })

  const currentWingObj = inspection?.wings?.find(w => w.name === activeWing)
  const floorOptions = currentWingObj
    ? Array.from({ length: currentWingObj.floors }, (_, i) => `Floor ${i + 1}`)
    : ['Floor 1']

  async function addWing() {
    if (!newWingName.trim()) return
    const newWing = { name: newWingName.trim(), floors: parseInt(newWingFloors) || 1 }
    const updatedWings = [...(inspection.wings || []), newWing]
    await supabase.from('inspections').update({ wings: updatedWings }).eq('id', id)
    setInspection({ ...inspection, wings: updatedWings })
    setNewWingName('')
    setNewWingFloors('1')
  }

  async function removeWing(wingName) {
    if (!confirm(`Remove "${wingName}"? This won't delete its issues.`)) return
    const updatedWings = inspection.wings.filter(w => w.name !== wingName)
    await supabase.from('inspections').update({ wings: updatedWings }).eq('id', id)
    setInspection({ ...inspection, wings: updatedWings })
    if (activeWing === wingName && updatedWings.length > 0) {
      setActiveWing(updatedWings[0].name)
      setActiveFloor('Floor 1')
    }
  }

  if (loading) return <div className="app-container"><div className="loading">Loading inspection...</div></div>
  if (!inspection) return <div className="app-container"><div className="loading">Inspection not found.</div></div>

  return (
    <>
      <Head><title>{inspection.facility_name} — RCS</title></Head>
      <div className="app-container">
        <div className="app-header">
          <div className="header-top">
            <div className="rcs-badge">rcs</div>
            <span className="header-title">Pre-Inspection Program</span>
          </div>
          <div className="header-sub">{inspection.facility_name} — {inspection.inspection_date}</div>
        </div>

        {/* FACILITY / LOCATION STRIP */}
        <div className="facility-strip">
          <span className="facility-name">
            {activeCategory === 'Interior' && activeWing
              ? `${activeWing}${activeFloor ? ` — ${activeFloor}` : ''}`
              : activeCategory}
          </span>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            {activeCategory === 'Interior' && (
              <button className="facility-change" onClick={() => setShowLocationModal(true)}>change</button>
            )}
            <button className="facility-change" onClick={() => setShowEditWings(true)}>+ wing</button>
            <button className="facility-change" onClick={() => router.push('/')}>← home</button>
          </div>
        </div>

        {/* LOCK BAR — only for interior */}
        {activeCategory === 'Interior' && inspection.wings?.length > 0 && (
          <div className="lock-bar">
            <span className="lock-label">In:</span>
            <button className="lock-pill" onClick={() => setShowLocationModal(true)}>
              <div className="lock-dot" />
              {activeWing || 'Select Wing'}
            </button>
            {activeWing && (
              <button className="lock-pill" onClick={() => setShowLocationModal(true)}>
                <div className="lock-dot" />
                {activeFloor || 'Select Floor'}
              </button>
            )}
          </div>
        )}

        {/* CATEGORY TABS */}
        <div className="cat-tabs">
          {CATEGORIES.map((cat, i) => (
            <button key={cat} className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}>
              {CAT_SHORT[i]}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        {showSearch && (
          <div style={{background:'var(--white)', padding:'8px 12px', borderBottom:'1px solid var(--border)', display:'flex', gap:'8px', alignItems:'center'}}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by room, issue, space type..."
              style={{flex:1, background:'var(--light-gray)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 12px', fontSize:'13px', fontFamily:'var(--font)', outline:'none'}}
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery('') }}
              style={{background:'none', border:'none', color:'var(--muted)', fontSize:'13px', cursor:'pointer', padding:'4px', fontFamily:'var(--font)'}}>
              Cancel
            </button>
          </div>
        )}

        {/* ISSUES LIST */}
        <div className="issues-body">
          {filteredIssues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No {activeCategory.toLowerCase()} issues yet.<br />Tap the button below to add one.</p>
            </div>
          ) : (
            filteredIssues.map(issue => (
              <div key={issue.id} className="issue-card">
                <div className="issue-card-top">
                  <div style={{flex:1}}>
                    <div className="issue-location">
                      {issue.wing && `${issue.wing}`}
                      {issue.floor && ` · ${issue.floor}`}
                      {issue.space_type && ` · ${issue.space_type}`}
                      {issue.location && ` · ${issue.location}`}
                    </div>
                    <div className="issue-name">{issue.issue_type}</div>
                  </div>
                  <button className="issue-menu-btn" onClick={() => setMenuIssue(issue)}>···</button>
                </div>
                {issue.notes && <div className="issue-notes">{issue.notes}</div>}
                {issue.photo_url && <span className="photo-tag">📷 photo attached</span>}
              </div>
            ))
          )}
        </div>

        {/* ADD BUTTON */}
        <div className="add-btn-wrap">
          <div style={{display:'flex', gap:'8px'}}>
            <button className="add-btn" style={{flex:1}}
              onClick={() => router.push(`/inspection/${id}/add?category=${encodeURIComponent(activeCategory)}&wing=${encodeURIComponent(activeWing)}&floor=${encodeURIComponent(activeFloor)}`)}>
              <div className="add-btn-plus">+</div>
              Add {activeCategory === 'Missing Paperwork' ? 'Paperwork' : activeCategory === 'Possible Critical Issues' ? 'Critical Issue' : activeCategory} Issue
            </button>
            <button className="add-btn" style={{width:'52px', flexShrink:0, borderRadius:'50%', padding:'0', background:'var(--mid-gray)'}}
              onClick={() => { setShowSearch(!showSearch); setSearchQuery('') }}
              title="Search">
              🔍
            </button>
            <button className="add-btn" style={{width:'52px', flexShrink:0, borderRadius:'50%', padding:'0'}}
              onClick={() => router.push(`/inspection/${id}/report`)}>
              📄
            </button>
          </div>
        </div>

        {/* LOCATION MODAL */}
        {showLocationModal && (
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Change Location</div>
              <div className="form-group">
                <label className="form-label">Wing / Section</label>
                <select className="form-select" value={activeWing} onChange={e => { setActiveWing(e.target.value); setActiveFloor('Floor 1') }}>
                  {inspection.wings?.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <select className="form-select" value={activeFloor} onChange={e => setActiveFloor(e.target.value)}>
                  {floorOptions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button className="save-btn" onClick={() => setShowLocationModal(false)}>Confirm Location</button>
            </div>
          </div>
        )}

        {/* EDIT WINGS MODAL */}
        {showEditWings && (
          <div className="modal-overlay" onClick={() => setShowEditWings(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Edit Wings & Floors</div>
              {inspection.wings?.map(w => (
                <div key={w.name} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--light-gray)', borderRadius:'10px', padding:'10px 14px', marginBottom:'8px'}}>
                  <div>
                    <div style={{fontSize:'13px', fontWeight:'600', color:'var(--dark)'}}>{w.name}</div>
                    <div style={{fontSize:'11px', color:'var(--muted)'}}>{w.floors} floor{w.floors > 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => removeWing(w.name)} style={{background:'none', border:'none', color:'#c0392b', fontSize:'16px', cursor:'pointer'}}>✕</button>
                </div>
              ))}
              <div style={{borderTop:'1px solid var(--border)', paddingTop:'12px', marginTop:'4px'}}>
                <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'8px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.06em'}}>Add New Wing</div>
                <div className="form-group">
                  <input className="form-input" value={newWingName} onChange={e => setNewWingName(e.target.value)} placeholder="Wing name e.g. East Wing" />
                </div>
                <div className="form-group">
                  <select className="form-select" value={newWingFloors} onChange={e => setNewWingFloors(e.target.value)}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} floor{n>1?'s':''}</option>)}
                  </select>
                </div>
                <button className="save-btn" onClick={addWing}>Add Wing</button>
              </div>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => setShowEditWings(false)}>Done</button>
            </div>
          </div>
        )}

        {/* ISSUE MENU MODAL */}
        {menuIssue && (
          <div className="modal-overlay" onClick={() => setMenuIssue(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{menuIssue.issue_type}</div>
              <button className="modal-btn" onClick={() => { router.push(`/inspection/${id}/edit/${menuIssue.id}`); setMenuIssue(null) }}>✏️ &nbsp; Edit Issue</button>
              <button className="modal-btn danger" onClick={() => deleteIssue(menuIssue.id)}>🗑 &nbsp; Delete Issue</button>
              <button className="modal-btn cancel" onClick={() => setMenuIssue(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
