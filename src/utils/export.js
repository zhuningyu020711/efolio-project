// src/utils/export.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * 导出 CSV
 * @param {string} filename  文件名（不带扩展名）
 * @param {Array<{key:string,label:string}>} columns  列定义
 * @param {Array<Object>} rows  行数据
 */
export function exportToCSV(filename, columns, rows) {
  const header = columns.map(c => c.label)
  const csvRows = [header]

  const escape = (val) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    // 包含逗号/引号/换行时需包裹并转义引号
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  rows.forEach(row => {
    const line = columns.map(c => escape(row[c.key]))
    csvRows.push(line)
  })

  const csv = csvRows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')
  a.download = `${filename}-${ts}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 导出 PDF（自动分页、带表头、页码）
 * @param {string} title        标题
 * @param {Array<{key:string,label:string}>} columns 列定义
 * @param {Array<Object>} rows  行数据
 * @param {string} [filename]   文件名（不带扩展名）
 */
export function exportToPDF(title, columns, rows, filename = title) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // 标题与时间
  doc.setFontSize(16)
  doc.text(title, 40, 40)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 40, 40, { align: 'right' })

  // 表格
  const head = [columns.map(c => c.label)]
  const body = rows.map(r => columns.map(c => formatCell(r[c.key])))

  autoTable(doc, {
    head,
    body,
    startY: 60,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [29, 78, 216], halign: 'left' }, // 深蓝
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didDrawPage: (data) => {
      // 页脚页码
      const str = `Page ${doc.internal.getNumberOfPages()}`
      doc.setFontSize(10)
      doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
    }
  })

  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')
  doc.save(`${filename}-${ts}.pdf`)
}

function formatCell(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
