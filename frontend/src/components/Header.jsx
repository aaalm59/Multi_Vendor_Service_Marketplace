import React, { useEffect, useRef, useState } from 'react'
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings, FiCheck, FiZap } from 'react-icons/fi'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../redux/store'
import { notificationAPI } from '../services/api'

const Header = ({ onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchUnread = async () => {
    try {
      const response = await notificationAPI.getUnread()
      const items = response.data.results || response.data || []
      setNotifications(items.slice(0, 8))
      setUnreadCount(items.length)
    } catch {}
  }

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications([])
      setUnreadCount(0)
    } catch {}
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('') || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between z-30 relative">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          <FiMenu size={20} />
        </button>
        <div className="flex items-center gap-2 hidden sm:flex">
          <div className="bg-yellow-400 p-1 rounded">
            <FiZap size={14} className="text-black" />
          </div>
          <span className="font-bold text-gray-800 text-sm">Electric Service ERP</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <FiBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Notifications {unreadCount > 0 && <span className="ml-1 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>}</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-yellow-600 font-semibold hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">All caught up!</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      <button
                        onClick={() => markRead(n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-green-600 transition"
                        title="Mark as read"
                      >
                        <FiCheck size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-none">{user?.first_name || 'User'} {user?.last_name || ''}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="font-bold text-gray-900 text-sm">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                <span className="mt-1.5 inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold capitalize">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/settings'); setShowProfile(false) }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-gray-50 text-sm text-gray-700 transition"
                >
                  <FiSettings size={15} className="text-gray-400" />
                  Settings & Profile
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-red-50 text-sm text-red-600 transition"
                  >
                    <FiLogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
