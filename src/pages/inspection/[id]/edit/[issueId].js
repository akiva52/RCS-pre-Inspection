import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../lib/supabase'
import { SPACE_TYPES, INTERIOR_ISSUES, EXTERIOR_ISSUES, CRITICAL_ISSUES } from '../../../../lib/data'
import Head from 'next/head'

export default function EditIssue() {
  const router = useRouter()
  const { id, issueId } = router.query
  const fileRef = useRef()

  const [issue, setIssue] = useState(null)
  const [spaceType, setSpaceType] = useState('')
  const [location, setLocation] = useState('')
  const [issueType, setIssueType] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [customIssues, setCustomIssues] = useState([])
  const [customSpaces, setCustomSpaces] = useState([])
  const [showCustomIssueInput, setShowCustomIssueInput] = useState(false)
  const [customIssueInput, setCustomIssueInput] = useState('')
  const [showSaveCustomIssue, setShowSaveCustomIssue] = useState(false)
  const [showCustomSpaceInput, setShowCustomSpaceInput] = useState(false)
  const [customSpaceInput, setCustomSpaceInput] = useState('')
  const [confirmedCustomSpace, setConfirmedCustomSpace] = useState('')
  const [showSaveCustomSpace, setShowSaveCustomSpace] = useState(false)

  useEffect(() => {
    if (issueId) loadIssue()
  }, [issueId])

  async function loadIssue() {
    const { data } = await supabase.from('issues').select('*').eq('id', issueId).single()
    if (data) {
      setIssue(data)
      setSpaceType(data.space_type || '')
      setLocation(data.location || '')
      setIssueType(data.issue_type || '')
      setNotes(data.notes || '')
      if (data.photo_url) setPhotoPreview(data.photo_url)
    }
    const { data: custom } = await supabase.from('custom_items').select('*')
    if (custom) {
      setCustomSpaces(custom.filter(i => i.item_type === 'space_type').map(i => i.value))
      // Load custom issues for the right category
      const catKey = data?.category === 'Interior' ? 'interior_issue'
        : data?.category === 'Exterior' ? 'exterior_issue'
        : data?.category === 'Possible Critical Issues' ? 'critical_issue'
        : 'paperwork_item'
      setCustomIssues(custom.filter(i => i.item_type === catKey).map(i => i.value))
    }
  }

  function getIssueList() {
    if (!issue) return []
    const base = issue.category === 'Interior' ? INTERIOR_ISSUES
      : issue.category === 'Exterior' ? EXTERIOR_ISSUES
      : issue.category === 'Possible Critical Issues' ? CRITICAL_ISSUES : []
    const combined = [...base, ...customIssues]
    // Make sure the current issue type is in the list even if it was custom
    if (issueType && !combined.includes(issueType)) {
      return [...combined, issueType]
    }
    return combined
  }

  function getSpaceTypeList() {
    const combined = [...SPACE_TYPES, ...customSpaces]
    // Make sure the current space type is in the list even if it was custom
    if (spaceType && !combined.includes(spaceType)) {
      return [...combined, spaceType]
    }
    return combined
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      alert('Photo is too large. Please choose a smaller photo.')
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function compressPhoto(file) {
    return new Promise((resolve, reject) => {
      try {
        const blobUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          try {
            URL.revokeObjectURL(blobUrl)
            const maxSize = 480
            let w = img.width, h = img.height
            const megapixels = (w * h) / 1000000
            const targetMax = megapixels > 10 ? 320 : megapixels > 5 ? 400 : maxSize
            if (w > targetMax || h > targetMax) {
              if (w > h) { h = Math.round(h * targetMax / w); w = targetMax }
              else { w = Math.round(w * targetMax / h); h = targetMax }
            }
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'low'
            ctx.drawImage(img, 0, 0, w, h)
            const result = canvas.toDataURL('image/jpeg', 0.35)
            ctx.clearRect(0, 0, w, h)
            canvas.width = 1; canvas.height = 1
            resolve(result)
          } catch(e) { reject(e) }
        }
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Load failed')) }
        img.src = blobUrl
      } catch(e) { reject(e) }
    })
  }

  async function handleSaveCustomIssue(permanently) {
    const val = customIssueInput.trim()
    if (permanently && val) {
      const catKey = issue.category === 'Interior' ? 'interior_issue'
        : issue.category === 'Exterior' ? 'exterior_issue'
        : issue.category === 'Possible Critical Issues' ? 'critical_issue' : 'paperwork_item'
      await supabase.from('custom_items').insert({ item_type: catKey, value: val })
      setCustomIssues(prev => [...prev, val])
    }
    setIssueType(val)
    setShowSaveCustomIssue(false)
    setShowCustomIssueInput(false)
    setCustomIssueInput('')
  }

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
    setCustomSpaceInput('')
  }

  async function handleSave() {
    if (!issueType.trim()) { alert('Please select an issue type.'); return }
    setSaving(true)
    let photoUrl = issue?.photo_url || null

    if (photo) {
      try {
        photoUrl = await compressPhoto(photo)
      } catch(e) {
        console.error('Photo compression failed:', e)
        alert('Could not process photo. Saving without it.')
      }
    }

    // If photo was removed
    if (!photo && !photoPreview) photoUrl = null

    const finalSpaceType = confirmedCustomSpace || spaceType || null

    const { error } = await supabase.from('issues').update({
      space_type: finalSpaceType,
      location: location.trim() || null,
      issue_type: issueType.trim(),
      notes: notes.trim() || null,
      photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', issueId)

    if (!error) router.push(`/inspection/${id}`)
    else { alert('Error saving. Please try again.'); setSaving(false) }
  }

  if (!issue) return <div className="app-container"><div className="loading">Loading...</div></div>

  return (
    <>
      <Head><title>Edit Issue — RCS</title></Head>
      <div className="app-container form-screen">
        <div className="back-bar">
          <button className="back-btn" onClick={() => router.back()}>←</button>
          <span className="back-title">Edit Issue</span>
        </div>

        {issue.category === 'Interior' && (
          <div className="lock-bar">
            <span className="lock-label">In:</span>
            {issue.wing && <div className="lock-pill"><div className="lock-dot" />{issue.wing}</div>}
            {issue.floor && <div className="lock-pill"><div className="lock-dot" />{issue.floor}</div>}
          </div>
        )}

        <div className="form-body">
          {issue.category === 'Interior' && (
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
                  <button onClick={() => { setConfirmedCustomSpace(''); setCustomSpaceInput('') }}
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
                  {getSpaceTypeList().map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">+ Other (Custom)</option>
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Room / Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Room 214B" />
          </div>

          <div className="form-group">
            <label className="form-label">Issue</label>
            {showCustomIssueInput ? (
              <div>
                <input className="form-input" value={customIssueInput}
                  onChange={e => setCustomIssueInput(e.target.value)}
                  placeholder="Describe the issue..." autoFocus />
                <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                  <button className="save-btn" style={{flex:1, padding:'10px', fontSize:'12px'}}
                    onClick={() => setShowSaveCustomIssue(true)}>
                    Use This
                  </button>
                  <button className="modal-btn cancel" style={{flex:1, padding:'10px', fontSize:'12px'}}
                    onClick={() => { setShowCustomIssueInput(false); setCustomIssueInput('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select className="form-select" value={issueType} onChange={e => {
                if (e.target.value === '__custom__') setShowCustomIssueInput(true)
                else setIssueType(e.target.value)
              }}>
                <option value="">Select issue...</option>
                {getIssueList().map(i => <option key={i} value={i}>{i}</option>)}
                <option value="__custom__">+ Other (Custom)</option>
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any relevant details..." />
          </div>

          <div className="form-group">
            <label className="form-label">Photo (optional)</label>
            <input type="file" accept="image/jpeg,image/jpg,image/png" capture="environment"
              ref={fileRef} style={{display:'none'}} onChange={handlePhotoChange} />
            {photoPreview ? (
              <div>
                <img src={photoPreview} className="photo-preview" alt="Preview" />
                <button className="modal-btn cancel" style={{marginTop:'8px', fontSize:'11px'}}
                  onClick={() => { setPhoto(null); setPhotoPreview(null) }}>Remove Photo</button>
              </div>
            ) : (
              <div className="photo-btn" onClick={() => fileRef.current?.click()}>
                📷 &nbsp; Tap to take or upload photo
              </div>
            )}
          </div>

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </div>

        {/* CUSTOM ISSUE SAVE MODAL */}
        {showSaveCustomIssue && (
          <div className="modal-overlay">
            <div className="modal-sheet">
              <div className="modal-title">Save "{customIssueInput}" permanently?</div>
              <p style={{fontSize:'13px', color:'var(--muted)', marginBottom:'16px', lineHeight:'1.5'}}>
                Add this to your dropdown list for future inspections.
              </p>
              <button className="save-btn" onClick={() => handleSaveCustomIssue(true)}>Yes — Add to my list</button>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => handleSaveCustomIssue(false)}>No — Just use it this once</button>
            </div>
          </div>
        )}

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
      </div>
    </>
  )
}
