import React from 'react'

const DataTable = ({ columns, rows, loading, emptyMessage = 'No records found' }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-black text-white">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-yellow-50/50">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 text-sm text-gray-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <div className="border-t border-gray-100 px-5 py-4 text-center text-sm text-gray-500">Loading...</div>}
    </div>
  )
}

export default DataTable
