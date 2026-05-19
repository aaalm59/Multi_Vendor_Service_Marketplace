import React from 'react'

const StatusBadge = ({ value, tone }) => {
  const normalized = String(value || 'unknown').replaceAll('_', ' ')
  const resolvedTone = tone || {
    pending: 'yellow',
    assigned: 'blue',
    in_progress: 'purple',
    completed: 'green',
    received: 'green',
    available: 'green',
    busy: 'yellow',
    offline: 'gray',
    cancelled: 'red',
    failed: 'red',
    low: 'red',
    ok: 'green',
  }[value] || 'gray'

  const tones = {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-sky-100 text-sky-800',
    purple: 'bg-violet-100 text-violet-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-rose-100 text-rose-800',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${tones[resolvedTone]}`}>
      {normalized}
    </span>
  )
}

export default StatusBadge
