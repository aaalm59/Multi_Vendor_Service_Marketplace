import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiUsers, FiShoppingCart, FiBox, FiDollarSign, FiBarChart3, FiSettings, FiLogOut } from 'react-icons/fi'
import { useDispatch } from 'react-redux'
import { logout } from '../redux/store'

const Sidebar = ({ isOpen }) => {
  const location = useLocation()
  const dispatch = useDispatch()

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/customers', label: 'Customers', icon: FiUsers },
    { path: '/bookings', label: 'Bookings', icon: FiShoppingCart },
    { path: '/inventory', label: 'Inventory', icon: FiBox },
    { path: '/billing', label: 'Billing', icon: FiDollarSign },
    { path: '/reports', label: 'Reports', icon: FiBarChart3 },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-black text-white h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-300`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-yellow-600 flex items-center justify-center h-20">
        <span className={`font-bold text-xl ${isOpen ? '' : 'text-sm'} text-yellow-400`}>
          {isOpen ? '⚡ ERP' : '⚡'}
        </span>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-yellow-400 text-black'
                  : 'hover:bg-gray-900 text-gray-300'
              }`}
              title={!isOpen ? item.label : ''}
            >
              <Icon size={20} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-yellow-600">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full hover:bg-red-600 transition-colors text-gray-300"
          title="Logout"
        >
          <FiLogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
