import React from 'react'
import { FiSearch } from 'react-icons/fi'

const PageToolbar = ({ title, subtitle, search, onSearch, actionLabel, actionIcon: ActionIcon, onAction }) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearch && (
          <label className="flex min-w-[240px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-yellow-400 focus-within:ring-1 focus-within:ring-yellow-400 transition">
            <FiSearch className="text-gray-400 flex-shrink-0" size={15} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        )}
        {actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-500 transition shadow-sm whitespace-nowrap"
          >
            {ActionIcon && <ActionIcon size={16} />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default PageToolbar
