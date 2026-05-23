import React, { useEffect, useState, useMemo } from 'react'
import {
  FiBell, FiCheckSquare, FiTrash2, FiFilter, FiSearch, FiX, FiExternalLink,
} from 'react-icons/fi'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../services/api'
import {
  setNotifications,
  markOneRead,
  markAllRead as markAllReadAction,
  clearRead,
} from '../redux/notificationSlice'
import toast from 'react-hot-toast'

// ── helpers ───────────────────────────────────────────────────────────────────
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

const TYPE_LABELS = {
  booking_created:     'Booking Created',
  booking_assigned:    'Booking Assigned',
  booking_in_progress: 'In Progress',
  booking_completed:   'Completed',
  booking_cancelled:   'Cancelled',
  invoice_created:     'Invoice',
  payment_received:    'Payment',
  low_stock:           'Low Stock',
  user_created:        'User',
  permission_changed:  'Permission',
  system:              'System',
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

const ENTITY_ROUTES = {
  booking:    '/bookings',
  invoice:    '/billing',
  customer:   '/customers',
  product:    '/inventory',
  technician: '/technicians',
  user:       '/admin/users',
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = (Date.now() - new Date(isoString)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const PAGE_SIZE = 20

// ── Main Page ─────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { items, unreadCount } = useSelector((s) => s.notifications)

  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState('all')       // 'all' | 'unread'
  const [search,    setSearch]    = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page,      setPage]      = useState(1)

  // Reload from server when page mounts
  useEffect(() => {
    setLoading(true)
    notificationAPI.getAll({ limit: 200 })
      .then((r) => dispatch(setNotifications(r.data?.results || r.data || [])))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [dispatch])

  const handleMarkRead = async (id) => {
    dispatch(markOneRead(id))
    try { await notificationAPI.markAsRead(id) } catch {}
  }

  const handleMarkAllRead = async () => {
    dispatch(markAllReadAction())
    try {
      await notificationAPI.markAllRead()
      toast.success('All notifications marked as read')
    } catch {}
  }

  const handleClearRead = async () => {
    try {
      await notificationAPI.clearAll()
      dispatch(clearRead())
      toast.success('Read notifications cleared')
    } catch { toast.error('Clear failed') }
  }

  const handleNavigate = (n) => {
    if (!n.is_read) handleMarkRead(n.id)
    const route = n.action_url || (n.entity_type ? ENTITY_ROUTES[n.entity_type] : null)
    if (route) navigate(route)
  }

  // ── derived list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = tab === 'unread' ? items.filter((n) => !n.is_read) : items
    if (typeFilter) list = list.filter((n) => n.notification_type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((n) =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      )
    }
    return list
  }, [items, tab, typeFilter, search])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const readCount   = items.filter((n) => n.is_read).length

  const allTypes = [...new Set(items.map((n) => n.notification_type))]

  const handleTabChange = (t) => { setTab(t); setPage(1) }
  const handleTypeChange = (t) => { setTypeFilter(t); setPage(1) }
  const handleSearch = (v) => { setSearch(v); setPage(1) }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiBell size={20} className="text-yellow-500" /> Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {items.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition"
            >
              <FiCheckSquare size={14} /> Mark all read
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={handleClearRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition"
            >
              <FiTrash2 size={14} /> Clear read
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: items.length,                      color: 'text-gray-900',   bg: 'bg-gray-50' },
          { label: 'Unread',   value: unreadCount,                       color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Read',     value: readCount,                         color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Today',    value: items.filter((n) => {
              const d = new Date(n.created_at); const today = new Date()
              return d.toDateString() === today.toDateString()
            }).length,                                                    color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-4 py-3`}>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 w-52"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <FiFilter size={13} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="">All Types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>

        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setPage(1) }}
            className="text-xs text-red-500 flex items-center gap-1 hover:text-red-700"
          >
            <FiX size={12} /> Reset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 flex gap-1">
        {[
          { id: 'all',    label: `All (${items.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition ${
              tab === t.id
                ? 'border-yellow-400 text-yellow-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading notifications…
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FiBell size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map((n) => {
              const icon  = TYPE_ICONS[n.notification_type] || '🔔'
              const color = TYPE_COLORS[n.notification_type] || TYPE_COLORS.system
              const route = n.action_url || (n.entity_type ? ENTITY_ROUTES[n.entity_type] : null)

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition group border-l-2 ${
                    n.is_read
                      ? 'bg-white border-transparent hover:bg-gray-50'
                      : 'bg-blue-50/30 border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  {/* Icon */}
                  <span className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${color}`}>
                    {icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {n.time_ago || timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
                        {TYPE_LABELS[n.notification_type] || n.notification_type}
                      </span>
                      {!n.is_read && (
                        <span className="text-xs text-blue-600 font-semibold">● Unread</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                        title="Mark as read"
                      >
                        <FiCheckSquare size={13} />
                      </button>
                    )}
                    {route && (
                      <button
                        onClick={() => handleNavigate(n)}
                        className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                        title="Go to details"
                      >
                        <FiExternalLink size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-semibold"
            >
              ←
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const n = page <= 3 ? i + 1 : page - 2 + i
              if (n < 1 || n > totalPages) return null
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1.5 rounded-lg border font-semibold ${
                    n === page
                      ? 'bg-yellow-400 border-yellow-400 text-black'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 font-semibold"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
