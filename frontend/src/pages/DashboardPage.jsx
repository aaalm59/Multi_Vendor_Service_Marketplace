import React, { useEffect, useState } from 'react'
import { FiAlertTriangle, FiCalendar, FiDollarSign, FiShoppingBag, FiTrendingUp, FiUsers, FiPackage, FiTool, FiArrowRight, FiBriefcase, FiBox, FiBarChart2, FiActivity, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { reportAPI, bookingAPI, customerAPI, productAPI } from '../services/api'
import { ROLES, canDo } from '../routes/rbac'

const StatCard = ({ title, value, icon: Icon, tone = 'yellow', sub, onClick }) => {
  const tones = {
    yellow: { bg: 'bg-yellow-400', text: 'text-black', light: 'bg-yellow-50 border-yellow-200' },
    black: { bg: 'bg-gray-900', text: 'text-white', light: 'bg-gray-50 border-gray-200' },
    green: { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-50 border-emerald-200' },
    blue: { bg: 'bg-sky-500', text: 'text-white', light: 'bg-sky-50 border-sky-200' },
    red: { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-50 border-rose-200' },
    purple: { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-50 border-purple-200' },
  }
  const t = tones[tone] || tones.yellow

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.bg} ${t.text} flex-shrink-0`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}

const COLORS = ['#FBBF24', '#111827', '#10B981', '#3B82F6']

// ── Manager Dashboard ─────────────────────────────────────────────────────────
const MODULE_NAV = [
  { module: 'bookings',    label: 'Bookings',   icon: FiCalendar,   path: '/bookings',   color: 'bg-yellow-400 text-black' },
  { module: 'customers',   label: 'Customers',  icon: FiUsers,      path: '/customers',  color: 'bg-sky-500 text-white' },
  { module: 'inventory',   label: 'Inventory',  icon: FiBox,        path: '/inventory',  color: 'bg-emerald-500 text-white' },
  { module: 'staff',       label: 'Staff',      icon: FiBriefcase,  path: '/staff',      color: 'bg-purple-500 text-white' },
  { module: 'billing',     label: 'Billing',    icon: FiDollarSign, path: '/billing',    color: 'bg-gray-900 text-white' },
  { module: 'reports',     label: 'Reports',    icon: FiBarChart2,  path: '/reports',    color: 'bg-rose-500 text-white' },
  { module: 'services',    label: 'Services',   icon: FiTool,       path: '/services',   color: 'bg-orange-400 text-black' },
  { module: 'technicians', label: 'Technicians',icon: FiActivity,   path: '/technicians',color: 'bg-cyan-500 text-white' },
  { module: 'suppliers',   label: 'Suppliers',  icon: FiPackage,    path: '/suppliers',  color: 'bg-lime-500 text-black' },
  { module: 'expenses',    label: 'Expenses',   icon: FiShoppingBag,path: '/expenses',   color: 'bg-pink-500 text-white' },
]

const ManagerDashboard = ({ user }) => {
  const navigate = useNavigate()
  const [bookingSummary, setBookingSummary] = useState(null)

  const allowedModules = MODULE_NAV.filter((m) => {
    const perms = user?.permissions || []
    return perms.some((p) => p.module === m.module && p.action === 'view')
  })

  useEffect(() => {
    if (canDo(user, 'bookings', 'view')) {
      bookingAPI.getAll({ limit: 1 })
        .then((res) => {
          const data = res.data
          setBookingSummary({ total: data.count || (Array.isArray(data) ? data.length : 0) })
        })
        .catch(() => {})
    }
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, <span className="text-yellow-500">{user?.first_name}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">Manager · {allowedModules.length} modules assigned</p>
      </div>

      {allowedModules.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <FiAlertTriangle size={32} className="text-yellow-500 mx-auto mb-2" />
          <p className="font-semibold text-gray-800">No modules assigned yet</p>
          <p className="text-sm text-gray-500 mt-1">Ask your Admin to assign permissions to your account.</p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your Assigned Modules</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {allowedModules.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.module}
                    onClick={() => navigate(m.path)}
                    className={`flex flex-col items-center gap-2 rounded-xl p-4 font-semibold text-sm transition-all hover:scale-105 shadow-sm ${m.color}`}
                  >
                    <Icon size={22} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {canDo(user, 'bookings', 'view') && (
              <StatCard
                title="Total Bookings"
                value={bookingSummary?.total ?? '—'}
                icon={FiCalendar}
                tone="yellow"
                sub="All assigned bookings"
                onClick={() => navigate('/bookings')}
              />
            )}
            {canDo(user, 'customers', 'view') && (
              <StatCard
                title="Customers"
                value="View"
                icon={FiUsers}
                tone="blue"
                sub="Tap to browse"
                onClick={() => navigate('/customers')}
              />
            )}
            {canDo(user, 'inventory', 'view') && (
              <StatCard
                title="Inventory"
                value="View"
                icon={FiBox}
                tone="green"
                sub="Check stock levels"
                onClick={() => navigate('/inventory')}
              />
            )}
            {canDo(user, 'staff', 'view') && (
              <StatCard
                title="Staff"
                value="View"
                icon={FiBriefcase}
                tone="black"
                sub="Manage your team"
                onClick={() => navigate('/staff')}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Technician Dashboard ──────────────────────────────────────────────────────
const TechnicianDashboard = ({ user }) => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState({ total: 0, assigned: 0, in_progress: 0, completed: 0 })

  useEffect(() => {
    bookingAPI.getAll().then((res) => {
      const all = res.data?.results || res.data || []
      setJobs({
        total: all.length,
        assigned: all.filter((j) => j.status === 'assigned').length,
        in_progress: all.filter((j) => j.status === 'in_progress').length,
        completed: all.filter((j) => j.status === 'completed').length,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, <span className="text-yellow-500">{user?.first_name}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Technician · Here are your job assignments</p>
        </div>
        <button
          onClick={() => navigate('/technician/jobs')}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-xl font-bold text-sm hover:bg-yellow-300 transition"
        >
          <FiTool size={14} /> My Jobs <FiArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Assigned" value={jobs.total} icon={FiTool} tone="yellow" />
        <StatCard title="Assigned" value={jobs.assigned} icon={FiCalendar} tone="blue" sub="Awaiting start" onClick={() => navigate('/technician/jobs')} />
        <StatCard title="In Progress" value={jobs.in_progress} icon={FiActivity} tone="purple" sub="Currently working" onClick={() => navigate('/technician/jobs')} />
        <StatCard title="Completed" value={jobs.completed} icon={FiTrendingUp} tone="green" sub="Jobs finished" />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center gap-4">
        <div className="bg-yellow-400 rounded-xl p-3 flex-shrink-0">
          <FiTool size={22} className="text-black" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">Go to My Jobs</p>
          <p className="text-sm text-gray-500">View job addresses, customer contact, update status, upload photos</p>
        </div>
        <button
          onClick={() => navigate('/technician/jobs')}
          className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-300 transition"
        >
          Open <FiArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Customer Dashboard ────────────────────────────────────────────────────────
const STATUS_META = {
  pending:     { label: 'Pending',     bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  assigned:    { label: 'Assigned',    bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  completed:   { label: 'Completed',   bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400' },
}

const ActiveBookingCard = ({ booking, onNavigate }) => {
  const meta = STATUS_META[booking.status] || STATUS_META.pending
  const tech = booking.technician
  return (
    <div
      onClick={onNavigate}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
              {meta.label}
            </span>
            <span className="text-xs text-gray-400 font-mono">{booking.booking_number}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 truncate">{booking.service?.name || 'Service Booking'}</p>
          {tech && (
            <p className="text-xs text-gray-500 mt-0.5">
              Technician: <span className="font-semibold">{tech.user?.first_name} {tech.user?.last_name}</span>
            </p>
          )}
          {booking.scheduled_date && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <FiCalendar size={10} />
              {new Date(booking.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {booking.scheduled_time && ` at ${booking.scheduled_time}`}
            </p>
          )}
        </div>
        <FiArrowRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </div>
  )
}

const CustomerDashboard = ({ user }) => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      bookingAPI.getAll({ ordering: '-created_at', limit: 50 }),
      customerAPI.getAll({ limit: 1 }),
    ]).then(([bookingsRes, profileRes]) => {
      if (bookingsRes.status === 'fulfilled') {
        setBookings(bookingsRes.value.data?.results || bookingsRes.value.data || [])
      }
      if (profileRes.status === 'fulfilled') {
        const list = profileRes.value.data?.results || profileRes.value.data || []
        if (list.length > 0) setProfile(list[0])
      }
      setLoading(false)
    })
  }, [])

  const activeBookings = bookings.filter((b) => ['pending', 'assigned', 'in_progress'].includes(b.status))
  const completedCount = bookings.filter((b) => b.status === 'completed').length

  const quickActions = [
    { label: 'Book Service',  icon: FiPlus,        onClick: () => navigate('/bookings'),           color: 'bg-yellow-400 text-black hover:bg-yellow-300' },
    { label: 'My Bookings',   icon: FiCalendar,     onClick: () => navigate('/bookings'),           color: 'bg-gray-900 text-white hover:bg-gray-800' },
    { label: 'My Invoices',   icon: FiDollarSign,   onClick: () => navigate('/customer/invoices'), color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { label: 'My Profile',    icon: FiUsers,        onClick: () => navigate('/customers'),          color: 'bg-sky-500 text-white hover:bg-sky-600' },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-yellow-500">{user?.first_name || 'there'}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 text-black rounded-xl font-bold text-sm hover:bg-yellow-300 transition shadow-sm"
        >
          <FiPlus size={15} /> Book a Service
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={bookings.length}      icon={FiCalendar}    tone="yellow" sub="All time"               onClick={() => navigate('/bookings')} />
        <StatCard title="Active"         value={activeBookings.length} icon={FiClock}       tone="blue"   sub="Pending / In Progress"  onClick={() => navigate('/bookings')} />
        <StatCard title="Completed"      value={completedCount}        icon={FiCheckCircle} tone="green"  sub="Jobs finished" />
        <StatCard title="Total Spent"    value={`₹${Number(profile?.total_spent || 0).toLocaleString('en-IN')}`} icon={FiDollarSign} tone="black" sub="Across invoices" onClick={() => navigate('/customer/invoices')} />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-sm transition shadow-sm ${a.color}`}
              >
                <Icon size={16} />
                {a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Active Services ({activeBookings.length})
            </p>
            <button onClick={() => navigate('/bookings')} className="text-xs text-yellow-600 font-semibold hover:underline flex items-center gap-1">
              View All <FiArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeBookings.slice(0, 4).map((b) => (
              <ActiveBookingCard key={b.id} booking={b} onNavigate={() => navigate('/bookings')} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Bookings History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">Recent Booking History</h2>
          <button onClick={() => navigate('/bookings')} className="flex items-center gap-1 text-xs text-yellow-600 font-semibold hover:underline">
            View All <FiArrowRight size={12} />
          </button>
        </div>
        {bookings.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FiCalendar size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">No bookings yet</p>
            <p className="text-xs text-gray-400 mt-1">Book your first service and it will appear here</p>
            <button
              onClick={() => navigate('/bookings')}
              className="mt-4 px-5 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-300 transition"
            >
              Book Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.slice(0, 6).map((booking) => {
              const meta = STATUS_META[booking.status] || STATUS_META.pending
              return (
                <div key={booking.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{booking.service?.name || 'Service Booking'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{booking.booking_number}
                      {booking.scheduled_date && ` · ${new Date(booking.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(booking.final_amount || booking.quote_amount) && (
                      <span className="text-sm font-bold text-gray-700">
                        ₹{Number(booking.final_amount || booking.quote_amount).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Average Rating */}
      {(profile?.average_rating > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl font-black text-yellow-500">{Number(profile.average_rating).toFixed(1)}</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Your Average Rating</p>
            <p className="text-xs text-gray-500">Based on completed service reviews</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <span key={s} className={`text-lg ${s <= Math.round(profile.average_rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main DashboardPage (switches by role) ─────────────────────────────────────
const DashboardPage = () => {
  // ALL hooks must be declared before any conditional returns (Rules of Hooks)
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [recentBookings, setRecentBookings] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const isAdminView = user && ![ROLES.MANAGER, ROLES.TECHNICIAN, ROLES.CUSTOMER].includes(user.role)

  const fetchAll = async () => {
    try {
      const [summaryRes, metricsRes, bookingsRes] = await Promise.allSettled([
        reportAPI.getDashboardSummary(),
        reportAPI.getDailyMetrics({ limit: 14, ordering: 'date' }),
        bookingAPI.getAll({ limit: 5, ordering: '-created_at' }),
      ])
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data)
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data.results || metricsRes.value.data || [])
      if (bookingsRes.status === 'fulfilled') setRecentBookings(bookingsRes.value.data.results || bookingsRes.value.data || [])
    } catch {}

    try {
      const lowStockRes = await productAPI.getLowStock()
      setTopProducts(lowStockRes.data.results || lowStockRes.data || [])
    } catch {}

    setLoading(false)
  }

  useEffect(() => {
    if (!isAdminView) { setLoading(false); return }
    fetchAll()
  }, [isAdminView]) // eslint-disable-line react-hooks/exhaustive-deps

  // Role-specific dashboards — rendered AFTER all hooks
  if (user?.role === ROLES.MANAGER) return <ManagerDashboard user={user} />
  if (user?.role === ROLES.TECHNICIAN) return <TechnicianDashboard user={user} />
  if (user?.role === ROLES.CUSTOMER) return <CustomerDashboard user={user} />

  const chartData = metrics.map((item) => ({
    date: item.date?.slice(5),
    Revenue: Number(item.total_revenue || 0),
    Expenses: Number(item.total_expenses || 0),
    Profit: Number(item.total_profit || 0),
  }))

  const bookingStatusData = [
    { name: 'Pending', value: Number(summary?.pending_bookings || 0) },
    { name: 'Completed', value: Number(summary?.completed_bookings || 0) },
    { name: 'In Progress', value: Number(summary?.open_bookings || 0) },
  ].filter((d) => d.value > 0)

  const profitLoss = Number(summary?.profit_loss || 0)

  const quickActions = [
    { label: 'New Booking', icon: FiCalendar, path: '/bookings', color: 'bg-yellow-400 text-black hover:bg-yellow-500' },
    { label: 'POS Billing', icon: FiShoppingBag, path: '/billing', color: 'bg-gray-900 text-white hover:bg-gray-800' },
    { label: 'Add Product', icon: FiPackage, path: '/inventory', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { label: 'View Reports', icon: FiTrendingUp, path: '/reports', color: 'bg-sky-500 text-white hover:bg-sky-600' },
  ]

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="text-yellow-500">{user?.first_name || 'Admin'}</span>
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Refreshing...</span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm transition-colors shadow-sm ${action.color}`}
            >
              <Icon size={16} />
              {action.label}
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={`₹${Number(summary?.daily_revenue || 0).toLocaleString('en-IN')}`} icon={FiDollarSign} tone="yellow" sub="All payment methods" />
        <StatCard title="Monthly Revenue" value={`₹${Number(summary?.monthly_revenue || 0).toLocaleString('en-IN')}`} icon={FiTrendingUp} tone="black" sub="This month" />
        <StatCard title="Open Bookings" value={summary?.open_bookings ?? '—'} icon={FiCalendar} tone="blue" sub="Pending + In-progress" onClick={() => navigate('/bookings')} />
        <StatCard title="Low Stock Items" value={summary?.low_stock_products ?? '—'} icon={FiAlertTriangle} tone="red" sub="Below reorder level" onClick={() => navigate('/inventory')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Profit / Loss" value={`${profitLoss >= 0 ? '+' : ''}₹${Math.abs(profitLoss).toLocaleString('en-IN')}`} tone={profitLoss >= 0 ? 'green' : 'red'} icon={FiTrendingUp} sub="Revenue minus expenses" />
        <StatCard title="Pending Bookings" value={summary?.pending_bookings ?? '—'} icon={FiCalendar} tone="purple" sub="Awaiting assignment" onClick={() => navigate('/bookings')} />
        <StatCard title="Completed (Month)" value={summary?.completed_bookings ?? '—'} icon={FiTool} tone="green" sub="Jobs closed this month" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Revenue vs Expenses (14 Days)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="Revenue" fill="#FBBF24" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#111827" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data yet — data appears after transactions</div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Booking Status</h2>
          {bookingStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {bookingStatusData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">No bookings yet</div>
          )}
        </div>
      </div>

      {/* Revenue Trend Line Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Profit Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
              <Line type="monotone" dataKey="Revenue" stroke="#FBBF24" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Bookings + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Recent Bookings</h2>
            <button onClick={() => navigate('/bookings')} className="flex items-center gap-1 text-xs text-yellow-600 font-semibold hover:underline">
              View All <FiArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBookings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No bookings yet</p>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{booking.booking_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.customer?.user?.first_name} {booking.customer?.user?.last_name}
                      {booking.service && ` • ${booking.service.name}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                    {booking.status?.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Low Stock Products</h2>
            <button onClick={() => navigate('/inventory')} className="flex items-center gap-1 text-xs text-yellow-600 font-semibold hover:underline">
              View All <FiArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">All products are adequately stocked</p>
            ) : (
              topProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product.SKU} • {product.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{product.inventory?.quantity_on_hand ?? 0}</p>
                    <p className="text-xs text-gray-400">in stock</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
