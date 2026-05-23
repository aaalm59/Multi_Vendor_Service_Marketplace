import React, { useEffect, useRef, useState } from 'react'
import {
  FiMenu, FiBell, FiLogOut, FiSettings, FiCheck, FiZap,
  FiCheckSquare, FiTrash2, FiExternalLink,
} from 'react-icons/fi'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../redux/store'
import { notificationAPI } from '../services/api'
import {
  markOneRead,
  markAllRead as markAllReadAction,
  clearRead,
} from '../redux/notificationSlice'
import useNotificationSocket from '../hooks/useNotificationSocket'

// ── map entity_type → route ───────────────────────────────────────────────────
const ENTITY_ROUTES = {
  booking:    '/bookings',
  invoice:    '/billing',
  customer:   '/customers',
  product:    '/inventory',
  technician: '/technicians',
  user:       '/admin/users',
}

const TYPE_COLORS = {
  booking_created:     'bg-blue-100 text-blue-600',
  booking_assigned:    'bg-indigo-100 text-indigo-600',
  booking_in_progress: 'bg-purple-100 text-purple-600',
  booking_completed:   'bg-green-100 text-green-600',
  booking_cancelled:   'bg-red-100 text-red-600',
  invoice_created:     'bg-yellow-100 text-yellow-600',
  payment_received:    'bg-emerald-100 text-emerald-600',
  low_stock:           'bg-orange-100 text-orange-600',
  user_created:        'bg-teal-100 text-teal-600',
  permission_changed:  'bg-pink-100 text-pink-600',
  system:              'bg-gray-100 text-gray-600',
}

const TYPE_ICONS = {
  booking_created:     '📋',
  booking_assigned:    '🔧',
  booking_in_progress: '⚙️',
  booking_completed:   '✅',
  booking_cancelled:   '❌',
  invoice_created:     '🧾',
  payment_received:    '💰',
  low_stock:           '⚠️',
  user_created:        '👤',
  permission_changed:  '🔑',
  system:              '🔔',
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = (Date.now() - new Date(isoString)) / 1000
  if (diff < 60)  return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Notification item ─────────────────────────────────────────────────────────
const NotifItem = ({ n, onRead, onNavigate }) => {
  const icon  = TYPE_ICONS[n.notification_type] || '🔔'
  const color = TYPE_COLORS[n.notification_type] || TYPE_COLORS.system
  const route = n.action_url || (n.entity_type ? ENTITY_ROUTES[n.entity_type] : null)

  const handleClick = () => {
    if (!n.is_read) onRead(n.id)
    if (route) onNavigate(route)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 transition cursor-pointer border-l-2 ${
        n.is_read
          ? 'bg-white border-transparent hover:bg-gray-50'
          : 'bg-blue-50/40 border-blue-400 hover:bg-blue-50'
      }`}
    >
      <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${color}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${n.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-xs text-gray-400 mt-1">{n.time_ago || timeAgo(n.created_at)}</p>
      </div>
      {!n.is_read && (
        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
      )}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
const Header = ({ onToggleSidebar }) => {
  const { user }                          = useSelector((s) => s.auth)
  const { items: notifications, unreadCount } = useSelector((s) => s.notifications)
  const dispatch  = useDispatch()
  const navigate  = useNavigate()

  const [showNotif,   setShowNotif]   = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [clearing,    setClearing]    = useState(false)

  const notifRef   = useRef(null)
  const profileRef = useRef(null)

  // Start the real-time socket
  useNotificationSocket()

  // Click-outside to close dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkRead = async (id) => {
    dispatch(markOneRead(id))
    try { await notificationAPI.markAsRead(id) } catch {}
  }

  const handleMarkAllRead = async () => {
    dispatch(markAllReadAction())
    try { await notificationAPI.markAllRead() } catch {}
  }

  const handleClearRead = async () => {
    setClearing(true)
    try {
      await notificationAPI.clearAll()
      dispatch(clearRead())
    } catch {}
    setClearing(false)
  }

  const handleNavigate = (route) => {
    setShowNotif(false)
    navigate(route)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('')
    || user?.email?.[0]?.toUpperCase() || 'U'

  const preview = notifications.slice(0, 6)
  const readCount = notifications.filter((n) => n.is_read).length

  return (
    <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between z-30 relative">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600">
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

        {/* ── Notification Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif((v) => !v); setShowProfile(false) }}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
            aria-label="Notifications"
          >
            <FiBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[520px]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                      title="Mark all as read"
                    >
                      <FiCheckSquare size={12} /> All read
                    </button>
                  )}
                  {readCount > 0 && (
                    <button
                      onClick={handleClearRead}
                      disabled={clearing}
                      className="flex items-center gap-1 text-xs text-gray-400 font-semibold hover:text-red-500"
                      title="Clear read"
                    >
                      <FiTrash2 size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                {preview.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiBell size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : (
                  preview.map((n) => (
                    <NotifItem
                      key={n.id}
                      n={n}
                      onRead={handleMarkRead}
                      onNavigate={handleNavigate}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => { setShowNotif(false); navigate('/notifications') }}
                  className="w-full py-3 text-xs font-semibold text-yellow-600 hover:bg-yellow-50 flex items-center justify-center gap-1.5 transition"
                >
                  <FiExternalLink size={12} /> View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile((v) => !v); setShowNotif(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-none">{user?.first_name || 'User'} {user?.last_name || ''}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="font-bold text-gray-900 text-sm">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                <span className="mt-1.5 inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold capitalize">
                  {user?.role?.replace(/_/g, ' ')}
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
