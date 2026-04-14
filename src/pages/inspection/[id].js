import { useState, useEffect } from 'react'
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
      if (insp.wings?.length > 0) {
        setActiveWing(insp.wings[0].name)
        setActiveFloor('Floor 1')
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
 
  const filteredIssues = issues.filter(i => i.category === activeCategory)
 
  const currentWingObj = inspection?.wings?.find(w => w.name === activeWing)
  const floorOptions = currentWingObj
    ? Array.from({ length: currentWingObj.floors }, (_, i) => `Floor ${i + 1}`)
    : ['Floor 1']
 
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
              <button className="facility-change" onClick={() => setShowLocationModal(true)}>change location</button>
            )}
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
