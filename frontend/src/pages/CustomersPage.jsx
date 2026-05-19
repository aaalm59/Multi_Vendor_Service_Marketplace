import React, { useEffect, useState } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiDownload, FiEye, FiPhone, FiMail, FiMapPin, FiCalendar, FiDollarSign, FiX } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { customerAPI } from '../services/api'
import toast from 'react-hot-toast'
import DataTable from '../components/DataTable'
import FormField, { inputClass } from '../components/FormField'
import Modal from '../components/Modal'
import PageToolbar from '../components/PageToolbar'
import StatusBadge from '../components/StatusBadge'
import { canAccess, canDo, roleGroups, ROLES } from '../routes/rbac'
import { downloadCSV } from '../utils/exportCSV'

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  shop_name: '', gst_number: '', address: '', city: '',
  state: '', postal_code: '', preferred_contact: 'phone',
}

// ── Customer Detail Drawer ────────────────────────────────────────────────────
const CustomerDetailDrawer = ({ customer, onClose }) => {
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)

  useEffect(() => {
    customerAPI.getBookings(customer.id)
      .then((res) => setBookings(res.data?.results || res.data || []))
      .catch(() => toast.error('Failed to load booking history'))
      .finally(() => setLoadingBookings(false))
  }, [customer.id])

  const u = customer.user || {}
  const initials = [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('') || u.email?.[0]?.toUpperCase() || 'C'

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-950 px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">
              {u.first_name} {u.last_name}
            </h2>
            {customer.shop_name && (
              <p className="text-yellow-400 text-sm">{customer.shop_name}</p>
            )}
            <p className="text-gray-400 text-xs mt-0.5 capitalize">{u.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 flex-shrink-0">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Contact Info */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
            <div className="space-y-2">
              {u.phone && (
                <a href={`tel:${u.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-yellow-600 transition">
                  <FiPhone size={14} className="text-gray-400 flex-shrink-0" />
                  {u.phone}
                </a>
              )}
              {u.email && (
                <a href={`mailto:${u.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-yellow-600 transition">
                  <FiMail size={14} className="text-gray-400 flex-shrink-0" />
                  {u.email}
                </a>
              )}
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <FiMapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span>
                  {customer.address && <span>{customer.address}, </span>}
                  {[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stats</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{customer.total_bookings}</p>
                <p className="text-xs text-gray-500 mt-0.5">Bookings</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-yellow-600">₹{Number(customer.total_spent || 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{Number(customer.average_rating || 0).toFixed(1)} ★</p>
                <p className="text-xs text-gray-500 mt-0.5">Avg Rating</p>
              </div>
            </div>
          </section>

          {/* Extra info */}
          {(customer.gst_number || customer.preferred_contact) && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Other Details</p>
              <div className="space-y-1 text-sm">
                {customer.gst_number && (
                  <p><span className="text-gray-500">GST: </span><span className="font-mono">{customer.gst_number}</span></p>
                )}
                {customer.preferred_contact && (
                  <p><span className="text-gray-500">Preferred Contact: </span><span className="capitalize">{customer.preferred_contact}</span></p>
                )}
              </div>
            </section>
          )}

          {/* Booking History */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Booking History ({bookings.length})
            </p>
            {loadingBookings ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{b.booking_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {b.service?.name && (
                      <p className="text-xs text-gray-600">{b.service.name}</p>
                    )}
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <FiCalendar size={10} />
                        {b.scheduled_date || new Date(b.booking_date).toLocaleDateString('en-IN')}
                      </span>
                      {b.final_amount && (
                        <span className="flex items-center gap-1 font-semibold text-gray-600">
                          <FiDollarSign size={10} />
                          ₹{Number(b.final_amount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState(null)
  const { user } = useSelector((state) => state.auth)

  // Permission checks (role + dynamic manager permissions)
  const canCreate = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'create')
  const canEdit   = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'update')
  const canDelete = canAccess(user, roleGroups.sales) && canDo(user, 'customers', 'delete')
  const canExport = (user?.role === ROLES.ADMIN || canAccess(user, roleGroups.sales)) && canDo(user, 'customers', 'export_csv')

  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchCustomers() }, [searchTerm])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await customerAPI.getAll({ limit: 200, search: searchTerm, ordering: '-created_at' })
      setCustomers(res.data.results || res.data || [])
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      first_name: c.user?.first_name || '', last_name: c.user?.last_name || '',
      email: c.user?.email || '', phone: c.user?.phone || '',
      shop_name: c.shop_name || '', gst_number: c.gst_number || '',
      address: c.address || '', city: c.city || '',
      state: c.state || '', postal_code: c.postal_code || '',
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
          shop_name: form.shop_name,
          gst_number: form.gst_number,
          address: form.address,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          preferred_contact: form.preferred_contact,
        })
        toast.success('Customer updated')
      } else {
        await customerAPI.create(form)
        toast.success('Customer created')
      }
      setShowForm(false)
      fetchCustomers()
    } catch (error) {
      const msg =
        error.response?.data?.email?.[0] ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        'Operation failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete customer "${c.user?.first_name || c.user?.email}"? This cannot be undone.`)) return
    try {
      await customerAPI.delete(c.id)
      toast.success('Customer deleted')
      fetchCustomers()
    } catch {
      toast.error('Delete failed — customer may have linked bookings or invoices')
    }
  }

  const handleExport = () => {
    downloadCSV(customers, [
      { key: 'name',         label: 'Name',         getValue: (r) => `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() },
      { key: 'email',        label: 'Email',        getValue: (r) => r.user?.email || '' },
      { key: 'phone',        label: 'Phone',        getValue: (r) => r.user?.phone || '' },
      { key: 'city',         label: 'City' },
      { key: 'state',        label: 'State' },
      { key: 'postal_code',  label: 'Pincode' },
      { key: 'shop_name',    label: 'Shop Name' },
      { key: 'gst_number',   label: 'GST Number' },
      { key: 'total_bookings', label: 'Total Bookings' },
      { key: 'total_spent',  label: 'Total Spent',  getValue: (r) => r.total_spent || 0 },
      { key: 'preferred_contact', label: 'Preferred Contact' },
    ], 'customers')
    toast.success('Customers CSV downloaded')
  }

  const columns = [
    {
      key: 'name', label: 'Customer',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
            {(r.user?.first_name?.[0] || r.user?.email?.[0] || 'C').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || '—'}</p>
            {r.shop_name && <p className="text-xs text-gray-400 truncate max-w-[140px]">{r.shop_name}</p>}
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (r) => r.user?.phone
        ? <a href={`tel:${r.user.phone}`} className="text-blue-600 hover:underline">{r.user.phone}</a>
        : '—'
    },
    { key: 'city', label: 'City / State', render: (r) => <span>{r.city || '—'}{r.state ? `, ${r.state}` : ''}</span> },
    { key: 'total_bookings', label: 'Bookings', render: (r) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
          {r.total_bookings || 0}
        </span>
      )
    },
    { key: 'total_spent', label: 'Total Spent', render: (r) => (
        <span className="font-semibold text-gray-900">₹{Number(r.total_spent || 0).toLocaleString('en-IN')}</span>
      )
    },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => setDetailCustomer(r)}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            title="View Details"
          >
            <FiEye size={13} />
          </button>
          {canEdit && (
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
              title="Edit"
            >
              <FiEdit2 size={13} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete(r)}
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
              title="Delete"
            >
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  const formFields = [
    ['first_name', 'First Name', false],
    ['last_name',  'Last Name',  false],
    ['email',      'Email',      false],
    ['phone',      'Phone',      false],
    ['shop_name',  'Shop Name',  true],
    ['gst_number', 'GST Number', true],
    ['city',       'City',       false],
    ['state',      'State',      false],
    ['postal_code','Pincode',    false],
  ]

  const isUserField = (name) => ['first_name', 'last_name', 'email', 'phone'].includes(name)

  return (
    <div className="space-y-5">
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

      <DataTable
        columns={columns}
        rows={customers}
        loading={loading}
        emptyMessage="No customers found"
      />

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? `Edit Customer — ${editing.user?.email}` : 'Add New Customer'}
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
                required={!editing && !optional && name !== 'shop_name' && name !== 'gst_number'}
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
              className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black disabled:opacity-60 hover:bg-yellow-500 transition flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving...' : editing ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail Drawer */}
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
