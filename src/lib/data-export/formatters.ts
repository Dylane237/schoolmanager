import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportDataset, ExportFormat } from './types'

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function rowsAsArrays(dataset: ExportDataset): string[][] {
  return dataset.rows.map(row =>
    dataset.columns.map(col => cellValue(row[col.key]))
  )
}

export function toCsv(dataset: ExportDataset): string {
  const header = dataset.columns.map(c => c.label).join(';')
  const lines = rowsAsArrays(dataset).map(cols =>
    cols.map(v => v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(';')
  )
  return [header, ...lines].join('\n')
}

export function toJson(dataset: ExportDataset): string {
  const payload = {
    meta: {
      entity: dataset.entity,
      title: dataset.title,
      ecole: dataset.ecoleNom,
      exportedAt: dataset.exportedAt,
      count: dataset.rows.length,
    },
    columns: dataset.columns,
    data: dataset.rows,
  }
  return JSON.stringify(payload, null, 2)
}

export function toXlsxBuffer(dataset: ExportDataset): Buffer {
  const header = dataset.columns.map(c => c.label)
  const data = [header, ...rowsAsArrays(dataset)]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, dataset.title.slice(0, 31))
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

export function toPdfBuffer(dataset: ExportDataset): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(14)
  doc.text(`${dataset.title} — ${dataset.ecoleNom}`, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Exporté le ${dataset.exportedAt} · ${dataset.rows.length} enregistrement(s)`, 14, 22)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 28,
    head: [dataset.columns.map(c => c.label)],
    body: rowsAsArrays(dataset),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  return Buffer.from(doc.output('arraybuffer'))
}

export function formatExport(
  dataset: ExportDataset,
  format: ExportFormat
): { buffer: Buffer; mime: string; extension: string } {
  const base = `${dataset.entity}-${dataset.exportedAt.slice(0, 10)}`

  switch (format) {
    case 'csv':
      return {
        buffer: Buffer.from('\uFEFF' + toCsv(dataset), 'utf-8'),
        mime: 'text/csv;charset=utf-8',
        extension: `${base}.csv`,
      }
    case 'json':
      return {
        buffer: Buffer.from(toJson(dataset), 'utf-8'),
        mime: 'application/json;charset=utf-8',
        extension: `${base}.json`,
      }
    case 'xlsx':
      return {
        buffer: toXlsxBuffer(dataset),
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: `${base}.xlsx`,
      }
    case 'pdf':
      return {
        buffer: toPdfBuffer(dataset),
        mime: 'application/pdf',
        extension: `${base}.pdf`,
      }
  }
}
