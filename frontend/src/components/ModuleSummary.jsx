import React from 'react'

const ModuleSummary = ({ items }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {items.map((item, i) => (
      <div key={item.label} className={`rounded-xl border p-4 shadow-sm ${i === 0 ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-gray-200'}`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${i === 0 ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
        <p className={`mt-2 text-2xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-gray-900'}`}>{item.value}</p>
      </div>
    ))}
  </div>
)

export default ModuleSummary
