import React from 'react'
import { FiX } from 'react-icons/fi'

const Modal = ({ title, open, onClose, children, width = 'max-w-2xl' }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${width}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <FiX size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
