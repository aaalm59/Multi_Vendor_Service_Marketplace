import React from 'react'

const StatCard = ({ title, value, icon: Icon, tone = 'yellow', helper }) => {
  const tones = {
    yellow: 'bg-yellow-400 text-black',
    black: 'bg-black text-white',
    green: 'bg-emerald-500 text-white',
    blue: 'bg-sky-500 text-white',
    red: 'bg-rose-500 text-white',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone] || tones.yellow}`}>
            <Icon size={21} />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
