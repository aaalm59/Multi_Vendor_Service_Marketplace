import React, { useState } from 'react'
import { FiMenu, FiBell, FiUser } from 'react-icons/fi'
import { useSelector } from 'react-redux'

const Header = ({ onToggleSidebar, sidebarOpen }) => {
  const { user } = useSelector((state) => state.auth)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <header className="bg-white shadow-md p-4 flex items-center justify-between">
      {/* Left Side */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiMenu size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Electric Service ERP
        </h1>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FiBell size={20} />
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 border-l pl-4">
          <div>
            <p className="font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-500 uppercase">{user?.role}</p>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="p-2 bg-yellow-400 rounded-full text-black font-bold"
          >
            {user?.first_name?.charAt(0) || 'U'}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
