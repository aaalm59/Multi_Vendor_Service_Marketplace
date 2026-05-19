import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiLogOut, FiZap } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/store'
import { canAccess, navItems } from '../routes/rbac'
import { useNavigate } from 'react-router-dom'

const Sidebar = ({ isOpen }) => {
  const location = useLocation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const menuItems = navItems.filter((item) => canAccess(user, item.roles, item.module))

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <aside
      className={`${isOpen ? 'w-64' : 'w-16'} bg-gray-950 text-white h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 border-r border-gray-800`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-gray-800 flex-shrink-0 ${isOpen ? 'px-4 gap-3' : 'justify-center'}`}>
        <div className="bg-yellow-400 p-1.5 rounded-lg flex-shrink-0">
          <FiZap size={18} className="text-black" />
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-none whitespace-nowrap">Bharat Electric</p>
            <p className="text-yellow-400 text-xs font-medium tracking-wider uppercase mt-0.5 whitespace-nowrap">Service ERP</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {isOpen && (
          <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Menu</p>
        )}
        <div className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isOpen ? item.label : ''}
                className={`flex items-center rounded-lg transition-all duration-150 group ${
                  isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center py-3'
                } ${
                  active
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {isOpen && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {isOpen && active && (
                  <span className="ml-auto w-1.5 h-1.5 bg-black rounded-full flex-shrink-0" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      {isOpen && user && (
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-900">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-gray-500 text-xs capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className={`border-t border-gray-800 p-2 flex-shrink-0 ${!isOpen ? 'flex justify-center' : ''}`}>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className={`flex items-center rounded-lg transition-colors text-gray-400 hover:bg-red-900/40 hover:text-red-400 ${
            isOpen ? 'gap-3 px-3 py-2.5 w-full' : 'justify-center p-3'
          }`}
        >
          <FiLogOut size={18} className="flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
