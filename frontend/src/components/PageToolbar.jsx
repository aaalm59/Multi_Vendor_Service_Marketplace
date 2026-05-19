import React from 'react'
import { FiSearch } from 'react-icons/fi'

const PageToolbar = ({ title, subtitle, search, onSearch, actionLabel, actionIcon: ActionIcon, onAction }) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {onSearch && (
          <label className="flex min-w-[260px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <FiSearch className="text-gray-400" />
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300"
          >
            {ActionIcon && <ActionIcon size={18} />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default PageToolbar
