import React, { useEffect, useState, useMemo } from 'react'
import {
  FiPlus, FiTrash2, FiEdit2, FiDownload, FiEye, FiPhone, FiMail,
  FiMapPin, FiCalendar, FiStar, FiTrendingUp, FiUsers, FiX,
  FiFilter, FiShoppingBag, FiFileText,
} from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { customerAPI, invoiceAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import { canAccess, canDo, roleGroups, ROLES } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
const initials = (u = {}) =>
  [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('') ||
  u.email?.[0]?.toUpperCase() ||
  'C'

const statusColor = {
  pending:     'bg-yellow-100 text-yellow-700',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
}

const StarRating = ({ value }) => {
  const v = Number(value || 0)
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          size={10}
          className={i <= Math.round(v) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{v.toFixed(1)}</span>
    </span>
  )
}

// ── Customer Detail Drawer ────────────────────────────────────────────────────
const CustomerDetailDrawer = ({ customer, onClose }) => {
  const [bookings, setBookings]         = useState([])
  const [invoices, setInvoices]         = useState([])
  const [loadingB, setLoadingB]         = useState(true)
  const [loadingI, setLoadingI]         = useState(true)
  const [drawerTab, setDrawerTab]       = useState('bookings')

  const u = customer.user || {}

  useEffect(() => {
    customerAPI.getBookings(customer.id)
      .then((r) => setBookings(r.data?.results || r.data || []))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoadingB(false))

    invoiceAPI.getAll({ customer: customer.id, limit: 50 })
      .then((r) => setInvoices(r.data?.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingI(false))
  }, [customer.id])

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-gray-950 px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
            {initials(u)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">
              {u.first_name} {u.last_name}
            </h2>
            {customer.service_shop_name && (
              <p className="text-yellow-400 text-sm flex items-center gap-1">
                <FiShoppingBag size={11} /> {customer.service_shop_name}
              </p>
            )}
            <p className="text-gray-400 text-xs mt-0.5">{u.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 flex-shrink-0">
            <FiX size={20} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
          {[
            { label: 'Bookings', value: customer.total_bookings || 0 },
            { label: 'Invoices',  value: customer.invoice_count  || 0 },
            { label: 'Total Spent', value: `₹${fmt(customer.total_spent)}` },
            { label: 'Rating',   value: Number(customer.average_rating || 0).toFixed(1) + ' ★' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 text-center">
              <p className="text-sm font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Contact */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="space-y-2">
              {u.phone && (
                <a href={`tel:${u.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-yellow-600">
                  <FiPhone size={13} className="text-gray-400 flex-shrink-0" /> {u.phone}
                </a>
              )}
              {u.email && (
                <a href={`mailto:${u.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-yellow-600">
                  <FiMail size={13} className="text-gray-400 flex-shrink-0" /> {u.email}
                </a>
              )}
              {(customer.city || customer.address) && (
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <FiMapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {customer.address ? `${customer.address}, ` : ''}
                    {[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Other details */}
          {(customer.gst_number || customer.shop_name || customer.preferred_contact) && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Business Details</p>
              <div className="space-y-1 text-sm text-gray-700">
                {customer.shop_name && <p><span className="text-gray-400">Business: </span>{customer.shop_name}</p>}
                {customer.gst_number && <p><span className="text-gray-400">GST: </span><span className="font-mono">{customer.gst_number}</span></p>}
                {customer.preferred_contact && <p><span className="text-gray-400">Preferred: </span><span className="capitalize">{customer.preferred_contact}</span></p>}
              </div>
            </section>
          )}

          {/* History tabs */}
          <section>
            <div className="flex gap-1 mb-4 border-b border-gray-100">
              {['bookings', 'invoices'].map((t) => (
                <button
                  key={t}
                  onClick={() => setDrawerTab(t)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize -mb-px border-b-2 transition ${
                    drawerTab === t ? 'border-yellow-400 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'bookings' ? `Bookings (${bookings.length})` : `Invoices (${invoices.length})`}
                </button>
              ))}
            </div>

            {drawerTab === 'bookings' && (
              loadingB ? (
                <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No bookings yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {bookings.map((b) => (
                    <div key={b.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{b.booking_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {b.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {b.service?.name && <p className="text-xs text-gray-600">{b.service.name}</p>}
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><FiCalendar size={10} />{b.scheduled_date || new Date(b.booking_date).toLocaleDateString('en-IN')}</span>
                        {b.final_amount && <span className="font-semibold text-gray-600">₹{fmt(b.final_amount)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {drawerTab === 'invoices' && (
              loadingI ? (
                <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No invoices yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700 font-mono">{inv.invoice_number}</span>
                        <span className="text-xs font-bold text-green-600">₹{fmt(inv.total_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1"><FiCalendar size={10} />{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</span>
                        <span className="capitalize">{inv.payment_method?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Analytics Cards (admin) ───────────────────────────────────────────────────
const AnalyticsSection = ({ analytics, loading }) => {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-28" />
      ))}
    </div>
  )

  if (!analytics.length) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shop-wise Analytics</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {analytics.map((s) => (
          <div key={s.shop_id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-sm">{s.shop_name}</p>
                <p className="text-xs text-gray-400">{s.shop_owner}</p>
              </div>
              <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {s.total_customers} customers
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-gray-900">₹{fmt(s.total_spent)}</p>
                <p className="text-xs text-gray-400">Total Spent</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">₹{fmt(s.avg_spent)}</p>
                <p className="text-xs text-gray-400">Avg Spend</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{s.avg_rating.toFixed(1)} ★</p>
                <p className="text-xs text-gray-400">Avg Rating</p>
              </div>
            </div>
            {s.top_city && s.top_city !== '—' && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <FiMapPin size={10} /> Top city: <strong>{s.top_city}</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  shop_name: '', gst_number: '', address: '', city: '',
  state: '', postal_code: '', preferred_contact: 'phone',
}

const CustomersPage = () => {
  const { user } = useSelector((s) => s.auth)
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SOP_USER

  const [customers, setCustomers]       = useState([])
  const [analytics, setAnalytics]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [searchTerm, setSearchTerm]     = useState('')
  const [filterCity, setFilterCity]     = useState('')
  const [filterState, setFilterState]   = useState('')
  const [activeTab, setActiveTab]       = useState('all')
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [detailCustomer, setDetailCustomer] = useState(null)
  const [form, setForm]                 = useState(emptyForm)

  const canCreate = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'create')
  const canEdit   = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'update')
  const canDelete = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'delete')
  const canExport = (isAdmin || canAccess(user, roleGroups.sales)) && canDo(user, 'customers', 'export_csv')

  useEffect(() => { fetchCustomers() }, [searchTerm, filterCity, filterState])

  useEffect(() => {
    if (isAdmin && activeTab === 'analytics') fetchAnalytics()
  }, [isAdmin, activeTab])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = { limit: 500, search: searchTerm, ordering: '-created_at' }
      if (filterCity)  params.city  = filterCity
      if (filterState) params.state = filterState
      const res = await customerAPI.getAll(params)
      setCustomers(res.data.results || res.data || [])
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (analytics.length) return
    setLoadingAnalytics(true)
    try {
      const res = await customerAPI.getAnalytics()
      setAnalytics(res.data || [])
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Derived stats
  const totalSpent    = useMemo(() => customers.reduce((s, c) => s + Number(c.total_spent || 0), 0), [customers])
  const avgSpent      = customers.length ? totalSpent / customers.length : 0
  const topCity       = useMemo(() => {
    const freq = {}
    customers.forEach((c) => { if (c.city) freq[c.city] = (freq[c.city] || 0) + 1 })
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  }, [customers])

  const topSpenders = useMemo(() =>
    [...customers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent)).slice(0, 20),
    [customers]
  )

  const uniqueCities  = useMemo(() => [...new Set(customers.map((c) => c.city).filter(Boolean))].sort(), [customers])
  const uniqueStates  = useMemo(() => [...new Set(customers.map((c) => c.state).filter(Boolean))].sort(), [customers])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit   = (c) => {
    setEditing(c)
    setForm({
      first_name: c.user?.first_name || '', last_name: c.user?.last_name || '',
      email: c.user?.email || '',          phone: c.user?.phone || '',
      shop_name: c.shop_name || '',        gst_number: c.gst_number || '',
      address: c.address || '',            city: c.city || '',
      state: c.state || '',               postal_code: c.postal_code || '',
      preferred_contact: c.preferred_contact || 'phone',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await customerAPI.update(editing.id, {
          shop_name: form.shop_name, gst_number: form.gst_number,
          address: form.address,    city: form.city,
          state: form.state,        postal_code: form.postal_code,
          preferred_contact: form.preferred_contact,
        })
        toast.success('Customer updated')
      } else {
        await customerAPI.create(form)
        toast.success('Customer created')
      }
      setShowForm(false)
      fetchCustomers()
    } catch (err) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Operation failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.user?.first_name || c.user?.email}"? This cannot be undone.`)) return
    try {
      await customerAPI.delete(c.id)
      toast.success('Customer deleted')
      fetchCustomers()
    } catch {
      toast.error('Delete failed — customer may have linked records')
    }
  }

  const handleExport = () => {
    downloadCSV(customers, [
      { key: 'name',             label: 'Name',          getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email',            label: 'Email',         getValue: (r) => r.user?.email || '' },
      { key: 'phone',            label: 'Phone',         getValue: (r) => r.user?.phone || '' },
      { key: 'city',             label: 'City' },
      { key: 'state',            label: 'State' },
      { key: 'postal_code',      label: 'Pincode' },
      { key: 'shop_name',        label: 'Business Name' },
      { key: 'gst_number',       label: 'GST Number' },
      { key: 'service_shop_name', label: 'Service Shop', getValue: (r) => r.service_shop_name || '' },
      { key: 'total_bookings',   label: 'Total Bookings' },
      { key: 'invoice_count',    label: 'Total Invoices' },
      { key: 'total_spent',      label: 'Total Spent',   getValue: (r) => r.total_spent || 0 },
      { key: 'average_rating',   label: 'Avg Rating',    getValue: (r) => r.average_rating || 0 },
      { key: 'preferred_contact', label: 'Preferred Contact' },
    ], 'customers')
    toast.success('CSV downloaded')
  }

  // ── columns ────────────────────────────────────────────────────────────────
  const buildColumns = (forTopSpenders = false) => {
    const cols = [
      {
        key: 'name', label: 'Customer',
        render: (r) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              {initials(r.user)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.user?.email || '—'}
              </p>
              {r.service_shop_name && isAdmin && (
                <p className="text-xs text-yellow-600 flex items-center gap-0.5">
                  <FiShoppingBag size={9} /> {r.service_shop_name}
                </p>
              )}
              {r.shop_name && <p className="text-xs text-gray-400 truncate max-w-[140px]">{r.shop_name}</p>}
            </div>
          </div>
        ),
      },
      {
        key: 'contact', label: 'Contact',
        render: (r) => (
          <div className="space-y-0.5">
            {r.user?.phone
              ? <a href={`tel:${r.user.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><FiPhone size={10} />{r.user.phone}</a>
              : <span className="text-xs text-gray-400">No phone</span>
            }
            {r.user?.email && <p className="text-xs text-gray-400 truncate max-w-[160px]">{r.user.email}</p>}
          </div>
        ),
      },
      {
        key: 'location', label: 'City / State',
        render: (r) => (
          <span className="text-sm text-gray-700">
            {r.city || '—'}{r.state ? `, ${r.state}` : ''}
          </span>
        ),
      },
      {
        key: 'stats', label: 'Activity',
        render: (r) => (
          <div className="flex items-center gap-3">
            <span title="Bookings" className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
              <FiCalendar size={9} /> {r.total_bookings || 0}
            </span>
            <span title="Invoices" className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
              <FiFileText size={9} /> {r.invoice_count || 0}
            </span>
          </div>
        ),
      },
      {
        key: 'total_spent', label: 'Total Spent',
        render: (r) => (
          <div>
            <p className="font-bold text-gray-900 text-sm">₹{fmt(r.total_spent)}</p>
            {forTopSpenders && r.average_rating > 0 && <StarRating value={r.average_rating} />}
          </div>
        ),
      },
    ]

    if (!forTopSpenders) {
      cols.push({
        key: 'rating', label: 'Rating',
        render: (r) => r.average_rating > 0 ? <StarRating value={r.average_rating} /> : <span className="text-xs text-gray-300">—</span>,
      })
    }

    cols.push({
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => setDetailCustomer(r)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="View Details">
            <FiEye size={13} />
          </button>
          {canEdit && (
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100" title="Edit">
              <FiEdit2 size={13} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      ),
    })

    return cols
  }

  const allColumns = buildColumns(false)
  const topColumns = buildColumns(true)

  const formFields = [
    ['first_name', 'First Name', false],
    ['last_name',  'Last Name',  false],
    ['email',      'Email',      false],
    ['phone',      'Phone',      false],
    ['shop_name',  'Business Name', true],
    ['gst_number', 'GST Number',    true],
    ['city',       'City',       false],
    ['state',      'State',      false],
    ['postal_code','Pincode',    false],
  ]
  const isUserField = (n) => ['first_name', 'last_name', 'email', 'phone'].includes(n)

  const tabs = [
    { id: 'all',       label: `All Customers (${customers.length})` },
    { id: 'top',       label: 'Top Spenders' },
    ...(isAdmin ? [{ id: 'analytics', label: 'Analytics' }] : []),
  ]

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <PageToolbar
          title="Customers"
          subtitle="Customer profiles, contact details, and booking history."
          search={searchTerm}
          onSearch={setSearchTerm}
          actionLabel={canCreate ? 'Add Customer' : undefined}
          actionIcon={FiPlus}
          onAction={canCreate ? openCreate : undefined}
        />
        {canExport && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: FiUsers,      label: 'Total Customers', value: customers.length,              color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { icon: FiTrendingUp, label: 'Total Revenue',   value: `₹${fmt(totalSpent)}`,         color: 'text-green-600',  bg: 'bg-green-50'  },
          { icon: FiStar,       label: 'Avg Spend',       value: `₹${fmt(Math.round(avgSpent))}`,color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { icon: FiMapPin,     label: 'Top City',        value: topCity,                        color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <FiFilter size={14} className="text-gray-400" />
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
        >
          <option value="">All Cities</option>
          {uniqueCities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
        >
          <option value="">All States</option>
          {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterCity || filterState) && (
          <button
            onClick={() => { setFilterCity(''); setFilterState('') }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <FiX size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-yellow-400 text-yellow-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'all' && (
        <DataTable
          columns={allColumns}
          rows={customers}
          loading={loading}
          emptyMessage="No customers found"
        />
      )}

      {activeTab === 'top' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Top 20 customers by total spending</p>
          <DataTable
            columns={topColumns}
            rows={topSpenders}
            loading={loading}
            emptyMessage="No customers found"
          />
        </div>
      )}

      {activeTab === 'analytics' && isAdmin && (
        <AnalyticsSection analytics={analytics} loading={loadingAnalytics} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? `Edit — ${editing.user?.email}` : 'Add New Customer'}
        open={showForm}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {formFields.map(([name, label, optional]) => (
            <FormField key={name} label={label}>
              <input
                className={`${inputClass}${editing && isUserField(name) ? ' opacity-60 cursor-not-allowed' : ''}`}
                type={name === 'email' ? 'email' : 'text'}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                readOnly={!!(editing && isUserField(name))}
                required={!editing && !optional && !['shop_name', 'gst_number'].includes(name)}
                placeholder={optional ? 'Optional' : ''}
              />
            </FormField>
          ))}

          <FormField label="Preferred Contact">
            <select
              className={inputClass}
              value={form.preferred_contact}
              onChange={(e) => setForm({ ...form, preferred_contact: e.target.value })}
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Full Address">
              <textarea
                className={inputClass}
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required={!editing}
              />
            </FormField>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : editing ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Drawer */}
      {detailCustomer && (
        <CustomerDetailDrawer
          customer={detailCustomer}
          onClose={() => setDetailCustomer(null)}
        />
      )}
    </div>
  )
}

export default CustomersPage
