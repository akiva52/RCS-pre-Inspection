import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import Head from 'next/head'
 
export default function Report() {
  const router = useRouter()
  const { id } = router.query
  const [inspection, setInspection] = useState(null)
  const [issues, setIssues] = useState([])
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
 
  useEffect(() => {
    if (id) loadData()
  }, [id])
 
  async function loadData() {
    const { data: insp } = await supabase.from('inspections').select('*').eq('id', id).single()
    const { data: iss } = await supabase.from('issues').select('*').eq('inspection_id', id).order('created_at', { ascending: true })
    setInspection(insp)
    setIssues(iss || [])
    setLoading(false)
  }
 
  const categoryCounts = {
    'Interior': issues.filter(i => i.category === 'Interior').length,
    'Exterior': issues.filter(i => i.category === 'Exterior').length,
    'Missing Paperwork': issues.filter(i => i.category === 'Missing Paperwork').length,
    'Possible Critical Issues': issues.filter(i => i.category === 'Possible Critical Issues').length,
  }
 
  async function generateReport() {
    setGenerating(true)
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')
 
      // Title case helper - capitalizes first letter of every word
      const toTitleCase = (str) => {
        if (!str) return ''
        return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
      }
 
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const W = 215.9, margin = 15
      const contentW = W - margin * 2
 
      // Colors
      const CHARCOAL = [61, 60, 58]
      const MID_GRAY = [74, 72, 69]
      const WARM_GRAY = [232, 228, 223]
      const LIGHT_GRAY = [240, 239, 237]
      const BORDER = [216, 212, 207]
      const GREEN = [74, 124, 78]
      const SLATE = [74, 96, 128]
      const RUST = [138, 74, 58]
      const PURPLE = [106, 74, 124]
      const WHITE = [255, 255, 255]
      const TEXT = [51, 51, 51]
      const DARK = [42, 42, 42]
      const MUTED = [153, 153, 153]
 
      let y = margin
 
      function addPage() {
        doc.addPage()
        y = margin
      }
 
      function checkSpace(needed) {
        if (y + needed > 265) addPage()
      }
 
      function drawHeader() {
        // RCS header bar
        doc.setFillColor(...CHARCOAL)
        doc.rect(margin, y, contentW, 18, 'F')
        doc.setTextColor(...WARM_GRAY)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('rcs', margin + 6, y + 12)
        doc.setFontSize(13)
        doc.text('PRE-INSPECTION REPORT', margin + 22, y + 9)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(170, 170, 170)
        doc.text('roselle creative solutions', margin + 22, y + 14)
        y += 22
 
        // Facility info
        const infoRows = [
          ['FACILITY', inspection.facility_name],
          ['ADDRESS', inspection.address || '—'],
          ['PRE-INSPECTION DATE', inspection.inspection_date || '—'],
        ]
        infoRows.forEach(([label, value], i) => {
          const rowH = 7
          const rc = i % 2 === 0 ? WARM_GRAY : LIGHT_GRAY; doc.setFillColor(...rc)
          doc.rect(margin, y, contentW, rowH, 'F')
          doc.setDrawColor(...BORDER)
          doc.rect(margin, y, contentW, rowH, 'S')
          doc.setTextColor(...MID_GRAY)
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'bold')
          doc.text(label, margin + 3, y + 4.8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...TEXT)
          doc.text(value, margin + 42, y + 4.8)
          y += rowH
        })
        y += 4
 
        // Contacts
        doc.setFillColor(...WARM_GRAY)
        doc.rect(margin, y, contentW / 2, 12, 'F')
        doc.rect(margin + contentW / 2, y, contentW / 2, 12, 'F')
        doc.setDrawColor(...BORDER)
        doc.rect(margin, y, contentW, 12, 'S')
        doc.setTextColor(...MID_GRAY)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Sol Jurkanski', margin + 4, y + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT)
        doc.setFontSize(7.5)
        doc.text('732-496-6029  |  Sol@rosellecs.com', margin + 4, y + 8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...MID_GRAY)
        doc.setFontSize(8)
        doc.text('Akiva Jurkanski', margin + contentW / 2 + 4, y + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT)
        doc.setFontSize(7.5)
        doc.text('732-606-3529  |  Akiva@rosellecs.com', margin + contentW / 2 + 4, y + 8.5)
        y += 16
 
        // Issue count boxes
        const boxes = [
          { label: 'TOTAL', count: issues.length, color: CHARCOAL },
          { label: 'EXTERIOR', count: categoryCounts['Exterior'], color: GREEN },
          { label: 'INTERIOR', count: categoryCounts['Interior'], color: SLATE },
          { label: 'CRITICAL', count: categoryCounts['Possible Critical Issues'], color: RUST },
          { label: 'PAPERWORK', count: categoryCounts['Missing Paperwork'], color: PURPLE },
        ]
        const boxW = contentW / 5
        boxes.forEach((box, i) => {
          doc.setFillColor(...box.color)
          doc.rect(margin + i * boxW, y, boxW, 16, 'F')
          doc.setTextColor(...WHITE)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text(String(box.count), margin + i * boxW + boxW / 2, y + 8, { align: 'center' })
          doc.setFontSize(6)
          doc.setFont('helvetica', 'normal')
          doc.text(box.label, margin + i * boxW + boxW / 2, y + 13, { align: 'center' })
        })
        y += 20
 
        // Disclaimer
        doc.setTextColor(...MUTED)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.text('This report was prepared by Roselle Creative Solutions for pre-inspection purposes only. Confidential.', W / 2, y, { align: 'center' })
        y += 6
        doc.setDrawColor(...CHARCOAL)
        doc.setLineWidth(0.5)
        doc.line(margin, y, margin + contentW, y)
        y += 6
      }
 
      function sectionBanner(title, subtitle, color) {
        checkSpace(14)
        doc.setFillColor(...color)
        doc.rect(margin, y, contentW, 12, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(title, margin + 4, y + 7.5)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(200, 200, 200)
        doc.text(subtitle, margin + contentW - 4, y + 7.5, { align: 'right' })
        y += 14
      }
 
      // ── COVER PAGE ──
      drawHeader()
 
      // Table of contents
      const toc = [
        'Section 1  —  Executive Summary',
        'Section 2  —  Detailed Issue Summary',
        'Section 3  —  View 1: By Location (room by room with checkboxes)',
        'Section 4  —  View 2: By Issue Type (same repairs grouped together)',
      ]
      toc.forEach(item => {
        doc.setTextColor(...MUTED)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`•  ${item}`, margin + 4, y)
        y += 5
      })
 
      // ── SECTION 1: EXECUTIVE SUMMARY ──
      addPage()
      sectionBanner('SECTION 1 — EXECUTIVE SUMMARY', 'Plain language overview by location', CHARCOAL)
 
      const cats = ['Exterior', 'Interior', 'Possible Critical Issues', 'Missing Paperwork']
      const catColors = { 'Exterior': GREEN, 'Interior': SLATE, 'Possible Critical Issues': RUST, 'Missing Paperwork': PURPLE }
 
      cats.forEach(cat => {
        const catIssues = issues.filter(i => i.category === cat)
        if (catIssues.length === 0) return
 
        // Category header
        checkSpace(20)
        doc.setFillColor(...(catColors[cat] || CHARCOAL))
        doc.rect(margin, y, contentW, 11, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(cat.toUpperCase(), margin + 6, y + 7.5)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(220, 220, 220)
        doc.text(`${catIssues.length} issue${catIssues.length !== 1 ? 's' : ''}`, margin + contentW - 6, y + 7.5, { align: 'right' })
        y += 14
 
        // Group by wing/location
        const grouped = {}
        catIssues.forEach(issue => {
          const key = issue.wing ? `${issue.wing}${issue.floor ? ' — ' + issue.floor : ''}` : 'General'
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(issue)
        })
 
        Object.entries(grouped).forEach(([loc, locIssues]) => {
          checkSpace(30)
 
          // Location subheader
          doc.setFillColor(...WARM_GRAY)
          doc.rect(margin, y, contentW, 8, 'F')
          doc.setDrawColor(...BORDER)
          doc.rect(margin, y, contentW, 8, 'S')
          doc.setTextColor(...MID_GRAY)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text(loc, margin + 5, y + 5.5)
          y += 10
 
          // Each issue as its own clean row
          locIssues.forEach((issue, idx) => {
            const issueLine = issue.issue_type
            const notesLine = issue.notes ? issue.notes : ''
            const locationLine = issue.space_type || issue.location
              ? [issue.space_type, issue.location].filter(Boolean).join(' — ')
              : ''
 
            const noteLines = notesLine ? doc.splitTextToSize(notesLine, contentW - 20) : []
            const rowH = 8 + (locationLine ? 4 : 0) + (noteLines.length * 4) + 4
            checkSpace(rowH + 2)
 
            const bg = idx % 2 === 0 ? LIGHT_GRAY : WHITE
            doc.setFillColor(...bg)
            doc.rect(margin, y, contentW, rowH, 'F')
            doc.setDrawColor(...BORDER)
            doc.rect(margin, y, contentW, rowH, 'S')
 
            // Bullet
            doc.setFillColor(...(catColors[cat] || CHARCOAL))
            doc.circle(margin + 5, y + 5, 1.5, 'F')
 
            // Issue name
            doc.setTextColor(...DARK)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'bold')
            doc.text(toTitleCase(issueLine), margin + 10, y + 5.5)
 
            let innerY = y + 10
 
            // Location
            if (locationLine) {
              doc.setTextColor(...MUTED)
              doc.setFontSize(7.5)
              doc.setFont('helvetica', 'normal')
              doc.text(locationLine, margin + 10, innerY)
              innerY += 4
            }
 
            // Notes
            if (noteLines.length > 0) {
              doc.setTextColor(80, 80, 80)
              doc.setFontSize(7.5)
              doc.setFont('helvetica', 'italic')
              doc.text(noteLines, margin + 10, innerY)
            }
 
            y += rowH + 1
          })
          y += 4
        })
        y += 6
      })
 
      // ── SECTION 2: DETAILED ISSUE SUMMARY ──
      addPage()
      sectionBanner('SECTION 2 — DETAILED ISSUE SUMMARY', 'Each issue type with total count', CHARCOAL)
 
      // Count issues by type
      const issueCounts = {}
      issues.forEach(issue => {
        if (!issueCounts[issue.issue_type]) {
          issueCounts[issue.issue_type] = { count: 0, category: issue.category, locations: [] }
        }
        issueCounts[issue.issue_type].count++
        if (issue.location) issueCounts[issue.issue_type].locations.push(issue.location)
      })
 
      const summaryRows = Object.entries(issueCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([issue, data], i) => [
          String(i + 1),
          toTitleCase(issue),
          data.category,
          String(data.count),
          [...new Set(data.locations)].join(', ') || '—'
        ])
 
      doc.autoTable({
        startY: y,
        head: [['#', 'Issue', 'Category', 'Count', 'Locations']],
        body: summaryRows,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: CHARCOAL, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: TEXT },
        alternateRowStyles: { fillColor: LIGHT_GRAY },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 55 }, 2: { cellWidth: 35 }, 3: { cellWidth: 14 }, 4: { cellWidth: 74 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 10
          }
        }
      })
      y = doc.lastAutoTable.finalY + 8
 
      // ── SECTION 3: BY LOCATION ──
      addPage()
      sectionBanner('SECTION 3 — VIEW 1: BY LOCATION', 'Walk room by room — check off as completed', CHARCOAL)
 
      const locationGroups = {}
      issues.forEach(issue => {
        const cat = issue.category
        const wing = issue.wing || 'General'
        const floor = issue.floor || ''
        const key = `${cat}||${wing}||${floor}`
        if (!locationGroups[key]) locationGroups[key] = []
        locationGroups[key].push(issue)
      })
 
      const catOrder = ['Exterior', 'Interior', 'Possible Critical Issues', 'Missing Paperwork']
      catOrder.forEach(cat => {
        const catGroups = Object.entries(locationGroups).filter(([k]) => k.startsWith(cat + '||'))
        if (catGroups.length === 0) return
 
        checkSpace(16)
        doc.setFillColor(...(catColors[cat] || CHARCOAL))
        doc.rect(margin, y, contentW, 9, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(cat.toUpperCase(), margin + 4, y + 6)
        y += 10
 
        catGroups.forEach(([key, groupIssues]) => {
          const [, wing, floor] = key.split('||')
          if (wing !== 'General') {
            checkSpace(10)
            doc.setFillColor(...MID_GRAY)
            doc.rect(margin, y, contentW, 8, 'F')
            doc.setTextColor(...WHITE)
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'bold')
            doc.text(`  ${wing}${floor ? ' — ' + floor : ''}`, margin + 4, y + 5.5)
            y += 8
          }
 
          const rows = groupIssues.map((issue, i) => [
            '',
            String(i + 1),
            issue.space_type || '—',
            issue.location || '—',
            issue.issue_type,
            issue.notes || '—'
          ])
 
          doc.autoTable({
            startY: y,
            head: [['', '#', 'Space Type', 'Location', 'Issue', 'Notes']],
            body: rows,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [74, 111, 165], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7, textColor: TEXT },
            alternateRowStyles: { fillColor: LIGHT_GRAY },
            columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 32 }, 3: { cellWidth: 28 }, 4: { cellWidth: 42 }, 5: { cellWidth: 72 } },
            didDrawCell: (data) => {
              if (data.section === 'body' && data.column.index === 0) {
                const x = data.cell.x + 1.5
                const y2 = data.cell.y + (data.cell.height - 4) / 2
                doc.setDrawColor(150, 150, 150)
                doc.setLineWidth(0.4)
                doc.rect(x, y2, 4, 4)
              }
            }
          })
          y = doc.lastAutoTable.finalY + 4
        })
        y += 4
      })
 
      // ── SECTION 4: BY ISSUE TYPE ──
      addPage()
      sectionBanner('SECTION 4 — VIEW 2: BY ISSUE TYPE', 'Same repairs grouped — assign one crew per issue', CHARCOAL)
 
      const byIssueType = {}
      issues.forEach(issue => {
        if (!byIssueType[issue.issue_type]) byIssueType[issue.issue_type] = []
        byIssueType[issue.issue_type].push(issue)
      })
 
      Object.entries(byIssueType)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([issueName, issueList]) => {
          checkSpace(18)
          doc.setFillColor(...MID_GRAY)
          doc.rect(margin, y, contentW, 9, 'F')
          doc.setTextColor(...WHITE)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(`  ${toTitleCase(issueName)}`, margin + 4, y + 6)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(200, 200, 200)
          doc.text(`${issueList.length} location${issueList.length > 1 ? 's' : ''}`, margin + contentW - 4, y + 6, { align: 'right' })
          y += 9
 
          const rows = issueList.map((issue, i) => [
            '',
            String(i + 1),
            issue.category,
            issue.wing ? `${issue.wing}${issue.floor ? ' · ' + issue.floor : ''}` : '—',
            issue.location || '—',
            issue.notes || '—'
          ])
 
          doc.autoTable({
            startY: y,
            head: [['', '#', 'Category', 'Wing / Floor', 'Location', 'Notes']],
            body: rows,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: SLATE, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7, textColor: TEXT },
            alternateRowStyles: { fillColor: LIGHT_GRAY },
            columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 32 }, 3: { cellWidth: 32 }, 4: { cellWidth: 28 }, 5: { cellWidth: 82 } },
            didDrawCell: (data) => {
              if (data.section === 'body' && data.column.index === 0) {
                const x = data.cell.x + 1.5
                const y2 = data.cell.y + (data.cell.height - 4) / 2
                doc.setDrawColor(150, 150, 150)
                doc.setLineWidth(0.4)
                doc.rect(x, y2, 4, 4)
              }
            }
          })
          y = doc.lastAutoTable.finalY + 6
        })
 
      // FOOTER on last page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(...CHARCOAL)
        doc.setLineWidth(0.3)
        doc.line(margin, 272, margin + contentW, 272)
        doc.setTextColor(...MUTED)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`Roselle Creative Solutions  |  Page ${i} of ${pageCount}`,
          W / 2, 276, { align: 'center' })
      }
 
      doc.save(`RCS_${inspection.facility_name.replace(/\s+/g, '_')}_${inspection.inspection_date}.pdf`)
      await supabase.from('inspections').update({ status: 'complete' }).eq('id', id)
    } catch (err) {
      console.error(err)
      alert('Error generating report. Please try again.')
    }
    setGenerating(false)
  }
 
  if (loading) return <div className="app-container"><div className="loading">Loading...</div></div>
 
  return (
    <>
      <Head><title>Generate Report — RCS</title></Head>
      <div className="app-container form-screen">
        <div className="back-bar">
          <button className="back-btn" onClick={() => router.back()}>←</button>
          <span className="back-title">Generate Report</span>
        </div>
 
        <div className="report-screen">
          <div style={{marginBottom:'4px', fontSize:'18px', fontWeight:'600', color:'var(--dark)'}}>
            {inspection?.facility_name}
          </div>
          <div style={{fontSize:'12px', color:'var(--muted)', marginBottom:'20px'}}>
            {issues.length} total issues logged
          </div>
 
          {/* Category counts */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px'}}>
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <div key={cat} style={{background:'var(--white)', border:'1px solid var(--border)', borderRadius:'10px', padding:'12px 14px'}}>
                <div style={{fontSize:'20px', fontWeight:'600', color:'var(--dark)'}}>{count}</div>
                <div style={{fontSize:'10px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{cat}</div>
              </div>
            ))}
          </div>
 
 
 
          <div style={{marginBottom:'16px'}}>
            <div className="section-label" style={{marginBottom:'8px'}}>Report includes:</div>
            {[
              ['Section 1', 'Executive Summary', 'Plain language overview'],
              ['Section 2', 'Detailed Issue Summary', 'Each issue type with total count'],
              ['Section 3', 'View 1: By Location', 'Room by room with checkboxes'],
              ['Section 4', 'View 2: By Issue Type', 'Same repairs grouped together'],
            ].map(([sec, title, sub]) => (
              <div key={sec} className="report-view-option">
                <div>
                  <div className="report-view-title">{sec} — {title}</div>
                  <div className="report-view-sub">{sub}</div>
                </div>
                <span className="check-icon">✓</span>
              </div>
            ))}
          </div>
 
          <button className="gen-btn" onClick={generateReport} disabled={generating || issues.length === 0}>
            {generating ? 'Generating PDF...' : '⬇ Generate & Download PDF'}
          </button>
 
          {issues.length === 0 && (
            <div style={{textAlign:'center', fontSize:'12px', color:'var(--muted)', marginTop:'12px'}}>
              No issues logged yet. Go back and add issues before generating a report.
            </div>
          )}
 
          <button className="modal-btn cancel" style={{marginTop:'12px'}} onClick={() => router.back()}>
            Back to Inspection
          </button>
        </div>
      </div>
    </>
  )
}

