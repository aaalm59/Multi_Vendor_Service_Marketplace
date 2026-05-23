import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiShoppingBag, FiUsers, FiTool, FiBookOpen, FiDollarSign,
  FiPackage, FiStar, FiCheckCircle, FiClock, FiActivity, FiPhone, FiMail,
  FiMapPin, FiUser, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { shopAPI, bookingAPI, technicianAPI, serviceAPI, staffAPI, expenseAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'

const STATUS_COLOR = {
  approved: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  suspended: 'bg-gray-100 text-gray-500 border-gray-200',
}

const StatCard = ({ icon: Icon, label, value, sub, color = 'yellow' }) => {
  const colors = {
    yellow: 'bg-yellow-400 text-black',
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    gray: 'bg-gray-700 text-white',
    red: 'bg-red-500 text-white',
  }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const SectionHeader = ({ title, icon: Icon, count }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon size={16} className="text-yellow-500" />
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    {count !== undefined && (
      <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{count}</span>
    )}
  </div>
)

const ShopDashboardPage = () => {
  const { shopId } = useParams()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [bookings, setBookings] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [shopRes, bookRes, techRes, svcRes, staffRes] = await Promise.all([
        shopAPI.getById(shopId),
        bookingAPI.getAll({ shop: shopId, limit: 200, ordering: '-created_at' }),
        technicianAPI.getAll({ shop: shopId, limit: 100 }),
        serviceAPI.getAll({ shop: shopId, limit: 100 }),
        staffAPI.getAll({ shop: shopId, limit: 100 }),
      ])
      setShop(shopRes.data)
      setBookings(bookRes.data?.results || bookRes.data || [])
      setTechnicians(techRes.data?.results || techRes.data || [])
      setServices(svcRes.data?.results || svcRes.data || [])
      setStaff(staffRes.data?.results || staffRes.data || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load shop data')
      toast.error('Failed to load shop data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [shopId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading shop dashboard...</p>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FiAlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600 font-semibold">{error || 'Shop not found'}</p>
        <button onClick={() => navigate('/admin/shops')} className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-500">
          <FiArrowLeft size={15} /> Back to Shops
        </button>
      </div>
    )
  }

  // Compute stats
  const totalBookings = bookings.length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const inProgressBookings = bookings.filter(b => b.status === 'in_progress').length
  const revenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.final_amount || b.quote_amount || 0), 0)
  const availableTechs = technicians.filter(t => t.availability_status === 'available').length
  const recentBookings = bookings.slice(0, 8)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Back + Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/shops')}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition flex-shrink-0 mt-0.5"
        >
          <FiArrowLeft size={15} /> All Shops
        </button>

        {/* Shop identity card */}
        <div className="flex items-center gap-4 flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          {shop.shop_logo ? (
            <img src={shop.shop_logo} alt={shop.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <FiShoppingBag size={26} className="text-black" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${STATUS_COLOR[shop.status] || STATUS_COLOR.pending}`}>
                {shop.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
              {shop.owner_name && <span className="flex items-center gap-1.5"><FiUser size={12} className="text-gray-400" />{shop.owner_name}</span>}
              {shop.phone && <span className="flex items-center gap-1.5"><FiPhone size={12} className="text-gray-400" />{shop.phone}</span>}
              {shop.email && <span className="flex items-center gap-1.5"><FiMail size={12} className="text-gray-400" />{shop.email}</span>}
              {(shop.city || shop.state) && <span className="flex items-center gap-1.5"><FiMapPin size={12} className="text-gray-400" />{[shop.city, shop.state].filter(Boolean).join(', ')}</span>}
              {shop.gst_number && <span className="text-xs text-gray-400">GST: {shop.gst_number}</span>}
            </div>
          </div>
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition flex-shrink-0"
            title="Refresh"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={FiBookOpen} label="Total Bookings" value={totalBookings} color="yellow" />
        <StatCard icon={FiCheckCircle} label="Completed" value={completedBookings} color="green" />
        <StatCard icon={FiClock} label="Pending" value={pendingBookings} color="gray" />
        <StatCard icon={FiActivity} label="In Progress" value={inProgressBookings} color="blue" />
        <StatCard icon={FiDollarSign} label="Revenue" value={`₹${revenue.toLocaleString('en-IN')}`} color="purple" />
        <StatCard icon={FiTool} label="Technicians" value={technicians.length} sub={`${availableTechs} available`} color="gray" />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Bookings — wide column */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <SectionHeader title="Recent Bookings" icon={FiBookOpen} count={totalBookings} />
          {recentBookings.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <FiBookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/30 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800">{b.booking_number}</span>
                      <StatusBadge value={b.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.service?.name || '—'}
                      {b.customer?.user?.first_name && ` · ${b.customer.user.first_name} ${b.customer.user.last_name || ''}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">
                      ₹{Number(b.final_amount || b.quote_amount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
              {totalBookings > 8 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{totalBookings - 8} more bookings</p>
              )}
            </div>
          )}
        </div>

        {/* Right column — Technicians + Booking status breakdown */}
        <div className="space-y-5">
          {/* Booking status breakdown */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader title="Booking Status" icon={FiActivity} />
            {[
              { label: 'Pending', val: pendingBookings, color: 'bg-yellow-400' },
              { label: 'In Progress', val: inProgressBookings, color: 'bg-blue-500' },
              { label: 'Completed', val: completedBookings, color: 'bg-green-500' },
              { label: 'Cancelled', val: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-red-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-3 py-2">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-sm text-gray-600 flex-1">{label}</span>
                <span className="text-sm font-bold text-gray-800">{val}</span>
                {totalBookings > 0 && (
                  <span className="text-xs text-gray-400 w-8 text-right">{Math.round(val / totalBookings * 100)}%</span>
                )}
              </div>
            ))}
          </div>

          {/* Technicians */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader title="Technicians" icon={FiTool} count={technicians.length} />
            {technicians.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No technicians assigned</p>
            ) : (
              <div className="space-y-2">
                {technicians.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                      {(t.user?.first_name?.[0] || 'T').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {[t.user?.first_name, t.user?.last_name].filter(Boolean).join(' ') || t.user?.email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{t.specialization}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      t.availability_status === 'available' ? 'bg-green-100 text-green-700' :
                      t.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {t.availability_status}
                    </span>
                  </div>
                ))}
                {technicians.length > 6 && (
                  <p className="text-xs text-center text-gray-400 pt-1">+{technicians.length - 6} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Services + Staff row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Services */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <SectionHeader title="Services" icon={FiPackage} count={services.length} />
          {services.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No services configured</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {services.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-yellow-200 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400 truncate">{s.description}</p>}
                  </div>
                  <span className="text-sm font-bold text-gray-700 flex-shrink-0 ml-3">₹{Number(s.base_price || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
              {services.length > 8 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{services.length - 8} more services</p>
              )}
            </div>
          )}
        </div>

        {/* Staff */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <SectionHeader title="Staff" icon={FiUsers} count={staff.length} />
          {staff.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No staff members</p>
          ) : (
            <div className="space-y-2">
              {staff.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-yellow-200 transition">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                    {(s.user?.first_name?.[0] || s.first_name?.[0] || 'S').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {[s.user?.first_name || s.first_name, s.user?.last_name || s.last_name].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-gray-400">{s.designation || s.user?.role || '—'}</p>
                  </div>
                </div>
              ))}
              {staff.length > 8 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{staff.length - 8} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick links to filtered pages ── */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5">
        <p className="text-white font-bold text-sm mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'View All Bookings', path: `/bookings?shop=${shopId}`, icon: FiBookOpen },
            { label: 'Manage Technicians', path: `/technicians`, icon: FiTool },
            { label: 'Manage Services', path: `/services`, icon: FiPackage },
            { label: 'Staff Management', path: `/staff`, icon: FiUsers },
            { label: 'View Reports', path: `/reports`, icon: FiActivity },
          ].map(({ label, path, icon: Icon }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition border border-white/10"
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ShopDashboardPage
