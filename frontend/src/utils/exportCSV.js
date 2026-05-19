export const downloadCSV = (rows, columns, filename) => {
  if (!rows.length) return

  const header = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.getValue ? c.getValue(row) : (row[c.key] ?? '')
        return `"${String(raw).replace(/"/g, '""')}"`
      })
      .join(',')
  )
  const csv = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
