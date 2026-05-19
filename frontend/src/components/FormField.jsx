import React from 'react'

const FormField = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span>
    {children}
  </label>
)

export const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'

export default FormField
