import React from 'react'

const ModuleSummary = ({ items }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {items.map((item) => (
      <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-gray-500">{item.label}</p>
        <p className="mt-2 text-xl font-bold text-gray-900">{item.value}</p>
      </div>
    ))}
  </div>
)

export default ModuleSummary
