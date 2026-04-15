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
  const [includedSections, setIncludedSections] = useState({
    section1: true, section2: true, section3: true, section4: true
  })

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
    'Exterior': issues.filter(i => i.category === 'Exterior').length,
    'Interior': issues.filter(i => i.category === 'Interior').length,
    'Missing Paperwork': issues.filter(i => i.category === 'Missing Paperwork').length,
    'Possible Critical Issues': issues.filter(i => i.category === 'Possible Critical Issues').length,
  }

  async function generateReport() {
    const { section1, section2, section3, section4 } = includedSections
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

      // Dynamic section numbering - always defined regardless of what's selected
      const sectionNums = { s1: 0, s2: 0, s3: 0, s4: 0 }
      let sNum = 1
      if (section1) { sectionNums.s1 = sNum++ }
      if (section2) { sectionNums.s2 = sNum++ }
      if (section3) { sectionNums.s3 = sNum++ }
      if (section4) { sectionNums.s4 = sNum++ }

      // Always available - used across all sections
      const catColors = { 'Exterior': GREEN, 'Interior': SLATE, 'Possible Critical Issues': RUST, 'Missing Paperwork': PURPLE }

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

      // Table of contents - only show included sections with correct numbers
      const toc = []
      if (section1) toc.push(`Section ${sectionNums.s1}  —  Executive Summary`)
      if (section2) toc.push(`Section ${sectionNums.s2}  —  Detailed Issue Summary`)
      if (section3) toc.push(`Section ${sectionNums.s3}  —  View 1: By Location (room by room with checkboxes)`)
      if (section4) toc.push(`Section ${sectionNums.s4}  —  View 2: By Issue Type (same repairs grouped together)`)
      toc.forEach(item => {
        doc.setTextColor(...MUTED)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`•  ${item}`, margin + 4, y)
        y += 5
      })

      // ── SECTION 1: EXECUTIVE SUMMARY ──
      if (section1) {
        addPage()
        sectionBanner(`SECTION ${sectionNums.s1} — EXECUTIVE SUMMARY`, 'Plain language overview by location', CHARCOAL)

        const colW = (contentW - 6) / 2
        const col1X = margin
        const col2X = margin + colW + 6
        let col1Y = y
        let col2Y = y
        let useCol2 = false

        const cats1 = ['Exterior', 'Interior', 'Missing Paperwork', 'Possible Critical Issues']

        cats1.forEach(cat => {
          const catIssues = issues.filter(i => i.category === cat)
          if (catIssues.length === 0) return

          let activeX = useCol2 ? col2X : col1X
          let activeY = useCol2 ? col2Y : col1Y

          // If current column is getting full, switch
          if (activeY > 240) {
            if (!useCol2) {
              col1Y = activeY
              useCol2 = true
              activeX = col2X
              activeY = col2Y
            } else {
              addPage()
              col1Y = y; col2Y = y; useCol2 = false
              activeX = col1X; activeY = y
            }
          }

          // Category header
          doc.setFillColor(...(catColors[cat] || CHARCOAL))
          doc.rect(activeX, activeY, colW, 9, 'F')
          doc.setTextColor(...WHITE)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.text(cat.toUpperCase(), activeX + 4, activeY + 6.2)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(220, 220, 220)
          doc.text(`${catIssues.length} issues`, activeX + colW - 3, activeY + 6.2, { align: 'right' })
          activeY += 10

          // Group by wing
          const grouped1 = {}
          catIssues.forEach(issue => {
            const key = issue.wing ? `${issue.wing}${issue.floor ? ' — ' + issue.floor : ''}` : 'General'
            if (!grouped1[key]) grouped1[key] = []
            grouped1[key].push(issue)
          })

          Object.entries(grouped1).forEach(([loc, locIssues]) => {
            // Location subheader
            doc.setFillColor(...WARM_GRAY)
            doc.rect(activeX, activeY, colW, 7, 'F')
            doc.setDrawColor(...BORDER)
            doc.rect(activeX, activeY, colW, 7, 'S')
            doc.setTextColor(...MID_GRAY)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            const locText = doc.splitTextToSize(loc, colW - 6)
            doc.text(locText[0], activeX + 3, activeY + 4.8)
            activeY += 8

            locIssues.forEach((issue, idx) => {
              const issueLine = toTitleCase(issue.issue_type)
              const locationLine = [issue.space_type, issue.location].filter(Boolean).join(' — ')
              const noteText = issue.notes || ''
              const issueLines = doc.splitTextToSize(issueLine, colW - 12)
              const locLines = locationLine ? doc.splitTextToSize(locationLine, colW - 12) : []
              const noteLines2 = noteText ? doc.splitTextToSize(noteText, colW - 12) : []
              const rowH = (issueLines.length * 4) + (locLines.length * 3.5) + (noteLines2.length * 3.5) + 5

              // Switch column or add page if needed
              if (activeY + rowH > 265) {
                if (!useCol2) {
                  col1Y = activeY
                  useCol2 = true
                  activeX = col2X
                  activeY = col2Y
                } else {
                  col1Y = 0; col2Y = 0
                  addPage()
                  useCol2 = false
                  activeX = col1X
                  activeY = y
                }
              }

              const bg = idx % 2 === 0 ? LIGHT_GRAY : WHITE
              doc.setFillColor(...bg)
              doc.rect(activeX, activeY, colW, rowH, 'F')
              doc.setDrawColor(...BORDER)
              doc.rect(activeX, activeY, colW, rowH, 'S')
              doc.setFillColor(...(catColors[cat] || CHARCOAL))
              doc.circle(activeX + 4, activeY + 4, 1.2, 'F')
              doc.setTextColor(...DARK)
              doc.setFontSize(7.5)
              doc.setFont('helvetica', 'bold')
              doc.text(issueLines, activeX + 8, activeY + 4.5)
              let iy = activeY + 4.5 + (issueLines.length * 4)
              if (locLines.length > 0) {
                doc.setTextColor(...MUTED)
                doc.setFontSize(6.5)
                doc.setFont('helvetica', 'normal')
                doc.text(locLines, activeX + 8, iy)
                iy += locLines.length * 3.5
              }
              if (noteLines2.length > 0) {
                doc.setTextColor(100, 100, 100)
                doc.setFontSize(6.5)
                doc.setFont('helvetica', 'italic')
                doc.text(noteLines2, activeX + 8, iy)
              }
              activeY += rowH + 1
            })
            activeY += 3
          })

          // Save column position
          if (useCol2) { col2Y = activeY + 4 } else { col1Y = activeY + 4 }
        })

        y = Math.max(col1Y, col2Y) + 4
      } // end section1

      // ── SECTION 2: DETAILED ISSUE SUMMARY ──
      if (section2) {
      addPage()
      sectionBanner(`SECTION ${sectionNums.s2} — DETAILED ISSUE SUMMARY`, 'Each issue type with total count', CHARCOAL)

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

      } // end section2

      // ── SECTION 3: BY LOCATION ──
      if (section3) {
      addPage()
      sectionBanner(`SECTION ${sectionNums.s3} — VIEW 1: BY LOCATION`, 'Walk room by room — check off as completed', CHARCOAL)

      const locationGroups = {}
      issues.forEach(issue => {
        const cat = issue.category
        const wing = issue.wing || 'General'
        const floor = issue.floor || ''
        const key = `${cat}||${wing}||${floor}`
        if (!locationGroups[key]) locationGroups[key] = []
        locationGroups[key].push(issue)
      })

      const catOrder = ['Exterior', 'Interior', 'Missing Paperwork', 'Possible Critical Issues']
      catOrder.forEach(cat => {
        const catGroups = Object.entries(locationGroups).filter(([k]) => k.startsWith(cat + '||'))
        if (catGroups.length === 0) return

        // Add disclaimer before Possible Critical Issues
        if (cat === 'Possible Critical Issues') {
          checkSpace(16)
          doc.setFillColor(255, 248, 225)
          doc.rect(margin, y, contentW, 12, 'F')
          doc.setDrawColor(230, 180, 50)
          doc.setLineWidth(0.5)
          doc.rect(margin, y, contentW, 12, 'S')
          doc.setTextColor(120, 80, 0)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bolditalic')
          doc.text('All of the below items will be reviewed and addressed following issuance of the inspection report.',
            margin + contentW / 2, y + 7.5, { align: 'center' })
          y += 16
        }

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

          const isSimpleCat = cat === 'Possible Critical Issues' || cat === 'Missing Paperwork'
          const rows = isSimpleCat
            ? groupIssues.map((issue, i) => ['', String(i + 1), toTitleCase(issue.issue_type), issue.notes || '—'])
            : groupIssues.map((issue, i) => ['', String(i + 1), issue.space_type || '—', issue.location || '—', toTitleCase(issue.issue_type), issue.notes || '—'])

          const head = isSimpleCat
            ? [['', '#', 'Issue', 'Notes']]
            : [['', '#', 'Space Type', 'Location', 'Issue', 'Notes']]

          const colStyles = isSimpleCat
            ? { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 100 }, 3: { cellWidth: 74 } }
            : { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 32 }, 3: { cellWidth: 28 }, 4: { cellWidth: 42 }, 5: { cellWidth: 72 } }

          doc.autoTable({
            startY: y,
            head: head,
            body: rows,
            margin: { left: margin, right: margin },
            headStyles: { fillColor: [74, 111, 165], textColor: WHITE, fontSize: 7.5, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7, textColor: TEXT },
            alternateRowStyles: { fillColor: LIGHT_GRAY },
            columnStyles: colStyles,
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

          // Add disclaimer BEFORE Possible Critical Issues section header
          
        })
        y += 4
      })

      } // end section3

      // ── SECTION 4: BY ISSUE TYPE ──
      if (section4) {
      addPage()
      sectionBanner(`SECTION ${sectionNums.s4} — VIEW 2: BY ISSUE TYPE`, 'Same repairs grouped — assign one crew per issue', CHARCOAL)

      const byIssueType = {}
      issues.forEach(issue => {
        if (!byIssueType[issue.issue_type]) byIssueType[issue.issue_type] = []
        byIssueType[issue.issue_type].push(issue)
      })

      let s4CriticalDisclaimerShown = false
      Object.entries(byIssueType)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([issueName, issueList]) => {
          const issueCat = issueList[0]?.category
          if (issueCat === 'Possible Critical Issues' && !s4CriticalDisclaimerShown) {
            s4CriticalDisclaimerShown = true
            checkSpace(16)
            doc.setFillColor(255, 248, 225)
            doc.rect(margin, y, contentW, 12, 'F')
            doc.setDrawColor(230, 180, 50)
            doc.setLineWidth(0.5)
            doc.rect(margin, y, contentW, 12, 'S')
            doc.setTextColor(120, 80, 0)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bolditalic')
            doc.text('All of the below items will be reviewed and addressed following issuance of the inspection report.',
              margin + contentW / 2, y + 7.5, { align: 'center' })
            y += 16
          }
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

      } // end section4

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
            <div className="section-label" style={{marginBottom:'8px'}}>Select sections to include:</div>
            {[
              ['section1', 'Section 1', 'Executive Summary', 'Plain language overview by location'],
              ['section2', 'Section 2', 'Detailed Issue Summary', 'Each issue type with total count'],
              ['section3', 'Section 3', 'View 1: By Location', 'Room by room with checkboxes'],
              ['section4', 'Section 4', 'View 2: By Issue Type', 'Same repairs grouped together'],
            ].map(([key, sec, title, sub]) => (
              <div key={key} className="report-view-option"
                onClick={() => setIncludedSections(prev => ({...prev, [key]: !prev[key]}))}
                style={{cursor:'pointer', opacity: includedSections[key] ? 1 : 0.45}}>
                <div>
                  <div className="report-view-title">{sec} — {title}</div>
                  <div className="report-view-sub">{sub}</div>
                </div>
                <div style={{
                  width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
                  background: includedSections[key] ? 'var(--green)' : 'var(--white)',
                  border: includedSections[key] ? 'none' : '1.5px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontSize:'13px', fontWeight:'600'
                }}>
                  {includedSections[key] ? '✓' : ''}
                </div>
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
