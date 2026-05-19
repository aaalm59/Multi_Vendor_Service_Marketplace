import React, { useEffect, useState } from 'react'
import { FiAlertTriangle, FiCalendar, FiDollarSign, FiShoppingBag, FiTrendingUp, FiUsers, FiPackage, FiTool, FiArrowRight } from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { reportAPI, bookingAPI, customerAPI, productAPI } from '../services/api'

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

const DashboardPage = () => {
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [recentBookings, setRecentBookings] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    fetchAll()
  }, [])

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
