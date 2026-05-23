import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiUser, FiMail, FiPhone, FiTool, FiBookOpen,
  FiStar, FiCheckCircle, FiClock, FiActivity, FiRefreshCw,
  FiAlertCircle, FiCalendar, FiDollarSign, FiBriefcase,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { userAPI, technicianAPI, bookingAPI, customerAPI, staffAPI } from '../../services/api'
import StatusBadge from '../../components/StatusBadge'

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  sop_user: 'bg-yellow-100 text-yellow-800',
  manager: 'bg-blue-100 text-blue-700',
  technician: 'bg-purple-100 text-purple-700',
  sales_staff: 'bg-green-100 text-green-700',
  inventory_staff: 'bg-orange-100 text-orange-700',
  customer: 'bg-gray-100 text-gray-600',
}

const StatCard = ({ icon: Icon, label, value, color = 'yellow' }) => {
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

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-800 capitalize text-right ml-4 max-w-[60%] truncate">{value ?? '—'}</span>
  </div>
)

const BookingRow = ({ b }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/30 transition">
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
)

const UserProfilePage = () => {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [techProfile, setTechProfile] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [customerProfile, setCustomerProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const userRes = await userAPI.getById(userId)
      const userData = userRes.data
      setUser(userData)

      if (userData.role === 'technician') {
        const techRes = await technicianAPI.getAll({ user: userId, limit: 10 })
        const techs = techRes.data?.results || techRes.data || []
        const tech = techs[0] || null
        setTechProfile(tech)
        if (tech) {
          const bookRes = await bookingAPI.getAll({ technician: tech.id, limit: 200, ordering: '-created_at' })
          setBookings(bookRes.data?.results || bookRes.data || [])
        }
      } else if (userData.role === 'customer') {
        const custRes = await customerAPI.getAll({ limit: 500 })
        const custs = custRes.data?.results || custRes.data || []
        const cust = custs.find(c => String(c.user?.id || c.user) === String(userId)) || null
        setCustomerProfile(cust)
        if (cust) {
          const bookRes = await bookingAPI.getAll({ customer: cust.id, limit: 200, ordering: '-created_at' })
          setBookings(bookRes.data?.results || bookRes.data || [])
        }
      } else if (['manager', 'sales_staff', 'inventory_staff'].includes(userData.role)) {
        const staffRes = await staffAPI.getAll({ limit: 200 })
        const staffList = staffRes.data?.results || staffRes.data || []
        const staff = staffList.find(s => String(s.user?.id || s.user) === String(userId)) || null
        setStaffProfile(staff)
        if (staff) {
          const attRes = await staffAPI.attendance({ staff: staff.id, limit: 30 })
          setAttendance(attRes.data?.results || attRes.data || [])
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile')
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading user profile...</p>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FiAlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600 font-semibold">{error || 'User not found'}</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold hover:bg-yellow-500"
        >
          <FiArrowLeft size={15} /> Back to Users
        </button>
      </div>
    )
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const completed = bookings.filter(b => b.status === 'completed').length
  const revenue = bookings.filter(b => b.status === 'completed')
    .reduce((s, b) => s + Number(b.final_amount || b.quote_amount || 0), 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Back + User identity card ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition flex-shrink-0 mt-0.5"
        >
          <FiArrowLeft size={15} /> All Users
        </button>

        <div className="flex items-center gap-4 flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-black">
              {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                {user.role?.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
              {user.email && <span className="flex items-center gap-1.5"><FiMail size={12} className="text-gray-400" />{user.email}</span>}
              {user.phone && <span className="flex items-center gap-1.5"><FiPhone size={12} className="text-gray-400" />{user.phone}</span>}
              {user.created_at && (
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={12} className="text-gray-400" />
                  Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {user.shop_name && <span className="text-xs text-gray-400">Shop: {user.shop_name}</span>}
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

      {/* ── TECHNICIAN VIEW ── */}
      {user.role === 'technician' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={FiBookOpen} label="Total Jobs" value={bookings.length} color="yellow" />
            <StatCard icon={FiCheckCircle} label="Completed" value={completed} color="green" />
            <StatCard icon={FiClock} label="Active Jobs" value={bookings.filter(b => ['pending', 'in_progress', 'confirmed'].includes(b.status)).length} color="blue" />
            <StatCard icon={FiDollarSign} label="Revenue Generated" value={`₹${revenue.toLocaleString('en-IN')}`} color="purple" />
            <StatCard icon={FiStar} label="Avg Rating" value={techProfile ? Number(techProfile.average_rating || 0).toFixed(1) : '—'} color="gray" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <SectionHeader title="Technician Profile" icon={FiTool} />
              {techProfile ? (
                <div>
                  <InfoRow label="Specialization" value={techProfile.specialization} />
                  <InfoRow label="Experience" value={`${techProfile.experience_years} years`} />
                  <InfoRow label="Hourly Rate" value={`₹${techProfile.hourly_rate}/hr`} />
                  <InfoRow label="Availability" value={techProfile.availability_status} />
                  <InfoRow label="Completed Bookings" value={techProfile.completed_bookings} />
                  <InfoRow label="Average Rating" value={`${Number(techProfile.average_rating || 0).toFixed(1)} / 5`} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No technician profile found</p>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <SectionHeader title="Recent Jobs" icon={FiBookOpen} count={bookings.length} />
              {bookings.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <FiBookOpen size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No jobs assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 10).map(b => <BookingRow key={b.id} b={b} />)}
                  {bookings.length > 10 && (
                    <p className="text-xs text-center text-gray-400 pt-1">+{bookings.length - 10} more jobs</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking status breakdown */}
          {bookings.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm max-w-sm">
              <SectionHeader title="Job Status Breakdown" icon={FiActivity} />
              {[
                { label: 'Pending', val: bookings.filter(b => b.status === 'pending').length, color: 'bg-yellow-400' },
                { label: 'In Progress', val: bookings.filter(b => b.status === 'in_progress').length, color: 'bg-blue-500' },
                { label: 'Completed', val: completed, color: 'bg-green-500' },
                { label: 'Cancelled', val: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-3 py-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm text-gray-600 flex-1">{label}</span>
                  <span className="text-sm font-bold text-gray-800">{val}</span>
                  {bookings.length > 0 && (
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {Math.round(val / bookings.length * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CUSTOMER VIEW ── */}
      {user.role === 'customer' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={FiBookOpen} label="Total Bookings" value={bookings.length} color="yellow" />
            <StatCard icon={FiCheckCircle} label="Completed" value={completed} color="green" />
            <StatCard icon={FiDollarSign} label="Total Spent" value={`₹${revenue.toLocaleString('en-IN')}`} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {customerProfile && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <SectionHeader title="Customer Details" icon={FiUser} />
                <InfoRow label="City" value={customerProfile.city} />
                <InfoRow label="Address" value={customerProfile.address} />
                <InfoRow label="Total Bookings" value={customerProfile.total_bookings} />
              </div>
            )}

            <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${customerProfile ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <SectionHeader title="Booking History" icon={FiBookOpen} count={bookings.length} />
              {bookings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 10).map(b => <BookingRow key={b.id} b={b} />)}
                  {bookings.length > 10 && (
                    <p className="text-xs text-center text-gray-400 pt-1">+{bookings.length - 10} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── STAFF VIEW (manager / sales_staff / inventory_staff) ── */}
      {['manager', 'sales_staff', 'inventory_staff'].includes(user.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader title="Staff Profile" icon={FiBriefcase} />
            {staffProfile ? (
              <div>
                <InfoRow label="Designation" value={staffProfile.designation} />
                <InfoRow label="Department" value={staffProfile.department} />
                <InfoRow label="Shift" value={staffProfile.shift_type} />
                <InfoRow
                  label="Salary"
                  value={staffProfile.salary ? `₹${Number(staffProfile.salary).toLocaleString('en-IN')}` : null}
                />
                <InfoRow
                  label="Hire Date"
                  value={staffProfile.hire_date ? new Date(staffProfile.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No staff profile found</p>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader title="Recent Attendance" icon={FiCalendar} count={attendance.length} />
            {attendance.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No attendance records</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {attendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">
                      {a.date ? new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                      a.status === 'present' ? 'bg-green-100 text-green-700' :
                      a.status === 'absent' ? 'bg-red-100 text-red-600' :
                      a.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SOP USER / ADMIN — minimal info ── */}
      {(user.role === 'sop_user' || user.role === 'admin') && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm max-w-md">
          <SectionHeader title="Account Details" icon={FiUser} />
          <InfoRow label="Role" value={user.role?.replace('_', ' ')} />
          <InfoRow label="Account Status" value={user.is_active ? 'Active' : 'Inactive'} />
          <InfoRow label="Shop" value={user.shop_name || (user.shop ? 'Assigned' : 'Not assigned')} />
          <InfoRow
            label="Joined"
            value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
          />
        </div>
      )}
    </div>
  )
}

export default UserProfilePage
