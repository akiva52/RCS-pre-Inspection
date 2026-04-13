import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)

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
                <div key={insp.id} className="inspection-card" onClick={() => router.push(`/inspection/${insp.id}`)}>
                  <div className="inspection-card-left">
                    <div className="insp-name">{insp.facility_name}</div>
                    <div className="insp-date">{insp.inspection_date || 'No date set'}</div>
                    <span className={insp.status === 'active' ? 'insp-status-active' : 'insp-status-done'}>
                      {insp.status === 'active' ? 'In Progress' : 'Complete'}
                    </span>
                  </div>
                  <div className="insp-count">{insp.issue_count || 0} issues</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
