import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import { SPACE_TYPES, INTERIOR_ISSUES, EXTERIOR_ISSUES, CRITICAL_ISSUES } from '../../../lib/data'
import Head from 'next/head'
 
export default function AddIssue() {
  const router = useRouter()
  const { id, category, wing, floor } = router.query
  const fileRef = useRef()
 
  const [inspection, setInspection] = useState(null)
  const [spaceType, setSpaceType] = useState('')
  const [location, setLocation] = useState('')
  const [issueType, setIssueType] = useState('')
  const [customIssue, setCustomIssue] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [customSpaces, setCustomSpaces] = useState([])
  const [customIssues, setCustomIssues] = useState([])
  const [showSaveCustom, setShowSaveCustom] = useState(false)
  const [showSaveCustomSpace, setShowSaveCustomSpace] = useState(false)
  const [customSpaceInput, setCustomSpaceInput] = useState('')
  const [showCustomSpaceInput, setShowCustomSpaceInput] = useState(false)
 
  useEffect(() => {
    if (id) {
      loadInspection()
      loadCustomItems()
    }
  }, [id])
 
  async function loadInspection() {
    const { data } = await supabase.from('inspections').select('*').eq('id', id).single()
    setInspection(data)
  }
 
  async function loadCustomItems() {
    const { data } = await supabase.from('custom_items').select('*')
    if (data) {
      setCustomSpaces(data.filter(i => i.item_type === 'space_type').map(i => i.value))
      const issueType = getIssueTypeKey()
      setCustomIssues(data.filter(i => i.item_type === issueType).map(i => i.value))
    }
  }
 
  function getIssueTypeKey() {
    if (category === 'Interior') return 'interior_issue'
    if (category === 'Exterior') return 'exterior_issue'
    if (category === 'Possible Critical Issues') return 'critical_issue'
    return 'paperwork_item'
  }
 
  function getIssueList() {
    if (category === 'Interior') return [...INTERIOR_ISSUES, ...customIssues]
    if (category === 'Exterior') return [...EXTERIOR_ISSUES, ...customIssues]
    if (category === 'Possible Critical Issues') return [...CRITICAL_ISSUES, ...customIssues]
    return [...customIssues]
  }
 
  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
 
  function handleIssueChange(val) {
    setIssueType(val)
    if (val === '__custom__') setCustomIssue('')
    else setCustomIssue('')
  }
 
  async function saveCustomIssue(permanently) {
    const finalIssue = issueType === '__custom__' ? customIssue.trim() : issueType
    if (permanently && finalIssue) {
      await supabase.from('custom_items').insert({ item_type: getIssueTypeKey(), value: finalIssue })
    }
    setShowSaveCustom(false)
    await saveIssue(finalIssue)
  }
 
  async function saveCustomSpace(permanently) {
    if (permanently && customSpaceInput.trim()) {
      await supabase.from('custom_items').insert({ item_type: 'space_type', value: customSpaceInput.trim() })
    }
    setSpaceType(customSpaceInput.trim())
    setShowSaveCustomSpace(false)
    setShowCustomSpaceInput(false)
  }
 
  async function handleSave() {
    const finalIssue = issueType === '__custom__' ? customIssue.trim() : issueType
    if (!finalIssue) { alert('Please select or enter an issue type.'); return }
 
    if (issueType === '__custom__' && customIssue.trim()) {
      setShowSaveCustom(true)
      return
    }
    if (spaceType === '__custom__' && customSpaceInput.trim()) {
      setShowSaveCustomSpace(true)
      return
    }
    await saveIssue(finalIssue)
  }
 
  async function saveIssue(finalIssue) {
    setSaving(true)
    let photoUrl = null
 
    if (photo) {
      const ext = photo.name.split('.').pop()
      const fileName = `${uuidv4()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(fileName, photo)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
    }
 
    const finalSpaceType = spaceType === '__custom__' ? customSpaceInput.trim() : spaceType
 
    const { error } = await supabase.from('issues').insert({
      inspection_id: id,
      category: category,
      wing: category === 'Interior' ? wing : null,
      floor: category === 'Interior' ? floor : null,
      space_type: category === 'Interior' ? finalSpaceType : null,
      location: location.trim(),
      issue_type: finalIssue,
      notes: notes.trim(),
      photo_url: photoUrl,
    })
 
    if (!error) {
      const { data: existing } = await supabase.from('inspections').select('issue_count').eq('id', id).single()
      await supabase.from('inspections').update({ issue_count: (existing?.issue_count || 0) + 1 }).eq('id', id)
      router.back()
    } else {
      alert('Error saving issue. Please try again.')
      setSaving(false)
    }
  }
 
  const allSpaceTypes = [...SPACE_TYPES, ...customSpaces]
 
  return (
    <>
      <Head><title>Add Issue — RCS</title></Head>
      <div className="app-container form-screen">
        <div className="back-bar">
          <button className="back-btn" onClick={() => router.back()}>←</button>
          <span className="back-title">Add {category} Issue</span>
        </div>
 
        {/* LOCKED LOCATION for interior */}
        {category === 'Interior' && (
          <div className="lock-bar">
            <span className="lock-label">In:</span>
            <div className="lock-pill"><div className="lock-dot" />{wing}</div>
            <div className="lock-pill"><div className="lock-dot" />{floor}</div>
          </div>
        )}
 
        <div className="form-body">
          {/* SPACE TYPE — interior only */}
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
                      onClick={() => { setSpaceType('__custom__'); setShowSaveCustomSpace(true) }}>
                      Use This Space Type
                    </button>
                    <button className="modal-btn cancel" style={{flex:1, padding:'10px', fontSize:'12px'}}
                      onClick={() => { setShowCustomSpaceInput(false); setCustomSpaceInput('') }}>
                      Cancel
                    </button>
                  </div>
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
 
          {/* ROOM / LOCATION */}
          <div className="form-group">
            <label className="form-label">Room / Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder={category === 'Interior' ? 'e.g. Room 214B, Near Nurses Station' : 'e.g. Front Entrance, North Side'} />
          </div>
 
          {/* ISSUE TYPE */}
          <div className="form-group">
            <label className="form-label">Issue</label>
            {issueType === '__custom__' ? (
              <div>
                <input className="form-input" value={customIssue} onChange={e => setCustomIssue(e.target.value)}
                  placeholder="Describe the issue..." autoFocus />
                <button className="modal-btn cancel" style={{marginTop:'6px', padding:'8px', fontSize:'11px'}}
                  onClick={() => setIssueType('')}>← Back to list</button>
              </div>
            ) : (
              <select className="form-select" value={issueType} onChange={e => handleIssueChange(e.target.value)}>
                <option value="">Select issue...</option>
                {getIssueList().map(i => <option key={i} value={i}>{i}</option>)}
                <option value="__custom__">+ Other (Custom)</option>
              </select>
            )}
          </div>
 
          {/* NOTES */}
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add any relevant details..." />
          </div>
 
          {/* PHOTO */}
          <div className="form-group">
            <label className="form-label">Photo (optional)</label>
            <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{display:'none'}} onChange={handlePhotoChange} />
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
            {saving ? 'Saving...' : 'Save Issue'}
          </button>
        </div>
 
        {/* CUSTOM ISSUE SAVE MODAL */}
        {showSaveCustom && (
          <div className="modal-overlay">
            <div className="modal-sheet">
              <div className="modal-title">Save "{customIssue}" permanently?</div>
              <p style={{fontSize:'13px', color:'var(--muted)', marginBottom:'16px', lineHeight:'1.5'}}>
                Add this to your dropdown list so you can select it quickly on future inspections.
              </p>
              <button className="save-btn" onClick={() => saveCustomIssue(true)}>Yes — Add to my list</button>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => saveCustomIssue(false)}>No — Just use it this once</button>
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
              <button className="save-btn" onClick={() => saveCustomSpace(true)}>Yes — Add to my list</button>
              <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => saveCustomSpace(false)}>No — Just use it this once</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
