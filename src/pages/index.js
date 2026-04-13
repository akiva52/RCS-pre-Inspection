import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
 
export default function Home() {
  const router = useRouter()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuInsp, setMenuInsp] = useState(null)
  const [deleting, setDeleting] = useState(false)
 
  useEffect(() => { loadInspections() }, [])
 
  async function loadInspections() {
    setLoading(true)
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setInspections(data || [])
    setLoading(false)
  }
 
  async function deleteInspection(id) {
    setDeleting(true)
    // Delete all issues first (cascade should handle it but let's be safe)
    await supabase.from('issues').delete().eq('inspection_id', id)
    await supabase.from('inspections').delete().eq('id', id)
    setInspections(inspections.filter(i => i.id !== id))
    setMenuInsp(null)
    setDeleting(false)
  }
 
  return (
    <>
      <Head><title>RCS Pre-Inspection</title></Head>
      <div className="app-container">
        <div className="app-header">
          <div className="header-top">
            <div className="rcs-badge">rcs</div>
            <span className="header-title">Pre-Inspection Program</span>
          </div>
          <div className="header-sub">Roselle Creative Solutions</div>
        </div>
 
        <div className="home-screen">
          <div className="home-welcome">Inspections</div>
          <div className="home-sub">Start a new inspection or continue an existing one.</div>
 
          <button className="new-inspection-btn" onClick={() => router.push('/setup')}>
            <span>+ New Inspection</span>
            <span style={{fontSize:'20px'}}>→</span>
          </button>
 
          {loading ? (
            <div className="loading">Loading inspections...</div>
          ) : inspections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No inspections yet.<br/>Tap above to start your first one.</p>
            </div>
          ) : (
            <>
              <div className="section-label">All Inspections</div>
              {inspections.map(insp => (
                <div key={insp.id} className="inspection-card" style={{cursor:'pointer'}}>
                  <div className="inspection-card-left" onClick={() => router.push(`/inspection/${insp.id}`)}>
                    <div className="insp-name">{insp.facility_name}</div>
                    <div className="insp-date">{insp.inspection_date || 'No date set'}</div>
                    <span className={insp.status === 'active' ? 'insp-status-active' : 'insp-status-done'}>
                      {insp.status === 'active' ? 'In Progress' : 'Complete'}
                    </span>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div className="insp-count">{insp.issue_count || 0} issues</div>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuInsp(insp) }}
                      style={{background:'var(--light-gray)', border:'1px solid var(--border)', borderRadius:'8px', padding:'4px 10px', fontSize:'14px', color:'#888', cursor:'pointer'}}>
                      ···
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
 
        {/* INSPECTION MENU MODAL */}
        {menuInsp && (
          <div className="modal-overlay" onClick={() => setMenuInsp(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{menuInsp.facility_name}</div>
              <button className="modal-btn" onClick={() => { router.push(`/inspection/${menuInsp.id}`); setMenuInsp(null) }}>
                📋 &nbsp; Open Inspection
              </button>
              <button className="modal-btn" onClick={() => { router.push(`/inspection/${menuInsp.id}/report`); setMenuInsp(null) }}>
                📄 &nbsp; Generate Report
              </button>
              <button
                className="modal-btn"
                style={{color:'#c0392b', borderColor:'#f5c6cb', background:'#fff5f5'}}
                onClick={() => {
                  if (confirm(`Delete "${menuInsp.facility_name}"? This cannot be undone.`)) {
                    deleteInspection(menuInsp.id)
                  }
                }}
                disabled={deleting}>
                🗑 &nbsp; {deleting ? 'Deleting...' : 'Delete Inspection'}
              </button>
              <button className="modal-btn" style={{color:'var(--muted)'}} onClick={() => setMenuInsp(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
