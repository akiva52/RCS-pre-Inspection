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
      setCustomIssues(custom.filter(i => i.item_type !== 'space_type').map(i => i.value))
    }
  }
 
  function getIssueList() {
    if (!issue) return []
    const base = issue.category === 'Interior' ? INTERIOR_ISSUES
      : issue.category === 'Exterior' ? EXTERIOR_ISSUES
      : issue.category === 'Possible Critical Issues' ? CRITICAL_ISSUES : []
    return [...base, ...customIssues]
  }
 
  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
 
  async function handleSave() {
    if (!issueType.trim()) { alert('Please select an issue type.'); return }
    setSaving(true)
    let photoUrl = issue?.photo_url || null
 
    if (photo) {
      const ext = photo.name.split('.').pop()
      const fileName = `${uuidv4()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inspection-photos').upload(fileName, photo)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
    }
 
    const { error } = await supabase.from('issues').update({
      space_type: spaceType,
      location: location.trim(),
      issue_type: issueType.trim(),
      notes: notes.trim(),
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
              <select className="form-select" value={spaceType} onChange={e => setSpaceType(e.target.value)}>
                <option value="">Select space type...</option>
                {[...SPACE_TYPES, ...customSpaces].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
 
          <div className="form-group">
            <label className="form-label">Room / Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Room 214B" />
          </div>
 
          <div className="form-group">
            <label className="form-label">Issue</label>
            <select className="form-select" value={issueType} onChange={e => setIssueType(e.target.value)}>
              <option value="">Select issue...</option>
              {getIssueList().map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
 
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any relevant details..." />
          </div>
 
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="modal-btn cancel" style={{marginTop:'8px'}} onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </>
  )
}
