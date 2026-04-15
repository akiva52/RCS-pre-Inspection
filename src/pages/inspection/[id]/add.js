import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import { SPACE_TYPES, INTERIOR_ISSUES, EXTERIOR_ISSUES, CRITICAL_ISSUES } from '../../../lib/data'
import Head from 'next/head'

export default function AddIssue() {
  const router = useRouter()
  const { id, category, wing, floor } = router.query

  // ── ROOM-LEVEL STATE (set once per room) ──
  const [spaceType, setSpaceType] = useState('')
  const [location, setLocation] = useState('')
  const [confirmedCustomSpace, setConfirmedCustomSpace] = useState('')
  const [customSpaceInput, setCustomSpaceInput] = useState('')
  const [showCustomSpaceInput, setShowCustomSpaceInput] = useState(false)
  const [showSaveCustomSpace, setShowSaveCustomSpace] = useState(false)

  // ── ISSUE LIST STATE (multiple per room) ──
  const [issueList, setIssueList] = useState([])

  // ── CURRENT ISSUE BEING BUILT ──
  const [currentIssueType, setCurrentIssueType] = useState('')
  const [currentCustomIssue, setCurrentCustomIssue] = useState('')
  const [currentNotes, setCurrentNotes] = useState('')
  const [currentPhoto, setCurrentPhoto] = useState(null)
  const [currentPhotoPreview, setCurrentPhotoPreview] = useState(null)
  const [showAddIssueForm, setShowAddIssueForm] = useState(true)
  const [showSaveCustomIssue, setShowSaveCustomIssue] = useState(false)

  // ── GLOBAL STATE ──
  const [customSpaces, setCustomSpaces] = useState([])
  const [customIssues, setCustomIssues] = useState([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (id && category) {
      loadCustomItems()
      // Restore last used space type
      if (category === 'Interior') {
        const lastSpace = sessionStorage.getItem('rcs_last_space_type')
        if (lastSpace) setSpaceType(lastSpace)
      }
    }
  }, [id, category])

  async function loadCustomItems() {
    const { data } = await supabase.from('custom_items').select('*')
    if (data) {
      setCustomSpaces(data.filter(i => i.item_type === 'space_type').map(i => i.value))
      setCustomIssues(data.filter(i => i.item_type === getIssueTypeKey()).map(i => i.value))
    }
  }

  function getIssueTypeKey() {
    if (category === 'Interior') return 'interior_issue'
    if (category === 'Exterior') return 'exterior_issue'
    if (category === 'Possible Critical Issues') return 'critical_issue'
    return 'paperwork_item'
  }

  function getIssueOptions() {
    const base =
      category === 'Interior' ? INTERIOR_ISSUES :
      category === 'Exterior' ? EXTERIOR_ISSUES :
      category === 'Possible Critical Issues' ? CRITICAL_ISSUES : []
    return [...base, ...customIssues]
  }

  function getFinalSpaceType() {
    return confirmedCustomSpace || spaceType
  }

  // ── PHOTO HANDLER ──
  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setCurrentPhoto(file)
    setCurrentPhotoPreview(URL.createObjectURL(file))
  }

  async function compressPhoto(file) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxSize = 800
          let w = img.width, h = img.height
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
            else { w = Math.round(w * maxSize / h); h = maxSize }
          }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    })
  }

  // ── ADD ISSUE TO BATCH ──
  async function handleAddIssueToBatch() {
    const issueVal = currentIssueType === '__custom__' ? currentCustomIssue.trim() : currentIssueType
    if (!issueVal) { alert('Please select or enter an issue.'); return }

    // If custom issue, ask about saving permanently
    if (currentIssueType === '__custom__' && currentCustomIssue.trim()) {
      setShowSaveCustomIssue(true)
      return
    }

    await addIssueToBatch(issueVal, false)
  }

  async function addIssueToBatch(issueVal, saveCustomPermanently) {
    if (saveCustomPermanently && issueVal) {
      await supabase.from('custom_items').insert({ item_type: getIssueTypeKey(), value: issueVal })
      setCustomIssues(prev => [...prev, issueVal])
    }
    setShowSaveCustomIssue(false)

    // Compress photo if present
    let photoUrl = null
    if (currentPhoto) {
      photoUrl = await compressPhoto(currentPhoto)
    }

    const newIssue = {
      tempId: Date.now(),
      issue_type: issueVal,
      notes: currentNotes.trim(),
      photo_url: photoUrl,
      photo_preview: currentPhotoPreview,
    }

    setIssueList(prev => [...prev, newIssue])

    // Reset issue form for next issue
    setCurrentIssueType('')
    setCurrentCustomIssue('')
    setCurrentNotes('')
    setCurrentPhoto(null)
    setCurrentPhotoPreview(null)
  }

  function removeIssueFromBatch(tempId) {
    setIssueList(prev => prev.filter(i => i.tempId !== tempId))
  }

  // ── SAVE ALL ISSUES ──
  async function handleSaveAll() {
    // If there's an issue in the form that hasn't been added to the list yet, add it first
    let finalList = [...issueList]
    const formIssueVal = currentIssueType === '__custom__' ? currentCustomIssue.trim() : currentIssueType
    if (formIssueVal) {
      let photoUrl = null
      if (currentPhoto) photoUrl = await compressPhoto(currentPhoto)
      finalList = [...finalList, {
        tempId: Date.now(),
        issue_type: formIssueVal,
        notes: currentNotes.trim(),
        photo_url: photoUrl,
      }]
    }

    if (finalList.length === 0) { alert('Please add at least one issue.'); return }
    setSaving(true)

    const finalSpaceType = getFinalSpaceType()

    // Remember last used space type
    if (category === 'Interior' && finalSpaceType) {
      sessionStorage.setItem('rcs_last_space_type', finalSpaceType)
    }

    try {
      // Insert all issues at once
      const rows = finalList.map(issue => ({
        inspection_id: id,
        category: category,
        wing: category === 'Interior' ? wing : null,
        floor: category === 'Interior' ? floor : null,
        space_type: category === 'Interior' ? (finalSpaceType || null) : null,
        location: location.trim() || null,
        issue_type: issue.issue_type,
        notes: issue.notes || null,
        photo_url: issue.photo_url || null,
      }))

      const { error } = await supabase.from('issues').insert(rows)

      if (error) {
        alert('Error saving issues. Please try again.')
        setSaving(false)
        return
      }

      // Update issue count
      const { data: existing } = await supabase
        .from('inspections').select('issue_count').eq('id', id).single()
      await supabase.from('inspections')
        .update({ issue_count: (existing?.issue_count || 0) + rows.length })
        .eq('id', id)

      router.back()
    } catch (e) {
      alert('Error saving issues. Please try again.')
      setSaving(false)
    }
  }

  // ── CUSTOM SPACE HANDLERS ──
  async function handleSaveCustomSpace(permanently) {
    const val = customSpaceInput.trim()
    if (permanently && val) {
      await supabase.from('custom_items').insert({ item_type: 'space_type', value: val })
      setCustomSpaces(prev => [...prev, val])
    }
    setConfirmedCustomSpace(val)
    setSpaceType(val)
    setShowSaveCustomSpace(false)
    setShowCustomSpaceInput(false)
  }

  const allSpaceTypes = [...SPACE_TYPES, ...customSpaces]
  const issueOptions = getIssueOptions()

  return (
    <>
      <Head><title>Add Issues — RCS</title></Head>
      <div className="app-container form-screen">
        <div className="back-bar">
          <button className="back-btn" onClick={() => router.back()}>←</button>
          <span className="back-title">Add {category} Issues</span>
        </div>

        {/* LOCKED WING/FLOOR */}
        {category === 'Interior' && (
          <div className="lock-bar">
            <span className="lock-label">In:</span>
            <div className="lock-pill"><div className="lock-dot" />{wing}</div>
            <div className="lock-pill"><div className="lock-dot" />{floor}</div>
          </div>
        )}

        <div className="form-body">

          {/* ── ROOM INFO (set once) ── */}
          {category === 'Interior' && (
            <div className="form-group">
              <label className="form-label">Space Type</label>
              {showCustomSpaceInput ? (
                <div>
                  <input className="form-input" value={customSpaceInput}
                    onChange={e => setCustomSpaceInput(e.target.value)}
                    placeholder="Type custom space type..." autoFocus />
                  <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                    <button className="save-btn" style={{flex:1, padding:'10px', fontSize:'12px'}}
                      onClick={() => { setConfirmedCustomSpace(customSpaceInput.trim()); setShowSaveCustomSpace(true) }}>
                      Use This
                    </button>
                    <button className="modal-btn cancel" style={{flex:1, padding:'10px', fontSize:'12px'}}
                      onClick={() => { setShowCustomSpaceInput(false); setCustomSpaceInput('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : confirmedCustomSpace ? (
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div style={{flex:1, background:'var(--white)', border:'1px solid var(--border)', borderRadius:'10px', padding:'11px 13px', fontSize:'13px', color:'var(--dark)', fontWeight:'500'}}>
                    {confirmedCustomSpace}
                  </div>
                  <button onClick={() => { setConfirmedCustomSpace(''); setSpaceType(''); setCustomSpaceInput('') }}
                    style={{background:'none', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 12px', fontSize:'12px', color:'var(--muted)', cursor:'pointer'}}>
                    Change
                  </button>
                </div>
              ) : (
                <select className="form-select" value={spaceType} onChange={e => {
                  if (e.target.value === '__custom__') setShowCustomSpaceInput(true)
                  else setSpaceType(e.target.value)
                }}>
                  <option value="">Select space type...</option>
                  {allSpaceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">+ Other (Custom)</option>
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Room / Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder={category === 'Interior' ? 'e.g. Room 223' : 'e.g. Front Entrance'} />
          </div>

          <div style={{height:'1px', background:'var(--border)', margin:'4px 0 16px'}} />

          {/* ── ISSUES ADDED SO FAR ── */}
          {issueList.length > 0 && (
            <div style={{marginBottom:'16px'}}>
              <div className="form-label" style={{marginBottom:'8px'}}>
                Issues added ({issueList.length}):
              </div>
              {issueList.map((issue, idx) => (
                <div key={issue.tempId} style={{
                  background:'var(--white)', border:'1px solid var(--border)',
                  borderRadius:'10px', padding:'10px 12px', marginBottom:'8px',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start'
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px', fontWeight:'600', color:'var(--dark)'}}>{issue.issue_type}</div>
                    {issue.notes && <div style={{fontSize:'11px', color:'var(--muted)', marginTop:'2px'}}>{issue.notes}</div>}
                    {issue.photo_url && <span className="photo-tag" style={{marginTop:'4px'}}>📷 photo</span>}
                  </div>
                  <button onClick={() => removeIssueFromBatch(issue.tempId)}
                    style={{background:'none', border:'none', color:'#c0392b', fontSize:'16px', cursor:'pointer', marginLeft:'8px', flexShrink:0}}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── ADD ISSUE FORM ── */}
          <div style={{background:'var(--light-gray)', borderRadius:'12px', padding:'14px', marginBottom:'16px'}}>
            <div className="form-label" style={{marginBottom:'10px'}}>
              {issueList.length === 0 ? 'Add issue:' : 'Add another issue:'}
            </div>

            <div className="form-group">
              <label className="form-label">Issue</label>
              {currentIssueType === '__custom__' ? (
                <div>
                  <input className="form-input" value={currentCustomIssue}
                    onChange={e => setCurrentCustomIssue(e.target.value)}
                    placeholder="Describe the issue..." autoFocus />
                  <button className="modal-btn cancel" style={{marginTop:'6px', padding:'8px', fontSize:'11px'}}
                    onClick={() => { setCurrentIssueType(''); setCurrentCustomIssue('') }}>
                    ← Back to list
                  </button>
                </div>
              ) : (
                <select className="form-select" value={currentIssueType}
                  onChange={e => { setCurrentIssueType(e.target.value); setCurrentCustomIssue('') }}>
                  <option value="">Select issue...</option>
                  {issueOptions.map(i => <option key={i} value={i}>{i}</option>)}
                  <option value="__custom__">+ Other (Custom)</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" value={currentNotes}
                onChange={e => setCurrentNotes(e.target.value)}
                placeholder="Add any relevant details..." />
            </div>

            <div className="form-group">
              <label className="form-label">Photo (optional)</label>
              <input type="file" accept="image/*" capture="environment" ref={fileRef}
                style={{display:'none'}} onChange={handlePhotoChange} />
              {currentPhotoPreview ? (
                <div>
                  <img src={currentPhotoPreview} className="photo-preview" alt="Preview" />
                  <button className="modal-btn cancel" style={{marginTop:'8px', fontSize:'11px'}}
                    onClick={() => { setCurrentPhoto(null); setCurrentPhotoPreview(null) }}>
                    Remove Photo
                  </button>
                </div>
              ) : (
                <div className="photo-btn" onClick={() => fileRef.current?.click()}>
                  📷 &nbsp; Tap to take or upload photo
                </div>
              )}
            </div>

            <button
              onClick={handleAddIssueToBatch}
              style={{
                width:'100%', background:'var(--slate)', color:'white', border:'none',
                borderRadius:'24px', padding:'12px', fontSize:'13px', fontWeight:'500',
                fontFamily:'var(--font)', cursor:'pointer'
              }}>
              + Add to List
            </button>
          </div>

          {/* ── SAVE ALL BUTTON ── */}
          <button className="save-btn" onClick={handleSaveAll}
            disabled={saving || (issueList.length === 0 && !currentIssueType)}
            style={{opacity: (issueList.length === 0 && !currentIssueType) ? 0.4 : 1}}>
            {saving ? 'Saving...' : (() => {
              const formHas = (currentIssueType && currentIssueType !== '__custom__') || (currentIssueType === '__custom__' && currentCustomIssue.trim())
              const total = issueList.length + (formHas ? 1 : 0)
              return `Save ${total} Issue${total !== 1 ? 's' : ''}`
            })()}
          </button>

          {issueList.length === 0 && !currentIssueType && (
            <div style={{textAlign:'center', fontSize:'11px', color:'var(--muted)', marginTop:'8px'}}>
              Select an issue above to save
            </div>
          )}

          <button className="btn-ghost" onClick={() => router.back()}>Cancel</button>
        </div>

        {/* CUSTOM SPACE SAVE MODAL */}
        {showSaveCustomSpace && (
          <div className="modal-overlay">
            <div className="modal-sheet">
              <div className="modal-title">Save "{customSpaceInput}" permanently?</div>
              <p style={{fontSize:'13px', color:'var(--muted)', marginBottom:'16px', lineHeight:'1.5'}}>
                Add this space type to your list for future inspections.
              </p>
              <button className="save-btn" onClick={() => handleSaveCustomSpace(true)}>Yes — Add to my list</button>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => handleSaveCustomSpace(false)}>No — Just use it this once</button>
            </div>
          </div>
        )}

        {/* CUSTOM ISSUE SAVE MODAL */}
        {showSaveCustomIssue && (
          <div className="modal-overlay">
            <div className="modal-sheet">
              <div className="modal-title">Save "{currentCustomIssue}" permanently?</div>
              <p style={{fontSize:'13px', color:'var(--muted)', marginBottom:'16px', lineHeight:'1.5'}}>
                Add this to your dropdown list for future inspections.
              </p>
              <button className="save-btn" onClick={() => addIssueToBatch(currentCustomIssue.trim(), true)}>Yes — Add to my list</button>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => addIssueToBatch(currentCustomIssue.trim(), false)}>No — Just use it this once</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
